const path = require('path');
import * as puppeteer from 'puppeteer';
import { InteractiveMode, OfflineMode, RemoteMode } from './command-line';
import { checkForEmptyScriptsFiles, checkLinting, checkTypes } from './validate';
import { App, initAppMakerApp } from './appmaker/app';
import { PageAPI, callAppMakerApp, runInApplicationPageContext } from './appmaker-network';
import { generateJSProjectForAppMaker, getModelsNames, getPathToViews, getScriptsNames, getViewsNames, readAppMakerModels, readAppMakerScripts, readAppMakerViews, readLinterConfig, readTSConfig, writeValidatedScriptsToAppMakerXML } from './io';
import { readAppMakerViews as readAppMakerViewsF } from './functional/io/appmaker-io';
import { printEmptyScripts, printLintingReport, printTSCheckDiagnostics } from './report';
import { AppValidator } from './appmaker/app-validatior';
import { stdin } from 'node:process';

import { stat as oldStat, rm as oldRm, readFile as oldReadFile, watch } from 'node:fs';
import { promisify } from 'node:util';
import { pipe } from 'fp-ts/lib/function';

import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';

const rm = promisify(oldRm);
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

async function createAppMakerApplication(pathToUnzipProjectFolder: string): Promise<App> {
  const [scriptsNames, modelsNames, viewsNames] = await Promise.all([
    getScriptsNames(pathToUnzipProjectFolder),
    getModelsNames(pathToUnzipProjectFolder),
    getViewsNames(pathToUnzipProjectFolder),
  ]);

  const [scriptsFiles, modelsFiles, viewsFiles, newViewFiles] = await Promise.all([
    readAppMakerScripts(pathToUnzipProjectFolder, scriptsNames),
    readAppMakerModels(pathToUnzipProjectFolder, modelsNames),
    readAppMakerViews(pathToUnzipProjectFolder, viewsNames),

    readAppMakerViewsF(getPathToViews(pathToUnzipProjectFolder))(),
  ]);

  const app = new App();

  pipe(
    newViewFiles,
    E.match(
      e => initAppMakerApp(app, modelsFiles, viewsFiles, scriptsFiles, []),
      views => initAppMakerApp(app, modelsFiles, viewsFiles, scriptsFiles, views),
    )
  )

  return app;
}

async function createApplicationValidator() {
  const [linterConfig, tsConfig] = await Promise.all([
    readLinterConfig(),
    readTSConfig(),
  ]);

  const validation = new AppValidator();

  validation.setLintConfig(linterConfig);
  validation.setTSConfig(tsConfig);

  return validation;
}

async function createAppAndGenerateProject(passedPath: string, outDir: string): Promise<{ app: App; generatedFiles: string[] }> {
  const appValidator = await createApplicationValidator();
  const app = await createAppMakerApplication(passedPath);

  app.setAppValidator(appValidator);

  const pathToGenerateJSProjectDir = outDir;

  const generatedFiles = await generateJSProjectForAppMaker(pathToGenerateJSProjectDir, app);

  return { app, generatedFiles };
}

async function validateUnzipProject(passedPath: string, outDir: string): Promise<{ code: number }> {
  const { app, generatedFiles } = await createAppAndGenerateProject(passedPath, outDir);

  const tsConfig = app.getAppValidator().getTSConfig();

  if (generatedFiles.length > 0 && tsConfig) {
    const allDiagnostics = checkTypes(generatedFiles, tsConfig);

    printTSCheckDiagnostics(allDiagnostics);

    // if (allDiagnostics.length) {
    //   console.log('TS check doesnt pass. Skip the rest');

    //   return { code: 1 };
    // }
  } else {
    console.log('No file to check for types. TS check skip')
  }

  const linterConfig = app.getAppValidator().getLintConfig();

  if (linterConfig) {
    const lintingReport = checkLinting(app, linterConfig);
    printLintingReport(lintingReport);

    await writeValidatedScriptsToAppMakerXML(app, lintingReport, passedPath);
  }

  const emptyScripts = checkForEmptyScriptsFiles(app);
  printEmptyScripts(emptyScripts);

  return { code: 1 };
}

async function unzipProject(passedPath: string): Promise<string> {
  let pathToProject = passedPath;

  pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
  console.log('unzip to', pathToProject);
  try {
    await exec(`unzip -d "${pathToProject}" "${passedPath}"`);
    return pathToProject;
  } catch (e) {
    console.log(`Fail to unzip file ${passedPath} to ${pathToProject}`);
    console.log(e);
    process.exit(1);
  }
}

