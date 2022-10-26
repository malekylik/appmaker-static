"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCommandLineArgs = exports.ApplicationMode = void 0;
const commandLineArgs = require("command-line-args");
const optionDefinitions = [
    // { name: 'appId', alias: 'v', type: Boolean },
    { name: 'mode', type: String },
    { name: 'appId', type: String },
    // { name: 'login', type: String, multiple: true, defaultOption: true },
    { name: 'login', type: String },
    { name: 'password', type: String },
    { name: 'outDir', type: String },
    { name: 'headless', type: String },
    { name: 'project', type: String }
    // { name: 'password', type: String },
];
var ApplicationMode;
(function (ApplicationMode) {
    ApplicationMode["remote"] = "remote";
    ApplicationMode["offline"] = "offline";
    ApplicationMode["interactive"] = "interactive";
})(ApplicationMode = exports.ApplicationMode || (exports.ApplicationMode = {}));
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
            console.log(`unknown value for headless ${headless}. Stick with value "${browserOptions.headless}". Possible values: true, false, chrome`);
        }
    }
    return browserOptions;
}
function getSupportedModesAsString() {
    return `"${ApplicationMode.remote}", "${ApplicationMode.offline}", "${ApplicationMode.interactive}"`;
}
function getOptionsForRemoteMode(mode, options) {
    const { appId, login, password, outDir = `${__dirname}/temp`, } = options;
    if (appId) {
        if (login === undefined || password === undefined) {
            console.log('For using script in remote mode please pass login and password');
            process.exit(1);
        }
    }
    else {
        console.log('For using script in remote mode please pass app id');
        process.exit(1);
    }
    const credentials = {
        login: login,
        password: password,
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
        console.log('For using script in offline mode please pass "project" option which is path to the exported project (either zip or folder)');
        process.exit(1);
    }
    return ({
        mode,
        project,
        outDir,
    });
}
function parseCommandLineArgs() {
    const options = commandLineArgs(optionDefinitions);
    const { mode } = options;
    if (!mode) {
        console.log(`--mode is a required parameter, Please pass one of supported modes: ${getSupportedModesAsString()}`);
        process.exit(1);
    }
    else if (mode !== ApplicationMode.interactive &&
        mode !== ApplicationMode.offline &&
        mode !== ApplicationMode.remote) {
        console.log(`unknown --mode parameter: ${mode}. Please pass one of supported modes: ${getSupportedModesAsString()}`);
        process.exit(1);
    }
    switch (mode) {
        case ApplicationMode.remote: return getOptionsForRemoteMode(mode, options);
        case ApplicationMode.offline: return getOptionsForOfflineMode(mode, options);
    }
    return ({
        mode,
    });
}
exports.parseCommandLineArgs = parseCommandLineArgs;
