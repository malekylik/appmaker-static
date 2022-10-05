import { Linter } from 'eslint';

export function lint(code: string, config: Linter.Config<Linter.RulesRecord>, fileName?: string) {
  const linter = new Linter();

  const lintingResult = linter.verifyAndFix(code, config, fileName);

  return lintingResult;
}