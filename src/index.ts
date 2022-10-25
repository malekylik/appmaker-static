import { ApplicationMode, parseCommandLineArgs } from './command-line';
import { handleRemoteApplicationMode } from './handlers';

// const passedPath = process.argv[2];

//  node ./dist/index.js "/usr/local/google/home/kalinouski/Downloads/Spotlight 2.0_last.zip"

async function run() {
  const options = parseCommandLineArgs();

  console.log(`Run with mode "${options.mode}"`);

  if (options.mode === ApplicationMode.remote) {
    await handleRemoteApplicationMode(options);
  } else {
    console.log(`Unsupported modes: "${ApplicationMode.interactive}", "${ApplicationMode.offline}"`);
  }
}

run();
