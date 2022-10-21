const {
  stat: oldStat, readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile,
  rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess,
  constants,
} = require('fs');
const { promisify } = require('util');
const { XMLParser } = require('fast-xml-parser');
const path = require('path');
import { generateResultXML } from './generate';
import { lint } from './validate';
import { ModelFile, ScriptFile, ViewFile } from './appmaker';
import * as ts from 'typescript';
import * as commandLineArgs from 'command-line-args';
import { App, Model, View } from './appmaker/app';
import { callAppMakerApp } from './appmaker-network';

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

//  node ./dist/index.js "/usr/local/google/home/kalinouski/Downloads/Spotlight 2.0_last.zip"

interface Options {
  appId?: string; login?: string; password?: string;
}

const options: Options = commandLineArgs(optionDefinitions) as Options;

const getViewName = (view: ViewFile) => view.component.property.find(property => property.name === 'name')?.['#text'] ?? '';
const getIsViewFragment = (view: ViewFile) => view.component.property.find(property => property.name === 'isCustomWidget');

async function run() {
  const {
    appId, login, password,
  } = options;


  if (appId) {
    if (login === undefined || password === undefined) {
      console.log('For using script in remote mode please pass login and password');

      process.exit(1);
    }
  } else {
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

  await callAppMakerApp(applicationId, credentials);
  let passedPath = __dirname + '/app.zip';

  let pathStat = null;

  try {
    pathStat = await stat(passedPath);
  } catch {
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
    } catch (e) {
      console.log(`Fail to unzip file ${passedPath} to ${pathToProject}`);
      console.log(e);
      process.exit(1);
    }
  }

  if (pathStat.isDirectory() || isZip) {
    const [scriptStat] = await Promise.all([
        stat(`${pathToProject}/scripts`)
    ]);
    const scriptsNames: Array<string> = await readdir(`${pathToProject}/scripts`);
    const modelsNames: Array<string> = await readdir(`${pathToProject}/models`);
    const viewsNames: Array<string> = await readdir(`${pathToProject}/views`);

    // TODO: fix file path to eslint config
    const linterConfig = JSON.parse(await readFile('./.eslintrc', 'utf-8'));
    const tsconfigConfig: { compilerOptions: any } = JSON.parse(await readFile('./tsconfig.json', 'utf-8'));

    const scriptFiles: Array<{ name: string; path: string; file: ScriptFile }> = [];
    const emptyScripts: string[] = [];

    for (let i = 0; i < scriptsNames.length; i++) {
      const scriptXML = await readFile(`${pathToProject}/scripts/${scriptsNames[i]}`, 'utf-8');
      // console.log(scriptsNames[i], 'xml', scriptXML);

      const options = {
        ignoreAttributes : false,
        attributeNamePrefix: '',
      };

      const parser = new XMLParser(options);
      let jsonObj: ScriptFile = parser.parse(scriptXML);

      scriptFiles.push({
        name: scriptsNames[i]!,
        path: `${pathToProject}/scripts/${scriptsNames[i]}`,
        file: jsonObj,
      });
    }

    const modelFiles: Array<{ name: string; path: string; file: ModelFile }> = [];
    const app = new App();

    for (let i = 0; i < modelsNames.length; i++) {
      const scriptXML = await readFile(`${pathToProject}/models/${modelsNames[i]}`, 'utf-8');

      const options = {
        ignoreAttributes : false,
        attributeNamePrefix: '',
      };

      const parser = new XMLParser(options);
      let jsonObj: ModelFile = parser.parse(scriptXML);

      modelFiles.push({
        name: modelsNames[i]!,
        path: `${pathToProject}/models/${modelsNames[i]}`,
        file: jsonObj,
      });

      const model: Model = {
        name: jsonObj.model.name,
        fields: jsonObj.model.field.map(field => ({ ...field, required: field.required === 'true' ? true : false })),
        dataSources: Array.isArray(jsonObj.model.dataSource) ? jsonObj.model.dataSource : [jsonObj.model.dataSource]
      };

      app.addModel(model);
    }

    const viewsFiles: Array<{ name: string; path: string; file: ViewFile }> = [];

    for (let i = 0; i < viewsNames.length; i++) {
      const scriptXML = await readFile(`${pathToProject}/views/${viewsNames[i]}`, 'utf-8');

      const options = {
        ignoreAttributes : false,
        attributeNamePrefix: '',
      };

      const parser = new XMLParser(options);
      let jsonObj: ViewFile = parser.parse(scriptXML);

      viewsFiles.push({
        name: viewsNames[i]!,
        path: `${pathToProject}/views/${viewsNames[i]}`,
        file: jsonObj,
      });

      const view: View = {
        name: getViewName(viewsFiles[i]!.file),
        key: viewsFiles[i]!.file.component.key,
        class: viewsFiles[i]!.file.component.class,
        isViewFragment: !!getIsViewFragment(viewsFiles[i]!.file)?.['#text'],
      };

      app.addView(view);
    }

    // console.log('modelFiles', viewsFiles.map(view => ({ name: view.name, isViewFragment: !!getIsViewFragment(view.file)?.['#text'] })).sort((a, b) => Number(a.isViewFragment) - Number(b.isViewFragment)));
    // console.log('modelFiles', JSON.stringify(modelFiles, null, 2));

    const pathToTempDir = `${__dirname}/temp`;

    try {
      await access(pathToTempDir, constants.F_OK);
      await rm(pathToTempDir, { recursive: true });
    } catch {}

    await mkdir(pathToTempDir);

    const tsFilesToCheck: string[] = [];

    for (let i = 0; i < scriptFiles.length; i++) {
      const { name, file } = scriptFiles[i]!;

      console.log(`-----${name}-----`);

      if (file.script['#text']) {
        const pathToFileTSFile = `${pathToTempDir}/${name.replace('.xml', '.js')}`;
        console.log(pathToFileTSFile);
        await writeFile(pathToFileTSFile, String(file.script['#text']));

        tsFilesToCheck.push(pathToFileTSFile);
      }
    }

    if (tsFilesToCheck.length > 0) {
      const pathToTypes = `${pathToTempDir}/type`;
      const files = tsFilesToCheck.concat([`${pathToTypes}/index.d.ts`, `${pathToTypes}/logger.d.ts`]);
      const conf = { ...tsconfigConfig.compilerOptions, moduleResolution: ts.ModuleResolutionKind.NodeJs, noEmit: true, allowJs: true, checkJs: true };
      writeFile(`${pathToTempDir}/tsconfig.json`, JSON.stringify({ files: files, compilerOptions: { ...conf, moduleResolution: 'node' } }, null, 2));

      await mkdir(pathToTypes);

      await copyFile(`${__dirname.split('/').slice(0, __dirname.split('/').length - 1).join('/')}/src/appmaker/logger.d.ts`, `${pathToTypes}/logger.d.ts`);
      await writeFile(`${pathToTypes}/index.d.ts`, app.generateAppDeclarationFile());

      let program = ts.createProgram(files, conf);
      let emitResult = program.emit();
  
      let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
  
      allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
          let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
          let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
          console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
      });

      if (allDiagnostics.length) {
        console.log('TS check doenst pass. Skip the rest');

       if (isZip) {
         await rm(pathToProject, { recursive: true });
       }

        process.exit(1);
      }
    }


    for (let i = 0; i < scriptFiles.length; i++) {
      const { name, file } = scriptFiles[i]!;

      console.log(`-----${name}-----`);

      let write = false;
      // console.log('type', jsonObj.script.type);
  // console.log('jsonObj', jsonObj);
      if (file.script['#text']) {
        const messages = lint(file.script['#text'], linterConfig, scriptsNames[i]);
        // console.log('messages', messages);
        write = messages.fixed;

        if (write) {
  //      console.log('text', jsonObj.script['#text']);
  //        console.log('res', generateResultXML(jsonObj, messages.output));
            const res = generateResultXML(file, messages.output);
  //          const res = scriptXML.replace(/CDATA\[[\s\S]*\]/, 'CDATA[' + messages.output + ']]');
          console.log('lint res', messages.messages);
          writeFile(`${pathToProject}/scripts/${scriptsNames[i]}`, res);
        } else if(messages.messages.length > 0) {
          console.log('Not fixed', messages.messages, messages.output);
        }
      } else {
        emptyScripts.push(scriptsNames[i]!);
      }
    }

    console.log('empty scripts', emptyScripts);

   if (isZip) {
      await rm(passedPath);
      process.chdir(pathToProject);
      await exec(`zip -r "${passedPath}" *`);
      await rm(pathToProject, { recursive: true });
    }
  } else {
    console.log('Doest support file or directory doesnt extist');
    process.exit(1);
  }
}

run();
