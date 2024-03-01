"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJSXForViews = void 0;
const ts = require("typescript");
const generate_utils_1 = require("./generate-utils");
const appmaker_view_1 = require("../functional/appmaker/appmaker-view");
const appmaker_view_2 = require("../functional/appmaker/appmaker-view");
const O = require("fp-ts/lib/Option");
const function_1 = require("fp-ts/lib/function");
const appmaker_utils_1 = require("../functional/appmaker/appmaker-utils");
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
function getViewDefinition(view, customWidgetMap) {
    return (0, function_1.pipe)(view, view => (0, appmaker_view_1.findAppMakerCustomWidgetKeyProperty)(view.property), O.match(() => O.none, p => customWidgetMap.get(p['#text']) ? O.some(customWidgetMap.get(p['#text'])) : O.none));
}
function getClassOrCustomName(view, customWidgetMap) {
    return (0, function_1.pipe)(getViewDefinition(view, customWidgetMap), // TODO: move outside
    O.match(() => O.none, v => (0, appmaker_view_1.findAppMakerNameProperty)(v.property)), O.match(() => view.class, p => p['#text']));
}
function getFunctionNameForBinding(widgetClass, name, bindingName) {
    return `get${widgetClass}_${name}_${bindingName}`;
}
function sortAttribNames(attribs) {
    return attribs
        .slice()
        .sort((a, b) => {
        if (a.attribName === 'name' && b.attribName === 'name') {
            return 0;
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
function getAttribsForComponent(attribs) {
    return (0, function_1.pipe)(attribs, attribs => sortAttribNames(attribs), attribs => attribs.map(attrib => `${attrib.attribName}={${attrib.attribValue}}`));
}
function generateAttribValueForDatasource(dataSourceBinding) {
    return (0, function_1.pipe)(dataSourceBinding, binding => binding.match(/@\w+\.(\w+)/) ?? [], match => match[1], datsourceName => datsourceName ? O.some(datsourceName) : O.none);
}
function getKeyForCustomComponentProperty(property) {
    return (0, function_1.pipe)(property, p => p.match(/\w+\.(\w+)/) ?? [], m => m[1], key => key ? O.some(key) : O.none);
}
function generateAttribForDatasource(bindings, parentDatasource) {
    return (0, function_1.pipe)(bindings, bindings => bindings.filter(b => b.sourceExpression === '_dataSource')[0], dataSourceBinding => dataSourceBinding ?
        ({ attribName: '_dataSource', attribValue: (0, function_1.pipe)(generateAttribValueForDatasource(dataSourceBinding.targetLiteralExpression), O.match(() => '', datasource => `app.datasources.${datasource}`)) }) :
        parentDatasource ? ({ attribName: '_inheritedDataSource', attribValue: `app.datasources.${parentDatasource}` }) : ({ attribName: '_dataSource', attribValue: 'null' }));
}
function joinAppMakerBindingAndAppMakerAttribs(getFunctionNameForBinding, attribs, bindings, context) {
    const existingBindings = new Map();
    (0, function_1.pipe)(bindings, bindings => bindings.map(b => existingBindings.set(b.name, true)));
    const funcBinding = bindings.filter(b => !InlineBinding.includes(b.sourceExpression));
    let bindingToInline = bindings.filter(b => InlineBinding.includes(b.sourceExpression));
    const attribsToInline = attribs
        .filter(b => !FuncAttribs.includes(b.name))
        .filter(b => !existingBindings.has(b.name));
    const funcAttribs = attribs
        .filter(b => FuncAttribs.includes(b.name))
        .filter(b => !existingBindings.has(b.name));
    const tsAttribs = [];
    tsAttribs.push(generateAttribForDatasource(bindings, context.parentDatasource));
    bindingToInline = bindingToInline.filter(b => b.sourceExpression !== '_dataSource');
    return tsAttribs
        .concat(bindingToInline.map(generateTSAttribForInlineBinding))
        .concat(funcBinding.map(b => ({ attribName: b.name, attribValue: `${getFunctionNameForBinding(b.name)}()` })))
        .concat(attribsToInline.map(a => ({ attribName: a.name, attribValue: (0, generate_utils_1.stringifyAppMakerProperty)(a['type'], a['#text']) })))
        .concat(funcAttribs.map(a => ({ attribName: a.name, attribValue: `${getFunctionNameForBinding(a.name)}()` })));
    function generateTSAttribForInlineBinding(binding) {
        return ({ attribName: binding.name, attribValue: binding.value });
    }
}
function generateBindings(widgetClass, viewName, bindings, attribs) {
    const bindingStatements = [];
    (0, appmaker_utils_1.oneOrManyRun)(bindings, (binding) => {
        if (InlineBinding.includes(binding.sourceExpression)) {
            return;
        }
        const bodyStatements = [
            ts.factory.createReturnStatement(ts.factory.createIdentifier(binding.value + '\n')),
        ];
        const functionBody = ts.factory.createBlock(bodyStatements);
        bindingStatements.push(ts.factory.createFunctionDeclaration([], undefined, ts.factory.createIdentifier(getFunctionNameForBinding(widgetClass, viewName, binding.name)), [], 
        // TODO: add check if the args are used in the func
        [], undefined, functionBody));
    });
    for (let i = 0; i < attribs.length; i++) {
        const property = attribs[i];
        if (FuncAttribs.includes(property.name) && property['#text']) {
            const bodyStatements = [
                ts.factory.createExpressionStatement(ts.factory.createIdentifier((0, generate_utils_1.hexHtmlToString)(String(property['#text'])) + '\n')),
            ];
            const functionBody = ts.factory.createBlock(bodyStatements);
            bindingStatements.push(ts.factory.createFunctionDeclaration([], undefined, ts.factory.createIdentifier(getFunctionNameForBinding(widgetClass, viewName, property.name)), [], 
            // TODO: add check if the args are used in the func
            [], undefined, functionBody));
        }
    }
    return bindingStatements;
}
function parseBindingValue(value) {
    return value.replace(/@/g, '/* binding */ (app).');
}
function createParsedBinding(binding, name, value) {
    return ({ ...binding, name, value });
}
function generateJSXForViews(newViews, customWidgetMap) {
    return newViews.map(view => {
        const currentTag = [];
        const datasources = [];
        const viewName = (0, function_1.pipe)(view, view => (0, appmaker_view_1.findAppMakerNameProperty)(view.property), O.match(() => 'Unknonw_View_Name', v => v['#text']));
        let statements = [];
        let jsx = [];
        let level = 0;
        const bodyStatements = [ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n'))];
        function onEnter(view) {
            const properties = view.property;
            const widgetClass = getClassOrCustomName(view, customWidgetMap);
            const viewDefinintion = getViewDefinition(view, customWidgetMap);
            const name = (0, function_1.pipe)((0, appmaker_view_1.findAppMakerNameProperty)(properties), O.match(() => 'Unknonw_View_Name', v => v['#text']));
            const propertiesAsAttribs = (0, appmaker_view_1.getAppMakerViewAttribs)(properties);
            const bindings = (0, function_1.pipe)((0, appmaker_view_1.findAppMakerBindingsProperty)(properties), O.match(() => [], v => v['binding']));
            const parsedBinding = (0, function_1.pipe)((0, appmaker_utils_1.convertOneOrManyToArray)(bindings).slice(), bindings => bindings.map((b) => {
                return (0, function_1.pipe)(b.sourceExpression, sourceExpression => getKeyForCustomComponentProperty(sourceExpression), 
                // TODO: find a way to remove duplication of the code
                O.match(() => createParsedBinding(b, b.sourceExpression, parseBindingValue((0, generate_utils_1.hexHtmlToString)(b.targetLiteralExpression))), key => (0, function_1.pipe)(viewDefinintion, O.match(() => O.some(null), viewDefinintion => O.some(viewDefinintion.customProperties ? (0, appmaker_utils_1.convertOneOrManyToArray)(viewDefinintion.customProperties.property).find(v => v.key === key) : null)), O.match(() => createParsedBinding(b, b.sourceExpression, parseBindingValue((0, generate_utils_1.hexHtmlToString)(b.targetLiteralExpression))), customProp => customProp ? createParsedBinding(b, `custom_${customProp.name}`, parseBindingValue((0, generate_utils_1.hexHtmlToString)(b.targetLiteralExpression))) : createParsedBinding(b, b.sourceExpression, (0, generate_utils_1.hexHtmlToString)(b.targetLiteralExpression))))));
            }));
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
            (0, function_1.pipe)(datasourceBinding, datasourceBinding => O.some(datasourceBinding), O.chain(b => b ? generateAttribValueForDatasource(b.targetLiteralExpression) : O.some(b)), // TODO: check how to avoid passing undefined to some
            O.match(() => { }, datasouceName => datasouceName ? datasources.push(datasouceName) : datasources.push(parentDatasource)));
            const attribsStr = attribsJsx
                .map(attr => `${attrIndent}${attr}`)
                .join('\n');
            jsx.push(`${indent}<${widgetClass}\n${attribsStr}\n${indent}>`);
            level += 1;
        }
        function onExit() {
            const props = currentTag.pop();
            datasources.pop();
            level -= 1;
            jsx.push(`${' '.repeat(level * 2)}</${props.tag}>`);
        }
        (0, appmaker_view_2.traverseView)(view, { onEnter, onExit });
        bodyStatements.push(ts.factory.createReturnStatement(ts.factory.createParenthesizedExpression(ts.factory.createIdentifier(jsx.join('\n')))));
        bodyStatements.push(ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')));
        const functionBody = ts.factory.createBlock(bodyStatements);
        statements.push(ts.factory.createFunctionDeclaration([ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, ts.factory.createIdentifier(`getView_${viewName}`), [], 
        // TODO: add check if the args are used in the func
        [], undefined, functionBody));
        const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const result = printer.printList(ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine, ts.factory.createNodeArray(statements), resultFile);
        return ({ name: viewName, code: result });
    });
}
exports.generateJSXForViews = generateJSXForViews;
