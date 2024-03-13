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
    log(...messages) {
        if (this.queuePr === null) {
            this.queuePr = Promise.resolve()
                .then(() => this.emptyQueue());
        }
        this.logQueue = this.logQueue.concat([messages]);
    }
    putLine(message) {
        if (this.queuePr === null) {
            this.queuePr = Promise.resolve()
                .then(() => this.emptyQueue());
        }
        this.putQueue = this.putQueue.concat([message]);
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
            this.logQueue.forEach(messages => { console.log.apply(null, messages); });
            this.putQueue.forEach(message => { process.stdout.write(String(message)); });
        }
        this.lastEndedWithPutLine = this.putQueue.length > 0;
        this.logQueue = [];
        this.putQueue = [];
        this.queuePr = null;
    }
}
exports.logger = new Logger();
