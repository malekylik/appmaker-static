import type { View } from './app';
import * as ts from 'typescript';
import { ViewBinding, ViewProperty, WidgetClass } from '../appmaker';
import { getViewBindings, getViewCss, getViewName, getViewStyleName, getViewVisible, hexHtmlToString, stringifyAppMakerProperty, traverseView } from './generate-utils';

const BindingAsAttribsSkip = [
  '_dataSource', // datasource cant conitian complex expression, just one of datasources, so it's easier to inspect the code, if we inline _dataSource binding
];

// add more actions
const AttribsWithFuncGeneration = [
  'action',
  'onLoad',
  'onDataLoad',
  'onUnload',

  'onClick',
  'onChange',
  'onValueEdit',
  'onValidate',

  'onTextChange',
  'inputChange',

  'onSelectedTabChange',
];

function getFunctionNameForBinding(widgetClass: WidgetClass, name: string, bindingName: string): string {
  // for custom components 
  bindingName = bindingName.replace('.', '_');

  return `get${widgetClass}_${name}_${bindingName}`;
}

function getAttribsForComponent(widgetClass: WidgetClass, properties: Array<ViewProperty>, parentDatasource: string | null): Array<string> {
  let attribs: Array<string> = [];
  let isDatasourceAdded = false;

  const bindings = getViewBindings(properties);

  const name = getViewName(properties);

  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i] as ViewBinding;

    const bindingName = getFunctionNameForBinding(widgetClass, name, binding.sourceExpression);
    // for custom components 
    const bindingPropertyName = binding.sourceExpression.replace('.', '_');

    if (BindingAsAttribsSkip.includes(binding.sourceExpression)) {
      // TODO: might be incorect :( should check the datasource name by id from targetExpression
      let attribValue = hexHtmlToString(binding.targetLiteralExpression);

      // add dataSource attrib for inhereted datasources
      if (binding.sourceExpression === '_dataSource') {
        const match = attribValue.match(/@\w+\.(\w+)/) ?? [];
        const datasouceName = match[1];

        if (datasouceName) {
          attribValue = `app.datasources.${datasouceName}`;

          isDatasourceAdded = true;
        }
      }

      attribs.push(`${bindingPropertyName}={${attribValue}}`);
    } else {
      attribs.push(`${bindingPropertyName}={${bindingName}()}`);
    }
  }

  if (!isDatasourceAdded) {
    if (parentDatasource) {
      attribs.push(`_inheritedDataSource={app.datasources.${parentDatasource}}`);
    } else {
      attribs.push(`_dataSource={null}`);
    }
  }

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i] as ViewProperty;

    if (property.name === 'bindings') continue;

    // bindings takes precedent over just properties
    if (bindings.find(binding => binding.sourceExpression === property.name)) continue;

    if (property['#text'] && !property['isNull']) {
      if (AttribsWithFuncGeneration.includes(property.name)) {
        const bindingName = getFunctionNameForBinding(widgetClass, name, property.name);

        attribs.push(`${property.name}={${bindingName}()}`);
      } else {
        attribs.push(`${property['name']}={${stringifyAppMakerProperty(property['type'], property['#text'])}}`);
      }
    }
  }

  return attribs;
}

function generateBindings(widgetClass: WidgetClass, properties: Array<ViewProperty>) {
  const bindingStatements: Array<ts.Statement> = [];
  const bindings = getViewBindings(properties);

  const name = getViewName(properties);

  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i] as ViewBinding;

    if (BindingAsAttribsSkip.includes(binding.sourceExpression)) {
      continue;
    }

    const bodyStatements: Array<ts.Statement> = [
      ts.factory.createReturnStatement(ts.factory.createIdentifier(
        hexHtmlToString(binding.targetLiteralExpression) + '\n'
      )),
    ];
    const functionBody = ts.factory.createBlock(bodyStatements);

    bindingStatements.push(
      ts.factory.createFunctionDeclaration(
        [], undefined, ts.factory.createIdentifier(getFunctionNameForBinding(widgetClass, name, binding.sourceExpression)),
        [],
        // TODO: add check if the args are used in the func
        [],
        undefined, functionBody)
    );
  }

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i] as ViewProperty;

    if (property.name === 'bindings') continue;

    if (AttribsWithFuncGeneration.includes(property.name) && property['#text']) {
      const bodyStatements: Array<ts.Statement> = [
        ts.factory.createExpressionStatement(ts.factory.createIdentifier(
          hexHtmlToString(String(property['#text'])) + '\n'
        )),
      ];
      const functionBody = ts.factory.createBlock(bodyStatements);

      bindingStatements.push(
        ts.factory.createFunctionDeclaration(
          [], undefined, ts.factory.createIdentifier(getFunctionNameForBinding(widgetClass, name, property.name)),
          [],
          // TODO: add check if the args are used in the func
          [],
          undefined, functionBody)
      );
    }
  }

  return bindingStatements;
}

