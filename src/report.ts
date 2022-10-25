import * as ts from 'typescript';
import { LintingReport } from './validate';

export function printTSCheckDiagnostics(diagnostics: ts.Diagnostic[]): void {
  diagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  });
}

export function printLintingReport(lintingReport: LintingReport): void {
  for (let i = 0; i < lintingReport.length; i++) {
    const { name, report } = lintingReport[i]!;
  
    if (report.fixed) {
      console.log(`-----${name}-----`);
  
      console.log('Not fixed', report.messages);
    }
  }
}

export function printEmptyScripts(emptyScripts: Array<string>): void {
  console.log('empty scripts', emptyScripts);
}
