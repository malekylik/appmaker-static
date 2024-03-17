const path = require('path');
import { InteractiveMode, OfflineMode, RemoteMode, WithPassword } from './command-line';
import { checkForEmptyScriptsFiles, checkLinting, checkTypes } from './validate';
import { App, initAppMakerApp, updateScript } from './appmaker/app';
import { PageAPI, callAppMakerApp, runInApplicationPageContext } from './appmaker-network';
import { generateJSProjectForAppMaker, getModelsNames, getPathToViews, getScriptsNames, getViewsNames, readAppMakerModels, readAppMakerScripts, readAppMakerViews, readLinterConfig, readTSConfig, writeValidatedScriptsToAppMakerXML } from './io';
import { readAppMakerViews as readAppMakerViewsF } from './functional/io/appmaker-io';
import { printEmptyScripts, printLintingReport, printTSCheckDiagnostics } from './report';
import { AppValidator } from './appmaker/app-validatior';
import { stdin } from 'node:process';

import { stat as oldStat, rm as oldRm, readFile as oldReadFile, writeFile as oldWriteFile, watch } from 'node:fs';
import { promisify } from 'node:util';
import { pipe } from 'fp-ts/lib/function';

import * as O from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';
import {
  RequestResponse, isRequestError, isRequestResponse,
  isRequestChangeScriptCommand, isRequestAddComponentInfoCommand, tryToGetCommand, RequestError, tryToGetCommandName, CommnadLikeResponse, ChangeScriptCommand, ScriptModifiaction
} from './appmaker-network-actions';
import { parseFilePath } from './functional/io/filesystem-io';
import { logger } from './logger';
import { colorImportantMessage, colorPath, colorValue, getReplUserInputLine } from './repl-logger';
import { ReplJob, replScheduler } from './repl-scheduler';

const rm = promisify(oldRm);
const readFile = promisify(oldReadFile);
const exec = promisify(require('node:child_process').exec);
const stat = promisify(oldStat);
const writeFile = promisify(oldWriteFile);

function getCommandNumberResponse(response: RequestResponse): string {
  return response
    .response
    .map((response) => {
      if (isRequestChangeScriptCommand(response)) {
        return response.changeScriptCommand.sequenceNumber;
      }

      if (isRequestAddComponentInfoCommand(response)) {
        return response.addComponentInfoCommand.sequenceNumber;
      }

      logger.log('Unknown response');
      logger.log('Try to get sequence number from response');

      const command = tryToGetCommand(response);

      if (O.isNone(command)) {
        logger.log('Cannot get sequence number from command');
        logger.log('Reload appmaker-static');

        return '-1';
      }

      logger.log('Sequence number successfully obtained');
      return command.value.sequenceNumber;
    })
    .sort((a, b) => Number(b) - Number(a))
    [0] || '-1'; // TODO: check why it fails when make changes in AppMaker (not related to script) and then export it
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

export async function handleRemoteApplicationMode(options: WithPassword<RemoteMode>): Promise<void> {
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
  stopWatch(): void;

  getState(): InteractiveModeState;
  setState(state: InteractiveModeState): void;

  writeUserPrompt(): void;

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
    logger.log('exporting...');

    api.stopWatch();

    logger.silent(true);

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

    logger.silent(false);

    api.setCommandNumber(pipe(
      commangFromServer,
      O.chain(v => isRequestResponse(v) ? O.some(getCommandNumberResponse(v)) : api.getCommandNumber())
    ));

    api.watch();
    api.setState('ready');

    initConsoleForInteractiveMode(api.getXsrfToken(), api.getCommandNumber(), api.getOptions().outDir, api.getState());
  } else if (command === InteractiveModeCommands.screenshot) {

  } else if (command === InteractiveModeCommands.update) {
    logger.log('update');
  } else {
    logger.log('unknown command', command);
    api.writeUserPrompt();
  }
}

