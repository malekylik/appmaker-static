import type { View } from './app';
import * as ts from 'typescript';
import { ViewBinding, WidgetClass } from '../appmaker';
import { hexHtmlToString, stringifyAppMakerProperty } from './generate-utils';
import type { AppMakerView, AppMakerAttrib } from '../functional/appmaker/appmaker-domain';
import { findAppMakerBindingsProperty, findAppMakerCustomWidgetKeyProperty, findAppMakerNameProperty, getAppMakerViewAttribs } from '../functional/appmaker/appmaker-view';
import { traverseView } from '../functional/appmaker/appmaker-view';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/function';
import { convertOneOrManyToArray, oneOrManyRun } from '../functional/appmaker/appmaker-utils';

type TSAttrib = { attribName: string; attribValue: string; };

type ParsedBinding = { 
  name: string;
  value: string;
} & ViewBinding;

const InlineBinding = [
  '_dataSource', // datasource can't conitian complex expression, just one of datasources, so it's easier to inspect the code, if we inline _dataSource binding
];

// add more actions
const FuncAttribs = [
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

function getViewDefinition(view: AppMakerView, customWidgetMap: Map<string, AppMakerView>): O.Option<AppMakerView> {
  return pipe(
    view,
    view => findAppMakerCustomWidgetKeyProperty(view.property),
    O.match(() => O.none, p => customWidgetMap.get(p['#text']) ? O.some(customWidgetMap.get(p['#text'])!) : O.none),
  );
}

function getClassOrCustomName(view: AppMakerView, customWidgetMap: Map<string, AppMakerView>): string {
  return pipe(
    getViewDefinition(view, customWidgetMap), // TODO: move outside
    O.match(() => O.none, v => findAppMakerNameProperty(v.property)),
    O.match(() => view.class, p => p['#text'])
  );
}

function getFunctionNameForBinding(widgetClass: WidgetClass | string, name: string, bindingName: string): string {
  return `get${widgetClass}_${name}_${bindingName}`;
}

function sortAttribNames(attribs: Array<TSAttrib>): Array<TSAttrib> {
  return attribs
    .slice()
    .sort((a, b) => {
      if (a.attribName === 'name' && b.attribName === 'name') {
        return 0
      }

      if (a.attribName === 'name') {
        return -1000;
      }

      if (b.attribName === 'name') {
        return 1000;
      }

      return a.attribName.charCodeAt(0) - b.attribName.charCodeAt(0);
    });
}

function getAttribsForComponent(attribs: Array<TSAttrib>): Array<string> {
  return pipe(
    attribs,
    attribs => sortAttribNames(attribs),
    attribs => attribs.map(attrib =>`${attrib.attribName}={${attrib.attribValue}}`)
  );
}

function generateAttribValueForDatasource(dataSourceBinding: string): O.Option<string> {
  return pipe(
    dataSourceBinding,
    binding => binding.match(/@\w+\.(\w+)/) ?? [],
    match => match[1],
    datsourceName => datsourceName ? O.some(datsourceName) : O.none
  );
}

function getKeyForCustomComponentProperty(property: string): O.Option<string> {
  return pipe(
    property,
    p => p.match(/\w+\.(\w+)/) ?? [],
    m => m[1],
    key => key ? O.some(key) : O.none
  )
}

function generateAttribForDatasource(bindings: ParsedBinding[], parentDatasource: string | null ): TSAttrib {
  return pipe(
    bindings,
    bindings => bindings.filter(b => b.sourceExpression === '_dataSource')[0],
    dataSourceBinding => dataSourceBinding ?
      ({ attribName: '_dataSource', attribValue: pipe(generateAttribValueForDatasource(dataSourceBinding.targetLiteralExpression), O.match(() => '', datasource => `app.datasources.${datasource}`)) }) :
      parentDatasource ? ({ attribName: '_inheritedDataSource', attribValue: `app.datasources.${parentDatasource}` }) : ({ attribName: '_dataSource', attribValue: 'null' })
  );
}

function joinAppMakerBindingAndAppMakerAttribs(getFunctionNameForBinding: (attribName: string) => string, attribs: AppMakerAttrib[], bindings: ParsedBinding[], context: { parentDatasource: string | null }): Array<{ attribName: string; attribValue: string; }> {
  const existingBindings = new Map<string, true>();
  pipe(
    bindings,
    bindings => bindings.map(b => existingBindings.set(b.name, true))
  );

  const funcBinding = bindings.filter(b => !InlineBinding.includes(b.sourceExpression));
  let bindingToInline = bindings.filter(b => InlineBinding.includes(b.sourceExpression));

  const attribsToInline = attribs
    .filter(b => !FuncAttribs.includes(b.name))
    .filter(b => !existingBindings.has(b.name));
  const funcAttribs = attribs
    .filter(b => FuncAttribs.includes(b.name))
    .filter(b => !existingBindings.has(b.name));

  const tsAttribs: TSAttrib[] = [];

  tsAttribs.push(generateAttribForDatasource(bindings, context.parentDatasource));
  bindingToInline = bindingToInline.filter(b => b.sourceExpression !== '_dataSource');

  return tsAttribs
    .concat(
      bindingToInline.map(generateTSAttribForInlineBinding)
    )
    .concat(
      funcBinding.map(b => ({ attribName: b.name, attribValue: `${getFunctionNameForBinding(b.name)}()` }))
    )
    .concat(
      attribsToInline.map(a => ({ attribName: a.name, attribValue: stringifyAppMakerProperty(a['type'], a['#text'])}))
    )
    .concat(
      funcAttribs.map(a => ({ attribName: a.name, attribValue: `${getFunctionNameForBinding(a.name)}()` }) )
    );

  function generateTSAttribForInlineBinding(binding: ParsedBinding) {
    return ({ attribName: binding.name, attribValue: binding.value });
  }
}

function generateBindings(widgetClass: WidgetClass | string, viewName: string, bindings: ParsedBinding[], attribs: AppMakerAttrib[]) {
  const bindingStatements: Array<ts.Statement> = [];

  oneOrManyRun(bindings, (binding) => {
    if (InlineBinding.includes(binding.sourceExpression)) {
      return;
    }

    const bodyStatements: Array<ts.Statement> = [
      ts.factory.createReturnStatement(ts.factory.createIdentifier(
        binding.value + '\n'
      )),
    ];
    const functionBody = ts.factory.createBlock(bodyStatements);

    bindingStatements.push(
      ts.factory.createFunctionDeclaration(
        [], undefined, ts.factory.createIdentifier(getFunctionNameForBinding(widgetClass, viewName, binding.name)),
        [],
        // TODO: add check if the args are used in the func
        [],
        undefined, functionBody)
    );
  });

  for (let i = 0; i < attribs.length; i++) {
    const property = attribs[i] as AppMakerAttrib;

    if (FuncAttribs.includes(property.name) && property['#text']) {
      const bodyStatements: Array<ts.Statement> = [
        ts.factory.createExpressionStatement(ts.factory.createIdentifier(
          hexHtmlToString(String(property['#text'])) + '\n'
        )),
      ];
      const functionBody = ts.factory.createBlock(bodyStatements);

      bindingStatements.push(
        ts.factory.createFunctionDeclaration(
          [], undefined, ts.factory.createIdentifier(getFunctionNameForBinding(widgetClass, viewName, property.name)),
          [],
          // TODO: add check if the args are used in the func
          [],
          undefined, functionBody)
      );
    }
  }

  return bindingStatements;
}

function parseBindingValue(value: string): string {
  return value.replace(/@/g, '/* binding */ (app).');
}

function createParsedBinding(binding: ViewBinding, name: string, value: string): ParsedBinding {
  return ({ ...binding, name, value });
}

export function generateJSXForViews(newViews: Array<AppMakerView>, customWidgetMap: Map<string, AppMakerView>): Array<{ name: string; code: string; }> {
  return newViews.map(view => {
    const currentTag: Array<{ tag: string; name: string }> = [];
    const datasources: Array<string | null> = [];
    const viewName = pipe(
      view,
      view => findAppMakerNameProperty(view.property),
      O.match(() => 'Unknonw_View_Name', v => v['#text'])
    );
    let statements: Array<ts.Node> = [];
    let jsx: Array<string> = [];
    let level = 0;

    const bodyStatements: Array<ts.Statement> = [ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n'))];

    function onEnter(view: AppMakerView) {
      const properties = view.property;
      const widgetClass = getClassOrCustomName(view, customWidgetMap);
      const viewDefinintion = getViewDefinition(view, customWidgetMap);
      const name = pipe(findAppMakerNameProperty(properties), O.match(() => 'Unknonw_View_Name', v => v['#text']));
      const propertiesAsAttribs = getAppMakerViewAttribs(properties);

      const bindings = pipe(findAppMakerBindingsProperty(properties), O.match(() => [], v => v['binding']));
      const parsedBinding: ParsedBinding[]  = pipe(
        convertOneOrManyToArray(bindings).slice(),
        bindings => bindings.map((b) => {
          return pipe(
            b.sourceExpression,
            sourceExpression => getKeyForCustomComponentProperty(sourceExpression),
            // TODO: find a way to remove duplication of the code
            O.match(() => createParsedBinding(b, b.sourceExpression, parseBindingValue(hexHtmlToString(b.targetLiteralExpression))), key => pipe(
                  viewDefinintion,
                  O.match(() => O.some(null), viewDefinintion => O.some(viewDefinintion.customProperties ? convertOneOrManyToArray(viewDefinintion.customProperties.property).find(v => v.key === key) : null)),
                  O.match(() => createParsedBinding(b, b.sourceExpression, parseBindingValue(hexHtmlToString(b.targetLiteralExpression))), customProp => customProp ? createParsedBinding(b, `custom_${customProp.name}`, parseBindingValue(hexHtmlToString(b.targetLiteralExpression))) : createParsedBinding(b, b.sourceExpression, hexHtmlToString(b.targetLiteralExpression)))
                )
              )
          )
        })
      );

      const bindingStatements = generateBindings(widgetClass, name, parsedBinding, propertiesAsAttribs);

      if (bindingStatements.length > 0) {
        statements = statements.concat(bindingStatements);
        statements.push(ts.factory.createExpressionStatement(ts.factory.createIdentifier('')));
      }

      currentTag.push({ tag: widgetClass, name });
      const indent = ' '.repeat(level * 2);
      const attrIndent = ' '.repeat((level + 1) * 2);
      const parentDatasource = datasources.length > 0 ? (datasources[datasources.length - 1] ?? null) : null;

      let datasourceBinding = parsedBinding.find(b => b.sourceExpression === '_dataSource');

      let attribs = joinAppMakerBindingAndAppMakerAttribs(attribName => getFunctionNameForBinding(widgetClass, name, attribName), propertiesAsAttribs, parsedBinding, { parentDatasource });
      let attribsJsx = getAttribsForComponent(attribs);

      pipe(
        datasourceBinding,
        datasourceBinding => O.some(datasourceBinding),
        O.chain(b => b ? generateAttribValueForDatasource(b.targetLiteralExpression) : O.some(b)), // TODO: check how to avoid passing undefined to some
        O.match(() => {}, datasouceName => datasouceName ? datasources.push(datasouceName) : datasources.push(parentDatasource))
      );

      const attribsStr = attribsJsx
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

    traverseView(view, { onEnter, onExit });

    bodyStatements.push(ts.factory.createReturnStatement(ts.factory.createParenthesizedExpression(ts.factory.createIdentifier(jsx.join('\n')))));

    bodyStatements.push(ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')));

    const functionBody = ts.factory.createBlock(bodyStatements);

    statements.push(ts.factory.createFunctionDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, ts.factory.createIdentifier(`getView_${viewName}`),
      [],
      // TODO: add check if the args are used in the func
      [],
      undefined, functionBody));

      const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
      const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
      const result = printer.printList(
        ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
        ts.factory.createNodeArray(statements), resultFile);

    return ({ name: viewName, code: result });
  });
}
