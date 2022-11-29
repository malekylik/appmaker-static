import * as ts from 'typescript';
import * as path from 'path';
import type { Model, View } from './app';
import {
  getModelName, createLiteralTypeProperty, converAppMakerPropertyTypeToTSType, getNameForViewProperties, getNameForViewFragmentProperties,
  getNameForDataSourceParams, getNameForDataSourceProperties, isDataSourceContainsProperties, isDataSourceContainsParams, getTypeForProperties, getDataSourceViewBinding, getDataSourceNameFromBinding,
} from './generate-utils';

enum TypeToGenerate {
  Views = 'Views',
  ViewFragments = 'ViewFragments',
  Datasources = 'Datasources',
}

export function generateTypeDeclarationFile(views: Array<View>, viewFragments: Array<View>, models: Array<Model>): string {
  const pathToDFile = path.resolve(__dirname, '../../src/appmaker/index.d.ts');

  let program = ts.createProgram([pathToDFile], { allowJs: true });
  const sourceFile = program.getSourceFile(pathToDFile)!;
  
  if (!sourceFile) {
    throw new Error(`Couldn't find template for declaration file at ${pathToDFile}`);
  }

  function createViewProperties(views: Array<View>): ts.TypeLiteralNode {
    return ts.factory.createTypeLiteralNode(
      views.map(view => {
        const typeArguments: Array<ts.TypeNode> = [];
        const dataSourceBinding = getDataSourceViewBinding(view.bindings);
        const dataSourceName = dataSourceBinding ? getDataSourceNameFromBinding(dataSourceBinding) : undefined;

        if (dataSourceName) {
          typeArguments.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(dataSourceName)));
        }

        if (view.customProperties.length > 0) {
          const propertiesTypeName = view.isViewFragment ? getNameForViewFragmentProperties(view.name) : getNameForViewProperties(view.name);

          if (typeArguments.length === 0) {
            typeArguments.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('null')));
          }

          typeArguments.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(propertiesTypeName)));
        }

        return (
          createLiteralTypeProperty(
            view.name,
            ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('LayoutWidget'), typeArguments)
          )
        );
      })
    );
  }
  
  function createDatasourceProperties(models: Array<Model>): ts.TypeLiteralNode {
    return ts.factory.createTypeLiteralNode(models.flatMap(model => model.dataSources.map(
      (datasource) => {
        const typeArgs = [ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(datasource.name))];

        if (isDataSourceContainsParams(datasource)) {
          typeArgs.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(getNameForDataSourceParams(model.name, datasource.name))));
        }

        if (isDataSourceContainsProperties(datasource)) {
          typeArgs.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('Record<string, unknown>')));

          typeArgs.push(ts.factory.createTypeReferenceNode(ts.factory.createIdentifier(getNameForDataSourceProperties(model.name, datasource.name))));
        }

        return createLiteralTypeProperty(datasource.name,
          ts.factory.createTypeReferenceNode(
            ts.factory.createIdentifier('Datasource'), typeArgs)
            );
          }))
    );
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
          createDatasourceProperties(models),
        );
  
        return newNode;
      }
    }
  
    return node;
  }

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

  const viewsWithProperties = [
    ...views.filter(view => view.customProperties.length > 0),
    ...viewFragments.filter(viewFragment => viewFragment.customProperties.length > 0)
  ];
  const viewProperties = viewsWithProperties.map((view) => {
    const parametersAsType = getTypeForProperties(view.customProperties, false);
    const name = view.isViewFragment ? getNameForViewFragmentProperties(view.name) : getNameForViewProperties(view.name);

    return ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], name, [], ts.factory.createTypeLiteralNode(parametersAsType));
  });

  const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }, { substituteNode: substituteNode });
  const result = printer.printList(
    ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
    ts.factory.createNodeArray([...sourceFile.statements, ...modelsTS, ...datasourcesTS, ...viewProperties]), resultFile);

  return result;
}

enum TypeToGenerate {
  ModelNames = 'ModelNames',
  ModelNamesToModelTypeMap = 'ModelNamesToModelTypeMap',
}

export function generateDataserviceSourceFile(models: Array<Model>): string {
  const pathToDFile = path.resolve(__dirname, '../../src/appmaker/dataService.d.ts');

  let program = ts.createProgram([pathToDFile], { allowJs: true });
  const sourceFile = program.getSourceFile(pathToDFile)!;
  
  if (!sourceFile) {
    throw new Error(`Couldn't find template for dataservice declaration file at ${pathToDFile}`);
  }

  const datasourceParams = models.flatMap(model => model.dataSources.map(datasource => {
    let parameters: Array<{ name: string; type: string; }> = [];
    let name = '';

    if (isDataSourceContainsParams(datasource)) {
      name = getNameForDataSourceParams(model.name, datasource.name);
      parameters = Array.isArray(datasource.parameters.property) ? datasource.parameters.property : [datasource.parameters.property];
    }

    if (isDataSourceContainsProperties(datasource)) {
      name = getNameForDataSourceProperties(model.name, datasource.name);
      parameters = Array.isArray(datasource.customProperties.property) ? datasource.customProperties.property : [datasource.customProperties.property];
    }

    if (parameters.length !== 0) {
      const parametersAsType = getTypeForProperties(parameters);

      return ts.factory.createTypeAliasDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], name, [], ts.factory.createTypeLiteralNode(parametersAsType));
    }

    return null;
  }))
  .filter(<T> (n: T | null): n is T => !!n);

  const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.External);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false }, { substituteNode: substituteNode });
  const result = printer.printList(
    ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
    ts.factory.createNodeArray([...sourceFile.statements, ...datasourceParams]), resultFile);

  return result;

  function substituteNode(_: ts.EmitHint, node: ts.Node): ts.Node {
    if (ts.isModuleDeclaration(node)) {
      // For some reason just leaving node makes printer removes the name of the modules
      return ts.factory.createModuleDeclaration([ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.factory.createStringLiteral(node.name.text), node.body);
    }

    if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.escapedText;
  
      if (typeName === TypeToGenerate.ModelNames) {
        const newNode = ts.factory.createTypeAliasDeclaration(
          [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], typeName, [],
          ts.factory.createUnionTypeNode(models.map(model => ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(model.name)))),
        );
  
        return newNode;
      }

      if (typeName === TypeToGenerate.ModelNamesToModelTypeMap) {
        const type = ts.factory.createTypeLiteralNode(models.map(
          (model) => createLiteralTypeProperty(model.name,
              ts.factory.createTypeReferenceNode(
                getModelName(model.name))
                )))

        const generatedNode = ts.factory.createTypeAliasDeclaration(node.modifiers, node.name, undefined, type);

        return generatedNode;
      }

      return node;
    }
  
    return node;
  }
}

