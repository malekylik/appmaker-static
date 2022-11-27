"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDatasourceSourceFile = void 0;
const ts = require("typescript");
var TypeToGenerate;
(function (TypeToGenerate) {
    TypeToGenerate["ModelNames"] = "ModelNames";
})(TypeToGenerate || (TypeToGenerate = {}));
function hexHtmlToString(str) {
    const REG_HEX = /&#x([a-fA-F0-9]+);/g;
    return str.replace(REG_HEX, function (match, grp) {
        const num = parseInt(grp, 16);
        return String.fromCharCode(num);
    });
}
function generateDatasourceSourceFile(models) {
    const getFunctionName = (modelName, datasource) => `${modelName}_${datasource}`;
    const statements = models.flatMap(model => model.dataSources.filter((datasource) => datasource.type === 'QUERY' && datasource.customQuery !== undefined && datasource.customQuery.length !== 0).flatMap((datasource) => {
        const queryScript = hexHtmlToString(datasource.customQuery ?? '');
        const isQueryObjectUsed = /query/.test(queryScript);
        const functionParams = isQueryObjectUsed ? [ts.factory.createParameterDeclaration([], undefined, 'query', undefined)] : [];
        const functionBody = ts.factory.createBlock([
            ts.factory.createExpressionStatement(ts.factory.createIdentifier(queryScript))
        ]);
        const statements = [];
        if (isQueryObjectUsed) {
            statements.push(ts.factory.createJSDocComment('@param {RecordQuery} query'));
        }
        statements.push(ts.factory.createFunctionDeclaration([ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, ts.factory.createIdentifier(getFunctionName(model.name, datasource.name)), [], functionParams, undefined, functionBody));
        return statements;
    }));
    const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }, { substituteNode: substituteNode });
    const result = printer.printList(ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine, ts.factory.createNodeArray(statements), resultFile);
    return result;
    function substituteNode(_, node) {
        if (ts.isTypeAliasDeclaration(node)) {
            const typeName = node.name.escapedText;
            if (typeName === TypeToGenerate.ModelNames) {
                const newNode = ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [], ts.factory.createUnionTypeNode(models.map(model => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(model.name)))));
                return newNode;
            }
            // if (typeName === TypeToGenerate.ViewFragments) {
            //   const newNode = ts.factory.createTypeAliasDeclaration(
            //     [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [],
            //     createViewProperties(viewFragments),
            //   );
            //   return newNode;
            // }
            // if (typeName === TypeToGenerate.Datasources) {
            //   const newNode = ts.factory.createTypeAliasDeclaration(
            //     [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [],
            //     createDatasourceProperties(models.flatMap(model => model.dataSources.map(datasource => datasource.name))),
            //   );
            //   return newNode;
            // }
        }
        return node;
    }
}
exports.generateDatasourceSourceFile = generateDatasourceSourceFile;
