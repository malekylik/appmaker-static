import { QueryDataSource, ViewProperty, WidgetClass } from '../appmaker';
import * as ts from 'typescript';
import type { Model, View } from './app';
import {
  getNameForDataSourceParams, getNameForDataSourceProperties, getOnChange, getOnClick, getOnDataLoad, getOnLoad, getOnUnload, getOnValidate, getOnValueEdit, getOnValuesChange, getViewName, hexHtmlToString,
  isDataSourceContainsParams, isDataSourceContainsProperties, traverseView
} from './generate-utils';

export function generateDatasourceSourceFile(models: Array<Model>): string {
  const getFunctionName = (modelName: string, datasource: string): string => `${modelName}_${datasource}`;

  const statements: Array<ts.Node> = models.flatMap(model => model.dataSources.filter((datasource): datasource is QueryDataSource => datasource.type === 'QUERY' && datasource.customQuery !== undefined && datasource.customQuery.length !== 0).flatMap((datasource) => {
    const queryScript = hexHtmlToString(datasource.customQuery ?? '');
    const isQueryObjectUsed = /query/.test(queryScript);
    const functionParams = isQueryObjectUsed ? [ts.factory.createParameterDeclaration([], undefined, 'query', undefined)] : [];
    const functionBody = ts.factory.createBlock([
      ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
      ts.factory.createExpressionStatement(ts.factory.createIdentifier(queryScript)),
      ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
    ]);

    const statements: Array<ts.Node> = [];

    if (isQueryObjectUsed) {
      if (isDataSourceContainsParams(datasource)) {
        statements.push(ts.factory.createJSDocComment(`@param {RecordQuery<${getNameForDataSourceParams(model.name, datasource.name)}>} query\n@returns {Array<unknown>}`));
      } if (isDataSourceContainsProperties(datasource)) {
        statements.push(ts.factory.createJSDocComment(`@param {RecordQuery<${getNameForDataSourceProperties(model.name, datasource.name)}>} query\n@returns {Array<unknown>}`));
      } else {
        statements.push(ts.factory.createJSDocComment('@param {RecordQuery} query\n@returns {Array<unknown>}'));
      }
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

function getWidgetEvents(widgetClass: WidgetClass, properties: Array<ViewProperty>): Array<[name: string, code: string, args: Array<string>]> {
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

  const funcs: Array<[name: string, code: string, args: Array<string>]> = [];

  if (widgetClass === 'SimpleButton') {
    const onClick = getOnClick(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onClick && onClick['#text']) {
      funcs.push(['onClick', onClick['#text'], argsForOnClick]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload]);
    }
  }

  if (widgetClass === 'Panel') {
    const onClick = getOnClick(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onClick && onClick['#text']) {
      funcs.push(['onClick', onClick['#text'], argsForOnClick]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload]);
    }
  }

  if (widgetClass === 'SimpleLabel') {
    const onClick = getOnClick(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onClick && onClick['#text']) {
      funcs.push(['onClick', onClick['#text'], argsForOnClick]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload]);
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
      funcs.push(['onValidate', onValidate['#text'], argsForOnValidate]);
    }

    if (onChange && onChange['#text']) {
      funcs.push(['onChange', onChange['#text'], argsForOnValueChange]);
    }
    
    if (onValueEdit && onValueEdit['#text']) {
      funcs.push(['onValueEdit', onValueEdit['#text'], argsForOnValueEdit]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload]);
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
      funcs.push(['onValidate', onValidate['#text'], argsForOnValidate]);
    }

    if (onChange && onChange['#text']) {
      funcs.push(['onChange', onChange['#text'], argsForOnValueChange]);
    }
    
    if (onValueEdit && onValueEdit['#text']) {
      funcs.push(['onValueEdit', onValueEdit['#text'], argsForOnValueEdit]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload]);
    }
  }

  if (widgetClass === 'MultiSelectBox') {
    const onValidate = getOnValidate(properties);
    const onValuesChange = getOnValuesChange(properties);

    const onLoad = getOnLoad(properties);
    const onDataLoad = getOnDataLoad(properties);
    const onUnload = getOnUnload(properties);

    if (onValidate && onValidate['#text']) {
      funcs.push(['onValidate', onValidate['#text'], argsForOnValidate]);
    }

    if (onValuesChange && onValuesChange['#text']) {
      funcs.push(['onValuesChange', onValuesChange['#text'], argsForOnValuesChange]);
    }

    if (onLoad && onLoad['#text']) {
      funcs.push(['onLoad', onLoad['#text'], argsForOnLoad]);
    }

    if (onDataLoad && onDataLoad['#text']) {
      funcs.push(['onDataLoad', onDataLoad['#text'], argsForOnDataLoad]);
    }

    if (onUnload && onUnload['#text']) {
      funcs.push(['onUnload', onUnload['#text'], argsForOnUnload]);
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
      const functionBody = ts.factory.createBlock([
        ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
        ts.factory.createExpressionStatement(ts.factory.createIdentifier(code)),
        ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
      ]);

      statements.push(ts.factory.createFunctionDeclaration(
        [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, ts.factory.createIdentifier(getFunctionName(viewsNames, name, widgetClass)),
        [],
        // TODO: add check if the args are used in the func
        agrs.map(name => ts.factory.createParameterDeclaration([], undefined, undefined, name)),
        undefined, functionBody));
    });

    statements.push(ts.factory.createIdentifier('\n'));
  }
}

function onExit() {
  viewsNames.pop();
}
  
  // models.flatMap(model => model.dataSources.filter((datasource): datasource is QueryDataSource => datasource.type === 'QUERY' && datasource.customQuery !== undefined && datasource.customQuery.length !== 0).flatMap((datasource) => {
  //   const queryScript = hexHtmlToString(datasource.customQuery ?? '');
  //   const isQueryObjectUsed = /query/.test(queryScript);
  //   const functionParams = isQueryObjectUsed ? [ts.factory.createParameterDeclaration([], undefined, 'query', undefined)] : [];
  //   const functionBody = ts.factory.createBlock([
  //     ts.factory.createExpressionStatement(ts.factory.createIdentifier(queryScript))
  //   ]);

  //   const statements: Array<ts.Node> = [];

  //   if (isQueryObjectUsed) {
  //     if (isDataSourceContainsParams(datasource)) {
  //       statements.push(ts.factory.createJSDocComment(`@param {RecordQuery<${getNameForDataSourceParams(model.name, datasource.name)}>} query\n@returns {Array<unknown>}`));
  //     } if (isDataSourceContainsProperties(datasource)) {
  //       statements.push(ts.factory.createJSDocComment(`@param {RecordQuery<${getNameForDataSourceProperties(model.name, datasource.name)}>} query\n@returns {Array<unknown>}`));
  //     } else {
  //       statements.push(ts.factory.createJSDocComment('@param {RecordQuery} query\n@returns {Array<unknown>}'));
  //     }
  //   }

  //   statements.push(ts.factory.createFunctionDeclaration(
  //     [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, ts.factory.createIdentifier(getFunctionName(model.name, datasource.name)), [], functionParams, undefined, functionBody));

  //   return statements;
  // }))

  views.forEach(view => {
    statements.push(ts.factory.createJSDocComment(`Page: ${view.name}\n`));

    traverseView(view.file, { onEnter, onExit });
  });

  const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const result = printer.printList(
    ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine,
    ts.factory.createNodeArray(statements), resultFile);

  return result;
}
