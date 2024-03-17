"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkForEmptyScriptsFiles = exports.checkLinting = exports.checkTypes = exports.lint = void 0;
const eslint_1 = require("eslint");
const ts = require("typescript");
function lint(code, config, fileName) {
    const linter = new eslint_1.Linter();
    const lintingResult = linter.verifyAndFix(code, config, fileName);
    return lintingResult;
}
exports.lint = lint;
function checkTypes(filesToCheck, tsConfig) {
    const conf = { ...tsConfig.compilerOptions,
        moduleResolution: ts.ModuleResolutionKind.Classic,
        noEmit: true, allowJs: true, checkJs: true };
    let program = ts.createProgram(filesToCheck, conf);
    let emitResult = program.emit();
    let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    return allDiagnostics;
}
exports.checkTypes = checkTypes;
function checkLinting(app, config) {
    const report = [];
    for (let i = 0; i < app.scripts.length; i++) {
        const { name, code } = app.scripts[i];
        if (code) {
            const _report = lint(code, config, name);
            report.push({
                name,
                report: _report,
            });
        }
    }
    return report;
}
exports.checkLinting = checkLinting;
function checkForEmptyScriptsFiles(app) {
    const emptyScripts = [];
    for (let i = 0; i < app.scripts.length; i++) {
        const { name, code } = app.scripts[i];
        if (!code) {
            emptyScripts.push(name);
        }
    }
    return emptyScripts;
}
exports.checkForEmptyScriptsFiles = checkForEmptyScriptsFiles;
