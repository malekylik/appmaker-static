"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWidgetEventsSourceFile = exports.generateDatasourceSourceFile = void 0;
const ts = require("typescript");
const generate_utils_1 = require("./generate-utils");
function generateDatasourceSourceFile(models) {
    const getFunctionName = (modelName, datasource) => `${modelName}_${datasource}`;
    let statements = models.flatMap(model => model.dataSources.filter((datasource) => datasource.type === 'QUERY' && datasource.customQuery !== undefined && datasource.customQuery.length !== 0).flatMap((datasource) => {
        const queryScript = (0, generate_utils_1.hexHtmlToString)(datasource.customQuery ?? '');
        const isQueryObjectUsed = /query/.test(queryScript);
        const functionParams = isQueryObjectUsed ? [ts.factory.createParameterDeclaration([], undefined, 'query', undefined)] : [];
        const functionBody = ts.factory.createBlock([
            // ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
            ts.factory.createExpressionStatement(ts.factory.createIdentifier(queryScript)),
            // ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')),
        ], true);
        const statements = [];
        if (isQueryObjectUsed) {
            if ((0, generate_utils_1.isDataSourceContainsParams)(datasource)) {
                statements.push(ts.factory.createJSDocComment(`@param {RecordQuery<${(0, generate_utils_1.getNameForDataSourceParams)(model.name, datasource.name)}>} query\n@returns {Array<${(0, generate_utils_1.getModelName)(model.name)}>}`));
            }
            else if ((0, generate_utils_1.isDataSourceContainsProperties)(datasource)) {
                statements.push(ts.factory.createJSDocComment(`@param {RecordQuery<${(0, generate_utils_1.getNameForDataSourceProperties)(model.name, datasource.name)}>} query\n@returns {Array<${(0, generate_utils_1.getModelName)(model.name)}>}`));
            }
            else {
                statements.push(ts.factory.createJSDocComment(`@param {RecordQuery} query\n@returns {Array<${(0, generate_utils_1.getModelName)(model.name)}>}`));
            }
        }
        // TODO: change to classic export style
        statements.push(ts.factory.createFunctionDeclaration([], undefined, ts.factory.createIdentifier(getFunctionName(model.name, datasource.name)), [], functionParams, undefined, functionBody));
        statements.push(ts.factory.createIdentifier('\n'));
        return statements;
    }));
    // statements.push(ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')));
    statements.push(ts.factory.createIdentifier('\n'));
    statements = statements.concat(models.flatMap(model => model.dataSources.filter((datasource) => datasource.type === 'QUERY' && datasource.customQuery !== undefined && datasource.customQuery.length !== 0).flatMap((datasource) => {
        const funcName = ts.factory.createIdentifier(getFunctionName(model.name, datasource.name));
        return [
            ts.factory.createExpressionStatement(ts.factory.createBinaryExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('exports'), funcName), ts.SyntaxKind.EqualsToken, funcName))
        ];
    })));
    const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, omitTrailingSemicolon: true });
    const result = printer.printList(ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine, ts.factory.createNodeArray(statements), resultFile);
    return '/* eslint-disable */\n' + result;
}
exports.generateDatasourceSourceFile = generateDatasourceSourceFile;
function getWidgetEvents(widgetClass, properties) {
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
    const funcs = [];
    if (widgetClass === 'SimpleButton') {
        const onClick = (0, generate_utils_1.getOnClick)(properties);
        const onLoad = (0, generate_utils_1.getOnLoad)(properties);
        const onDataLoad = (0, generate_utils_1.getOnDataLoad)(properties);
        const onUnload = (0, generate_utils_1.getOnUnload)(properties);
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
        const onClick = (0, generate_utils_1.getOnClick)(properties);
        const onLoad = (0, generate_utils_1.getOnLoad)(properties);
        const onDataLoad = (0, generate_utils_1.getOnDataLoad)(properties);
        const onUnload = (0, generate_utils_1.getOnUnload)(properties);
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
        const onClick = (0, generate_utils_1.getOnClick)(properties);
        const onLoad = (0, generate_utils_1.getOnLoad)(properties);
        const onDataLoad = (0, generate_utils_1.getOnDataLoad)(properties);
        const onUnload = (0, generate_utils_1.getOnUnload)(properties);
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
        const onValidate = (0, generate_utils_1.getOnValidate)(properties);
        const onChange = (0, generate_utils_1.getOnChange)(properties);
        const onValueEdit = (0, generate_utils_1.getOnValueEdit)(properties);
        const onLoad = (0, generate_utils_1.getOnLoad)(properties);
        const onDataLoad = (0, generate_utils_1.getOnDataLoad)(properties);
        const onUnload = (0, generate_utils_1.getOnUnload)(properties);
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
        const onValidate = (0, generate_utils_1.getOnValidate)(properties);
        const onChange = (0, generate_utils_1.getOnChange)(properties);
        const onValueEdit = (0, generate_utils_1.getOnValueEdit)(properties);
        const onLoad = (0, generate_utils_1.getOnLoad)(properties);
        const onDataLoad = (0, generate_utils_1.getOnDataLoad)(properties);
        const onUnload = (0, generate_utils_1.getOnUnload)(properties);
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
        const onValidate = (0, generate_utils_1.getOnValidate)(properties);
        const onValuesChange = (0, generate_utils_1.getOnValuesChange)(properties);
        const onLoad = (0, generate_utils_1.getOnLoad)(properties);
        const onDataLoad = (0, generate_utils_1.getOnDataLoad)(properties);
        const onUnload = (0, generate_utils_1.getOnUnload)(properties);
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
function generateWidgetEventsSourceFile(views) {
    const getFunctionName = (names, eventName, widgetClass) => `${names.join('__')}__${eventName}__${widgetClass}`;
    const viewsNames = [];
    const statements = [];
    function onEnter(widgetClass, properties) {
        const name = (0, generate_utils_1.getViewName)(properties);
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
                statements.push(ts.factory.createFunctionDeclaration([], undefined, funcName, [], 
                // TODO: add check if the args are used in the func
                agrs.map(name => ts.factory.createParameterDeclaration([], undefined, name)), undefined, functionBody));
                statements.push(ts.factory.createExpressionStatement(ts.factory.createBinaryExpression(ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('exports'), funcName), ts.SyntaxKind.EqualsToken, funcName)));
            });
            statements.push(ts.factory.createIdentifier('\n'));
        }
    }
    function onExit() {
        viewsNames.pop();
    }
    views.forEach(view => {
        statements.push(ts.factory.createJSDocComment(`Page: ${view.name}\n`));
        (0, generate_utils_1.traverseView)(view.file, { onEnter, onExit });
    });
    const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const result = printer.printList(ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine, ts.factory.createNodeArray(statements), resultFile);
    return '/* eslint-disable */\n' + result;
}
exports.generateWidgetEventsSourceFile = generateWidgetEventsSourceFile;
