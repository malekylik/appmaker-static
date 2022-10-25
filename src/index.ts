const {
  stat: oldStat, readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile,
  rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess,
  constants,
} = require('fs');
const { promisify } = require('util');
const path = require('path');
import { generateResultXML } from './generate';
import { checkTypes, lint } from './validate';
import * as commandLineArgs from 'command-line-args';
import { App, initAppMakerApp, Model, View } from './appmaker/app';
import { callAppMakerApp } from './appmaker-network';
import { generateJSProjectForAppMaker, getModelsNames, getScriptsNames, getViewsNames, readAppMakerModels, readAppMakerScripts, readAppMakerViews, readLinterConfig, readTSConfig } from './io';
import { printTSCheckDiagnostics } from './report';

const stat = promisify(oldStat);
const readdir = promisify(oldReaddir);
const readFile = promisify(oldReadFile);
const writeFile = promisify(oldWriteFile);
const rm = promisify(oldRm);
const mkdir = promisify(oldMkDir);
const copyFile = promisify(oldCopyFile);
const access = promisify(oldAccess);
const exec = promisify(require('node:child_process').exec);

// const passedPath = process.argv[2];

const optionDefinitions = [
  // { name: 'appId', alias: 'v', type: Boolean },
  { name: 'appId', type: String },
  // { name: 'login', type: String, multiple: true, defaultOption: true },
  { name: 'login', type: String },
  { name: 'password', type: String },
  { name: 'outDir', type: String },
  { name: 'headless', type: String }
  // { name: 'password', type: String },
];

//  node ./dist/index.js "/usr/local/google/home/kalinouski/Downloads/Spotlight 2.0_last.zip"

interface Options {
  appId?: string; login?: string; password?: string; outDir?: string;
  headless?: string;
}

const options: Options = commandLineArgs(optionDefinitions) as Options;

async function run() {
  const {
    appId, login, password, outDir = `${__dirname}/temp`,
    headless,
  } = options;

  if (appId) {
    if (login === undefined || password === undefined) {
      console.log('For using script in remote mode please pass login and password');

      process.exit(1);
    }
  } else {
    console.log('only remote mode');
    process.exit(1);
  }

  const credentials = {
    login: login,
    password: password,
  };
  const applicationId = appId;

  const browserOptions: { headless?: boolean | 'chrome' } = {};

  if (headless) {
    if (headless === 'true') {
      browserOptions.headless = true;
    } else if (headless === 'false') {
      browserOptions.headless = false;
    } else if (headless === 'chrome') {
      browserOptions.headless = 'chrome';
    } else {
      console.log(`unknown value for headless ${headless}. Stick with value "chrome". Possible values: true, false, chrome`);

      browserOptions.headless = 'chrome';
    }
  }

  // if (!passedPath) {
  //   console.log('Pass path as second arg');
  //   process.exit(1);
  // }

  // let passedPath = __dirname + '/app.zip';
  // can be folder to zip project or unzip project folder
  let passedPath = await callAppMakerApp(applicationId, credentials, browserOptions);

  let pathStat = null;

  try {
    pathStat = await stat(passedPath);
  } catch {
    console.log(`Couldn't find path: ${passedPath}`);
    process.exit(1);
  }

  let passToZip = passedPath;
  let pathToProject = passedPath;
  const isZip = path.extname(pathToProject) === '.zip';

  if (isZip) {
    pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
    console.log('unzip to', pathToProject);
    try {
      await exec(`unzip -d "${pathToProject}" "${passedPath}"`);
    } catch (e) {
      console.log(`Fail to unzip file ${passedPath} to ${pathToProject}`);
      console.log(e);
      process.exit(1);
    }
  }

  if (pathStat.isDirectory() || isZip) {
    const [linterConfig, tsConfig] = await Promise.all([
      readLinterConfig(),
      readTSConfig(),
    ]);

    const [scriptsNames, modelsNames, viewsNames] = await Promise.all([
      getScriptsNames(pathToProject),
      getModelsNames(pathToProject),
      getViewsNames(pathToProject),
    ]);

    const [scriptsFiles, modelsFiles, viewsFiles] = await Promise.all([
      readAppMakerScripts(pathToProject, scriptsNames),
      readAppMakerModels(pathToProject, modelsNames),
      readAppMakerViews(pathToProject, viewsNames),
    ]);

    const app = new App();

    initAppMakerApp(app, modelsFiles, viewsFiles);

    const pathToGenerateJSProjectDir = outDir;

    const generatedFiles = await generateJSProjectForAppMaker(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, app);

    if (generatedFiles.length > 0) {
      const allDiagnostics = checkTypes(generatedFiles, tsConfig);

      printTSCheckDiagnostics(allDiagnostics);

      if (allDiagnostics.length) {
        console.log('TS check doesnt pass. Skip the rest');

        if (isZip) {
          await rm(pathToProject, { recursive: true });
        } 

        process.exit(1);
      }
    } else {
      console.log('No file to check for types. TS check skip')
    }

    const emptyScripts: string[] = [];

    for (let i = 0; i < scriptsFiles.length; i++) {
      const { name, file } = scriptsFiles[i]!;

      console.log(`-----${name}-----`);

      if (file.script['#text']) {
        const messages = lint(file.script['#text'], linterConfig, scriptsNames[i]);
        const res = generateResultXML(file, messages.output);

        console.log('lint res', messages.messages);
        await writeFile(`${pathToProject}/scripts/${scriptsNames[i]}`, res);

        if(messages.messages.length > 0) {
          console.log('Not fixed', messages.messages, messages.output);
        }
      } else {
        emptyScripts.push(scriptsNames[i]!);
      }
    }

    console.log('empty scripts', emptyScripts);

   if (isZip) {
      console.log('post actions');

      process.chdir(pathToProject);
      console.log('zip to', '${outDir}/app.zip');
      await exec(`zip -r "${outDir}/app.zip" *`);

      console.log('remove', passedPath);
      await rm(passToZip);

      console.log('remove', pathToProject);
      await rm(pathToProject, { recursive: true });
    }
  } else {
    console.log('Doest support file or directory doesnt extist');
    process.exit(1);
  }
}

run();
