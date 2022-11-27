import { QueryDataSource } from '../appmaker';
import * as ts from 'typescript';
import type { Model } from './app';
import { hexHtmlToString } from './generate-utils';

export function generateDatasourceSourceFile(models: Array<Model>): string {
  const getFunctionName = (modelName: string, datasource: string): string => `${modelName}_${datasource}`;

  const statements: Array<ts.Node> = models.flatMap(model => model.dataSources.filter((datasource): datasource is QueryDataSource => datasource.type === 'QUERY' && datasource.customQuery !== undefined && datasource.customQuery.length !== 0).flatMap((datasource) => {
    const queryScript = hexHtmlToString(datasource.customQuery ?? '');
    const isQueryObjectUsed = /query/.test(queryScript);
    const functionParams = isQueryObjectUsed ? [ts.factory.createParameterDeclaration([], undefined, 'query', undefined)] : [];
    const functionBody = ts.factory.createBlock([
      ts.factory.createExpressionStatement(ts.factory.createIdentifier(queryScript))
    ]);

    const statements: Array<ts.Node> = [];

    if (isQueryObjectUsed) {
      statements.push(ts.factory.createJSDocComment('@param {RecordQuery} query'))
    }

    statements.push(ts.factory.createFunctionDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, ts.factory.createIdentifier(getFunctionName(model.name, datasource.name)), [], functionParams, undefined, functionBody));

    return statements;
  }))

  const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printList(
    ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
    ts.factory.createNodeArray(statements), resultFile);

  return result;
}
