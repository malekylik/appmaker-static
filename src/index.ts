import { ApplicationMode, joinOptions, parseCommandLineArgs, readAppMakerStaticConfig, readPasswordFromUser } from './command-line';
import { handleInteractiveApplicationMode, handleOfflineApplicationMode, handleRemoteApplicationMode } from './handlers';
import { logger } from './logger';

async function run() {
  const options = parseCommandLineArgs();
  const config = await readAppMakerStaticConfig();
  const joinedOptions = await joinOptions(options, config, readPasswordFromUser);

  logger.log(`Run with mode "${options.mode}"`);

  try {
    if (joinedOptions.mode === ApplicationMode.remote) {
      await handleRemoteApplicationMode(joinedOptions);
    } if (joinedOptions.mode === ApplicationMode.offline) {
      await handleOfflineApplicationMode(joinedOptions);
    } if (joinedOptions.mode === ApplicationMode.interactive) {
      await handleInteractiveApplicationMode(joinedOptions);
    } else {
      logger.log(`Unsupported modes: "${joinedOptions.mode}"`);
    }
  } catch (e) {
    logger.log(e);
  }
}

run();
