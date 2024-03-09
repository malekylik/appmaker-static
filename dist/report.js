"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printEmptyScripts = exports.printLintingReport = exports.printTSCheckDiagnostics = void 0;
const ts = require("typescript");
const logger_1 = require("./logger");
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
                console.log(`---${(0, logger_1.coloringNumber)(fileNumber)} - ${(0, logger_1.coloringPath)(diagnostic.file.fileName)}---`);
            }
            diagnosticOfFile += 1;
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`\t${(0, logger_1.coloringNumber)(fileNumber)}.${(0, logger_1.coloringNumber)(diagnosticOfFile)} - ${(0, logger_1.coloringPath)(diagnostic.file.fileName)} (${(0, logger_1.coloringNumber)(line + 1)},${(0, logger_1.coloringNumber)(character + 1)}) ${(0, logger_1.coloringCode)(`TS${diagnostic.code}`)}: ${message}`);
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
            console.log(`-----${(0, logger_1.coloringPath)(name)}-----`);
            console.log('Not fixed', report.messages);
        }
    }
}
exports.printLintingReport = printLintingReport;
function printEmptyScripts(emptyScripts) {
    console.log('empty scripts', emptyScripts);
}
exports.printEmptyScripts = printEmptyScripts;
