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
  // { name: 'password', type: String },
];

//  node ./dist/index.js "/usr/local/google/home/kalinouski/Downloads/Spotlight 2.0_last.zip"

interface Options {
  appId?: string; login?: string; password?: string;
}

const options: Options = commandLineArgs(optionDefinitions) as Options;

async function run() {
  const {
    appId, login, password,
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

  // if (!passedPath) {
  //   console.log('Pass path as second arg');
  //   process.exit(1);
  // }

  await callAppMakerApp(applicationId, credentials);
  let passedPath = __dirname + '/app.zip';

  let pathStat = null;

  try {
    pathStat = await stat(passedPath);
  } catch {
    console.log(`Couldn't find path: ${passedPath}`);
    process.exit(1);
  }

  let pathToProject = passedPath;
  const isZip = path.extname(pathToProject) === '.zip';

  if (isZip) {
    pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
    console.log('zip', pathToProject);
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

    const pathToTempDir = `${__dirname}/temp`;

    const generatedFiles = await generateJSProjectForAppMaker(pathToTempDir, scriptsFiles, tsConfig, app);

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

      let write = false;
      // console.log('type', jsonObj.script.type);
  // console.log('jsonObj', jsonObj);
      if (file.script['#text']) {
        const messages = lint(file.script['#text'], linterConfig, scriptsNames[i]);
        // console.log('messages', messages);
        // TODO: check can we write even it's fixe it partialy
        write = messages.fixed;

        if (write) {
  //      console.log('text', jsonObj.script['#text']);
  //        console.log('res', generateResultXML(jsonObj, messages.output));
            const res = generateResultXML(file, messages.output);
  //          const res = scriptXML.replace(/CDATA\[[\s\S]*\]/, 'CDATA[' + messages.output + ']]');
          console.log('lint res', messages.messages);
          writeFile(`${pathToProject}/scripts/${scriptsNames[i]}`, res);
        } else if(messages.messages.length > 0) {
          console.log('Not fixed', messages.messages, messages.output);
        }
      } else {
        emptyScripts.push(scriptsNames[i]!);
      }
    }

    console.log('empty scripts', emptyScripts);

   if (isZip) {
      await rm(passedPath);
      process.chdir(pathToProject);
      await exec(`zip -r "${passedPath}" *`);
      await rm(pathToProject, { recursive: true });
    }
  } else {
    console.log('Doest support file or directory doesnt extist');
    process.exit(1);
  }
}

run();
