"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printEmptyScripts = exports.printLintingReport = exports.printTSCheckDiagnostics = void 0;
const ts = require("typescript");
const chalk = require("chalk");
function coloringNumber(text) {
    return chalk.yellowBright(text);
}
function coloringPath(text) {
    return chalk.cyan(text);
}
function coloringCode(text) {
    return chalk.blackBright(text);
}
function printTSCheckDiagnostics(diagnostics) {
    let prevFile = '';
    let fileNumber = 0;
    let diagnosticOfFile = 0;
    console.log('---TSCheckDiagnostic---');
    diagnostics.forEach((diagnostic) => {
        if (diagnostic.file) {
            if (prevFile !== diagnostic.file.fileName) {
                prevFile = diagnostic.file.fileName;
                fileNumber += 1;
                diagnosticOfFile = 0;
                console.log('\n\n');
                console.log(`---${coloringNumber(fileNumber)} - ${coloringPath(diagnostic.file.fileName)}---`);
            }
            diagnosticOfFile += 1;
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`\t${coloringNumber(fileNumber)}.${coloringNumber(diagnosticOfFile)} - ${coloringPath(diagnostic.file.fileName)} (${coloringNumber(line + 1)},${coloringNumber(character + 1)}) ${coloringCode(`TS${diagnostic.code}`)}: ${message}`);
        }
        else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    });
}
exports.printTSCheckDiagnostics = printTSCheckDiagnostics;
function printLintingReport(lintingReport) {
    for (let i = 0; i < lintingReport.length; i++) {
        const { name, report } = lintingReport[i];
        if (report.fixed) {
            console.log(`-----${coloringPath(name)}-----`);
            console.log('Not fixed', report.messages);
        }
    }
}
exports.printLintingReport = printLintingReport;
function printEmptyScripts(emptyScripts) {
    console.log('empty scripts', emptyScripts);
}
exports.printEmptyScripts = printEmptyScripts;
