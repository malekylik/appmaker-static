"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_line_1 = require("./command-line");
const handlers_1 = require("./handlers");
// const passedPath = process.argv[2];
//  node ./dist/index.js "/usr/local/google/home/kalinouski/Downloads/Spotlight 2.0_last.zip"
async function run() {
    const options = (0, command_line_1.parseCommandLineArgs)();
    console.log(`Run with mode "${options.mode}"`);
    if (options.mode === command_line_1.ApplicationMode.remote) {
        await (0, handlers_1.handleRemoteApplicationMode)(options);
    }
    else {
        console.log(`Unsupported modes: "${command_line_1.ApplicationMode.interactive}", "${command_line_1.ApplicationMode.offline}"`);
    }
}
run();
