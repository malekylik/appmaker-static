"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeValidatedScriptsToAppMakerXML = exports.generateJSProjectForAppMaker = exports.readAppMakerViews = exports.readAppMakerSingleView = exports.readAppMakerModels = exports.readAppMakerSingleModel = exports.readAppMakerScripts = exports.readAppMakerSingleScript = exports.getViewsNames = exports.getModelsNames = exports.getScriptsNames = exports.readLinterConfig = exports.readTSConfig = exports.getPathToViews = exports.getPathToModels = exports.getPathToScrips = void 0;
const { readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile, rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess, constants, } = require('fs');
const { promisify } = require('util');
const { XMLParser } = require('fast-xml-parser');
const ts = require("typescript");
const generate_1 = require("./generate");
const readFile = promisify(oldReadFile);
const readdir = promisify(oldReaddir);
const access = promisify(oldAccess);
const writeFile = promisify(oldWriteFile);
const rm = promisify(oldRm);
const mkdir = promisify(oldMkDir);
const copyFile = promisify(oldCopyFile);
function getPathToScrips(pathToProject) {
    return `${pathToProject}/scripts`;
}
exports.getPathToScrips = getPathToScrips;
function getPathToModels(pathToProject) {
    return `${pathToProject}/models`;
}
exports.getPathToModels = getPathToModels;
function getPathToViews(pathToProject) {
    return `${pathToProject}/views`;
}
exports.getPathToViews = getPathToViews;
async function readTSConfig() {
    const tsConfig = JSON.parse(await readFile('./tsconfig.json', 'utf-8'));
    return tsConfig;
}
exports.readTSConfig = readTSConfig;
async function readLinterConfig() {
    // TODO: fix file path to eslint config
    const linterConfig = JSON.parse(await readFile('./.eslintrc', 'utf-8'));
    return linterConfig;
}
exports.readLinterConfig = readLinterConfig;
function getScriptsNames(pathToProject) {
    return readdir(getPathToScrips(pathToProject));
}
exports.getScriptsNames = getScriptsNames;
function getModelsNames(pathToProject) {
    return readdir(getPathToModels(pathToProject));
}
exports.getModelsNames = getModelsNames;
function getViewsNames(pathToProject) {
    return readdir(getPathToViews(pathToProject));
}
exports.getViewsNames = getViewsNames;
async function readAppMakerSingleScript(pathToProject, scriptName) {
    const path = `${getPathToScrips(pathToProject)}/${scriptName}`;
    const scriptXML = await readFile(path, 'utf-8');
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: '',
    };
    const parser = new XMLParser(options);
    let jsonObj = parser.parse(scriptXML);
    // if content contains only a number, for example, the parser treats it like a JS number, instead of a JS string
    if (jsonObj.script['#text']) {
        jsonObj.script['#text'] = String(jsonObj.script['#text']);
    }
    const content = {
        name: scriptName,
        path: path,
        file: jsonObj,
    };
    return content;
}
exports.readAppMakerSingleScript = readAppMakerSingleScript;
async function readAppMakerScripts(pathToProject, scriptsNames) {
    const scriptFiles = await Promise.all(scriptsNames.map(name => readAppMakerSingleScript(pathToProject, name)));
    return scriptFiles;
}
exports.readAppMakerScripts = readAppMakerScripts;
async function readAppMakerSingleModel(pathToProject, modelName) {
    const path = `${getPathToModels(pathToProject)}/${modelName}`;
    const scriptXML = await readFile(path, 'utf-8');
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: '',
    };
    const parser = new XMLParser(options);
    let jsonObj = parser.parse(scriptXML);
    const content = {
        name: modelName,
        path: path,
        file: jsonObj,
    };
    return content;
}
exports.readAppMakerSingleModel = readAppMakerSingleModel;
async function readAppMakerModels(pathToProject, modelsNames) {
    const modelFiles = await Promise.all(modelsNames.map(name => readAppMakerSingleModel(pathToProject, name)));
    return modelFiles;
}
exports.readAppMakerModels = readAppMakerModels;
async function readAppMakerSingleView(pathToProject, viewName) {
    const path = `${getPathToViews(pathToProject)}/${viewName}`;
    const scriptXML = await readFile(path, 'utf-8');
    const options = {
        ignoreAttributes: false,
        attributeNamePrefix: '',
    };
    const parser = new XMLParser(options);
    let jsonObj = parser.parse(scriptXML);
    const content = {
        name: viewName,
        path: path,
        file: jsonObj,
    };
    return content;
}
exports.readAppMakerSingleView = readAppMakerSingleView;
async function readAppMakerViews(pathToProject, modelsNames) {
    const viewFiles = await Promise.all(modelsNames.map(name => readAppMakerSingleView(pathToProject, name)));
    return viewFiles;
}
exports.readAppMakerViews = readAppMakerViews;
async function generateJSProjectForAppMaker(pathToProject, scriptsFiles, tsConfig, eslintConfig, app) {
    try {
        await access(pathToProject, constants.F_OK);
        await rm(pathToProject, { recursive: true });
    }
    catch { }
    await mkdir(pathToProject);
    const tsFilesToCheck = [];
    for (let i = 0; i < scriptsFiles.length; i++) {
        const { name, file } = scriptsFiles[i];
        console.log(`-----${name}-----`);
        if (file.script['#text']) {
            const pathToFileTSFile = `${pathToProject}/${name.replace('.xml', '.js')}`;
            console.log(pathToFileTSFile);
            await writeFile(pathToFileTSFile, file.script['#text']);
            tsFilesToCheck.push(pathToFileTSFile);
        }
    }
    const pathToTypes = `${pathToProject}/type`;
    const files = tsFilesToCheck.concat([
        `${pathToProject}/__models.js`, `${pathToTypes}/index.d.ts`, `${pathToTypes}/logger.d.ts`, `${pathToTypes}/dataService.d.ts`,
    ]);
    const conf = { ...tsConfig.compilerOptions, moduleResolution: ts.ModuleResolutionKind.NodeJs, noEmit: true, allowJs: true, checkJs: true };
    await writeFile(`${pathToProject}/tsconfig.json`, JSON.stringify({ files: files, compilerOptions: { ...conf, moduleResolution: 'node' } }, null, 2));
    await writeFile(`${pathToProject}/.eslintrc`, JSON.stringify(eslintConfig, null, 2));
    await mkdir(pathToTypes);
    await copyFile(`${__dirname.split('/').slice(0, __dirname.split('/').length - 1).join('/')}/src/appmaker/logger.d.ts`, `${pathToTypes}/logger.d.ts`);
    await copyFile(`${__dirname.split('/').slice(0, __dirname.split('/').length - 1).join('/')}/src/appmaker/dataService.d.ts`, `${pathToTypes}/dataService.d.ts`);
    await writeFile(`${pathToTypes}/index.d.ts`, app.generateAppDeclarationFile());
    await writeFile(`${pathToProject}/__models.js`, app.generateDatasourceSourceFile());
    return files;
}
exports.generateJSProjectForAppMaker = generateJSProjectForAppMaker;
async function writeValidatedScriptsToAppMakerXML(scriptsFiles, lintingReport, pathToProject) {
    const promise = [];
    for (let i = 0; i < scriptsFiles.length; i++) {
        const { name, file } = scriptsFiles[i];
        const report = lintingReport.find(report => report.name === name);
        if (report) {
            console.log('write fixed after linting file', name);
            const res = (0, generate_1.generateResultXML)(file, report.report.output);
            promise.push(writeFile(`${getPathToScrips(pathToProject)}/${name}`, res));
        }
    }
    return Promise.all(promise);
}
exports.writeValidatedScriptsToAppMakerXML = writeValidatedScriptsToAppMakerXML;