export function generateJSXForViews(views: Array<View>): Array<{ name: string; code: string; }> {
  return views.map(view => {
    let statements: Array<ts.Node> = [];
    const currentTag: Array<{ tag: string; name: string }> = [];
    const datasources: Array<string | null> = [];
    let jsx: Array<string> = [];
    let level = 0;

    const bodyStatements: Array<ts.Statement> = [ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n'))];

    function onEnter(widgetClass: WidgetClass, properties: Array<ViewProperty>) {
      const name = getViewName(properties);
      const bindingStatements = generateBindings(widgetClass, properties);

      if (bindingStatements.length > 0) {
        statements = statements.concat(bindingStatements);
        statements.push(ts.factory.createExpressionStatement(ts.factory.createIdentifier('')));
      }

      currentTag.push({ tag: widgetClass, name });
      const indent = ' '.repeat(level * 2);
      const attrIndent = ' '.repeat((level + 1) * 2);
      const parentDatasource = datasources.length > 0 ? (datasources[datasources.length - 1] ?? null) : null;

      let attribs = getAttribsForComponent(widgetClass, properties, parentDatasource);

      const bindings = getViewBindings(properties);
      const datasourceBinding = bindings.find(binding => binding.sourceExpression === '_dataSource');

      if (datasourceBinding) {
        const attribValue = hexHtmlToString(datasourceBinding.targetLiteralExpression);
        const match = attribValue.match(/@\w+\.(\w+)/) ?? [];
        const datasouceName = match[1];

        if (datasouceName) {
          datasources.push(datasouceName);
        } else {
          datasources.push(null);
        }
      }

      // if (name === 'AddGapDialog') {
        // console.log(`${name} datasourceBinding`, JSON.stringify(datasourceBinding));
        // if (datasourceBinding) {
        //   const attribValue = hexHtmlToString(datasourceBinding.targetLiteralExpression);
        //   const match = attribValue.match(/@\w+\.(\w+)/) ?? [];
        //   const datasouceName = match[1];

        //   console.log(`${name} attribValue`, attribValue);
        //   console.log(`${name} datasouceName`, datasouceName);
        // }
      // }

      const attribsStr = attribs
        .map(attr => `${attrIndent}${attr}`)
        .join('\n');

      jsx.push(`${indent}<${widgetClass}\n${attribsStr}\n${indent}>`);
      level += 1;
    }

    function onExit() {
      const props = currentTag.pop() as { tag: string; name: string };
      datasources.pop();
      level -= 1;
      jsx.push(`${' '.repeat(level * 2)}</${props.tag}>`);
    }

    traverseView(view.file, { onEnter, onExit });

    bodyStatements.push(ts.factory.createReturnStatement(ts.factory.createParenthesizedExpression(ts.factory.createIdentifier(jsx.join('\n')))));

    bodyStatements.push(ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')));

    const functionBody = ts.factory.createBlock(bodyStatements);

    statements.push(ts.factory.createFunctionDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, ts.factory.createIdentifier(`getView_${view.name}`),
      [],
      // TODO: add check if the args are used in the func
      [],
      undefined, functionBody));

      const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
      const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
      const result = printer.printList(
        ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
        ts.factory.createNodeArray(statements), resultFile);

    return ({ name: view.name, code: result });
  });
}
