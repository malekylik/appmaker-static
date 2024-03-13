"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class Logger {
    constructor() {
        this.queuePr = null;
        this.logQueue = [];
        this.putQueue = [];
        this.lastEndedWithPutLine = false;
        this._silent = false;
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
    silent(flag) {
        if (this.queuePr) {
            this.queuePr
                .then(() => { this._silent = flag; });
        }
        else {
            this._silent = flag;
        }
    }
    emptyQueue() {
        if (!this._silent) {
            if (this.lastEndedWithPutLine) {
                console.log('');
            }
            this.logQueue.forEach(message => { console.log(message); });
            this.putQueue.forEach(message => { process.stdout.write(String(message)); });
        }
        this.lastEndedWithPutLine = this.putQueue.length > 0;
        this.logQueue = [];
        this.putQueue = [];
        this.queuePr = null;
    }
}
exports.logger = new Logger();
