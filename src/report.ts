import * as ts from 'typescript';
import { LintingReport } from './validate';
import { coloringCode, coloringNumber, coloringPath } from './logger';

export function printTSCheckDiagnostics(diagnostics: ts.Diagnostic[]): void {
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

      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.log(`\t${coloringNumber(fileNumber)}.${coloringNumber(diagnosticOfFile)} - ${coloringPath(diagnostic.file.fileName)} (${coloringNumber(line + 1)},${coloringNumber(character + 1)}) ${coloringCode(`TS${diagnostic.code}`)}: ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  });
}

export function printLintingReport(lintingReport: LintingReport): void {
  for (let i = 0; i < lintingReport.length; i++) {
    const { name, report } = lintingReport[i]!;
  
    if (report.fixed) {
      console.log(`-----${coloringPath(name)}-----`);
  
      console.log('Not fixed', report.messages);
    }
  }
}

export function printEmptyScripts(emptyScripts: Array<string>): void {
  console.log('empty scripts', emptyScripts);
}
