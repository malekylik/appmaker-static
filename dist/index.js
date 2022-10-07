"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { stat: oldStat, readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile, rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile } = require('fs');
const { promisify } = require('util');
const { XMLParser } = require('fast-xml-parser');
const path = require('path');
const generate_1 = require("./generate");
const validate_1 = require("./validate");
const ts = require("typescript");
const stat = promisify(oldStat);
const readdir = promisify(oldReaddir);
const readFile = promisify(oldReadFile);
const writeFile = promisify(oldWriteFile);
const rm = promisify(oldRm);
const mkdir = promisify(oldMkDir);
const copyFile = promisify(oldCopyFile);
const exec = promisify(require('node:child_process').exec);
const passedPath = process.argv[2];
async function run() {
    if (!passedPath) {
        console.log('Pass path as second arg');
        process.exit(1);
    }
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
        const [scriptStat] = await Promise.all([
            stat(`${pathToProject}/scripts`)
        ]);
        const scriptsNames = await readdir(`${pathToProject}/scripts`);
        // TODO: fix file path to eslint config
        const linterConfig = JSON.parse(await readFile('./.eslintrc', 'utf-8'));
        const tsconfigConfig = JSON.parse(await readFile('./tsconfig.json', 'utf-8'));
        const files = [];
        const emptyScripts = [];
        for (let i = 0; i < scriptsNames.length; i++) {
            const scriptXML = await readFile(`${pathToProject}/scripts/${scriptsNames[i]}`, 'utf-8');
            // console.log(scriptsNames[i], 'xml', scriptXML);
            const options = {
                ignoreAttributes: false,
                attributeNamePrefix: '',
            };
            const parser = new XMLParser(options);
            let jsonObj = parser.parse(scriptXML);
            files.push({
                name: scriptsNames[i],
                path: `${pathToProject}/scripts/${scriptsNames[i]}`,
                file: jsonObj,
            });
        }
        const pathToTempDir = `${__dirname}/temp`;
        await mkdir(pathToTempDir);
        const tsFilesToCheck = [];
        for (let i = 0; i < files.length; i++) {
            const { name, file } = files[i];
            console.log(`-----${name}-----`);
            if (file.script['#text']) {
                const pathToFileTSFile = `${pathToTempDir}/${name.replace('.xml', '.js')}`;
                console.log(pathToFileTSFile);
                await writeFile(pathToFileTSFile, file.script['#text']);
                tsFilesToCheck.push(pathToFileTSFile);
            }
        }
        if (tsFilesToCheck.length > 0) {
            const pathToTypes = `${pathToTempDir}/type`;
            const files = tsFilesToCheck.concat([`${pathToTypes}/index.d.ts`]);
            const conf = { ...tsconfigConfig.compilerOptions, moduleResolution: ts.ModuleResolutionKind.NodeJs, noEmit: true, allowJs: true, checkJs: true };
            writeFile(`${pathToTempDir}/tsconfig.json`, JSON.stringify({ files: files, compilerOptions: { ...conf, moduleResolution: 'node' } }, null, 2));
            await mkdir(pathToTypes);
            await copyFile(`${__dirname.split('/').slice(0, __dirname.split('/').length - 1).join('/')}/src/appmaker/index.d.ts`, `${pathToTypes}/index.d.ts`);
            let program = ts.createProgram(files, conf);
            let emitResult = program.emit();
            let allDiagnostics = ts
                .getPreEmitDiagnostics(program)
                .concat(emitResult.diagnostics);
            allDiagnostics.forEach(diagnostic => {
                if (diagnostic.file) {
                    let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
                    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
                }
                else {
                    console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
                }
            });
            if (allDiagnostics.length) {
                console.log('TS check doenst pass. Skip the rest');
                process.exit(1);
            }
        }
        for (let i = 0; i < files.length; i++) {
            const { name, file } = files[i];
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
                    console.log('lint res', messages.messages, res);
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
