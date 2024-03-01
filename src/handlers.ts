const path = require('path');
import * as puppeteer from 'puppeteer';
import { InteractiveMode, OfflineMode, RemoteMode } from './command-line';
import { checkForEmptyScriptsFiles, checkLinting, checkTypes } from './validate';
import { App, initAppMakerApp } from './appmaker/app';
import { auth, app, callAppMakerApp, isAppPage, isAuthPage, openBrowser } from './appmaker-network';
import { generateJSProjectForAppMaker, getModelsNames, getPathToViews, getScriptsNames, getViewsNames, readAppMakerModels, readAppMakerScripts, readAppMakerViews, readLinterConfig, readTSConfig, writeValidatedScriptsToAppMakerXML } from './io';
import { readAppMakerViews as readAppMakerViewsF } from './functional/io/appmaker-io';
import { printEmptyScripts, printLintingReport, printTSCheckDiagnostics } from './report';
import { changeScriptFile, getCommandNumberFromApp, getXSRFToken, retrieveCommands, takeScreenshoot } from './appmaker-network-actions';
import { stdin } from 'node:process';

import { stat as oldStat, rm as oldRm, readdir as oldReaddir, watch, lstatSync, readFile as oldReadFile } from 'node:fs';
import { promisify } from 'node:util';
import { pipe } from 'fp-ts/lib/function';

import * as E from 'fp-ts/lib/Either';

