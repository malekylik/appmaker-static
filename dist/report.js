"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printTSCheckDiagnostics = void 0;
const ts = require("typescript");
function printTSCheckDiagnostics(diagnostics) {
    diagnostics.forEach((diagnostic) => {
        if (diagnostic.file) {
            let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        }
        else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
        }
    });
}
exports.printTSCheckDiagnostics = printTSCheckDiagnostics;
