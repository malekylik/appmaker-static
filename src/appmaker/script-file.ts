import { QueryDataSource, ViewProperty, WidgetClass } from '../appmaker';
import * as ts from 'typescript';
import type { Model, View } from './app';
import {
  getModelName,
  getNameForDataSourceParams, getNameForDataSourceProperties, getOnChange, getOnClick, getOnDataLoad, getOnLoad, getOnUnload, getOnValidate, getOnValueEdit, getOnValuesChange, getViewName, hexHtmlToString,
  isDataSourceContainsParams, isDataSourceContainsProperties, traverseView
} from './generate-utils';

export function generateDatasourceSourceFile(models: Array<Model>): string {
  const getFunctionName = (modelName: string, datasource: string): string => `${modelName}_${datasource}`;

  let statements: Array<ts.Node> = models.flatMap(model => model.dataSources.filter((datasource): datasource is QueryDataSource => datasource.type === 'QUERY' && datasource.customQuery !== undefined && datasource.customQuery.length !== 0).flatMap((datasource) => {
    const queryScript = hexHtmlToString(datasource.customQuery ?? '');
    const isQueryObjectUsed = /query/.test(queryScript);
    const functionParams = isQueryObjectUsed ? [ts.factory.createParameterDeclaration([], undefined, 'query', undefined)] : [];
    const functionBody = ts.factory.createBlock([
      // ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
      ts.factory.createExpressionStatement(ts.factory.createIdentifier(queryScript)),
      // ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
    ], true);

    const statements: Array<ts.Node> = [];

    if (isQueryObjectUsed) {
      if (isDataSourceContainsParams(datasource)) {
        statements.push(ts.factory.createJSDocComment(`@param {RecordQuery<${getNameForDataSourceParams(model.name, datasource.name)}>} query\n@returns {Array<${getModelName(model.name)}>}`));
      } else if (isDataSourceContainsProperties(datasource)) {
        statements.push(ts.factory.createJSDocComment(`@param {RecordQuery<${getNameForDataSourceProperties(model.name, datasource.name)}>} query\n@returns {Array<${getModelName(model.name)}>}`));
      } else {
        statements.push(ts.factory.createJSDocComment(`@param {RecordQuery} query\n@returns {Array<${getModelName(model.name)}>}`));
      }
    }

    // TODO: change to classic export style
    statements.push(ts.factory.createFunctionDeclaration(
      [], undefined, ts.factory.createIdentifier(getFunctionName(model.name, datasource.name)), [], functionParams, undefined, functionBody));

    statements.push(ts.factory.createIdentifier('\n'));

    return statements;
  }));

  // statements.push(ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')));
  statements.push(ts.factory.createIdentifier('\n'));

  statements = statements.concat(models.flatMap(model => model.dataSources.filter((datasource): datasource is QueryDataSource => datasource.type === 'QUERY' && datasource.customQuery !== undefined && datasource.customQuery.length !== 0).flatMap((datasource) => {
    const funcName = ts.factory.createIdentifier(getFunctionName(model.name, datasource.name));

    return [
      ts.factory.createExpressionStatement(
        ts.factory.createBinaryExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier('exports'),
            funcName
          ),
          ts.SyntaxKind.EqualsToken,
          funcName
        )
      )
    ];
  })));

  const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, omitTrailingSemicolon: true });
  const result = printer.printList(
    ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
    ts.factory.createNodeArray(statements), resultFile);

  return '/* eslint-disable */\n' + result;
}

