"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInteractiveApplicationModeTest = exports.handleInteractiveApplicationMode = exports.handleRemoteApplicationMode = exports.handleOfflineApplicationMode = exports.postRemoteZipActionsHandler = exports.postOfflineZipActionsHandler = void 0;
const path = require('path');
const validate_1 = require("./validate");
const app_1 = require("./appmaker/app");
const appmaker_network_1 = require("./appmaker-network");
const io_1 = require("./io");
const appmaker_io_1 = require("./functional/io/appmaker-io");
const report_1 = require("./report");
const app_validatior_1 = require("./appmaker/app-validatior");
const node_process_1 = require("node:process");
const node_fs_1 = require("node:fs");
const node_util_1 = require("node:util");
const function_1 = require("fp-ts/lib/function");
const O = require("fp-ts/lib/Option");
const E = require("fp-ts/lib/Either");
const appmaker_network_actions_1 = require("./appmaker-network-actions");
const filesystem_io_1 = require("./functional/io/filesystem-io");
const logger_1 = require("./logger");
const repl_logger_1 = require("./repl-logger");
const repl_scheduler_1 = require("./repl-scheduler");
const rm = (0, node_util_1.promisify)(node_fs_1.rm);
const readFile = (0, node_util_1.promisify)(node_fs_1.readFile);
const exec = (0, node_util_1.promisify)(require('node:child_process').exec);
const stat = (0, node_util_1.promisify)(node_fs_1.stat);
const writeFile = (0, node_util_1.promisify)(node_fs_1.writeFile);
function getCommandNumberResponse(response) {
    return response
        .response
        .map((response) => {
        if ((0, appmaker_network_actions_1.isRequestChangeScriptCommand)(response)) {
            return response.changeScriptCommand.sequenceNumber;
        }
        if ((0, appmaker_network_actions_1.isRequestAddComponentInfoCommand)(response)) {
            return response.addComponentInfoCommand.sequenceNumber;
        }
        logger_1.logger.log('Unknown response');
        logger_1.logger.log('Try to get sequence number from response');
        const command = (0, appmaker_network_actions_1.tryToGetCommand)(response);
        if (O.isNone(command)) {
            logger_1.logger.log('Cannot get sequence number from command');
            logger_1.logger.log('Reload appmaker-static');
            return '-1';
        }
        logger_1.logger.log('Sequence number successfully obtained');
        return command.value.sequenceNumber;
    })
        .sort((a, b) => Number(b) - Number(a))[0] || '-1'; // TODO: check why it fails when make changes in AppMaker (not related to script) and then export it
}
async function postOfflineZipActionsHandler(pathToProject, outDir) {
    logger_1.logger.log('post actions');
    process.chdir(pathToProject);
    logger_1.logger.log('zip to', `${outDir}/app.zip`);
    await exec(`zip -r "${outDir}/app.zip" *`);
    logger_1.logger.log('remove', pathToProject);
    await rm(pathToProject, { recursive: true });
}
exports.postOfflineZipActionsHandler = postOfflineZipActionsHandler;
async function postRemoteZipActionsHandler(pathToZip, pathToProject, outDir) {
    logger_1.logger.log('post actions');
    process.chdir(pathToProject);
    logger_1.logger.log('zip to', `${outDir}/app.zip`);
    await exec(`zip -r "${outDir}/app.zip" *`);
    logger_1.logger.log('remove', pathToZip);
    await rm(pathToZip);
    logger_1.logger.log('remove', pathToProject);
    await rm(pathToProject, { recursive: true });
    process.chdir(process.env.PWD || '');
}
exports.postRemoteZipActionsHandler = postRemoteZipActionsHandler;
async function createAppMakerApplication(pathToUnzipProjectFolder) {
    const [scriptsNames, modelsNames, viewsNames] = await Promise.all([
        (0, io_1.getScriptsNames)(pathToUnzipProjectFolder),
        (0, io_1.getModelsNames)(pathToUnzipProjectFolder),
        (0, io_1.getViewsNames)(pathToUnzipProjectFolder),
    ]);
    const [scriptsFiles, modelsFiles, viewsFiles, newViewFiles] = await Promise.all([
        // TODO: check
        (0, io_1.readAppMakerScripts)(pathToUnzipProjectFolder, scriptsNames),
        (0, io_1.readAppMakerModels)(pathToUnzipProjectFolder, modelsNames),
        (0, io_1.readAppMakerViews)(pathToUnzipProjectFolder, viewsNames),
        (0, appmaker_io_1.readAppMakerViews)((0, io_1.getPathToViews)(pathToUnzipProjectFolder))(),
    ]);
    const app = new app_1.App();
    (0, function_1.pipe)(newViewFiles, E.match(e => (0, app_1.initAppMakerApp)(app, modelsFiles, viewsFiles, scriptsFiles, []), views => (0, app_1.initAppMakerApp)(app, modelsFiles, viewsFiles, scriptsFiles, views)));
    return app;
}
async function createApplicationValidator() {
    const [linterConfig, tsConfig] = await Promise.all([
        (0, io_1.readLinterConfig)(),
        (0, io_1.readTSConfig)(),
    ]);
    const validation = new app_validatior_1.AppValidator();
    validation.setLintConfig(linterConfig);
    validation.setTSConfig(tsConfig);
    return validation;
}
async function createAppAndGenerateProject(passedPath, outDir) {
    const appValidator = await createApplicationValidator();
    const app = await createAppMakerApplication(passedPath);
    app.setAppValidator(appValidator);
    const pathToGenerateJSProjectDir = outDir;
    const generatedFiles = await (0, io_1.generateJSProjectForAppMaker)(pathToGenerateJSProjectDir, app);
    return { app, generatedFiles };
}
async function validateUnzipProject(passedPath, outDir) {
    const { app, generatedFiles } = await createAppAndGenerateProject(passedPath, outDir);
    const tsConfig = app.getAppValidator().getTSConfig();
    if (generatedFiles.length > 0 && tsConfig) {
        const allDiagnostics = (0, validate_1.checkTypes)(generatedFiles, tsConfig);
        (0, report_1.printTSCheckDiagnostics)(allDiagnostics);
        // if (allDiagnostics.length) {
        //   logger.log('TS check doesnt pass. Skip the rest');
        //   return { code: 1 };
        // }
    }
    else {
        logger_1.logger.log('No file to check for types. TS check skip');
    }
    const linterConfig = app.getAppValidator().getLintConfig();
    if (linterConfig) {
        const lintingReport = (0, validate_1.checkLinting)(app, linterConfig);
        (0, report_1.printLintingReport)(lintingReport);
        await (0, io_1.writeValidatedScriptsToAppMakerXML)(app, lintingReport, passedPath);
    }
    const emptyScripts = (0, validate_1.checkForEmptyScriptsFiles)(app);
    (0, report_1.printEmptyScripts)(emptyScripts);
    return { code: 1 };
}
async function unzipProject(passedPath) {
    let pathToProject = passedPath;
    pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
    logger_1.logger.log('unzip to', pathToProject);
    try {
        await exec(`unzip -d "${pathToProject}" "${passedPath}"`);
        return pathToProject;
    }
    catch (e) {
        console.log(`Fail to unzip file ${passedPath} to ${pathToProject}`);
        console.log(e);
        process.exit(1);
    }
}
async function validateZipProject(passedPath, outDir) {
    const pathToProject = await unzipProject(passedPath);
    const result = await validateUnzipProject(pathToProject, outDir);
    return ({
        ...result,
        path: pathToProject,
    });
}
async function handleOfflineApplicationMode(options) {
    let pathStat = null;
    try {
        pathStat = await stat(options.project);
    }
    catch {
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
    }
    else {
        result = await validateUnzipProject(options.project, options.outDir);
    }
    if (result.code !== 0) {
        process.exit(result.code);
    }
}
exports.handleOfflineApplicationMode = handleOfflineApplicationMode;
async function handleRemoteApplicationMode(options) {
    const passedPathToExportedZip = await (0, appmaker_network_1.callAppMakerApp)(options.appId, options.credentials, options.browserOptions, options.browserConfigOptions);
    const result = await validateZipProject(passedPathToExportedZip, options.outDir);
    await postRemoteZipActionsHandler(passedPathToExportedZip, result.path, options.outDir);
    if (result.code !== 0) {
        process.exit(result.code);
    }
}
exports.handleRemoteApplicationMode = handleRemoteApplicationMode;
async function handleExportProject(pageAPI, appId, outDir) {
    const passedPathToExportedZip = (0, function_1.pipe)(await pageAPI.exportApplication(appId), O.match(() => '', v => v));
    const pathToProject = await unzipProject(passedPathToExportedZip);
    const res = await createAppAndGenerateProject(pathToProject, outDir);
    await postRemoteZipActionsHandler(passedPathToExportedZip, pathToProject, outDir);
    return res;
}
async function handleUserInput(api, data) {
    let command = data.toString();
    command = command.slice(0, command.length - 1);
    if (command === InteractiveModeCommands.close) {
        await api.close();
    }
    else if (command === InteractiveModeCommands.printWorkingDirectory) {
        logger_1.logger.log(api.getOptions().outDir);
    }
    else if (command === InteractiveModeCommands.printCommandNumber) {
        logger_1.logger.log(api.getCommandNumber());
    }
    else if (command === InteractiveModeCommands.listFiles) {
    }
    else if (command === InteractiveModeCommands.export) {
        logger_1.logger.log('exporting...');
        api.stopWatch();
        logger_1.logger.silent(true);
        const { app, generatedFiles } = await handleExportProject(api.getPageAPI(), api.getOptions().appId, api.getOptions().outDir);
        api.setGeneratedFiles(generatedFiles);
        api.setApp(app);
        const commangFromServer = await (0, function_1.pipe)(api.getXsrfToken(), O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(api.getCommandNumber(), O.match(() => Promise.resolve(O.none), c => api.getPageAPI().getCommandNumberFromServer(t, api.getOptions().appId, c)))));
        logger_1.logger.silent(false);
        api.setCommandNumber((0, function_1.pipe)(commangFromServer, O.chain(v => (0, appmaker_network_actions_1.isRequestResponse)(v) ? O.some(getCommandNumberResponse(v)) : api.getCommandNumber())));
        api.watch();
        api.setState('ready');
        initConsoleForInteractiveMode(api.getXsrfToken(), api.getCommandNumber(), api.getOptions().outDir, api.getState());
    }
    else if (command === InteractiveModeCommands.screenshot) {
    }
    else if (command === InteractiveModeCommands.update) {
        logger_1.logger.log('update');
    }
    else {
        logger_1.logger.log('unknown command', command);
        api.writeUserPrompt();
    }
}
function applyModificationsToScript(source, modifications) {
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
async function tryToSyncScript(api, commands) {
    const app = api.getApp();
    for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const script = app.scripts.find(script => script.key === command.changeScriptCommand.key.localKey);
        if (script) {
            const changedStr = applyModificationsToScript(script.code || '', command.changeScriptCommand.scriptChange.modifications);
            (0, app_1.updateScript)(script, changedStr);
            const pathToProject = api.getOptions().outDir;
            const pathToFileTSFile = `${pathToProject}/${script.name}.js`;
            logger_1.logger.log('writting to ', script.name);
            await writeFile(pathToFileTSFile, script.code || '');
        }
        else {
            logger_1.logger.log('fail to sync script with kye ', command.changeScriptCommand.key.localKey);
        }
    }
}
function getFuncToSyncWorkspace(api) {
    let commangFromServerPr = null;
    return async function checkForCommandNumber() {
        try {
            if (commangFromServerPr !== null || repl_scheduler_1.replScheduler.getJobsCount() !== 0) {
                return;
            }
            // TODO: drop this request when close method called
            commangFromServerPr = (0, function_1.pipe)(api.getXsrfToken(), O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(api.getCommandNumber(), O.match(() => Promise.resolve(O.none), c => api.getPageAPI().getCommandNumberFromServer(t, api.getOptions().appId, c)))));
            const _commandNumber = await commangFromServerPr;
            commangFromServerPr = null;
            // Check for race condition
            // When we check for updating during the script updating by the user
            // TODO: think about better syncing
            if (repl_scheduler_1.replScheduler.getJobsCount() !== 0) {
                return;
            }
            if (O.isSome(_commandNumber) && (0, appmaker_network_actions_1.isRequestResponse)(_commandNumber.value)) {
                const res = (0, function_1.pipe)(_commandNumber.value, response => response.response.map(commandResponse => {
                    const commandName = (0, appmaker_network_actions_1.tryToGetCommandName)(commandResponse);
                    const command = (0, appmaker_network_actions_1.tryToGetCommand)(commandResponse);
                    return ([
                        O.isSome(commandName) ? commandName.value : '',
                        O.isSome(command) ? command.value.sequenceNumber : null
                    ]);
                }), commands => commands.filter((command) => command[1] !== null), commnads => commnads.sort((c1, c2) => Number(c1[1]) - Number(c2[1])));
                const supportedCommands = (0, function_1.pipe)(_commandNumber.value, commands => commands.response.filter(appmaker_network_actions_1.isRequestChangeScriptCommand));
                if (_commandNumber.value.response.length > supportedCommands.length) {
                    logger_1.logger.log('Your application is out-of-day - it was updated outside appmaker-static, please reload');
                    logger_1.logger.log('res', JSON.stringify(res).slice(0, 300) + (JSON.stringify(res).length > 300 ? '...' : ''));
                    api.setState('warn');
                    api.writeUserPrompt();
                }
                else if (supportedCommands.length > 0) {
                    logger_1.logger.log('Your application was updated outside appmaker-static, trying to sync with local files');
                    api.stopWatch();
                    await tryToSyncScript(api, supportedCommands);
                    api.watch();
                    api.setCommandNumber(O.some(supportedCommands[supportedCommands.length - 1].changeScriptCommand.sequenceNumber));
                    api.setState('ready');
                    api.writeUserPrompt();
                }
            }
            else if (O.isSome(_commandNumber) && (0, appmaker_network_actions_1.isRequestError)(_commandNumber.value)) {
                logger_1.logger.log('Error retriving sequence number from the server');
            }
            else if (O.isSome(_commandNumber) && Object.keys(_commandNumber.value).length === 0) {
                // empty response
            }
            else {
                logger_1.logger.log('Unknown repsonse during retriving sequence');
            }
        }
        catch (e) {
            logger_1.logger.log('getFuncToSyncWorkspace error:', e);
        }
    };
}
function watchProjectFiles(folder, api) {
    let fsWait = false;
    const ac = new AbortController();
    const { signal } = ac;
    (0, node_fs_1.watch)(folder, { signal }, (event, filename) => {
        if (filename) {
            if (fsWait)
                return;
            fsWait = setTimeout(() => {
                fsWait = false;
            }, 300);
            const file = api.getGeneratedFiles().find(f => (0, filesystem_io_1.parseFilePath)(f).fullName === filename);
            const filenameObj = (0, filesystem_io_1.parseFilePath)(filename);
            if (file) {
                readFile(file, { encoding: 'utf-8' })
                    .then((newContent) => {
                    const script = api.getApp().scripts.find(script => script.name === filename.replace('.js', ''));
                    if (script) {
                        const job = {
                            scriptName: filenameObj.name,
                            run: () => {
                                logger_1.logger.log(`Updating file: ${(0, repl_logger_1.colorPath)(filenameObj.name)}`);
                                // TODO: for some reason sometime its empty
                                if (newContent === '') {
                                    logger_1.logger.log(`Set: NewContent for ${filenameObj.name} is empty, probably it's not what was intended`);
                                }
                                return (0, function_1.pipe)(api.getXsrfToken(), O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(api.getCommandNumber(), O.match(() => Promise.resolve(O.none), c => api.getPageAPI().changeScriptFile(t, api.getOptions().appId, api.getOptions().credentials.login, script.key, c, script.code || '', newContent))))).then((r) => {
                                    if (newContent === '') {
                                        logger_1.logger.log(`Update: NewContent for ${filenameObj.name} is empty, probably it's not what was intended`);
                                    }
                                    (0, app_1.updateScript)(script, newContent);
                                    api.setCommandNumber((0, function_1.pipe)(r, O.chain(v => (0, appmaker_network_actions_1.isRequestResponse)(v) ? O.some(getCommandNumberResponse(v)) : api.getCommandNumber())));
                                    return r;
                                });
                            }
                        };
                        if (repl_scheduler_1.replScheduler.getJobsCount() === 0) {
                            api.setState('loading');
                            api.writeUserPrompt();
                        }
                        const p = repl_scheduler_1.replScheduler.schedule(job);
                        return p;
                    }
                    else {
                        logger_1.logger.log(`script with name ${(0, repl_logger_1.colorPath)(filenameObj.name)} wasn't registered`);
                    }
                    return Promise.resolve(O.none);
                })
                    .then(done => {
                    if (O.isSome(done) && (0, appmaker_network_actions_1.isRequestResponse)(done.value)) {
                        logger_1.logger.log('Script updated: ' + (0, repl_logger_1.colorPath)(filenameObj.name));
                        if (repl_scheduler_1.replScheduler.getJobsCount() === 0) {
                            api.setState('ready');
                            api.writeUserPrompt();
                        }
                    }
                    else if (O.isSome(done) && (0, appmaker_network_actions_1.isRequestError)(done.value)) {
                        logger_1.logger.log('Updating script error: ' + JSON.stringify(done.value));
                    }
                    else {
                        logger_1.logger.log('Updating script: unknown response', done);
                    }
                })
                    .catch(e => {
                    logger_1.logger.log('Updating script error: ' + e);
                });
            }
            else {
                logger_1.logger.log('Couldt find file with name', filename);
            }
        }
    });
    return { unsubscribe: () => { ac.abort(); } };
}
function initConsoleForInteractiveMode(xsrfToken, commandNumber, outDir, state) {
    logger_1.logger.log((0, repl_logger_1.colorImportantMessage)('Interactive Mode'));
    (0, function_1.pipe)(xsrfToken, O.chain(v => O.some(logger_1.logger.log('run xsrfToken ' + (0, repl_logger_1.colorValue)(v)))));
    (0, function_1.pipe)(commandNumber, O.chain(v => O.some(logger_1.logger.log('run commandNumber ' + (0, repl_logger_1.colorValue)(v)))));
    logger_1.logger.log(`Watching for file changes on ${(0, repl_logger_1.colorPath)(outDir)}`);
    logger_1.logger.putLine((0, repl_logger_1.getReplUserInputLine)({ state }));
}
var InteractiveModeCommands;
(function (InteractiveModeCommands) {
    InteractiveModeCommands["close"] = "close";
    InteractiveModeCommands["printWorkingDirectory"] = "pwd";
    InteractiveModeCommands["printCommandNumber"] = "pcn";
    InteractiveModeCommands["listFiles"] = "ls";
    InteractiveModeCommands["export"] = "export";
    InteractiveModeCommands["screenshot"] = "screenshot";
    InteractiveModeCommands["update"] = "update";
})(InteractiveModeCommands || (InteractiveModeCommands = {}));
// TODO: improve
//  1. user interaction (when the user types command and hit enter - unnecessary new line); autocomlition for commands. Check (TTY and raw mode)
//  2. close all calls when user enter "close" command
//  3. create queue for polling command number and updating script - they may overlap
//  4. add supporting different command, not only "changeScriptCommand", for example, command for updating view should regenerate view, command for updating model should regenerate types for models
//  5. add recalculating of the import of a script file
//  6. add command to interact with AppMaker: delete file, deploy to instance, etc.
//  7. add handling of error for updating scripts
//  8. allow to open chrome in headless mode
async function handleInteractiveApplicationMode(options) {
    function run(pageAPI) {
        return new Promise(async (resolve, reject) => {
            let state = 'ready';
            let { app, generatedFiles } = await handleExportProject(pageAPI, options.appId, options.outDir);
            let syncInterval = -1;
            let watcherSubscription = { unsubscribe: () => { } };
            let xsrfToken = await pageAPI.getXSRFToken();
            let commandNumber = await pageAPI.getCommandNumberFromApp();
            const userAPI = {
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
                    logger_1.logger.putLine((0, repl_logger_1.getReplUserInputLine)({ state }));
                },
                watch() {
                    watcherSubscription.unsubscribe();
                    watcherSubscription = watchProjectFiles(options.outDir, userAPI);
                },
                stopWatch() {
                    watcherSubscription.unsubscribe();
                    watcherSubscription = { unsubscribe: () => { } };
                },
                async close() {
                    node_process_1.stdin.removeListener('data', handler);
                    clearInterval(syncInterval);
                    watcherSubscription.unsubscribe();
                    await pageAPI.close();
                    node_process_1.stdin.end();
                    logger_1.logger.log('browser closed');
                    process.exit(0);
                },
            };
            watcherSubscription = watchProjectFiles(options.outDir, userAPI);
            function handler(data) {
                return handleUserInput(userAPI, data);
            }
            ;
            node_process_1.stdin.on('data', handler);
            syncInterval = setInterval(getFuncToSyncWorkspace(userAPI), 5000);
            console.clear();
            initConsoleForInteractiveMode(xsrfToken, commandNumber, options.outDir, state);
        });
    }
    (0, appmaker_network_1.runInApplicationPageContext)(options.appId, options.credentials, options.browserOptions, options.browserConfigOptions, run);
}
exports.handleInteractiveApplicationMode = handleInteractiveApplicationMode;
async function handleInteractiveApplicationModeTest(options) {
    logger_1.logger.log('interactive');
    function run(pageAPI) {
        return new Promise(async (resolve, reject) => {
            let xsrfToken = await pageAPI.getXSRFToken();
            let commandNumber = await pageAPI.getCommandNumberFromApp();
            (0, function_1.pipe)(xsrfToken, O.chain(v => O.some(logger_1.logger.log('run xsrfToken ' + v))));
            (0, function_1.pipe)(commandNumber, O.chain(v => O.some(logger_1.logger.log('run commandNumber ' + v))));
            const key = 'rDkAi7g84bbMjZopfFKpim3S3MZ60MkF';
            const code = '';
            const newContent = '123';
            try {
                const r = await (0, function_1.pipe)(xsrfToken, O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(commandNumber, O.match(() => Promise.resolve(O.none), c => pageAPI.changeScriptFile(t, options.appId, options.credentials.login, key, c, code, newContent)))));
                // { response: [ { changeScriptCommand: [Object] } ] }
                logger_1.logger.log('sending done', O.isSome(r) ? r.value : O.none);
                if (O.isSome(r) && (0, appmaker_network_actions_1.isRequestResponse)(r.value) && (0, appmaker_network_actions_1.isRequestChangeScriptCommand)(r.value)) {
                    logger_1.logger.log('sucesfull done');
                    commandNumber = O.some(getCommandNumberResponse(r.value));
                }
                const code1 = newContent;
                const newContent1 = '31';
                const p = await (0, function_1.pipe)(xsrfToken, O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(commandNumber, O.match(() => Promise.resolve(O.none), c => pageAPI.changeScriptFile(t, options.appId, options.credentials.login, key, c, code1, newContent1)))));
                // { response: [ { changeScriptCommand: [Object] } ] }
                logger_1.logger.log('sending done', O.isSome(p) ? JSON.stringify(p.value) : O.none);
            }
            catch (e) {
                logger_1.logger.log(e);
            }
            resolve(null);
        });
    }
    (0, appmaker_network_1.runInApplicationPageContext)(options.appId, options.credentials, options.browserOptions, options.browserConfigOptions, run);
}
exports.handleInteractiveApplicationModeTest = handleInteractiveApplicationModeTest;
