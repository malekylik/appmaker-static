"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTypeDeclarationFile = void 0;
const ts = require("typescript");
const path = require("path");
var TypeToGenerate;
(function (TypeToGenerate) {
    TypeToGenerate["Views"] = "Views";
    TypeToGenerate["ViewFragments"] = "ViewFragments";
    TypeToGenerate["Datasources"] = "Datasources";
})(TypeToGenerate || (TypeToGenerate = {}));
function converAppMakerPropertyTypeToTSType(type) {
    switch (type) {
        case 'Number': return 'number';
        case 'String': return 'string';
        case 'Boolean': return 'boolean';
    }
    return type;
}
function generateTypeDeclarationFile(views, viewFragments, models) {
    const pathToDFile = path.resolve(__dirname, '../../src/appmaker/index.d.ts');
    let program = ts.createProgram([pathToDFile], { allowJs: true });
    const sourceFile = program.getSourceFile(pathToDFile);
    if (!sourceFile) {
        throw new Error(`Couldn't find template for declaration file at ${pathToDFile}`);
    }
    function createLiteralTypeProperty(name, type) {
        return ts.factory.createPropertySignature([], name, undefined, type);
    }
    function createViewProperties(viewsNames) {
        return ts.factory.createTypeLiteralNode(viewsNames.map(name => createLiteralTypeProperty(name, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Widget')))));
    }
    function createDatasourceProperties(datasources) {
        return ts.factory.createTypeLiteralNode(datasources.map((name) => createLiteralTypeProperty(name, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Datasource'), [ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(name))]))));
    }
    function createModelProperties(fields) {
        return ts.factory.createTypeLiteralNode(fields.map(field => createLiteralTypeProperty(field.name, field.required || field.autoIncrement ? ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(converAppMakerPropertyTypeToTSType(field.type))) :
            ts.factory.createUnionTypeNode([ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(converAppMakerPropertyTypeToTSType(field.type))), ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(converAppMakerPropertyTypeToTSType('null')))]))));
    }
    function substituteNode(_, node) {
        if (ts.isTypeAliasDeclaration(node)) {
            const typeName = node.name.escapedText;
            if (typeName === TypeToGenerate.Views) {
                const newNode = ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [], createViewProperties(views));
                return newNode;
            }
            if (typeName === TypeToGenerate.ViewFragments) {
                const newNode = ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [], createViewProperties(viewFragments));
                return newNode;
            }
            if (typeName === TypeToGenerate.Datasources) {
                const newNode = ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [], createDatasourceProperties(models.flatMap(model => model.dataSources.map(datasource => datasource.name))));
                return newNode;
            }
        }
        return node;
    }
    const getModelName = (name) => `Model_${name}`;
    const modelsTS = models
        .map(model => ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], getModelName(model.name), [], createModelProperties(model.fields)))
        .sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        else if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    const datasourcesTS = models
        .flatMap(model => model.dataSources.map(datasource => ({ name: datasource.name, ModelName: getModelName(model.name) }))) // propagate generated types to each datasource
        .sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        else if (a.name > b.name) {
            return 1;
        }
        return 0;
    })
        .map(datasource => ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], datasource.name, [], ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(datasource.ModelName)))); // create ts type for each datasource
    const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }, { substituteNode: substituteNode });
    const result = printer.printList(ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine, ts.factory.createNodeArray([...sourceFile.statements, ...modelsTS, ...datasourcesTS]), resultFile);
    return result;
}
exports.generateTypeDeclarationFile = generateTypeDeclarationFile;
