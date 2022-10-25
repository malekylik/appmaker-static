const {
  stat: oldStat, readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile,
  rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess,
  constants,
} = require('fs');
const { promisify } = require('util');
const path = require('path');
import { generateResultXML } from './generate';
import { checkForEmptyScriptsFiles, checkLinting, checkTypes, lint } from './validate';
import { App, initAppMakerApp, Model, View } from './appmaker/app';
import { callAppMakerApp } from './appmaker-network';
import { generateJSProjectForAppMaker, getModelsNames, getScriptsNames, getViewsNames, readAppMakerModels, readAppMakerScripts, readAppMakerViews, readLinterConfig, readTSConfig } from './io';
import { printEmptyScripts, printLintingReport, printTSCheckDiagnostics } from './report';
import { parseCommandLineArgs } from './command-line';

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

//  node ./dist/index.js "/usr/local/google/home/kalinouski/Downloads/Spotlight 2.0_last.zip"

async function run() {
  const options = parseCommandLineArgs();

  // if (!passedPath) {
  //   console.log('Pass path as second arg');
  //   process.exit(1);
  // }

  // let passedPath = __dirname + '/app.zip';
  // can be folder to zip project or unzip project folder
  let passedPath = await callAppMakerApp(options.appId, options.credentials, options.browserOptions);

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

    const pathToGenerateJSProjectDir = options.outDir;

    const generatedFiles = await generateJSProjectForAppMaker(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, app);

    if (generatedFiles.length > 0) {
      const allDiagnostics = checkTypes(generatedFiles, tsConfig);

      printTSCheckDiagnostics(allDiagnostics);

      if (allDiagnostics.length) {
        console.log('TS check doesnt pass. Skip the rest');

        if (isZip) {
          console.log('remove', passedPath);
          await rm(passToZip);

          console.log('remove', pathToProject);
          await rm(pathToProject, { recursive: true });
        }

        process.exit(1);
      }
    } else {
      console.log('No file to check for types. TS check skip')
    }

    const lintingReport = checkLinting(scriptsFiles, linterConfig);
    printLintingReport(lintingReport);

    for (let i = 0; i < scriptsFiles.length; i++) {
      const { name, file } = scriptsFiles[i]!;
      const report = lintingReport.find(report => report.name === name);

      if (report) {
        console.log('write fixed after linting file', name);

        const res = generateResultXML(file, report.report.output);

        await writeFile(`${pathToProject}/scripts/${name}`, res);
      }
    }

    const emptyScripts = checkForEmptyScriptsFiles(scriptsFiles);
    printEmptyScripts(emptyScripts);

   if (isZip) {
      console.log('post actions');

      process.chdir(pathToProject);
      console.log('zip to', `${options.outDir}/app.zip`);
      await exec(`zip -r "${options.outDir}/app.zip" *`);

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
