import { Linter } from 'eslint';
import * as ts from 'typescript';
import { AppMakerScriptFolderContent, TSConfig } from './io';

export function lint(code: string, config: Linter.Config<Linter.RulesRecord>, fileName?: string) {
  const linter = new Linter();

  const lintingResult = linter.verifyAndFix(code, config, fileName);

  return lintingResult;
}

export function checkTypes(filesToCheck: Array<string>, tsConfig: TSConfig) {
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

export type LintingReport = Array<{ name: string; report: Linter.FixReport }>;

export function checkLinting(scriptsFiles: AppMakerScriptFolderContent, config: Linter.Config<Linter.RulesRecord>): LintingReport {
  const report: LintingReport = [];

  for (let i = 0; i < scriptsFiles.length; i++) {
    const { name, file } = scriptsFiles[i]!;

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

export function checkForEmptyScriptsFiles(scriptsFiles: AppMakerScriptFolderContent): Array<string> {
  const emptyScripts: string[] = [];

  for (let i = 0; i < scriptsFiles.length; i++) {
    const { name, file } = scriptsFiles[i]!;

    if (!file.script['#text']) {
      emptyScripts.push(name);
    }
  }

  return emptyScripts;
}
