"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeValidatedScriptsToAppMakerXML = exports.generateJSProjectForAppMaker = exports.readAppMakerViews = exports.readAppMakerSingleView = exports.readAppMakerModels = exports.readAppMakerSingleModel = exports.readAppMakerScripts = exports.readAppMakerSingleScript = exports.getViewsNames = exports.getModelsNames = exports.getScriptsNames = exports.readLinterConfig = exports.readTSConfig = exports.getPathToViews = exports.getPathToModels = exports.getPathToScrips = void 0;
const { readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile, rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess, constants, } = require('fs');
const { promisify } = require('util');
const { XMLParser } = require('fast-xml-parser');
const ts = require("typescript");
const generate_1 = require("./generate");
const logger_1 = require("./logger");
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
    return readdir(getPathToScrips(pathToProject))
        .catch(() => []);
}
exports.getScriptsNames = getScriptsNames;
function getModelsNames(pathToProject) {
    return readdir(getPathToModels(pathToProject))
        .catch(() => []);
}
exports.getModelsNames = getModelsNames;
function getViewsNames(pathToProject) {
    return readdir(getPathToViews(pathToProject))
        .catch(() => []);
}
exports.getViewsNames = getViewsNames;
async function readAppMakerSingleScript(pathToProject, scriptName) {
    const path = `${getPathToScrips(pathToProject)}/${scriptName}`;
    try {
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
    catch (e) {
        return null;
    }
}
exports.readAppMakerSingleScript = readAppMakerSingleScript;
async function readAppMakerScripts(pathToProject, scriptsNames) {
    const scriptFiles = (await Promise.all(scriptsNames.map(name => readAppMakerSingleScript(pathToProject, name))))
        .filter((v) => v !== null);
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
async function generateJSProjectForAppMaker(pathToProject, app) {
    try {
        await access(pathToProject, constants.F_OK);
        await rm(pathToProject, { recursive: true });
    }
    catch { }
    await mkdir(pathToProject);
    const tsFilesToCheck = [];
    for (let i = 0; i < app.scripts.length; i++) {
        let { name, code } = app.scripts[i];
        code = code || '';
        logger_1.logger.log(`-----${name}-----`);
        const pathToFileTSFile = `${pathToProject}/${name}.js`;
        logger_1.logger.log(pathToFileTSFile);
        await writeFile(pathToFileTSFile, code);
        tsFilesToCheck.push(pathToFileTSFile);
    }
    const generatedViews = app.generateJSXForViews();
    const pathToTypes = `${pathToProject}/type`;
    const pathToViews = `${pathToProject}/views`;
    const files = tsFilesToCheck.concat([
        `${pathToProject}/__models.js`,
        // `${pathToProject}/__events.js`,
        `${pathToTypes}/index.d.ts`, `${pathToTypes}/logger.d.ts`, `${pathToTypes}/services.d.ts`, `${pathToTypes}/dataService.d.ts`, `${pathToTypes}/cloudSqlService.d.ts`, `${pathToTypes}/userProvider.d.ts`
        // ...generatedViews.map(view => `${pathToViews}/${view.name}.jsx`), TODO: uncomment when types for jsx is created
    ]);
    const tsConfig = app.getAppValidator().getTSConfig();
    if (tsConfig) {
        const conf = {
            ...tsConfig.compilerOptions, moduleResolution: ts.ModuleResolutionKind.Node16, noEmit: true, allowJs: true, checkJs: true,
            jsx: 'react-jsx',
        };
        await writeFile(`${pathToProject}/tsconfig.json`, JSON.stringify({ files: files, compilerOptions: { ...conf, moduleResolution: 'node' } }, null, 2));
    }
    const eslintConfig = app.getAppValidator().getLintConfig();
    if (eslintConfig) {
        await writeFile(`${pathToProject}/.eslintrc`, JSON.stringify(eslintConfig, null, 2));
    }
    await mkdir(pathToTypes);
    await mkdir(pathToViews);
    await copyFile(`${__dirname.split('/').slice(0, __dirname.split('/').length - 1).join('/')}/src/appmaker/logger.d.ts`, `${pathToTypes}/logger.d.ts`);
    await copyFile(`${__dirname.split('/').slice(0, __dirname.split('/').length - 1).join('/')}/src/appmaker/services.d.ts`, `${pathToTypes}/services.d.ts`);
    await copyFile(`${__dirname.split('/').slice(0, __dirname.split('/').length - 1).join('/')}/src/appmaker/cloudSqlService.d.ts`, `${pathToTypes}/cloudSqlService.d.ts`);
    await copyFile(`${__dirname.split('/').slice(0, __dirname.split('/').length - 1).join('/')}/src/appmaker/userProvider.d.ts`, `${pathToTypes}/userProvider.d.ts`);
    await writeFile(`${pathToTypes}/index.d.ts`, app.generateAppDeclarationFile());
    await writeFile(`${pathToTypes}/dataService.d.ts`, app.generateDataserviceSourceFile());
    await writeFile(`${pathToProject}/__models.js`, app.generateDatasourceSourceFile());
    await writeFile(`${pathToProject}/__events.js`, app.generateWidgetEventsSourceFile());
    for (let i = 0; i < generatedViews.length; i++) {
        const view = generatedViews[i];
        // TODO: use path instead of view name
        await writeFile(`${pathToViews}/${view.name}.jsx`, view.code);
    }
    return files;
}
exports.generateJSProjectForAppMaker = generateJSProjectForAppMaker;
async function writeValidatedScriptsToAppMakerXML(app, lintingReport, pathToProject) {
    const promise = [];
    for (let i = 0; i < app.scripts.length; i++) {
        const script = app.scripts[i];
        const report = lintingReport.find(report => report.name === script.name);
        if (report) {
            logger_1.logger.log('write fixed after linting file', script.name);
            const res = (0, generate_1.generateResultXML)(script, report.report.output);
            // TODO: path should come from script object
            promise.push(writeFile(`${getPathToScrips(pathToProject)}/${script.name}.xml`, res));
        }
    }
    return Promise.all(promise);
}
exports.writeValidatedScriptsToAppMakerXML = writeValidatedScriptsToAppMakerXML;
