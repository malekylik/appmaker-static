"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postZipActionsHandler = void 0;
const { stat: oldStat, rm: oldRm } = require('fs');
const { promisify } = require('util');
const rm = promisify(oldRm);
const exec = promisify(require('node:child_process').exec);
async function postZipActionsHandler(pathToZip, pathToProject, outDir) {
    console.log('post actions');
    process.chdir(pathToProject);
    console.log('zip to', `${outDir}/app.zip`);
    await exec(`zip -r "${outDir}/app.zip" *`);
    console.log('remove', pathToZip);
    await rm(pathToZip);
    console.log('remove', pathToProject);
    await rm(pathToProject, { recursive: true });
}
exports.postZipActionsHandler = postZipActionsHandler;
