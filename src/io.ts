const {
  stat: oldStat, readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile,
  rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess,
  constants,
} = require('fs');
const { promisify } = require('util');
const { XMLParser } = require('fast-xml-parser');
import { ModelFile, ScriptFile, ViewFile } from './appmaker';
import { Linter } from 'eslint';

const readFile = promisify(oldReadFile);
const readdir = promisify(oldReaddir);

export function getPathToScrips(pathToProject: string): string {
  return `${pathToProject}/scripts`;
}

export function getPathToModels(pathToProject: string): string {
  return `${pathToProject}/models`;
}

export function getPathToViews(pathToProject: string): string {
  return `${pathToProject}/views`;
}


export async function readTSConfig() {
  const tsConfig: { compilerOptions: any } = JSON.parse(await readFile('./tsconfig.json', 'utf-8'));

  return tsConfig;
}

export async function readLinterConfig(): Promise<Linter.Config<Linter.RulesRecord>> {
  // TODO: fix file path to eslint config
  const linterConfig: Linter.Config<Linter.RulesRecord> = JSON.parse(await readFile('./.eslintrc', 'utf-8'));


  return linterConfig;
}

export function getScriptsNames(pathToProject: string): Promise<Array<string>> {
  return readdir(getPathToScrips(pathToProject));
}

export function getModelsNames(pathToProject: string): Promise<Array<string>> {
  return readdir(getPathToModels(pathToProject));
}

export function getViewsNames(pathToProject: string): Promise<Array<string>> {
  return readdir(getPathToViews(pathToProject));
}

export type AppMakerScriptContent = { name: string; path: string; file: ScriptFile };
export type AppMakerScriptFolderContent = Array<AppMakerScriptContent>;

export async function readAppMakerSingleScript(pathToProject: string, scriptName: string): Promise<AppMakerScriptContent> {
  const path = `${getPathToScrips(pathToProject)}/${scriptName}`;
  const scriptXML = await readFile(path, 'utf-8');


  const options = {
    ignoreAttributes : false,
    attributeNamePrefix: '',
  };

  const parser = new XMLParser(options);
  let jsonObj: ScriptFile = parser.parse(scriptXML);

  // if content contains only a number, for example, the parser treats it like a JS number, instead of a JS string
  if (jsonObj.script['#text']) {
    jsonObj.script['#text'] = String(jsonObj.script['#text']);
  }

  const content: AppMakerScriptContent = {
    name: scriptName,
    path: path,
    file: jsonObj,
  };

  return content;
}

export async function readAppMakerScripts(pathToProject: string, scriptsNames: Array<string>): Promise<AppMakerScriptFolderContent> {
  const scriptFiles: AppMakerScriptFolderContent = await Promise.all(scriptsNames.map(name => readAppMakerSingleScript(pathToProject, name)));

  return scriptFiles;
}

export type AppMakerModelContent = { name: string; path: string; file: ModelFile };
export type AppMakerModelFolderContent = Array<AppMakerModelContent>;

export async function readAppMakerSingleModel(pathToProject: string, modelName: string): Promise<AppMakerModelContent> {
  const path = `${getPathToModels(pathToProject)}/${modelName}`;
  const scriptXML = await readFile(path, 'utf-8');


  const options = {
    ignoreAttributes : false,
    attributeNamePrefix: '',
  };

  const parser = new XMLParser(options);
  let jsonObj: ModelFile = parser.parse(scriptXML);

  const content: AppMakerModelContent = {
    name: modelName,
    path: path,
    file: jsonObj,
  };

  return content;
}

export async function readAppMakerModels(pathToProject: string, modelsNames: Array<string>): Promise<AppMakerModelFolderContent> {
  const modelFiles: AppMakerModelFolderContent = await Promise.all(modelsNames.map(name => readAppMakerSingleModel(pathToProject, name)));

  return modelFiles;
}


export type AppMakerViewContent = { name: string; path: string; file: ViewFile };
export type AppMakerViewFolderContent = Array<AppMakerViewContent>;

export async function readAppMakerSingleView(pathToProject: string, viewName: string): Promise<AppMakerViewContent> {
  const path = `${getPathToViews(pathToProject)}/${viewName}`;
  const scriptXML = await readFile(path, 'utf-8');

  const options = {
    ignoreAttributes : false,
    attributeNamePrefix: '',
  };

  const parser = new XMLParser(options);
  let jsonObj: ViewFile = parser.parse(scriptXML);

  const content: AppMakerViewContent = {
    name: viewName,
    path: path,
    file: jsonObj,
  };

  return content;
}

export async function readAppMakerViews(pathToProject: string, modelsNames: Array<string>): Promise<AppMakerViewFolderContent> {
  const viewFiles: AppMakerViewFolderContent = await Promise.all(modelsNames.map(name => readAppMakerSingleView(pathToProject, name)));

  return viewFiles;
}


