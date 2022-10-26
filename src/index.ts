import { ApplicationMode, parseCommandLineArgs } from './command-line';
import { handleOfflineApplicationMode, handleRemoteApplicationMode } from './handlers';

async function run() {
  const options = parseCommandLineArgs();

  console.log(`Run with mode "${options.mode}"`);

  if (options.mode === ApplicationMode.remote) {
    await handleRemoteApplicationMode(options);
  } if (options.mode === ApplicationMode.offline) {
    await handleOfflineApplicationMode(options);
  } else {
    console.log(`Unsupported modes: "${ApplicationMode.interactive}"`);
  }
}

run();
