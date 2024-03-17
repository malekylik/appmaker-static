"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinOptions = exports.readPasswordFromUser = exports.parseCommandLineArgs = exports.ApplicationMode = void 0;
const commandLineArgs = require("command-line-args");
const logger_1 = require("./logger");
const optionDefinitions = [
    { name: 'appId', type: String },
    { name: 'mode', type: String },
    { name: 'login', type: String },
    { name: 'outDir', type: String },
    { name: 'headless', type: String },
    { name: 'project', type: String }
];
var ApplicationMode;
(function (ApplicationMode) {
    ApplicationMode["remote"] = "remote";
    ApplicationMode["offline"] = "offline";
    ApplicationMode["interactive"] = "interactive";
})(ApplicationMode || (exports.ApplicationMode = ApplicationMode = {}));
function parseBrowserCommandLineArgs(options) {
    const { headless } = options;
    const browserOptions = {
        headless: 'chrome'
    };
    if (headless) {
        if (headless === 'true') {
            browserOptions.headless = true;
        }
        else if (headless === 'false') {
            browserOptions.headless = false;
        }
        else if (headless === 'chrome') {
            browserOptions.headless = 'chrome';
        }
        else {
            logger_1.logger.log(`unknown value for headless ${headless}. Stick with value "${browserOptions.headless}". Possible values: true, false, chrome`);
        }
    }
    return browserOptions;
}
function getSupportedModesAsString() {
    return `"${ApplicationMode.remote}", "${ApplicationMode.offline}", "${ApplicationMode.interactive}"`;
}
function getOptionsForRemoteMode(mode, options) {
    const { appId, login, outDir = `${__dirname}/temp`, } = options;
    if (appId) {
        if (login === undefined) {
            logger_1.logger.log('For using script in remote mode please pass login');
            process.exit(1);
        }
    }
    else {
        logger_1.logger.log('For using script in remote mode please pass app id');
        process.exit(1);
    }
    const credentials = {
        login: login,
        // password: password,
    };
    const browserOptions = parseBrowserCommandLineArgs(options);
    return ({
        mode,
        appId,
        credentials,
        outDir,
        browserOptions,
    });
}
function getOptionsForOfflineMode(mode, options) {
    const { project, outDir = `${__dirname}/temp`, } = options;
    if (!project) {
        logger_1.logger.log('For using script in offline mode please pass "project" option which is path to the exported project (either zip or folder)');
        process.exit(1);
    }
    return ({
        mode,
        project,
        outDir,
    });
}
function getOptionsForInteractiveMode(mode, options) {
    const { appId, login, outDir } = options;
    if (appId) {
        if (login === undefined) {
            logger_1.logger.log('For using script in interactive mode please pass login');
            process.exit(1);
        }
        if (outDir === undefined) {
            logger_1.logger.log('For using script in interactive mode please pass outDir, it`s used as working directory');
            process.exit(1);
        }
    }
    else {
        logger_1.logger.log('For using script in interactive mode please pass app id');
        process.exit(1);
    }
    const credentials = {
        login: login,
        // password: password,
    };
    const browserOptions = parseBrowserCommandLineArgs(options);
    return ({
        mode,
        appId,
        credentials,
        browserOptions,
        outDir,
    });
}
function parseCommandLineArgs() {
    const options = commandLineArgs(optionDefinitions);
    const { mode } = options;
    if (!mode) {
        logger_1.logger.log(`--mode is a required parameter, Please pass one of supported modes: ${getSupportedModesAsString()}`);
        process.exit(1);
    }
    else if (mode !== ApplicationMode.interactive &&
        mode !== ApplicationMode.offline &&
        mode !== ApplicationMode.remote) {
        logger_1.logger.log(`unknown --mode parameter: ${mode}. Please pass one of supported modes: ${getSupportedModesAsString()}`);
        process.exit(1);
    }
    switch (mode) {
        case ApplicationMode.remote: return getOptionsForRemoteMode(mode, options);
        case ApplicationMode.offline: return getOptionsForOfflineMode(mode, options);
        case ApplicationMode.interactive: return getOptionsForInteractiveMode(mode, options);
    }
    // @ts-ignore: Unreachable code error
    return ({
        mode,
    });
}
exports.parseCommandLineArgs = parseCommandLineArgs;
var BACKSPACE = String.fromCharCode(127);
// Probably should use readline
// https://nodejs.org/api/readline.html
function getPassword(prompt, callback) {
    if (prompt) {
        process.stdout.write(prompt);
    }
    var stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    var password = '';
    stdin.on('data', function (ch) {
        const chStr = ch.toString('utf8');
        switch (chStr) {
            case '\n':
            case '\r':
            case '\u0004':
                // They've finished typing their password
                process.stdout.write('\n');
                stdin.setRawMode(false);
                callback(true, password);
                break;
            case '\u0003':
                // Ctrl-C
                callback(false);
                break;
            case BACKSPACE:
                password = password.slice(0, password.length - 1);
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(prompt);
                process.stdout.write(password.split('').map(function () {
                    return '*';
                }).join(''));
                break;
            default:
                // More password characters
                process.stdout.write('*');
                password += ch;
                break;
        }
    });
}
async function readPasswordFromUser() {
    return new Promise((resolve, reject) => getPassword('Password: ', (ok, password) => { if (ok) {
        resolve(password);
    }
    else {
        reject();
    } }));
}
exports.readPasswordFromUser = readPasswordFromUser;
async function joinOptions(options, getPassword) {
    if (options.mode === ApplicationMode.offline) {
        return options;
    }
    const password = await getPassword();
    // const password = '';
    options.credentials.password = password;
    return options;
}
exports.joinOptions = joinOptions;
