"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { stat: oldStat, readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile, rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess, constants, } = require('fs');
const { promisify } = require('util');
const path = require('path');
const generate_1 = require("./generate");
const validate_1 = require("./validate");
const commandLineArgs = require("command-line-args");
const app_1 = require("./appmaker/app");
const appmaker_network_1 = require("./appmaker-network");
const io_1 = require("./io");
const report_1 = require("./report");
const stat = promisify(oldStat);
const readdir = promisify(oldReaddir);
const readFile = promisify(oldReadFile);
const writeFile = promisify(oldWriteFile);
const rm = promisify(oldRm);
const mkdir = promisify(oldMkDir);
const copyFile = promisify(oldCopyFile);
const access = promisify(oldAccess);
const exec = promisify(require('node:child_process').exec);
// const passedPath = process.argv[2];
const optionDefinitions = [
    // { name: 'appId', alias: 'v', type: Boolean },
    { name: 'appId', type: String },
    // { name: 'login', type: String, multiple: true, defaultOption: true },
    { name: 'login', type: String },
    { name: 'password', type: String },
    // { name: 'password', type: String },
];
const options = commandLineArgs(optionDefinitions);
async function run() {
    const { appId, login, password, } = options;
    if (appId) {
        if (login === undefined || password === undefined) {
            console.log('For using script in remote mode please pass login and password');
            process.exit(1);
        }
    }
    else {
        console.log('only remote mode');
        process.exit(1);
    }
    const credentials = {
        login: login,
        password: password,
    };
    const applicationId = appId;
    // if (!passedPath) {
    //   console.log('Pass path as second arg');
    //   process.exit(1);
    // }
    await (0, appmaker_network_1.callAppMakerApp)(applicationId, credentials);
    let passedPath = __dirname + '/app.zip';
    let pathStat = null;
    try {
        pathStat = await stat(passedPath);
    }
    catch {
        console.log(`Couldn't find path: ${passedPath}`);
        process.exit(1);
    }
    let pathToProject = passedPath;
    const isZip = path.extname(pathToProject) === '.zip';
    if (isZip) {
        pathToProject = passedPath.replace('.zip', '') + '_temp_' + `${new Date().getMonth()}:${new Date().getDate()}:${new Date().getFullYear()}_${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
        console.log('zip', pathToProject);
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
        const pathToTempDir = `${__dirname}/temp`;
        const generatedFiles = await (0, io_1.generateJSProjectForAppMaker)(pathToTempDir, scriptsFiles, tsConfig, app);
        if (generatedFiles.length > 0) {
            const allDiagnostics = (0, validate_1.checkTypes)(generatedFiles, tsConfig);
            (0, report_1.printTSCheckDiagnostics)(allDiagnostics);
            if (allDiagnostics.length) {
                console.log('TS check doenst pass. Skip the rest');
                if (isZip) {
                    await rm(pathToProject, { recursive: true });
                }
                process.exit(1);
            }
        }
        const emptyScripts = [];
        for (let i = 0; i < scriptsFiles.length; i++) {
            const { name, file } = scriptsFiles[i];
            console.log(`-----${name}-----`);
            let write = false;
            // console.log('type', jsonObj.script.type);
            // console.log('jsonObj', jsonObj);
            if (file.script['#text']) {
                const messages = (0, validate_1.lint)(file.script['#text'], linterConfig, scriptsNames[i]);
                // console.log('messages', messages);
                write = messages.fixed;
                if (write) {
                    //      console.log('text', jsonObj.script['#text']);
                    //        console.log('res', generateResultXML(jsonObj, messages.output));
                    const res = (0, generate_1.generateResultXML)(file, messages.output);
                    //          const res = scriptXML.replace(/CDATA\[[\s\S]*\]/, 'CDATA[' + messages.output + ']]');
                    console.log('lint res', messages.messages);
                    writeFile(`${pathToProject}/scripts/${scriptsNames[i]}`, res);
                }
                else if (messages.messages.length > 0) {
                    console.log('Not fixed', messages.messages, messages.output);
                }
            }
            else {
                emptyScripts.push(scriptsNames[i]);
            }
        }
        console.log('empty scripts', emptyScripts);
        if (isZip) {
            await rm(passedPath);
            process.chdir(pathToProject);
            await exec(`zip -r "${passedPath}" *`);
            await rm(pathToProject, { recursive: true });
        }
    }
    else {
        console.log('Doest support file or directory doesnt extist');
        process.exit(1);
    }
}
run();
