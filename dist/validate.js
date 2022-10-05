"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lint = void 0;
const eslint_1 = require("eslint");
function lint(code, config, fileName) {
    const linter = new eslint_1.Linter();
    const lintingResult = linter.verifyAndFix(code, config, fileName);
    return lintingResult;
}
exports.lint = lint;