function applyModificationsToScript(source: string, modifications: Array<ScriptModifiaction>): string {
  let pointer = 0;

  // TODO: chech in the end modicfied str.length is the same as pointer
  return modifications.reduce((str, modification) => {
    if (modification.type === 'SKIP') {
      pointer += modification.length;

      return str;
    }

    if (modification.type === 'INSERT') {
      const newStr = str.slice(0, pointer) + modification.text + str.slice(pointer);

      pointer += modification.length;

      return newStr;
    }

    if (modification.type === 'DELETE') {
      // TODO; check the deleted potion of the string is the same as modification.text
      const newStr = str.slice(0, pointer) + str.slice(pointer + modification.length);

      return newStr;
    }

    return str;
  }, source);
}

async function tryToSyncScript(api: HandleUserInputAPI, commands: Array<ChangeScriptCommand>) {
  const app = api.getApp();

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i]!;

    const script = app.scripts.find(script => script.key === command.changeScriptCommand.key.localKey);

    if (script) {
      const changedStr = applyModificationsToScript(script.code || '', command.changeScriptCommand.scriptChange.modifications);
      updateScript(script, changedStr);

      const pathToProject = api.getOptions().outDir;
      const pathToFileTSFile = `${pathToProject}/${script.name}.js`;

      logger.log('writting to ', script.name);

      await writeFile(pathToFileTSFile, script.code || '');
    } else {
      logger.log('fail to sync script with kye ', command.changeScriptCommand.key.localKey);
    }
  }
}