async function validateZipProject(passedPath: string, outDir: string): Promise<{ code: number; path: string; }> {
  const pathToProject = await unzipProject(passedPath);

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
  const passedPathToExportedZip = await callAppMakerApp(options.appId, options.credentials, options.browserOptions);

  const result = await validateZipProject(passedPathToExportedZip, options.outDir);

  await postRemoteZipActionsHandler(passedPathToExportedZip, result.path, options.outDir);

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

  const passedPathToExportedZip = await callAppMakerApp(options.appId, options.credentials, options.browserOptions);
  const pathToProject = await unzipProject(passedPathToExportedZip);
  const { app, generatedFiles } = await createAppAndGenerateProject(pathToProject, options.outDir);

  await postRemoteZipActionsHandler(passedPathToExportedZip, pathToProject, options.outDir);

  function run(pageAPI: PageAPI) {
    return new Promise(async (resolve, reject) => {
      let xsrfToken = await pageAPI.getXSRFToken();
      let commandNumber = await pageAPI.getCommandNumberFromApp();

      pipe(
        xsrfToken,
        O.chain(v => O.some(console.log('run xsrfToken ' + v)))
      );
      pipe(
        commandNumber,
        O.chain(v => O.some(console.log('run commandNumber ' + v)))
      );

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

          const file = generatedFiles.find(f => f.split('/')[f.split('/').length - 1] === filename);

          if (file) {
            readFile(file, { encoding: 'utf-8' })
              .then((newContent) => {
                const script = app.scripts.find(script => script.name === filename.replace('.js', ''));
                
                if (script) {
                  const p = pipe(
                    xsrfToken,
                    O.match(() => Promise.resolve(O.none), t => pipe(
                      commandNumber,
                      O.match(() => Promise.resolve(O.none), c => pageAPI.changeScriptFile(
                        t,
                        options.appId,
                        options.credentials.login,
                        script.key,
                        c,
                        script.code || '',
                        newContent
                      ))
                    ))
                  );

                  p.then(() => {
                    script.code = newContent;
                  });

                  return p;
                } else {
                  console.log(`script with name ${filename} wasn't registered`);
                }

                return Promise.resolve(O.none);
              })
              .then(done => {
                console.log('Updated script: ' + file);
                console.log('Res ', done);
              })
              .catch(e => {
                console.log('updating content ended with a error ' + e);
              })
          } else {
            console.log('Couldt find file with name', filename);
          }
        }
      });

      async function callback(data: Buffer) {
      let command = data.toString();
      command = command.slice(0, command.length - 1)

      if (command === InteractiveModeCommands.close) {
        stdin.removeListener('data', callback);

        await pageAPI.close();
        console.log('browser closed');
        stdin.end();
        process.exit(0);
      } else if (command === InteractiveModeCommands.printWorkingDirectory) {
        console.log(options.outDir);
      } else if (command === InteractiveModeCommands.printCommandNumber) {
        console.log(commandNumber);
      } else if (command === InteractiveModeCommands.listFiles) {
        // try {
        //   const files: Array<string> = await readdir(options.outDir);
        //   const filesAsString = files.reduce((str, file) => str + `\n${file}`, '');
        //   console.log(filesAsString);
        // } catch (e) {
        //   console.log('ls failed with error: ', e);
        // }
      } else if (command === InteractiveModeCommands.export) {
        // try {
        //   const passedPath = await app(page!, options.outDir);

        //   let pathToProject = passedPath;

        //   pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;

        //   await exec(`unzip -d "${pathToProject}" "${passedPath}"`);

        //   const [scriptsNames, modelsNames, viewsNames] = await Promise.all([
        //     getScriptsNames(pathToProject),
        //     getModelsNames(pathToProject),
        //     getViewsNames(pathToProject),
        //   ]);
        
        //   const [scriptsFiles, modelsFiles, viewsFiles] = await Promise.all([
        //     readAppMakerScripts(pathToProject, scriptsNames),
        //     readAppMakerModels(pathToProject, modelsNames),
        //     readAppMakerViews(pathToProject, viewsNames),
        //   ]);
        
        
        //   initAppMakerApp(_app, modelsFiles, viewsFiles, scriptsFiles, []);
        
        //   const pathToGenerateJSProjectDir = options.outDir;
        
        //   generatedFiles = await generateJSProjectForAppMaker(pathToGenerateJSProjectDir, _app);
        // } catch (e) {
        //   console.log('Export failed with error: ', e);
        // }
      } else if (command === InteractiveModeCommands.screenshot) {
        // try {
        //   await takeScreenshoot(page!);
        //   console.log('screenshot done');
        // } catch (e) {
        //   console.log(`${InteractiveModeCommands.screenshot} failed with error: `, e);
        // }
      } else if (command === InteractiveModeCommands.update) {
        console.log('update');
      } else {
        console.log('unknown command', command);
      }
    }

    stdin.on('data', callback);

    let pr: Promise<unknown> | null = null;

    async function checkForCommandNumber() {
      if (pr !== null) {
        return;
      }

      pr = pipe(
        xsrfToken,
        O.match(() => Promise.resolve(O.none), t => pipe(
          commandNumber,
          O.match(() => Promise.resolve(O.none), c => pageAPI.getCommandNumberFromServer(t, options.appId, c))
        ))
      );

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
      });
    }

    runInApplicationPageContext(options.appId, options.credentials, options.browserOptions, run);
}

export async function handleInteractiveApplicationModeTest(options: InteractiveMode): Promise<void> {
  console.log('interactive');

  function run(pageAPI: PageAPI) {
    return new Promise(async (resolve, reject) => {
      let xsrfToken = await pageAPI.getXSRFToken();
      let commandNumber = await pageAPI.getCommandNumberFromApp();

      pipe(
        xsrfToken,
        O.chain(v => O.some(console.log('run xsrfToken ' + v)))
      );
      pipe(
        commandNumber,
        O.chain(v => O.some(console.log('run commandNumber ' + v)))
      );

      const key = 'rDkAi7g84bbMjZopfFKpim3S3MZ60MkF';
      const code = '';
      const newContent = '123';

      try {
        const r = await pipe(
          xsrfToken,
          O.match(() => Promise.resolve(O.none), t => pipe(
            commandNumber,
            O.match(() => Promise.resolve(O.none), c => pageAPI.changeScriptFile(
              t,
              options.appId,
              options.credentials.login,
              key,
              c,
              code,
              newContent
            ))
          ))
        );

        // { response: [ { changeScriptCommand: [Object] } ] }

        console.log('sending done', O.isSome(r) ? r.value : O.none);
      } catch (e) {
        console.log(e);
      }

      resolve(null);
    });
  }

  runInApplicationPageContext(options.appId, options.credentials, options.browserOptions, run);
}
