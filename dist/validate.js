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
    const conf = { ...tsConfig.compilerOptions, moduleResolution: ts.ModuleResolutionKind.NodeJs, noEmit: true, allowJs: true, checkJs: true };
    let program = ts.createProgram(filesToCheck, conf);
    let emitResult = program.emit();
    let allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    return allDiagnostics;
}
exports.checkTypes = checkTypes;
function checkLinting(scriptsFiles, config) {
    const report = [];
    for (let i = 0; i < scriptsFiles.length; i++) {
        const { name, file } = scriptsFiles[i];
        if (file.script['#text']) {
            const _report = lint(file.script['#text'], config, name);
            report.push({
                name,
                report: _report,
            });
        }
    }
    return report;
}
exports.checkLinting = checkLinting;
function checkForEmptyScriptsFiles(scriptsFiles) {
    const emptyScripts = [];
    for (let i = 0; i < scriptsFiles.length; i++) {
        const { name, file } = scriptsFiles[i];
        if (!file.script['#text']) {
            emptyScripts.push(name);
        }
    }
    return emptyScripts;
}
exports.checkForEmptyScriptsFiles = checkForEmptyScriptsFiles;
