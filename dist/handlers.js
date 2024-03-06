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
const rm = (0, node_util_1.promisify)(node_fs_1.rm);
const readFile = (0, node_util_1.promisify)(node_fs_1.readFile);
const exec = (0, node_util_1.promisify)(require('node:child_process').exec);
const stat = (0, node_util_1.promisify)(node_fs_1.stat);
async function postOfflineZipActionsHandler(pathToProject, outDir) {
    console.log('post actions');
    process.chdir(pathToProject);
    console.log('zip to', `${outDir}/app.zip`);
    await exec(`zip -r "${outDir}/app.zip" *`);
    console.log('remove', pathToProject);
    await rm(pathToProject, { recursive: true });
}
exports.postOfflineZipActionsHandler = postOfflineZipActionsHandler;
async function postRemoteZipActionsHandler(pathToZip, pathToProject, outDir) {
    console.log('post actions');
    process.chdir(pathToProject);
    console.log('zip to', `${outDir}/app.zip`);
    await exec(`zip -r "${outDir}/app.zip" *`);
    console.log('remove', pathToZip);
    await rm(pathToZip);
    console.log('remove', pathToProject);
    await rm(pathToProject, { recursive: true });
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
        //   console.log('TS check doesnt pass. Skip the rest');
        //   return { code: 1 };
        // }
    }
    else {
        console.log('No file to check for types. TS check skip');
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
    console.log('unzip to', pathToProject);
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
    const passedPathToExportedZip = await (0, appmaker_network_1.callAppMakerApp)(options.appId, options.credentials, options.browserOptions);
    const result = await validateZipProject(passedPathToExportedZip, options.outDir);
    await postRemoteZipActionsHandler(passedPathToExportedZip, result.path, options.outDir);
    if (result.code !== 0) {
        process.exit(result.code);
    }
}
exports.handleRemoteApplicationMode = handleRemoteApplicationMode;
async function saveCallToBrowser(browser, callback) {
    try {
        const res = callback(browser);
        if (res instanceof Promise) {
            return await res;
        }
        return res;
    }
    catch (e) {
        console.log('fail to run command', e);
    }
    return null;
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
    console.log('interactive');
    const passedPathToExportedZip = await (0, appmaker_network_1.callAppMakerApp)(options.appId, options.credentials, options.browserOptions);
    const pathToProject = await unzipProject(passedPathToExportedZip);
    const { app, generatedFiles } = await createAppAndGenerateProject(pathToProject, options.outDir);
    await postRemoteZipActionsHandler(passedPathToExportedZip, pathToProject, options.outDir);
    function run(pageAPI) {
        return new Promise(async (resolve, reject) => {
            let xsrfToken = await pageAPI.getXSRFToken();
            let commandNumber = await pageAPI.getCommandNumberFromApp();
            (0, function_1.pipe)(xsrfToken, O.chain(v => O.some(console.log('run xsrfToken ' + v))));
            (0, function_1.pipe)(commandNumber, O.chain(v => O.some(console.log('run commandNumber ' + v))));
            const buttonPressesLogFile = options.outDir;
            console.log(`Watching for file changes on ${buttonPressesLogFile}`);
            let fsWait = false;
            (0, node_fs_1.watch)(buttonPressesLogFile, (event, filename) => {
                if (filename) {
                    if (fsWait)
                        return;
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
                                const p = (0, function_1.pipe)(xsrfToken, O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(commandNumber, O.match(() => Promise.resolve(O.none), c => pageAPI.changeScriptFile(t, options.appId, options.credentials.login, script.key, c, script.code || '', newContent)))));
                                p.then(() => {
                                    script.code = newContent;
                                });
                                return p;
                            }
                            else {
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
                        });
                    }
                    else {
                        console.log('Couldt find file with name', filename);
                    }
                }
            });
            async function callback(data) {
                let command = data.toString();
                command = command.slice(0, command.length - 1);
                if (command === InteractiveModeCommands.close) {
                    node_process_1.stdin.removeListener('data', callback);
                    await pageAPI.close();
                    console.log('browser closed');
                    node_process_1.stdin.end();
                    process.exit(0);
                }
                else if (command === InteractiveModeCommands.printWorkingDirectory) {
                    console.log(options.outDir);
                }
                else if (command === InteractiveModeCommands.printCommandNumber) {
                    console.log(commandNumber);
                }
                else if (command === InteractiveModeCommands.listFiles) {
                    // try {
                    //   const files: Array<string> = await readdir(options.outDir);
                    //   const filesAsString = files.reduce((str, file) => str + `\n${file}`, '');
                    //   console.log(filesAsString);
                    // } catch (e) {
                    //   console.log('ls failed with error: ', e);
                    // }
                }
                else if (command === InteractiveModeCommands.export) {
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
                }
                else if (command === InteractiveModeCommands.screenshot) {
                    // try {
                    //   await takeScreenshoot(page!);
                    //   console.log('screenshot done');
                    // } catch (e) {
                    //   console.log(`${InteractiveModeCommands.screenshot} failed with error: `, e);
                    // }
                }
                else if (command === InteractiveModeCommands.update) {
                    console.log('update');
                }
                else {
                    console.log('unknown command', command);
                }
            }
            node_process_1.stdin.on('data', callback);
            let pr = null;
            async function checkForCommandNumber() {
                if (pr !== null) {
                    return;
                }
                pr = (0, function_1.pipe)(xsrfToken, O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(commandNumber, O.match(() => Promise.resolve(O.none), c => pageAPI.getCommandNumberFromServer(t, options.appId, c)))));
                const _commandNumber = await pr;
                pr = null;
                // console.log('res', _commandNumber);
                // console.log('current Command', commandNumber);
                if (_commandNumber.response) {
                    // console.log(`Command number changed. Prev: ${_commandNumber.response[0].changeScriptCommand.sequenceNumber }. Current: ${commandNumber}`);
                    // commandNumber = _commandNumber.response[0].changeScriptCommand.sequenceNumber ;
                    console.log('Your application is out-of-day, please reload');
                    console.log('res', _commandNumber);
                }
            }
            setInterval(checkForCommandNumber, 5000);
        });
    }
    (0, appmaker_network_1.runInApplicationPageContext)(options.appId, options.credentials, options.browserOptions, run);
}
exports.handleInteractiveApplicationMode = handleInteractiveApplicationMode;
async function handleInteractiveApplicationModeTest(options) {
    console.log('interactive');
    function run(pageAPI) {
        return new Promise(async (resolve, reject) => {
            let xsrfToken = await pageAPI.getXSRFToken();
            let commandNumber = await pageAPI.getCommandNumberFromApp();
            (0, function_1.pipe)(xsrfToken, O.chain(v => O.some(console.log('run xsrfToken ' + v))));
            (0, function_1.pipe)(commandNumber, O.chain(v => O.some(console.log('run commandNumber ' + v))));
            const key = 'rDkAi7g84bbMjZopfFKpim3S3MZ60MkF';
            const code = '';
            const newContent = '123';
            try {
                const r = await (0, function_1.pipe)(xsrfToken, O.match(() => Promise.resolve(O.none), t => (0, function_1.pipe)(commandNumber, O.match(() => Promise.resolve(O.none), c => pageAPI.changeScriptFile(t, options.appId, options.credentials.login, key, c, code, newContent)))));
                // { response: [ { changeScriptCommand: [Object] } ] }
                console.log('sending done', O.isSome(r) ? r.value : O.none);
            }
            catch (e) {
                console.log(e);
            }
            resolve(null);
        });
    }
    (0, appmaker_network_1.runInApplicationPageContext)(options.appId, options.credentials, options.browserOptions, run);
}
exports.handleInteractiveApplicationModeTest = handleInteractiveApplicationModeTest;
