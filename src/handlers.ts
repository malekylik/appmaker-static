const path = require('path');
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
import { parseFilePath } from './functional/io/filesystem-io';
import { logger } from './logger';
import { getReplUserInputLine } from './repl-logger';

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
  logger.log('post actions');

  process.chdir(pathToProject);
  logger.log('zip to', `${outDir}/app.zip`);
  await exec(`zip -r "${outDir}/app.zip" *`);

  logger.log('remove', pathToProject);
  await rm(pathToProject, { recursive: true });
}

export async function postRemoteZipActionsHandler(pathToZip: string, pathToProject: string, outDir: string) {
  logger.log('post actions');

  process.chdir(pathToProject);
  logger.log('zip to', `${outDir}/app.zip`);
  await exec(`zip -r "${outDir}/app.zip" *`);

  logger.log('remove', pathToZip);
  await rm(pathToZip);

  logger.log('remove', pathToProject);
  await rm(pathToProject, { recursive: true });

  process.chdir(process.env.PWD || '');
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
    //   logger.log('TS check doesnt pass. Skip the rest');

    //   return { code: 1 };
    // }
  } else {
    logger.log('No file to check for types. TS check skip')
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
  logger.log('unzip to', pathToProject);
  try {
    await exec(`unzip -d "${pathToProject}" "${passedPath}"`);
    return pathToProject;
  } catch (e) {
    logger.log(`Fail to unzip file ${passedPath} to ${pathToProject}`);
    logger.log(e);
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
    logger.log(`Couldn't find path: ${options.project}`);
    process.exit(1);
  }

  const isZip = path.extname(options.project) === '.zip';

  if (!pathStat.isDirectory() && !isZip) {
    logger.log(`Passed pass isn't a zip nor folder. Unsupported extension of project file. Passed path ${options.project}`);
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

type HandleUserInputAPI = {
  getOptions(): InteractiveMode;

  getPageAPI(): PageAPI;

  getGeneratedFiles(): string[];
  setGeneratedFiles(generatedFiles: string[]): void;

  getApp(): App;
  setApp(app: App): void;

  getCommandNumber(): O.Option<string>;
  setCommandNumber(commandNumber: O.Option<string>): void;

  getXsrfToken(): O.Option<string>;

  watch(): void;

  close(): Promise<void>;
};

async function handleExportProject(pageAPI: PageAPI, appId: string, outDir: string): Promise<{ app: App; generatedFiles: string[] }> {
  const passedPathToExportedZip = pipe(await pageAPI.exportApplication(appId), O.match(() => '', v => v));
  const pathToProject = await unzipProject(passedPathToExportedZip);
  const res = await createAppAndGenerateProject(pathToProject, outDir);

  await postRemoteZipActionsHandler(passedPathToExportedZip, pathToProject, outDir);

  return res;
}

async function handleUserInput(api: HandleUserInputAPI, data: Buffer) {
  let command = data.toString();
  command = command.slice(0, command.length - 1)

  if (command === InteractiveModeCommands.close) {
    await api.close()
  } else if (command === InteractiveModeCommands.printWorkingDirectory) {
    logger.log(api.getOptions().outDir);
  } else if (command === InteractiveModeCommands.printCommandNumber) {
    logger.log(api.getCommandNumber());
  } else if (command === InteractiveModeCommands.listFiles) {

  } else if (command === InteractiveModeCommands.export) {
    const { app, generatedFiles } = await handleExportProject(api.getPageAPI(), api.getOptions().appId, api.getOptions().outDir);

    api.setGeneratedFiles(generatedFiles);
    api.setApp(app);

    const commangFromServer = await pipe(
      api.getXsrfToken(),
      O.match(() => Promise.resolve(O.none), t => pipe(
        api.getCommandNumber(),
        O.match(() => Promise.resolve(O.none), c => api.getPageAPI().getCommandNumberFromServer(t, api.getOptions().appId, c))
      ))
    );


    api.setCommandNumber(pipe(
      commangFromServer,
      O.chain(v => isRequestResponse(v) ? O.some(getCommandNumberResponse(v)) : api.getCommandNumber())
    ));

    api.watch();

    initConsoleForInteractiveMode(api.getXsrfToken(), api.getCommandNumber(), api.getOptions().outDir);
  } else if (command === InteractiveModeCommands.screenshot) {

  } else if (command === InteractiveModeCommands.update) {
    logger.log('update');
  } else {
    logger.log('unknown command', command);
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
        logger.log('Your application is out-of-day, please reload');
        logger.log('res', _commandNumber);
        }
    } catch (e) {
      logger.log('getFuncToSyncWorkspace error:', e);
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
      logger.log(`${filename} file Changed`);

      const file = api.getGeneratedFiles().find(f => parseFilePath(f).fullName === filename);

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

              logger.log('---updating script---');
              logger.putLine(getReplUserInputLine({ state: 'loading' }));

              return p;
            } else {
              logger.log(`script with name ${filename} wasn't registered`);
            }

            return Promise.resolve(O.none);
          })
          .then(done => {
            if (O.isSome(done) && isRequestResponse(done.value)) {
              logger.log('Script updated: ' + filename);
              logger.putLine(getReplUserInputLine({ state: 'ready' }));
            } else if (O.isSome(done) && isRequestError(done.value)) {
              logger.log('Updating script error: ' + JSON.stringify(done.value));
            } else {
              logger.log('Updating script: unknown response', done);
            }
          })
          .catch(e => {
            logger.log('Updating script error: ' + e);
          })
      } else {
        logger.log('Couldt find file with name', filename);
      }
    }
  });

  return { unsubscribe: () => { ac.abort(); } };
}

