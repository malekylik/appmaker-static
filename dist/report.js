"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printEmptyScripts = exports.printLintingReport = exports.printTSCheckDiagnostics = exports.coloringCode = exports.coloringPath = exports.coloringNumber = void 0;
const chalk = require("chalk");
const ts = require("typescript");
const logger_1 = require("./logger");
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
function printTSCheckDiagnostics(diagnostics) {
    let prevFile = '';
    let fileNumber = 0;
    let diagnosticOfFile = 0;
    logger_1.logger.log('---TSCheckDiagnostic---');
    diagnostics.forEach((diagnostic) => {
        if (diagnostic.file) {
            if (prevFile !== diagnostic.file.fileName) {
                prevFile = diagnostic.file.fileName;
                fileNumber += 1;
                diagnosticOfFile = 0;
                logger_1.logger.log('\n\n');
                logger_1.logger.log(`---${coloringNumber(fileNumber)} - ${coloringPath(diagnostic.file.fileName)}---`);
            }
            diagnosticOfFile += 1;
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            logger_1.logger.log(`\t${coloringNumber(fileNumber)}.${coloringNumber(diagnosticOfFile)} - ${coloringPath(diagnostic.file.fileName)} (${coloringNumber(line + 1)},${coloringNumber(character + 1)}) ${coloringCode(`TS${diagnostic.code}`)}: ${message}`);
        }
        else {
            logger_1.logger.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    });
}
exports.printTSCheckDiagnostics = printTSCheckDiagnostics;
function printLintingReport(lintingReport) {
    for (let i = 0; i < lintingReport.length; i++) {
        const { name, report } = lintingReport[i];
        if (report.fixed) {
            logger_1.logger.log(`-----${coloringPath(name)}-----`);
            logger_1.logger.log('Not fixed', report.messages);
        }
    }
}
exports.printLintingReport = printLintingReport;
function printEmptyScripts(emptyScripts) {
    logger_1.logger.log('empty scripts', emptyScripts);
}
exports.printEmptyScripts = printEmptyScripts;
