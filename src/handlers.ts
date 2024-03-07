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
import { RequestResponse, isRequestError, isRequestResponse } from './appmaker-network-actions';

const rm = promisify(oldRm);
const readFile = promisify(oldReadFile);
const exec = promisify(require('node:child_process').exec);
const stat = promisify(oldStat);


function getCommandNumberResponse(response: RequestResponse): string {
  return response
    .response
    .slice()
    .sort((a, b) => Number(b.changeScriptCommand.sequenceNumber) - Number(a.changeScriptCommand.sequenceNumber))
    [0]?.changeScriptCommand.sequenceNumber || '-1';
}

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

type HandleUserInputAPI = {
  getOptions(): InteractiveMode;

  getPageAPI(): PageAPI;

  getGeneratedFiles(): string[];

  getApp(): App;

  getCommandNumber(): O.Option<string>;
  setCommandNumber(commandNumber: O.Option<string>): void;

  getXsrfToken(): O.Option<string>;

  close(): Promise<void>;
};

async function handleUserInput(api: HandleUserInputAPI, data: Buffer) {
  let command = data.toString();
  command = command.slice(0, command.length - 1)

  if (command === InteractiveModeCommands.close) {
    await api.close()
  } else if (command === InteractiveModeCommands.printWorkingDirectory) {
    console.log(api.getOptions().outDir);
  } else if (command === InteractiveModeCommands.printCommandNumber) {
    console.log(api.getCommandNumber());
  } else if (command === InteractiveModeCommands.listFiles) {

  } else if (command === InteractiveModeCommands.export) {

  } else if (command === InteractiveModeCommands.screenshot) {

  } else if (command === InteractiveModeCommands.update) {
    console.log('update');
  } else {
    console.log('unknown command', command);
  }
}

function getFuncToSyncWorkspace(api: HandleUserInputAPI) {
  let commangFromServerPr: Promise<unknown> | null = null;

  return async function checkForCommandNumber() {
    try {
      if (commangFromServerPr !== null) {
        return;
      }
  
      commangFromServerPr = pipe(
        api.getXsrfToken(),
        O.match(() => Promise.resolve(O.none), t => pipe(
          api.getCommandNumber(),
          O.match(() => Promise.resolve(O.none), c => api.getPageAPI().getCommandNumberFromServer(t, api.getOptions().appId, c))
        ))
      );

      const _commandNumber = await commangFromServerPr;

      commangFromServerPr = null;

      if (_commandNumber !== null && typeof _commandNumber === 'object' && 'response' in (_commandNumber) && (_commandNumber as any).response) {
        console.log('Your application is out-of-day, please reload');
        console.log('res', _commandNumber);
        }
    } catch (e) {
      console.log('getFuncToSyncWorkspace error:', e);
    }
  }
}

function watchProjectFiles(folder: string, api: HandleUserInputAPI) {
  let fsWait: any = false;

  const ac = new AbortController();
  const { signal } = ac;

  watch(folder, { signal }, (event, filename) => {
    if (filename) {
      if (fsWait) return;
      fsWait = setTimeout(() => {
        fsWait = false;
      }, 1000);
      console.log(`${filename} file Changed`);

      const file = api.getGeneratedFiles().find(f => f.split('/')[f.split('/').length - 1] === filename);

      if (file) {
        readFile(file, { encoding: 'utf-8' })
          .then((newContent) => {
            const script = api.getApp().scripts.find(script => script.name === filename.replace('.js', ''));
            
            if (script) {
              const p = pipe(
                api.getXsrfToken(),
                O.match(() => Promise.resolve(O.none), t => pipe(
                  api.getCommandNumber(),
                  O.match(() => Promise.resolve(O.none), c => api.getPageAPI().changeScriptFile(
                    t,
                    api.getOptions().appId,
                    api.getOptions().credentials.login,
                    script.key,
                    c,
                    script.code || '',
                    newContent
                  ))
                ))
              );

              p.then((r) => {
                script.code = newContent;

                api.setCommandNumber(pipe(
                  r,
                  O.chain(v => isRequestResponse(v) ? O.some(getCommandNumberResponse(v)) : api.getCommandNumber())
                ));
              });

              console.log('---updating script---');

              return p;
            } else {
              console.log(`script with name ${filename} wasn't registered`);
            }

            return Promise.resolve(O.none);
          })
          .then(done => {
            if (O.isSome(done) && isRequestResponse(done.value)) {
              console.log('Script updated: ' + file);
            } else if (O.isSome(done) && isRequestError(done.value)) {
              console.log('Updating script error: ' + JSON.stringify(done.value));
            } else {
              console.log('Updating script: unknown response', done);
            }
          })
          .catch(e => {
            console.log('Updating script error: ' + e);
          })
      } else {
        console.log('Couldt find file with name', filename);
      }
    }
  });

  return { unsubscribe: () => { ac.abort(); } };
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
      let syncInterval = -1;
      let watcherSubscription: { unsubscribe: () => void } = { unsubscribe: () => {} };

      let xsrfToken = await pageAPI.getXSRFToken();
      let commandNumber = await pageAPI.getCommandNumberFromApp();

      console.clear();
      console.log('---started---');

      pipe(
        xsrfToken,
        O.chain(v => O.some(console.log('run xsrfToken ' + v)))
      );
      pipe(
        commandNumber,
        O.chain(v => O.some(console.log('run commandNumber ' + v)))
      );

      const buttonPressesLogFile = options.outDir;

      const userAPI: HandleUserInputAPI = {
        getOptions() {
          return options;
        },

        getPageAPI() {
          return pageAPI;
        },

        getGeneratedFiles() {
          return generatedFiles;
        },

        getApp() {
          return app;
        },

        getCommandNumber() {
          return commandNumber;
        },

        setCommandNumber(_commandNumber) {
          commandNumber = _commandNumber;
        },

        getXsrfToken() {
          return xsrfToken;
        },

        async close() {
          stdin.removeListener('data', handler);
          clearInterval(syncInterval);
          watcherSubscription.unsubscribe();

          await pageAPI.close();
          stdin.end();

          console.log('browser closed');

          process.exit(0);
        },
      };

      console.log(`Watching for file changes on ${buttonPressesLogFile}`);
      watcherSubscription = watchProjectFiles(options.outDir, userAPI);

      process.stdout.write('repl: ');

      function handler(data: Buffer) {
        return handleUserInput(userAPI, data)
      };

      stdin.on('data', handler);

      syncInterval = setInterval(getFuncToSyncWorkspace(userAPI), 5000) as unknown as number;
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

        if (O.isSome(r) && isRequestResponse(r.value)) {
          console.log('sucesfull done');

          commandNumber = O.some(getCommandNumberResponse(r.value));
        }

        const code1 = newContent;
        const newContent1 = '31';

        const p = await pipe(
          xsrfToken,
          O.match(() => Promise.resolve(O.none), t => pipe(
            commandNumber,
            O.match(() => Promise.resolve(O.none), c => pageAPI.changeScriptFile(
              t,
              options.appId,
              options.credentials.login,
              key,
              c,
              code1,
              newContent1
            ))
          ))
        );

        // { response: [ { changeScriptCommand: [Object] } ] }
        console.log('sending done', O.isSome(p) ? JSON.stringify(p.value) : O.none);
      } catch (e) {
        console.log(e);
      }

      resolve(null);
    });
  }

  runInApplicationPageContext(options.appId, options.credentials, options.browserOptions, run);
}