function initConsoleForInteractiveMode(xsrfToken: O.Option<string>, commandNumber: O.Option<string>, outDir: string) {
  console.clear();
  logger.log('Interactive Mode');

  pipe(
    xsrfToken,
    O.chain(v => O.some(logger.log('run xsrfToken ' + v)))
  );
  pipe(
    commandNumber,
    O.chain(v => O.some(logger.log('run commandNumber ' + v)))
  );

  logger.log(`Watching for file changes on ${outDir}`);

  logger.putLine(getReplUserInputLine({ state: 'ready' }));
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
  function run(pageAPI: PageAPI) {
    return new Promise(async (resolve, reject) => {
      let { app, generatedFiles } = await handleExportProject(pageAPI, options.appId, options.outDir); 

      let syncInterval = -1;
      let watcherSubscription: { unsubscribe: () => void } = { unsubscribe: () => {} };

      let xsrfToken = await pageAPI.getXSRFToken();
      let commandNumber = await pageAPI.getCommandNumberFromApp();

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
        setGeneratedFiles(_generatedFiles) {
          generatedFiles = _generatedFiles;
        },

        getApp() {
          return app;
        },
        setApp(_app) {
          app = _app;
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

        watch() {
          watcherSubscription.unsubscribe();
          watcherSubscription = watchProjectFiles(options.outDir, userAPI);
        },

        async close() {
          stdin.removeListener('data', handler);
          clearInterval(syncInterval);
          watcherSubscription.unsubscribe();

          await pageAPI.close();
          stdin.end();

          logger.log('browser closed');

          process.exit(0);
        },
      };

      watcherSubscription = watchProjectFiles(options.outDir, userAPI);

      function handler(data: Buffer) {
        return handleUserInput(userAPI, data)
      };

      stdin.on('data', handler);

      syncInterval = setInterval(getFuncToSyncWorkspace(userAPI), 5000) as unknown as number;

      initConsoleForInteractiveMode(xsrfToken, commandNumber, options.outDir);
    });
  }

  runInApplicationPageContext(options.appId, options.credentials, options.browserOptions, run);
}

export async function handleInteractiveApplicationModeTest(options: InteractiveMode): Promise<void> {
  logger.log('interactive');

  function run(pageAPI: PageAPI) {
    return new Promise(async (resolve, reject) => {
      let xsrfToken = await pageAPI.getXSRFToken();
      let commandNumber = await pageAPI.getCommandNumberFromApp();

      pipe(
        xsrfToken,
        O.chain(v => O.some(logger.log('run xsrfToken ' + v)))
      );
      pipe(
        commandNumber,
        O.chain(v => O.some(logger.log('run commandNumber ' + v)))
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
        logger.log('sending done', O.isSome(r) ? r.value : O.none);

        if (O.isSome(r) && isRequestResponse(r.value)) {
          logger.log('sucesfull done');

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
        logger.log('sending done', O.isSome(p) ? JSON.stringify(p.value) : O.none);
      } catch (e) {
        logger.log(e);
      }

      resolve(null);
    });
  }

  runInApplicationPageContext(options.appId, options.credentials, options.browserOptions, run);
}
