"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorImportantMessage = exports.colorValue = exports.colorPath = exports.getReplUserInputLine = void 0;
const chalk = require("chalk");
function getReplUserInputLine(status) {
    let statusPart = '';
    switch (status.state) {
        case 'ready':
            {
                statusPart = chalk.green('ready');
                break;
            }
            ;
        case 'loading':
            {
                statusPart = chalk.blueBright('loading');
                break;
            }
            ;
    }
    return `repl (${statusPart})$ `;
}
exports.getReplUserInputLine = getReplUserInputLine;
function colorPath(path) {
    return chalk.blue(path);
}
exports.colorPath = colorPath;
function colorValue(value) {
    return chalk.yellow(value);
}
exports.colorValue = colorValue;
function colorImportantMessage(message) {
    return chalk.yellowBright(message);
}
exports.colorImportantMessage = colorImportantMessage;
