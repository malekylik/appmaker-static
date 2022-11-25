import * as ts from 'typescript';
import * as path from 'path';
import type { Model } from './app';

enum TypeToGenerate {
  Views = 'Views',
  ViewFragments = 'ViewFragments',
  Datasources = 'Datasources',
}

function converAppMakerPropertyTypeToTSType(type: string): string {
  switch(type) {
    case 'Number': return 'number';
    case 'String': return 'string';
    case 'Boolean': return 'boolean';
  }

  return type;
}

export function generateTypeDeclarationFile(views: Array<string>, viewFragments: Array<string>, models: Array<Model>): string {
  const pathToDFile = path.resolve(__dirname, '../../src/appmaker/index.d.ts');

  let program = ts.createProgram([pathToDFile], { allowJs: true });
  const sourceFile = program.getSourceFile(pathToDFile)!;
  
  if (!sourceFile) {
    throw new Error(`Couldn't find template for declaration file at ${pathToDFile}`);
  }
  
  function createLiteralTypeProperty(name: string, type: ts.TypeNode): ts.PropertySignature {
    return ts.factory.createPropertySignature(
      [], name, undefined, type);
  }
  
  function createViewProperties(viewsNames: Array<string>): ts.TypeLiteralNode {
    return ts.factory.createTypeLiteralNode(viewsNames.map(name => createLiteralTypeProperty(name, ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Widget')))))
  }
  
  function createDatasourceProperties(datasources: Array<string>): ts.TypeLiteralNode {
    return ts.factory.createTypeLiteralNode(datasources.map(
      (name) => createLiteralTypeProperty(name,
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier('Datasource'), [ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(name))])
            )))
  }

  function createModelProperties(fields: Model['fields']): ts.TypeLiteralNode {
    return ts.factory.createTypeLiteralNode(fields.map(field => createLiteralTypeProperty(
      field.name, field.required || field.autoIncrement ? ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(converAppMakerPropertyTypeToTSType(field.type))) :
      ts.factory.createUnionTypeNode(
        [ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(converAppMakerPropertyTypeToTSType(field.type))), ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(converAppMakerPropertyTypeToTSType('null')))]
        ))));
  }
  
  function substituteNode(_: ts.EmitHint, node: ts.Node): ts.Node {
    if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.escapedText;
  
      if (typeName === TypeToGenerate.Views) {
        const newNode = ts.factory.createTypeAliasDeclaration(
          [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [],
          createViewProperties(views),
        );
  
        return newNode;
      }
  
      if (typeName === TypeToGenerate.ViewFragments) {
        const newNode = ts.factory.createTypeAliasDeclaration(
          [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [],
          createViewProperties(viewFragments),
        );
  
        return newNode;
      }
  
      if (typeName === TypeToGenerate.Datasources) {
        const newNode = ts.factory.createTypeAliasDeclaration(
          [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [],
          createDatasourceProperties(models.flatMap(model => model.dataSources.map(datasource => datasource.name))),
        );
  
        return newNode;
      }
    }
  
    return node;
  }

  const getModelName = (name: string): string => `Model_${name}`;

  const modelsTS = models
    .map(model => ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], getModelName(model.name), [], createModelProperties(model.fields)))
    .sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      }

      return 0;
    });
  const datasourcesTS = models
    .flatMap(model => model.dataSources.map(datasource => ({ name: datasource.name, ModelName: getModelName(model.name) }))) // propagate generated types to each datasource
    .sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      }

      return 0;
    })
    .map(datasource => ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], datasource.name, [], ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(datasource.ModelName)))) // create ts type for each datasource

  const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }, { substituteNode: substituteNode });
  const result = printer.printList(
    ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
    ts.factory.createNodeArray([...sourceFile.statements, ...modelsTS, ...datasourcesTS]), resultFile);

  return result;
}
