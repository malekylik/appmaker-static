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
const rm = (0, node_util_1.promisify)(node_fs_1.rm);
const readFile = (0, node_util_1.promisify)(node_fs_1.readFile);
const exec = (0, node_util_1.promisify)(require('node:child_process').exec);
const stat = (0, node_util_1.promisify)(node_fs_1.stat);
function getCommandNumberResponse(response) {
    return response
        .response
        .slice()
        .sort((a, b) => Number(b.changeScriptCommand.sequenceNumber) - Number(a.changeScriptCommand.sequenceNumber))[0]?.changeScriptCommand.sequenceNumber || '-1';
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
        logger_1.logger.log(`Fail to unzip file ${passedPath} to ${pathToProject}`);
        logger_1.logger.log(e);
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
        logger_1.logger.log(`Couldn't find path: ${options.project}`);
        process.exit(1);
    }
    const isZip = path.extname(options.project) === '.zip';
    if (!pathStat.isDirectory() && !isZip) {
        logger_1.logger.log(`Passed pass isn't a zip nor folder. Unsupported extension of project file. Passed path ${options.project}`);
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
    const passedPathToExportedZip = await (0, appmaker_network_1.callAppMakerApp)(options.appId, options.credentials, options.browserOptions);
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
        const { app, generatedFiles } = await handleExportProject(api.getPageAPI(), api.getOptions().appId, api.getOptions().outDir);
        api.setGeneratedFiles(generatedFiles);
        api.setApp(app);
        const commangFromServer = await (0, function_1.pipe)(api.getXsrfToken(), O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(api.getCommandNumber(), O.match(() => Promise.resolve(O.none), c => api.getPageAPI().getCommandNumberFromServer(t, api.getOptions().appId, c)))));
        api.setCommandNumber((0, function_1.pipe)(commangFromServer, O.chain(v => (0, appmaker_network_actions_1.isRequestResponse)(v) ? O.some(getCommandNumberResponse(v)) : api.getCommandNumber())));
        api.watch();
        initConsoleForInteractiveMode(api.getXsrfToken(), api.getCommandNumber(), api.getOptions().outDir);
    }
    else if (command === InteractiveModeCommands.screenshot) {
    }
    else if (command === InteractiveModeCommands.update) {
        logger_1.logger.log('update');
    }
    else {
        logger_1.logger.log('unknown command', command);
    }
}
function getFuncToSyncWorkspace(api) {
    let commangFromServerPr = null;
    return async function checkForCommandNumber() {
        try {
            if (commangFromServerPr !== null) {
                return;
            }
            commangFromServerPr = (0, function_1.pipe)(api.getXsrfToken(), O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(api.getCommandNumber(), O.match(() => Promise.resolve(O.none), c => api.getPageAPI().getCommandNumberFromServer(t, api.getOptions().appId, c)))));
            const _commandNumber = await commangFromServerPr;
            commangFromServerPr = null;
            if (_commandNumber !== null && typeof _commandNumber === 'object' && 'response' in (_commandNumber) && _commandNumber.response) {
                logger_1.logger.log('Your application is out-of-day, please reload');
                logger_1.logger.log('res', _commandNumber);
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
            }, 1000);
            logger_1.logger.log(`${filename} file Changed`);
            const file = api.getGeneratedFiles().find(f => (0, filesystem_io_1.parseFilePath)(f).fullName === filename);
            if (file) {
                readFile(file, { encoding: 'utf-8' })
                    .then((newContent) => {
                    const script = api.getApp().scripts.find(script => script.name === filename.replace('.js', ''));
                    if (script) {
                        const p = (0, function_1.pipe)(api.getXsrfToken(), O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(api.getCommandNumber(), O.match(() => Promise.resolve(O.none), c => api.getPageAPI().changeScriptFile(t, api.getOptions().appId, api.getOptions().credentials.login, script.key, c, script.code || '', newContent)))));
                        p.then((r) => {
                            script.code = newContent;
                            api.setCommandNumber((0, function_1.pipe)(r, O.chain(v => (0, appmaker_network_actions_1.isRequestResponse)(v) ? O.some(getCommandNumberResponse(v)) : api.getCommandNumber())));
                        });
                        logger_1.logger.log('---updating script---');
                        logger_1.logger.putLine('repl (loading)$ ');
                        return p;
                    }
                    else {
                        logger_1.logger.log(`script with name ${filename} wasn't registered`);
                    }
                    return Promise.resolve(O.none);
                })
                    .then(done => {
                    if (O.isSome(done) && (0, appmaker_network_actions_1.isRequestResponse)(done.value)) {
                        logger_1.logger.log('Script updated: ' + filename);
                        logger_1.logger.putLine('repl (ready)$ ');
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
function initConsoleForInteractiveMode(xsrfToken, commandNumber, outDir) {
    console.clear();
    logger_1.logger.log('Interactive Mode');
    (0, function_1.pipe)(xsrfToken, O.chain(v => O.some(logger_1.logger.log('run xsrfToken ' + v))));
    (0, function_1.pipe)(commandNumber, O.chain(v => O.some(logger_1.logger.log('run commandNumber ' + v))));
    logger_1.logger.log(`Watching for file changes on ${outDir}`);
    logger_1.logger.putLine('repl (ready)$ ');
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
async function handleInteractiveApplicationMode(options) {
    function run(pageAPI) {
        return new Promise(async (resolve, reject) => {
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
                watch() {
                    watcherSubscription.unsubscribe();
                    watcherSubscription = watchProjectFiles(options.outDir, userAPI);
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
            initConsoleForInteractiveMode(xsrfToken, commandNumber, options.outDir);
        });
    }
    (0, appmaker_network_1.runInApplicationPageContext)(options.appId, options.credentials, options.browserOptions, run);
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
                if (O.isSome(r) && (0, appmaker_network_actions_1.isRequestResponse)(r.value)) {
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
    (0, appmaker_network_1.runInApplicationPageContext)(options.appId, options.credentials, options.browserOptions, run);
}
exports.handleInteractiveApplicationModeTest = handleInteractiveApplicationModeTest;
