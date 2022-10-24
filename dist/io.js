"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAppMakerViews = exports.readAppMakerSingleView = exports.readAppMakerModels = exports.readAppMakerSingleModel = exports.readAppMakerScripts = exports.readAppMakerSingleScript = exports.getViewsNames = exports.getModelsNames = exports.getScriptsNames = exports.readLinterConfig = exports.readTSConfig = exports.getPathToViews = exports.getPathToModels = exports.getPathToScrips = void 0;
const { stat: oldStat, readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile, rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess, constants, } = require('fs');
const { promisify } = require('util');
const { XMLParser } = require('fast-xml-parser');
const readFile = promisify(oldReadFile);
const readdir = promisify(oldReaddir);
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
