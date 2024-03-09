"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_line_1 = require("./command-line");
const handlers_1 = require("./handlers");
const logger_1 = require("./logger");
async function run() {
    const options = (0, command_line_1.parseCommandLineArgs)();
    logger_1.logger.log(`Run with mode "${options.mode}"`);
    try {
        if (options.mode === command_line_1.ApplicationMode.remote) {
            await (0, handlers_1.handleRemoteApplicationMode)(options);
        }
        if (options.mode === command_line_1.ApplicationMode.offline) {
            await (0, handlers_1.handleOfflineApplicationMode)(options);
        }
        if (options.mode === command_line_1.ApplicationMode.interactive) {
            await (0, handlers_1.handleInteractiveApplicationMode)(options);
        }
        else {
            logger_1.logger.log(`Unsupported modes: "${options.mode}"`);
        }
    }
    catch (e) {
        logger_1.logger.log(e);
    }
}
run();
