import { Linter } from 'eslint';
import * as ts from 'typescript';
import { TSConfig } from './io';

export function lint(code: string, config: Linter.Config<Linter.RulesRecord>, fileName?: string) {
  const linter = new Linter();

  const lintingResult = linter.verifyAndFix(code, config, fileName);

  return lintingResult;
}

export function checkTypes(filesToCheck: Array<string>, tsConfig: TSConfig) {
  const conf = { ...tsConfig.compilerOptions, moduleResolution: ts.ModuleResolutionKind.NodeJs, noEmit: true, allowJs: true, checkJs: true };

  let program = ts.createProgram(filesToCheck, conf);
  let emitResult = program.emit();

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  return allDiagnostics;
}
