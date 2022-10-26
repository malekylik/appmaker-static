"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRemoteApplicationMode = exports.postZipActionsHandler = void 0;
const validate_1 = require("./validate");
const app_1 = require("./appmaker/app");
const appmaker_network_1 = require("./appmaker-network");
const io_1 = require("./io");
const report_1 = require("./report");
const { stat: oldStat, rm: oldRm } = require('fs');
const { promisify } = require('util');
const rm = promisify(oldRm);
const exec = promisify(require('node:child_process').exec);
const stat = promisify(oldStat);
async function postZipActionsHandler(pathToZip, pathToProject, outDir) {
    console.log('post actions');
    process.chdir(pathToProject);
    console.log('zip to', `${outDir}/app.zip`);
    await exec(`zip -r "${outDir}/app.zip" *`);
    console.log('remove', pathToZip);
    await rm(pathToZip);
    console.log('remove', pathToProject);
    await rm(pathToProject, { recursive: true });
}
exports.postZipActionsHandler = postZipActionsHandler;
async function handleRemoteApplicationMode(options) {
    let passedPath = await (0, appmaker_network_1.callAppMakerApp)(options.appId, options.credentials, options.browserOptions);
    let pathStat = null;
    try {
        pathStat = await stat(passedPath);
    }
    catch {
        console.log(`Couldn't find path: ${passedPath}`);
        process.exit(1);
    }
    let pathToZip = passedPath;
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
    const app = new app_1.App();
    (0, app_1.initAppMakerApp)(app, modelsFiles, viewsFiles);
    const pathToGenerateJSProjectDir = options.outDir;
    const generatedFiles = await (0, io_1.generateJSProjectForAppMaker)(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, linterConfig, app);
    if (generatedFiles.length > 0) {
        const allDiagnostics = (0, validate_1.checkTypes)(generatedFiles, tsConfig);
        (0, report_1.printTSCheckDiagnostics)(allDiagnostics);
        if (allDiagnostics.length) {
            console.log('TS check doesnt pass. Skip the rest');
            await postZipActionsHandler(pathToZip, pathToProject, options.outDir);
            process.exit(1);
        }
    }
    else {
        console.log('No file to check for types. TS check skip');
    }
    const lintingReport = (0, validate_1.checkLinting)(scriptsFiles, linterConfig);
    (0, report_1.printLintingReport)(lintingReport);
    await (0, io_1.writeValidatedScriptsToAppMakerXML)(scriptsFiles, lintingReport, pathToProject);
    const emptyScripts = (0, validate_1.checkForEmptyScriptsFiles)(scriptsFiles);
    (0, report_1.printEmptyScripts)(emptyScripts);
    await postZipActionsHandler(pathToZip, pathToProject, options.outDir);
}
exports.handleRemoteApplicationMode = handleRemoteApplicationMode;
