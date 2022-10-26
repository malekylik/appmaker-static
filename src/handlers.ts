import { RemoteMode } from './command-line';
import { checkForEmptyScriptsFiles, checkLinting, checkTypes } from './validate';
import { App, initAppMakerApp } from './appmaker/app';
import { callAppMakerApp } from './appmaker-network';
import { generateJSProjectForAppMaker, getModelsNames, getScriptsNames, getViewsNames, readAppMakerModels, readAppMakerScripts, readAppMakerViews, readLinterConfig, readTSConfig, writeValidatedScriptsToAppMakerXML } from './io';
import { printEmptyScripts, printLintingReport, printTSCheckDiagnostics } from './report';

const { stat: oldStat, rm: oldRm } = require('fs');
const { promisify } = require('util');

const rm = promisify(oldRm);
const exec = promisify(require('node:child_process').exec);
const stat = promisify(oldStat);

export async function postZipActionsHandler(pathToZip: string, pathToProject: string, outDir: string) {
  console.log('post actions');

  process.chdir(pathToProject);
  console.log('zip to', `${outDir}/app.zip`);
  await exec(`zip -r "${outDir}/app.zip" *`);

  console.log('remove', pathToZip);
  await rm(pathToZip);

  console.log('remove', pathToProject);
  await rm(pathToProject, { recursive: true });
}

export async function handleRemoteApplicationMode(options: RemoteMode): Promise<void> {
  let passedPath = await callAppMakerApp(options.appId, options.credentials, options.browserOptions);

  let pathStat = null;

  try {
    pathStat = await stat(passedPath);
  } catch {
    console.log(`Couldn't find path: ${passedPath}`);
    process.exit(1);
  }

  let pathToZip = passedPath;
  let pathToProject = passedPath;

  pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
  console.log('unzip to', pathToProject);
  try {
    await exec(`unzip -d "${pathToProject}" "${passedPath}"`);
  } catch (e) {
    console.log(`Fail to unzip file ${passedPath} to ${pathToProject}`);
    console.log(e);
    process.exit(1);
  }

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

  const generatedFiles = await generateJSProjectForAppMaker(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, linterConfig, app);

  if (generatedFiles.length > 0) {
    const allDiagnostics = checkTypes(generatedFiles, tsConfig);

    printTSCheckDiagnostics(allDiagnostics);

    if (allDiagnostics.length) {
      console.log('TS check doesnt pass. Skip the rest');

      await postZipActionsHandler(pathToZip, pathToProject, options.outDir);

      process.exit(1);
    }
  } else {
    console.log('No file to check for types. TS check skip')
  }

  const lintingReport = checkLinting(scriptsFiles, linterConfig);
  printLintingReport(lintingReport);

  await writeValidatedScriptsToAppMakerXML(scriptsFiles, lintingReport, pathToProject);

  const emptyScripts = checkForEmptyScriptsFiles(scriptsFiles);
  printEmptyScripts(emptyScripts);

  await postZipActionsHandler(pathToZip, pathToProject, options.outDir);
}
