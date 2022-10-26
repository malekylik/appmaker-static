const path = require('path');
import { OfflineMode, RemoteMode } from './command-line';
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

export async function postOfflineZipActionsHandler(pathToProject: string, outDir: string) {
  console.log('post actions');

  process.chdir(pathToProject);
  console.log('zip to', `${outDir}/app.zip`);
  await exec(`zip -r "${outDir}/app.zip" *`);

  console.log('remove', pathToProject);
  await rm(pathToProject, { recursive: true });
}

export async function postRemoteZipActionsHandler(pathToZip: string, pathToProject: string, outDir: string) {
  console.log('post actions');

  process.chdir(pathToProject);
  console.log('zip to', `${outDir}/app.zip`);
  await exec(`zip -r "${outDir}/app.zip" *`);

  console.log('remove', pathToZip);
  await rm(pathToZip);

  console.log('remove', pathToProject);
  await rm(pathToProject, { recursive: true });
}

async function validateUnzipProject(passedPath: string, outDir: string): Promise<{ code: number }> {
  const [linterConfig, tsConfig] = await Promise.all([
    readLinterConfig(),
    readTSConfig(),
  ]);

  const [scriptsNames, modelsNames, viewsNames] = await Promise.all([
    getScriptsNames(passedPath),
    getModelsNames(passedPath),
    getViewsNames(passedPath),
  ]);

  const [scriptsFiles, modelsFiles, viewsFiles] = await Promise.all([
    readAppMakerScripts(passedPath, scriptsNames),
    readAppMakerModels(passedPath, modelsNames),
    readAppMakerViews(passedPath, viewsNames),
  ]);

  const app = new App();

  initAppMakerApp(app, modelsFiles, viewsFiles);

  const pathToGenerateJSProjectDir = outDir;

  const generatedFiles = await generateJSProjectForAppMaker(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, linterConfig, app);

  if (generatedFiles.length > 0) {
    const allDiagnostics = checkTypes(generatedFiles, tsConfig);

    printTSCheckDiagnostics(allDiagnostics);

    if (allDiagnostics.length) {
      console.log('TS check doesnt pass. Skip the rest');

      return { code: 1 };
    }
  } else {
    console.log('No file to check for types. TS check skip')
  }

  const lintingReport = checkLinting(scriptsFiles, linterConfig);
  printLintingReport(lintingReport);

  await writeValidatedScriptsToAppMakerXML(scriptsFiles, lintingReport, passedPath);

  const emptyScripts = checkForEmptyScriptsFiles(scriptsFiles);
  printEmptyScripts(emptyScripts);

  return { code: 1 };
}

async function validateZipProject(passedPath: string, outDir: string): Promise<{ code: number; path: string; }> {
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

  const result = await validateUnzipProject(pathToProject, outDir);

  return ({
    ...result,
    path: pathToProject,
  });
}

export async function handleOfflineApplicationMode(options: OfflineMode): Promise<void> {
  let pathStat = null;

  try {
    pathStat = await stat(options.project);
  } catch {
    console.log(`Couldn't find path: ${options.project}`);
    process.exit(1);
  }

  const isZip = path.extname(options.project) === '.zip';

  if (!pathStat.isDirectory() && !isZip) {
    console.log(`Passed pass isn't a zip nor folder. Unsupported extension of project file. Passed path ${options.project}`);
    process.exit(1);
  }

  let result = null;

  if (isZip) {
    result = await validateZipProject(options.project, options.outDir);

    await postOfflineZipActionsHandler(result.path, options.outDir);
  } else {
    result = await validateUnzipProject(options.project, options.outDir);
  }

  if (result.code !== 0) {
    process.exit(result.code);
  }
}

export async function handleRemoteApplicationMode(options: RemoteMode): Promise<void> {
  const passedPath = await callAppMakerApp(options.appId, options.credentials, options.browserOptions);

  const result = await validateZipProject(passedPath, options.outDir);

  await postRemoteZipActionsHandler(passedPath, result.path, options.outDir);

  if (result.code !== 0) {
    process.exit(result.code);
  }
}
