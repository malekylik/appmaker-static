"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.coloringCode = exports.coloringPath = exports.coloringNumber = void 0;
const chalk = require("chalk");
function coloringNumber(text) {
    return chalk.yellowBright(text);
}
exports.coloringNumber = coloringNumber;
function coloringPath(text) {
    return chalk.cyan(text);
}
exports.coloringPath = coloringPath;
function coloringCode(text) {
    return chalk.blackBright(text);
}
exports.coloringCode = coloringCode;
class Logger {
    constructor() {
        this.queuePr = null;
        this.logQueue = [];
        this.putQueue = [];
        this.lastEndedWithPutLine = false;
    }
    log(message, ...messages) {
        if (this.queuePr === null) {
            this.queuePr = Promise.resolve()
                .then(() => this.emptyQueue());
        }
        this.logQueue = this.logQueue.concat([message]).concat(messages);
    }
    putLine(message, ...messages) {
        if (this.queuePr === null) {
            this.queuePr = Promise.resolve()
                .then(() => this.emptyQueue());
        }
        this.putQueue = this.putQueue.concat([message]).concat(messages);
    }
    emptyQueue() {
        if (this.lastEndedWithPutLine) {
            console.log('');
        }
        this.logQueue.forEach(message => { console.log(message); });
        this.putQueue.forEach(message => { process.stdout.write(String(message)); });
        this.lastEndedWithPutLine = this.putQueue.length > 0;
        this.logQueue = [];
        this.putQueue = [];
        this.queuePr = null;
    }
}
exports.logger = new Logger();
