"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_line_1 = require("./command-line");
const handlers_1 = require("./handlers");
const logger_1 = require("./logger");
async function run() {
    const options = (0, command_line_1.parseCommandLineArgs)();
    const config = await (0, command_line_1.readAppMakerStaticConfig)();
    const joinedOptions = await (0, command_line_1.joinOptions)(options, config, command_line_1.readPasswordFromUser);
    logger_1.logger.log(`Run with mode "${options.mode}"`);
    try {
        if (joinedOptions.mode === command_line_1.ApplicationMode.remote) {
            await (0, handlers_1.handleRemoteApplicationMode)(joinedOptions);
        }
        if (joinedOptions.mode === command_line_1.ApplicationMode.offline) {
            await (0, handlers_1.handleOfflineApplicationMode)(joinedOptions);
        }
        if (joinedOptions.mode === command_line_1.ApplicationMode.interactive) {
            await (0, handlers_1.handleInteractiveApplicationMode)(joinedOptions);
        }
        else {
            logger_1.logger.log(`Unsupported modes: "${joinedOptions.mode}"`);
        }
    }
    catch (e) {
        logger_1.logger.log(e);
    }
}
run();