function getWidgetEvents(widgetClass: WidgetClass, properties: Array<ViewProperty>): Array<[name: string, code: string, args: Array<string>, params: Array<[name: string, type: string]>]> {
  // TODO: add type generation for the args
  // TODO: add textfield generating
  const argsForOnLoad = ['widget'];
  const argsForOnUnload = ['widget'];
  const argsForOnDataLoad = ['widget'];
  const argsForOnClick = ['widget', 'event'];
  const argsForOnValidate = ['widget', 'newValue'];
  const argsForOnValueChange = ['widget', 'newValue'];
  const argsForOnValueEdit = ['widget', 'newValue'];
  const argsForOnValuesChange = ['widget', 'newValues'];

  const funcs: Array<[name: string, code: string, args: Array<string>, params: Array<[name: string, type: string]>]> = [];

  if (widgetClass === 'SimpleButton') {
    const onClick = getOnClick(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onClick && onClick['#text']) {
      funcs.push(['onClick', onClick['#text'], argsForOnClick, []]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad, []]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad, []]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload, []]);
    }
  }

  if (widgetClass === 'Panel') {
    const onClick = getOnClick(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onClick && onClick['#text']) {
      funcs.push(['onClick', onClick['#text'], argsForOnClick, []]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad, []]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad, []]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload, []]);
    }
  }

  if (widgetClass === 'SimpleLabel') {
    const onClick = getOnClick(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onClick && onClick['#text']) {
      funcs.push(['onClick', onClick['#text'], argsForOnClick, []]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad, []]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad, []]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload, []]);
    }
  }

  if (widgetClass === 'Dropdown') {
    // TODO: think about type safety: how to connect the widget class to the avaliable events
    const onValidate = getOnValidate(properties);
    const onChange = getOnChange(properties);
    const onValueEdit = getOnValueEdit(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onValidate && onValidate['#text']) {
      funcs.push(['onValidate', onValidate['#text'], argsForOnValidate, []]);
    }

    if (onChange && onChange['#text']) {
      funcs.push(['onChange', onChange['#text'], argsForOnValueChange, []]);
    }
    
    if (onValueEdit && onValueEdit['#text']) {
      funcs.push(['onValueEdit', onValueEdit['#text'], argsForOnValueEdit, []]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad, []]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad, []]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload, []]);
    }
  }

  if (widgetClass === 'CheckBoxComponent') {
    const onValidate = getOnValidate(properties);
    const onChange = getOnChange(properties);
    const onValueEdit = getOnValueEdit(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onValidate && onValidate['#text']) {
      funcs.push(['onValidate', onValidate['#text'], argsForOnValidate, []]);
    }

    if (onChange && onChange['#text']) {
      funcs.push(['onChange', onChange['#text'], argsForOnValueChange, []]);
    }
    
    if (onValueEdit && onValueEdit['#text']) {
      funcs.push(['onValueEdit', onValueEdit['#text'], argsForOnValueEdit, []]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad, []]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad, []]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload, []]);
    }
  }

  if (widgetClass === 'MultiSelectBox') {
    const onValidate = getOnValidate(properties);
    const onValuesChange = getOnValuesChange(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onValidate && onValidate['#text']) {
      funcs.push(['onValidate', onValidate['#text'], argsForOnValidate, []]);
    }

    if (onValuesChange && onValuesChange['#text']) {
      funcs.push(['onValuesChange', onValuesChange['#text'], argsForOnValuesChange, []]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad, []]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad, []]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload, []]);
    }
  }

  return funcs;
}

export function generateWidgetEventsSourceFile(views: Array<View>): string {
  const getFunctionName = (names: Array<string>, eventName: string, widgetClass: WidgetClass | string): string => `${names.join('__')}__${eventName}__${widgetClass}`;

  const viewsNames: Array<string> = [];
  const statements: Array<ts.Node> = [];

  function onEnter(widgetClass: WidgetClass, properties: Array<ViewProperty>) {
  const name = getViewName(properties);

  viewsNames.push(name);

  const events = getWidgetEvents(widgetClass, properties);

  if (events.length > 0) {
    events.forEach(([name, code, agrs]) => {
      const funcName = ts.factory.createIdentifier(getFunctionName(viewsNames, name, widgetClass));
      const functionBody = ts.factory.createBlock([
        // ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
        ts.factory.createExpressionStatement(ts.factory.createIdentifier(code)),
        // ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
      ], true);

      statements.push(ts.factory.createFunctionDeclaration(
        [], undefined, funcName,
        [],
        // TODO: add check if the args are used in the func
        agrs.map(name => ts.factory.createParameterDeclaration([], undefined, name)),
        undefined, functionBody));

        statements.push(
          ts.factory.createExpressionStatement(
            ts.factory.createBinaryExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier('exports'),
                funcName
              ),
              ts.SyntaxKind.EqualsToken,
              funcName
            )
          )
        );
    });

    statements.push(ts.factory.createIdentifier('\n'));
  }
}

function onExit() {
  viewsNames.pop();
}
  
  views.forEach(view => {
    statements.push(ts.factory.createJSDocComment(`Page: ${view.name}\n`));

    traverseView(view.file, { onEnter, onExit });
  });

  const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printList(
    ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
    ts.factory.createNodeArray(statements), resultFile);

  return '/* eslint-disable */\n' + result;
}
