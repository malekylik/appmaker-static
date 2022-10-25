const { stat: oldStat, rm: oldRm } = require('fs');
const { promisify } = require('util');

const rm = promisify(oldRm);
const exec = promisify(require('node:child_process').exec);

export async function postZipActionsHandler(pathToZip: string, pathToProject: string, outDir: string) {
  console.log('post actions');

  process.chdir(pathToProject);
  console.log('zip to', `${outDir}/app.zip`);
  await exec(`zip -r "${outDir}/app.zip" *`);

  console.log('remove', pathToZip);
  await rm(pathToZip);

  console.log('remove', pathToProject);
  await rm(pathToProject, { recursive: true });
}
