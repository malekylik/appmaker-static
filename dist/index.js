"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { stat: oldStat, rm: oldRm } = require('fs');
const { promisify } = require('util');
const path = require('path');
const validate_1 = require("./validate");
const app_1 = require("./appmaker/app");
const appmaker_network_1 = require("./appmaker-network");
const io_1 = require("./io");
const report_1 = require("./report");
const command_line_1 = require("./command-line");
const handlers_1 = require("./handlers");
const stat = promisify(oldStat);
const exec = promisify(require('node:child_process').exec);
// const passedPath = process.argv[2];
//  node ./dist/index.js "/usr/local/google/home/kalinouski/Downloads/Spotlight 2.0_last.zip"
async function run() {
    const options = (0, command_line_1.parseCommandLineArgs)();
    // if (!passedPath) {
    //   console.log('Pass path as second arg');
    //   process.exit(1);
    // }
    // let passedPath = __dirname + '/app.zip';
    // can be folder to zip project or unzip project folder
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
    const isZip = path.extname(pathToProject) === '.zip';
    if (isZip) {
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
    }
    if (pathStat.isDirectory() || isZip) {
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
        const generatedFiles = await (0, io_1.generateJSProjectForAppMaker)(pathToGenerateJSProjectDir, scriptsFiles, tsConfig, app);
        if (generatedFiles.length > 0) {
            const allDiagnostics = (0, validate_1.checkTypes)(generatedFiles, tsConfig);
            (0, report_1.printTSCheckDiagnostics)(allDiagnostics);
            if (allDiagnostics.length) {
                console.log('TS check doesnt pass. Skip the rest');
                if (isZip) {
                    await (0, handlers_1.postZipActionsHandler)(pathToZip, pathToProject, options.outDir);
                }
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
        if (isZip) {
            await (0, handlers_1.postZipActionsHandler)(pathToZip, pathToProject, options.outDir);
        }
    }
    else {
        console.log('Doest support file or directory doesnt extist');
        process.exit(1);
    }
}
run();