const rm = promisify(oldRm);
const readdir = promisify(oldReaddir);
const readFile = promisify(oldReadFile);
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

  const [scriptsFiles, modelsFiles, viewsFiles, newViewFiles] = await Promise.all([
    readAppMakerScripts(passedPath, scriptsNames),
    readAppMakerModels(passedPath, modelsNames),
    readAppMakerViews(passedPath, viewsNames),

    readAppMakerViewsF(getPathToViews(passedPath))(),
  ]);

  // const 

  const app = new App();

  pipe(
    newViewFiles,
    E.match(
      e => initAppMakerApp(app, modelsFiles, viewsFiles, scriptsFiles, []),
      views => initAppMakerApp(app, modelsFiles, viewsFiles, scriptsFiles, views),
    )
  )

  const pathToGenerateJSProjectDir = outDir;

  const generatedFiles = await generateJSProjectForAppMaker(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, linterConfig, app);

  if (generatedFiles.length > 0) {
    const allDiagnostics = checkTypes(generatedFiles, tsConfig);

    printTSCheckDiagnostics(allDiagnostics);

    // if (allDiagnostics.length) {
    //   console.log('TS check doesnt pass. Skip the rest');

    //   return { code: 1 };
    // }
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

async function saveCallToBrowser<T>(browser: puppeteer.Browser, callback: (browser: puppeteer.Browser) => T): Promise<T | null> {
  try {
    const res = callback(browser);

    if (res instanceof Promise) {
      return await res;
    }

    return res;
  } catch (e) {
    console.log('fail to run command', e);
  }

  return null;
}

enum InteractiveModeCommands {
  close = 'close',
  printWorkingDirectory = 'pwd',
  printCommandNumber = 'pcn',
  listFiles = 'ls',
  export = 'export',
  screenshot = 'screenshot',
  update = 'update',
}

export async function handleInteractiveApplicationMode(options: InteractiveMode): Promise<void> {
  console.log('interactive');

  let filesName = (await readdir(options.outDir))
    .filter(name => name[0] !== '.')
    .filter(name => name.slice(0, 2) !== '__')
    .filter(name => !lstatSync(path.join(options.outDir, name)).isDirectory())
    .filter(name => name.split('.')[name.split('.').length - 1] === 'js');
  let files = await (Promise.all(
    filesName.map(name => readFile(path.join(options.outDir, name), 'utf-8')
      .then(content => {
        return ({
          content,
          name,
          path: path.join(options.outDir, name)
        });
      }))
  )) as Array<{ content: string, name: string, path: string }>;

  // console.log('files', files);

  let browser = await openBrowser({ headless: false });

  let page: puppeteer.Page | null = null;
  let commandNumber = '';
  let xsrfToken = '';
  let generatedFiles: Array<string> = [];

  let _app = new App();

  try {
    console.log('open page');

    page = await browser.newPage()
  } catch (e) {
    console.log('error: cant open page', e);

    console.log('handleInteractiveApplicationMode interactive closing');
    await browser.close();

    throw e;
  }

  try {
    await new Promise(res => setTimeout(res, 2000));

    console.log('newPage');

    // TODO: not always wait correctly
    await page.goto(`https://appmaker.googleplex.com/edit/${options.appId}`, {waitUntil: 'networkidle2'});

    if (isAuthPage(page.url())) {
      await auth(page, options.credentials);
    }

    if (isAppPage(page.url())) {
      commandNumber = await getCommandNumberFromApp(page);
      console.log('current command', commandNumber);
      console.log('successfuly loged in, please type command');
    } else {
      throw new Error('unknown page: taking screen');
    }

    xsrfToken = await getXSRFToken(page);

  } catch (e) {
    console.log('error: taking screen', e);
    await takeScreenshoot(page);

    await browser.close();

    throw e;
  }

  async function callback(data: Buffer) {
    let command = data.toString();
    command = command.slice(0, command.length - 1)

    if (command === InteractiveModeCommands.close) {
      stdin.removeListener('data', callback);

      await browser.close();
      console.log('browser closed');
      stdin.end();
      process.exit(0);
    } else if (command === InteractiveModeCommands.printWorkingDirectory) {
      console.log(options.outDir);
    } else if (command === InteractiveModeCommands.printCommandNumber) {
      console.log(commandNumber);
    } else if (command === InteractiveModeCommands.listFiles) {
      try {
        const files: Array<string> = await readdir(options.outDir);
        const filesAsString = files.reduce((str, file) => str + `\n${file}`, '');
        console.log(filesAsString);
      } catch (e) {
        console.log('ls failed with error: ', e);
      }
    } else if (command === InteractiveModeCommands.export) {
      try {
        const passedPath = await app(page!, options.outDir);

        let pathToProject = passedPath;

        pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;

        await exec(`unzip -d "${pathToProject}" "${passedPath}"`);

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
      
      
        initAppMakerApp(_app, modelsFiles, viewsFiles, scriptsFiles, []);
      
        const pathToGenerateJSProjectDir = options.outDir;
      
        generatedFiles = await generateJSProjectForAppMaker(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, linterConfig, _app);
      } catch (e) {
        console.log('Export failed with error: ', e);
      }
    } else if (command === InteractiveModeCommands.screenshot) {
      try {
        await takeScreenshoot(page!);
        console.log('screenshot done');
      } catch (e) {
        console.log(`${InteractiveModeCommands.screenshot} failed with error: `, e);
      }
    } else if (command === InteractiveModeCommands.update) {
      console.log('update');
    } else {
      console.log('unknown command', command);
    }
  }

  const buttonPressesLogFile = options.outDir;

  console.log(`Watching for file changes on ${buttonPressesLogFile}`);

  let fsWait: any = false;
  watch(buttonPressesLogFile, (event, filename) => {
    if (filename) {
      if (fsWait) return;
      fsWait = setTimeout(() => {
        fsWait = false;
      }, 1000);
      console.log(`${filename} file Changed`);
      console.log('event', event);

      const file = files.find(f => f.name === filename);

      if (file) {
        readFile(file.path, 'utf-8')
          .then((newContent) => {
            const name = file.name.split('.').slice(0, file.name.split('.').length - 1).join('.');
            console.log('name', name, file.name);
            const p = changeScriptFile(page!, xsrfToken, options.appId, options.credentials.login, name, commandNumber, file.content, newContent);

            file.content = newContent;

            return p;
          })
          .then(done => {
            console.log('done', done);
          })
      } else {
        console.log('Couldt find file with name', filename);
      }
    }
  });

  let pr: Promise<unknown> | null = null;

  async function checkForCommandNumber() {
    if (pr !== null) {
      return;
    }

    pr = retrieveCommands(page!, xsrfToken, options.appId, commandNumber);

    const _commandNumber = await pr;

    pr = null;

    // console.log('res', _commandNumber);
    // console.log('current Command', commandNumber);

    if ((_commandNumber as any).response) {
      // console.log(`Command number changed. Prev: ${_commandNumber.response[0].changeScriptCommand.sequenceNumber }. Current: ${commandNumber}`);
      // commandNumber = _commandNumber.response[0].changeScriptCommand.sequenceNumber ;
      console.log('Your application is out-of-day, please reload');
      console.log('res', _commandNumber);
    }
  }

  setInterval(checkForCommandNumber, 5000);

  stdin.on('data', callback);
}
