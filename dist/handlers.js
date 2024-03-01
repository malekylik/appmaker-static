"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInteractiveApplicationMode = exports.handleRemoteApplicationMode = exports.handleOfflineApplicationMode = exports.postRemoteZipActionsHandler = exports.postOfflineZipActionsHandler = void 0;
const path = require('path');
const validate_1 = require("./validate");
const app_1 = require("./appmaker/app");
const appmaker_network_1 = require("./appmaker-network");
const io_1 = require("./io");
const appmaker_io_1 = require("./functional/io/appmaker-io");
const report_1 = require("./report");
const appmaker_network_actions_1 = require("./appmaker-network-actions");
const node_process_1 = require("node:process");
const node_fs_1 = require("node:fs");
const node_util_1 = require("node:util");
const function_1 = require("fp-ts/lib/function");
const E = require("fp-ts/lib/Either");
const rm = (0, node_util_1.promisify)(node_fs_1.rm);
const readdir = (0, node_util_1.promisify)(node_fs_1.readdir);
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
async function validateUnzipProject(passedPath, outDir) {
    const [linterConfig, tsConfig] = await Promise.all([
        (0, io_1.readLinterConfig)(),
        (0, io_1.readTSConfig)(),
    ]);
    const [scriptsNames, modelsNames, viewsNames] = await Promise.all([
        (0, io_1.getScriptsNames)(passedPath),
        (0, io_1.getModelsNames)(passedPath),
        (0, io_1.getViewsNames)(passedPath),
    ]);
    const [scriptsFiles, modelsFiles, viewsFiles, newViewFiles] = await Promise.all([
        (0, io_1.readAppMakerScripts)(passedPath, scriptsNames),
        (0, io_1.readAppMakerModels)(passedPath, modelsNames),
        (0, io_1.readAppMakerViews)(passedPath, viewsNames),
        (0, appmaker_io_1.readAppMakerViews)((0, io_1.getPathToViews)(passedPath))(),
    ]);
    // const 
    const app = new app_1.App();
    (0, function_1.pipe)(newViewFiles, E.match(e => (0, app_1.initAppMakerApp)(app, modelsFiles, viewsFiles, scriptsFiles, []), views => (0, app_1.initAppMakerApp)(app, modelsFiles, viewsFiles, scriptsFiles, views)));
    const pathToGenerateJSProjectDir = outDir;
    const generatedFiles = await (0, io_1.generateJSProjectForAppMaker)(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, linterConfig, app);
    if (generatedFiles.length > 0) {
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
    const lintingReport = (0, validate_1.checkLinting)(scriptsFiles, linterConfig);
    (0, report_1.printLintingReport)(lintingReport);
    await (0, io_1.writeValidatedScriptsToAppMakerXML)(scriptsFiles, lintingReport, passedPath);
    const emptyScripts = (0, validate_1.checkForEmptyScriptsFiles)(scriptsFiles);
    (0, report_1.printEmptyScripts)(emptyScripts);
    return { code: 1 };
}
async function validateZipProject(passedPath, outDir) {
    let pathToProject = passedPath;
    pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
    console.log('unzip to', pathToProject);
    try {
        await exec(`unzip -d "${pathToProject}" "${passedPath}"`);
    }
    catch (e) {
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
    const passedPath = await (0, appmaker_network_1.callAppMakerApp)(options.appId, options.credentials, options.browserOptions);
    const result = await validateZipProject(passedPath, options.outDir);
    await postRemoteZipActionsHandler(passedPath, result.path, options.outDir);
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
    let filesName = (await readdir(options.outDir))
        .filter(name => name[0] !== '.')
        .filter(name => name.slice(0, 2) !== '__')
        .filter(name => !(0, node_fs_1.lstatSync)(path.join(options.outDir, name)).isDirectory())
        .filter(name => name.split('.')[name.split('.').length - 1] === 'js');
    let files = await (Promise.all(filesName.map(name => readFile(path.join(options.outDir, name), 'utf-8')
        .then(content => {
        return ({
            content,
            name,
            path: path.join(options.outDir, name)
        });
    }))));
    // console.log('files', files);
    let browser = await (0, appmaker_network_1.openBrowser)({ headless: false });
    let page = null;
    let commandNumber = '';
    let xsrfToken = '';
    let generatedFiles = [];
    let _app = new app_1.App();
    try {
        console.log('open page');
        page = await browser.newPage();
    }
    catch (e) {
        console.log('error: cant open page', e);
        console.log('handleInteractiveApplicationMode interactive closing');
        await browser.close();
        throw e;
    }
    try {
        await new Promise(res => setTimeout(res, 2000));
        console.log('newPage');
        // TODO: not always wait correctly
        await page.goto(`https://appmaker.googleplex.com/edit/${options.appId}`, { waitUntil: 'networkidle2' });
        if ((0, appmaker_network_1.isAuthPage)(page.url())) {
            await (0, appmaker_network_1.auth)(page, options.credentials);
        }
        if ((0, appmaker_network_1.isAppPage)(page.url())) {
            commandNumber = await (0, appmaker_network_actions_1.getCommandNumberFromApp)(page);
            console.log('current command', commandNumber);
            console.log('successfuly loged in, please type command');
        }
        else {
            throw new Error('unknown page: taking screen');
        }
        xsrfToken = await (0, appmaker_network_actions_1.getXSRFToken)(page);
    }
    catch (e) {
        console.log('error: taking screen', e);
        await (0, appmaker_network_actions_1.takeScreenshoot)(page);
        await browser.close();
        throw e;
    }
    async function callback(data) {
        let command = data.toString();
        command = command.slice(0, command.length - 1);
        if (command === InteractiveModeCommands.close) {
            node_process_1.stdin.removeListener('data', callback);
            await browser.close();
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
            try {
                const files = await readdir(options.outDir);
                const filesAsString = files.reduce((str, file) => str + `\n${file}`, '');
                console.log(filesAsString);
            }
            catch (e) {
                console.log('ls failed with error: ', e);
            }
        }
        else if (command === InteractiveModeCommands.export) {
            try {
                const passedPath = await (0, appmaker_network_1.app)(page, options.outDir);
                let pathToProject = passedPath;
                pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
                await exec(`unzip -d "${pathToProject}" "${passedPath}"`);
                const [linterConfig, tsConfig] = await Promise.all([
                    (0, io_1.readLinterConfig)(),
                    (0, io_1.readTSConfig)(),
                ]);
                const [scriptsNames, modelsNames, viewsNames] = await Promise.all([
                    (0, io_1.getScriptsNames)(pathToProject),
                    (0, io_1.getModelsNames)(pathToProject),
                    (0, io_1.getViewsNames)(pathToProject),
                ]);
                const [scriptsFiles, modelsFiles, viewsFiles] = await Promise.all([
                    (0, io_1.readAppMakerScripts)(pathToProject, scriptsNames),
                    (0, io_1.readAppMakerModels)(pathToProject, modelsNames),
                    (0, io_1.readAppMakerViews)(pathToProject, viewsNames),
                ]);
                (0, app_1.initAppMakerApp)(_app, modelsFiles, viewsFiles, scriptsFiles, []);
                const pathToGenerateJSProjectDir = options.outDir;
                generatedFiles = await (0, io_1.generateJSProjectForAppMaker)(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, linterConfig, _app);
            }
            catch (e) {
                console.log('Export failed with error: ', e);
            }
        }
        else if (command === InteractiveModeCommands.screenshot) {
            try {
                await (0, appmaker_network_actions_1.takeScreenshoot)(page);
                console.log('screenshot done');
            }
            catch (e) {
                console.log(`${InteractiveModeCommands.screenshot} failed with error: `, e);
            }
        }
        else if (command === InteractiveModeCommands.update) {
            console.log('update');
        }
        else {
            console.log('unknown command', command);
        }
    }
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
            const file = files.find(f => f.name === filename);
            if (file) {
                readFile(file.path, 'utf-8')
                    .then((newContent) => {
                    const name = file.name.split('.').slice(0, file.name.split('.').length - 1).join('.');
                    console.log('name', name, file.name);
                    const p = (0, appmaker_network_actions_1.changeScriptFile)(page, xsrfToken, options.appId, options.credentials.login, name, commandNumber, file.content, newContent);
                    file.content = newContent;
                    return p;
                })
                    .then(done => {
                    console.log('done', done);
                });
            }
            else {
                console.log('Couldt find file with name', filename);
            }
        }
    });
    let pr = null;
    async function checkForCommandNumber() {
        if (pr !== null) {
            return;
        }
        pr = (0, appmaker_network_actions_1.retrieveCommands)(page, xsrfToken, options.appId, commandNumber);
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
    node_process_1.stdin.on('data', callback);
}
exports.handleInteractiveApplicationMode = handleInteractiveApplicationMode;
