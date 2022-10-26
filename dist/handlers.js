"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRemoteApplicationMode = exports.handleOfflineApplicationMode = exports.postRemoteZipActionsHandler = exports.postOfflineZipActionsHandler = void 0;
const path = require('path');
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
    const [scriptsFiles, modelsFiles, viewsFiles] = await Promise.all([
        (0, io_1.readAppMakerScripts)(passedPath, scriptsNames),
        (0, io_1.readAppMakerModels)(passedPath, modelsNames),
        (0, io_1.readAppMakerViews)(passedPath, viewsNames),
    ]);
    const app = new app_1.App();
    (0, app_1.initAppMakerApp)(app, modelsFiles, viewsFiles);
    const pathToGenerateJSProjectDir = outDir;
    const generatedFiles = await (0, io_1.generateJSProjectForAppMaker)(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, linterConfig, app);
    if (generatedFiles.length > 0) {
        const allDiagnostics = (0, validate_1.checkTypes)(generatedFiles, tsConfig);
        (0, report_1.printTSCheckDiagnostics)(allDiagnostics);
        if (allDiagnostics.length) {
            console.log('TS check doesnt pass. Skip the rest');
            return { code: 1 };
        }
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
