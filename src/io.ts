const {
  readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile,
  rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess,
  constants,
} = require('fs');
const { promisify } = require('util');
const { XMLParser } = require('fast-xml-parser');
import { ModelFile, ScriptFile, ViewFile } from './appmaker';
import { Linter } from 'eslint';
import * as ts from 'typescript';
import { App } from './appmaker/app';
import { generateResultXML } from './generate';
import { LintingReport } from './validate';
import { TSConfig } from './appmaker/app-validatior';
import { logger } from './logger';

const readFile = promisify(oldReadFile);
const readdir = promisify(oldReaddir);
const access = promisify(oldAccess);
const writeFile = promisify(oldWriteFile);
const rm = promisify(oldRm);
const mkdir = promisify(oldMkDir);
const copyFile = promisify(oldCopyFile);

export function getPathToScrips(pathToProject: string): string {
  return `${pathToProject}/scripts`;
}

export function getPathToModels(pathToProject: string): string {
  return `${pathToProject}/models`;
}

export function getPathToViews(pathToProject: string): string {
  return `${pathToProject}/views`;
}

export async function readTSConfig(): Promise<TSConfig> {
  const tsConfig: TSConfig = JSON.parse(await readFile('./tsconfig.json', 'utf-8'));

  return tsConfig;
}

export async function readLinterConfig(): Promise<Linter.Config<Linter.RulesRecord>> {
  // TODO: fix file path to eslint config
  const linterConfig: Linter.Config<Linter.RulesRecord> = JSON.parse(await readFile('./.eslintrc', 'utf-8'));

  return linterConfig;
}

export function getScriptsNames(pathToProject: string): Promise<Array<string>> {
  return readdir(getPathToScrips(pathToProject))
    .catch(() => []);
}

export function getModelsNames(pathToProject: string): Promise<Array<string>> {
  return readdir(getPathToModels(pathToProject))
    .catch(() => []);
}

export function getViewsNames(pathToProject: string): Promise<Array<string>> {
  return readdir(getPathToViews(pathToProject))
    .catch(() => []);
}

export type AppMakerScriptContent = { name: string; path: string; file: ScriptFile };
export type AppMakerScriptFolderContent = Array<AppMakerScriptContent>;

export async function readAppMakerSingleScript(pathToProject: string, scriptName: string): Promise<AppMakerScriptContent | null> {
  const path = `${getPathToScrips(pathToProject)}/${scriptName}`;
  try {
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
  } catch (e) {
    return null;
  }
}

export async function readAppMakerScripts(pathToProject: string, scriptsNames: Array<string>): Promise<AppMakerScriptFolderContent> {
  const scriptFiles: AppMakerScriptFolderContent = (await Promise.all(scriptsNames.map(name => readAppMakerSingleScript(pathToProject, name))))
    .filter((v): v is AppMakerScriptContent => v !== null);

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

export async function generateJSProjectForAppMaker(pathToProject: string, app: App): Promise<Array<string>> {
  try {
    await access(pathToProject, constants.F_OK);
    await rm(pathToProject, { recursive: true });
  } catch {}

  await mkdir(pathToProject);

  const tsFilesToCheck: string[] = [];

  for (let i = 0; i < app.scripts.length; i++) {
    let { name, code } = app.scripts[i]!;
    code = code || '';

    logger.log(`-----${name}-----`);

    const pathToFileTSFile = `${pathToProject}/${name}.js`;
    logger.log(pathToFileTSFile);
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
    const view = generatedViews[i]!;

    // TODO: use path instead of view name
    await writeFile(`${pathToViews}/${view.name}.jsx`, view.code);
  }

  return files;
}

export async function writeValidatedScriptsToAppMakerXML(
  app: App, lintingReport: LintingReport, pathToProject: string,
): Promise<void[]> {
  const promise: Array<Promise<void>> = [];

  for (let i = 0; i < app.scripts.length; i++) {
    const script = app.scripts[i]!;
    const report = lintingReport.find(report => report.name === script.name);

    if (report) {
      logger.log('write fixed after linting file', script.name);

      const res = generateResultXML(script, report.report.output);

      // TODO: path should come from script object
      promise.push(writeFile(`${getPathToScrips(pathToProject)}/${script.name}.xml`, res));
    }
  }

  return Promise.all(promise);
}