function getFuncToSyncWorkspace(api: HandleUserInputAPI) {
  let commangFromServerPr: Promise<O.Option<RequestResponse | RequestError>> | null = null;

  return async function checkForCommandNumber() {
    try {
      if (commangFromServerPr !== null) {
        return;
      }

      // TODO: drop this request when close method called
      commangFromServerPr = pipe(
        api.getXsrfToken(),
        O.match(() => Promise.resolve(O.none), t => pipe(
          api.getCommandNumber(),
          O.match(() => Promise.resolve(O.none), c => api.getPageAPI().getCommandNumberFromServer(t, api.getOptions().appId, c))
        ))
      );

      const _commandNumber = await commangFromServerPr;

      commangFromServerPr = null;

      if (O.isSome(_commandNumber) && isRequestResponse(_commandNumber.value)) {
        const res = pipe(
          _commandNumber.value,
          response => response.response.map(commandResponse => {
            const commandName = tryToGetCommandName(commandResponse)
            const command = tryToGetCommand(commandResponse);

            return ([
              O.isSome(commandName) ? commandName.value : '',
              O.isSome(command) ? command.value.sequenceNumber : null
            ]);
          }),
          commands => commands.filter((command): command is [string, string] => command[1] !== null),
          commnads => commnads.sort((c1, c2) => Number(c1[1]) - Number(c2[1]))
        );
        const supportedCommands = pipe(
          _commandNumber.value,
          commands => commands.response.filter(isRequestChangeScriptCommand)
        );

        if (_commandNumber.value.response.length > supportedCommands.length) {
          logger.log('Your application is out-of-day - it was updated outside appmaker-static, please reload');
          logger.log('res', JSON.stringify(res).slice(0, 300) + (JSON.stringify(res).length > 300 ? '...' : ''));

          api.setState('warn');
          api.writeUserPrompt();
        } else if (supportedCommands.length > 0) {
          logger.log('Your application was updated outside appmaker-static, trying to sync with local files');
          api.stopWatch();
          await tryToSyncScript(api, supportedCommands);
          api.watch();

          api.setCommandNumber(O.some(supportedCommands[supportedCommands.length - 1]!.changeScriptCommand.sequenceNumber));

          api.setState('ready');
          api.writeUserPrompt();
        }
      } else if (O.isSome(_commandNumber) && isRequestError(_commandNumber.value)) {
        logger.log('Error retriving sequence number from the server');
      } else if (O.isSome(_commandNumber) && Object.keys(_commandNumber.value).length === 0) {
        // empty response
      } else {
        logger.log('Unknown repsonse during retriving sequence');
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
      }, 300);

      const file = api.getGeneratedFiles().find(f => parseFilePath(f).fullName === filename);
      const filenameObj = parseFilePath(filename);

      if (file) {
        readFile(file, { encoding: 'utf-8' })
          .then((newContent) => {
            const script = api.getApp().scripts.find(script => script.name === filename.replace('.js', ''));
            
            if (script) {
              const job: ReplJob = {
                scriptName: filenameObj.name,
                run: () => {
                  logger.log(`Updating file: ${colorPath(filenameObj.name)}`);

                  if (newContent === '') {
                    logger.log(`Set: NewContent for ${filenameObj.name} is empty, probably it's not what was intended`)
                  }

                  return pipe(
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
                    ).then((r) => {
                      if (newContent === '') {
                        logger.log(`Update: NewContent for ${filenameObj.name} is empty, probably it's not what was intended`)
                      }

                      updateScript(script, newContent);

                      api.setCommandNumber(pipe(
                        r,
                        O.chain(v => isRequestResponse(v) ? O.some(getCommandNumberResponse(v)) : api.getCommandNumber())
                      ));

                      return r;
                    })
                    ;
                  }
              };

              if (replScheduler.getJobsCount() === 0) {
                api.setState('loading');
                api.writeUserPrompt();
              }

              const p = replScheduler.schedule(job);

              return p;
            } else {
              logger.log(`script with name ${colorPath(filenameObj.name)} wasn't registered`);
            }

            return Promise.resolve(O.none);
          })
          .then(done => {
            if (O.isSome(done) && isRequestResponse(done.value)) {
              logger.log('Script updated: ' + colorPath(filenameObj.name));

              if (replScheduler.getJobsCount() === 0) {
                api.setState('ready');
                api.writeUserPrompt();
              }
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

function initConsoleForInteractiveMode(xsrfToken: O.Option<string>, commandNumber: O.Option<string>, outDir: string, state: InteractiveModeState) {
  logger.log(colorImportantMessage('Interactive Mode'));

  pipe(
    xsrfToken,
    O.chain(v => O.some(logger.log('run xsrfToken ' + colorValue(v))))
  );
  pipe(
    commandNumber,
    O.chain(v => O.some(logger.log('run commandNumber ' + colorValue(v))))
  );

  logger.log(`Watching for file changes on ${colorPath(outDir)}`);

  logger.putLine(getReplUserInputLine({ state }));
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

export type InteractiveModeState = 'ready' | 'loading' | 'warn';

// TODO: improve
//  1. user interaction (when the user types command and hit enter - unnecessary new line); autocomlition for commands. Check (TTY and raw mode)
//  2. close all calls when user enter "close" command
//  3. create queue for polling command number and updating script - they may overlap
//  4. add supporting different command, not only "changeScriptCommand", for example, command for updating view should regenerate view, command for updating model should regenerate types for models
//  5. add recalculating of the import of a script file
//  6. add command to interact with AppMaker: delete file, deploy to instance, etc.
//  7. add handling of error for updating scripts
//  8. allow to open chrome in headless mode
export async function handleInteractiveApplicationMode(options: WithPassword<InteractiveMode>): Promise<void> {
  function run(pageAPI: PageAPI) {
    return new Promise(async (resolve, reject) => {
      let state: InteractiveModeState = 'ready';
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

        getState() {
          return state;
        },
        setState(_state) {
          state = _state;
        },

        writeUserPrompt() {
          logger.putLine(getReplUserInputLine({ state }));
        },

        watch() {
          watcherSubscription.unsubscribe();
          watcherSubscription = watchProjectFiles(options.outDir, userAPI);
        },

        stopWatch() {
          watcherSubscription.unsubscribe();
          watcherSubscription = { unsubscribe: () => {} };
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

      console.clear();
      initConsoleForInteractiveMode(xsrfToken, commandNumber, options.outDir, state);
    });
  }

  runInApplicationPageContext(options.appId, options.credentials, options.browserOptions, run);
}

export async function handleInteractiveApplicationModeTest(options: WithPassword<InteractiveMode>): Promise<void> {
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

        if (O.isSome(r) && isRequestResponse(r.value) && isRequestChangeScriptCommand(r.value)) {
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
