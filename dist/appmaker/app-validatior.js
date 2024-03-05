"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppValidator = void 0;
class AppValidator {
    constructor() {
        this.tsConfig = null;
        this.lintConfig = null;
    }
    setTSConfig(tsConfig) {
        this.tsConfig = tsConfig;
    }
    setLintConfig(lintConfig) {
        this.lintConfig = lintConfig;
    }
    getTSConfig() {
        return this.tsConfig;
    }
    getLintConfig() {
        return this.lintConfig;
    }
}
exports.AppValidator = AppValidator;
