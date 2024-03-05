import { Linter } from 'eslint';

export type TSConfig = { compilerOptions: any };

export class AppValidator {
  private tsConfig: TSConfig | null;
  private lintConfig: Linter.Config<Linter.RulesRecord> | null;

  constructor () {
    this.tsConfig = null;
    this.lintConfig = null;
  }

  setTSConfig(tsConfig: TSConfig): void {
    this.tsConfig = tsConfig;
  }

  setLintConfig(lintConfig: Linter.Config<Linter.RulesRecord>): void {
    this.lintConfig = lintConfig;
  }

  getTSConfig(): TSConfig | null {
    return this.tsConfig;
  }

  getLintConfig(): Linter.Config<Linter.RulesRecord> | null {
    return this.lintConfig;
  }
}
