import type { View } from './app';
import * as ts from 'typescript';
import { ViewChildren, ViewProperty, WidgetClass } from '../appmaker';
import { getViewBindings, getViewChildren, getViewCss, getViewEnabled, getViewName, getViewStyleName, getViewVisible, traverseView } from './generate-utils';

export function generateJSXForViews(views: Array<View>): Array<{ name: string; code: string; }> {
  return views.map(view => {
    const statements: Array<ts.Node> = [];
    const currentTag: Array<{ tag: string; name: string }> = [];
    let jsx: Array<string> = [];
    let level = 0;

    const bodyStatements: Array<ts.Statement> = [ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n'))];

    function onEnter(widgetClass: WidgetClass, properties: Array<ViewProperty>) {
      const name = getViewName(properties);
      const styleName = getViewStyleName(properties);
      const visible = getViewVisible(properties);
      const enabled = getViewEnabled(properties);
      const css = getViewCss(properties);

      const _bindings = getViewBindings(properties);
      const bindings = _bindings?.binding ? (Array.isArray(_bindings.binding) ? _bindings.binding : [_bindings.binding]) : null;
      const styleNameBinding = bindings ? bindings.filter(binding => binding.sourceExpression === 'styleName')[0] ?? null : null;
      const visibleBinding = bindings ? bindings.filter(binding => binding.sourceExpression === 'visible')[0] ?? null : null;
      const enabledBinding = bindings ? bindings.filter(binding => binding.sourceExpression === 'enabled')[0] ?? null : null;

      currentTag.push({ tag: widgetClass, name });
      const indent = ' '.repeat(level * 2);
      const attrIndent = ' '.repeat((level + 1) * 2);
      const attribs = [
        `name='${name}'`,
        `styleName={\`${styleNameBinding?.targetLiteralExpression ?? styleName?.['#text'] ?? ''}\`}`,
        `css={\`${css?.['#text'] ?? ''}\`}`,
        `visible={\`${visibleBinding?.targetLiteralExpression ?? visible?.['#text'] ?? ''}\`}`,
        `enabled={\`${enabledBinding?.targetLiteralExpression ?? enabled?.['#text'] ?? ''}\`}`,
      ].map(attr => `${attrIndent}${attr}`)
      .join('\n');

      // styleName

      jsx.push(`${indent}<${widgetClass}\n${attribs}\n${indent}>`);
      level += 1;
    }

    function onExit() {
      const props = currentTag.pop() as { tag: string; name: string };
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
