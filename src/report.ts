import * as chalk from 'chalk';
import * as ts from 'typescript';
import { LintingReport } from './validate';
import { logger } from './logger';

export function coloringNumber(text: string | number): string {
  return chalk.yellowBright(text);
}

export function coloringPath(text: string | number): string {
  return chalk.cyan(text);
}

export function coloringCode(text: string | number): string {
  return chalk.blackBright(text);
}

export function printTSCheckDiagnostics(diagnostics: ts.Diagnostic[]): void {
  let prevFile = '';
  let fileNumber = 0;
  let diagnosticOfFile = 0;

  logger.log('---TSCheckDiagnostic---');

  diagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      if (prevFile !== diagnostic.file.fileName) {
        prevFile = diagnostic.file.fileName;
        fileNumber += 1;

        diagnosticOfFile = 0;

        logger.log('\n\n');
        logger.log(`---${coloringNumber(fileNumber)} - ${coloringPath(diagnostic.file.fileName)}---`);
      }

      diagnosticOfFile += 1;

      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      logger.log(`\t${coloringNumber(fileNumber)}.${coloringNumber(diagnosticOfFile)} - ${coloringPath(diagnostic.file.fileName)} (${coloringNumber(line + 1)},${coloringNumber(character + 1)}) ${coloringCode(`TS${diagnostic.code}`)}: ${message}`);
    } else {
      logger.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  });
}

export function printLintingReport(lintingReport: LintingReport): void {
  for (let i = 0; i < lintingReport.length; i++) {
    const { name, report } = lintingReport[i]!;
  
    if (report.fixed) {
      logger.log(`-----${coloringPath(name)}-----`);
  
      logger.log('Not fixed', report.messages);
    }
  }
}

export function printEmptyScripts(emptyScripts: Array<string>): void {
  logger.log('empty scripts', emptyScripts);
}
