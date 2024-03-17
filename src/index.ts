import { ApplicationMode, parseCommandLineArgs } from './command-line';
import { handleInteractiveApplicationMode, handleOfflineApplicationMode, handleRemoteApplicationMode } from './handlers';
import { logger } from './logger';

async function run() {
  const options = parseCommandLineArgs();

  logger.log(`Run with mode "${options.mode}"`);

  try {
    if (options.mode === ApplicationMode.remote) {
      await handleRemoteApplicationMode(options);
    } if (options.mode === ApplicationMode.offline) {
      await handleOfflineApplicationMode(options);
    } if (options.mode === ApplicationMode.interactive) {
      await handleInteractiveApplicationMode(options);
    } else {
      logger.log(`Unsupported modes: "${options.mode}"`);
    }
  } catch (e) {
    logger.log(e);
  }
}

run();
