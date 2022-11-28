"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDataserviceSourceFile = exports.generateTypeDeclarationFile = void 0;
const ts = require("typescript");
const path = require("path");
const generate_utils_1 = require("./generate-utils");
var TypeToGenerate;
(function (TypeToGenerate) {
    TypeToGenerate["Views"] = "Views";
    TypeToGenerate["ViewFragments"] = "ViewFragments";
    TypeToGenerate["Datasources"] = "Datasources";
})(TypeToGenerate || (TypeToGenerate = {}));
function generateTypeDeclarationFile(views, viewFragments, models) {
    const pathToDFile = path.resolve(__dirname, '../../src/appmaker/index.d.ts');
    let program = ts.createProgram([pathToDFile], { allowJs: true });
    const sourceFile = program.getSourceFile(pathToDFile);
    if (!sourceFile) {
        throw new Error(`Couldn't find template for declaration file at ${pathToDFile}`);
    }
    function createViewProperties(viewsNames) {
        return ts.factory.createTypeLiteralNode(viewsNames.map(name => (0, generate_utils_1.createLiteralTypeProperty)(name, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Widget')))));
    }
    function createDatasourceProperties(models) {
        return ts.factory.createTypeLiteralNode(models.flatMap(model => model.dataSources.map((datasource) => {
            const typeArgs = [ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(datasource.name))];
            if ((0, generate_utils_1.isDataSourceContainsParams)(datasource)) {
                typeArgs.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier((0, generate_utils_1.getNameForDataSourceParams)(model.name, datasource.name))));
            }
            if ((0, generate_utils_1.isDataSourceContainsProperties)(datasource)) {
                typeArgs.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Record<string, unknown>')));
                typeArgs.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier((0, generate_utils_1.getNameForDataSourceProperties)(model.name, datasource.name))));
            }
            return (0, generate_utils_1.createLiteralTypeProperty)(datasource.name, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Datasource'), typeArgs));
        })));
    }
    function createModelProperties(fields) {
        return ts.factory.createTypeLiteralNode(fields.map(field => (0, generate_utils_1.createLiteralTypeProperty)(field.name, field.required || field.autoIncrement ? ts.factory.createTypeReferenceNode(ts.factory.createIdentifier((0, generate_utils_1.converAppMakerPropertyTypeToTSType)(field.type))) :
            ts.factory.createUnionTypeNode([ts.factory.createTypeReferenceNode(ts.factory.createIdentifier((0, generate_utils_1.converAppMakerPropertyTypeToTSType)(field.type))), ts.factory.createTypeReferenceNode(ts.factory.createIdentifier((0, generate_utils_1.converAppMakerPropertyTypeToTSType)('null')))]))));
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
                const newNode = ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [], createDatasourceProperties(models));
                return newNode;
            }
        }
        return node;
    }
    const modelsTS = models
        .map(model => ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], (0, generate_utils_1.getModelName)(model.name), [], createModelProperties(model.fields)))
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
        .flatMap(model => model.dataSources.map(datasource => ({ name: datasource.name, ModelName: (0, generate_utils_1.getModelName)(model.name) }))) // propagate generated types to each datasource
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
(function (TypeToGenerate) {
    TypeToGenerate["ModelNames"] = "ModelNames";
    TypeToGenerate["ModelNamesToModelTypeMap"] = "ModelNamesToModelTypeMap";
})(TypeToGenerate || (TypeToGenerate = {}));
function generateDataserviceSourceFile(models) {
    const pathToDFile = path.resolve(__dirname, '../../src/appmaker/dataService.d.ts');
    let program = ts.createProgram([pathToDFile], { allowJs: true });
    const sourceFile = program.getSourceFile(pathToDFile);
    if (!sourceFile) {
        throw new Error(`Couldn't find template for dataservice declaration file at ${pathToDFile}`);
    }
    const datasourceParams = models.flatMap(model => model.dataSources.map(datasource => {
        let parameters = [];
        let name = '';
        if ((0, generate_utils_1.isDataSourceContainsParams)(datasource)) {
            name = (0, generate_utils_1.getNameForDataSourceParams)(model.name, datasource.name);
            parameters = Array.isArray(datasource.parameters.property) ? datasource.parameters.property : [datasource.parameters.property];
        }
        if ((0, generate_utils_1.isDataSourceContainsProperties)(datasource)) {
            name = (0, generate_utils_1.getNameForDataSourceProperties)(model.name, datasource.name);
            parameters = Array.isArray(datasource.customProperties.property) ? datasource.customProperties.property : [datasource.customProperties.property];
        }
        if (parameters.length !== 0) {
            let parametersAsType = parameters.map(parameter => {
                const typeString = (0, generate_utils_1.converAppMakerPropertyTypeToTSType)(parameter.type);
                const type = ts.factory.createUnionTypeNode([ts.factory.createTypeReferenceNode(typeString), ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('null'))]);
                return (0, generate_utils_1.createLiteralTypeProperty)(parameter.name, type);
            });
            const listParameters = parameters.filter(parameter => (0, generate_utils_1.isAppMakerListType)(parameter.type));
            const initListParameters = listParameters.map(parameter => {
                const typeString = (0, generate_utils_1.converAppMakerPropertyTypeToTSType)(parameter.type);
                const type = ts.factory.createFunctionTypeNode(undefined, [], ts.factory.createTypeReferenceNode(typeString));
                return (0, generate_utils_1.createLiteralTypeProperty)(`init${parameter.name.charAt(0).toUpperCase() + parameter.name.slice(1)}`, type);
            });
            parametersAsType = [...parametersAsType, ...initListParameters];
            return ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], name, [], ts.factory.createTypeLiteralNode(parametersAsType));
        }
        return null;
    }))
        .filter((n) => !!n);
    const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.External);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false }, { substituteNode: substituteNode });
    const result = printer.printList(ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine, ts.factory.createNodeArray([...sourceFile.statements, ...datasourceParams]), resultFile);
    return result;
    function substituteNode(_, node) {
        if (ts.isModuleDeclaration(node)) {
            // For some reason just leaving node makes printer removes the name of the modules
            return ts.factory.createModuleDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.factory.createStringLiteral(node.name.text), node.body);
        }
        if (ts.isTypeAliasDeclaration(node)) {
            const typeName = node.name.escapedText;
            if (typeName === TypeToGenerate.ModelNames) {
                const newNode = ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [], ts.factory.createUnionTypeNode(models.map(model => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(model.name)))));
                return newNode;
            }
            if (typeName === TypeToGenerate.ModelNamesToModelTypeMap) {
                const type = ts.factory.createTypeLiteralNode(models.map((model) => (0, generate_utils_1.createLiteralTypeProperty)(model.name, ts.factory.createTypeReferenceNode((0, generate_utils_1.getModelName)(model.name)))));
                const generatedNode = ts.factory.createTypeAliasDeclaration(node.modifiers, node.name, undefined, type);
                return generatedNode;
            }
            return node;
        }
        return node;
    }
}
exports.generateDataserviceSourceFile = generateDataserviceSourceFile;
