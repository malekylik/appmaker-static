"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReplUserInputLine = void 0;
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
                statusPart = chalk.blue('loading');
                break;
            }
            ;
    }
    return `repl (${statusPart})$ `;
}
exports.getReplUserInputLine = getReplUserInputLine;
