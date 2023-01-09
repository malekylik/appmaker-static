"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJSXForViews = void 0;
const ts = require("typescript");
const generate_utils_1 = require("./generate-utils");
const BindingAsAttribsSkip = [
    '_dataSource', // datasource cant conitian complex expression, just one of datasources, so it's easier to inspect the code, if we inline _dataSource bindgin
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
];
function getFunctionNameForBinding(widgetClass, name, bindingName) {
    // for custom components 
    bindingName = bindingName.replace('.', '_');
    return `get${widgetClass}_${name}_${bindingName}`;
}
function getAttribsForComponent(widgetClass, properties, parentDatasource) {
    let attribs = [];
    let isDatasourceAdded = false;
    const bindings = (0, generate_utils_1.getViewBindings)(properties);
    const name = (0, generate_utils_1.getViewName)(properties);
    for (let i = 0; i < bindings.length; i++) {
        const binding = bindings[i];
        const bindingName = getFunctionNameForBinding(widgetClass, name, binding.sourceExpression);
        // for custom components 
        const bindingPropertyName = binding.sourceExpression.replace('.', '_');
        if (BindingAsAttribsSkip.includes(binding.sourceExpression)) {
            // TODO: might be incorect :( should check the datasource name by id from targetExpression
            let attribValue = (0, generate_utils_1.hexHtmlToString)(binding.targetLiteralExpression);
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
        }
        else {
            attribs.push(`${bindingPropertyName}={${bindingName}()}`);
        }
    }
    if (!isDatasourceAdded) {
        if (parentDatasource) {
            attribs.push(`_inheritedDataSource={app.datasources.${parentDatasource}}`);
        }
        else {
            attribs.push(`_dataSource={null}`);
        }
    }
    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        if (property.name === 'bindings')
            continue;
        // bindings takes precedent over just properties
        if (bindings.find(binding => binding.sourceExpression === property.name))
            continue;
        if (property['#text'] && !property['isNull']) {
            if (AttribsWithFuncGeneration.includes(property.name)) {
                const bindingName = getFunctionNameForBinding(widgetClass, name, property.name);
                attribs.push(`${property.name}={${bindingName}()}`);
            }
            else {
                attribs.push(`${property['name']}={${(0, generate_utils_1.stringifyAppMakerProperty)(property['type'], property['#text'])}}`);
            }
        }
    }
    return attribs;
}
function generateBindings(widgetClass, properties) {
    const bindingStatements = [];
    const bindings = (0, generate_utils_1.getViewBindings)(properties);
    const name = (0, generate_utils_1.getViewName)(properties);
    for (let i = 0; i < bindings.length; i++) {
        const binding = bindings[i];
        if (BindingAsAttribsSkip.includes(binding.sourceExpression)) {
            continue;
        }
        const bodyStatements = [
            ts.factory.createReturnStatement(ts.factory.createIdentifier((0, generate_utils_1.hexHtmlToString)(binding.targetLiteralExpression) + '\n')),
        ];
        const functionBody = ts.factory.createBlock(bodyStatements);
        bindingStatements.push(ts.factory.createFunctionDeclaration([], undefined, ts.factory.createIdentifier(getFunctionNameForBinding(widgetClass, name, binding.sourceExpression)), [], 
        // TODO: add check if the args are used in the func
        [], undefined, functionBody));
    }
    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        if (property.name === 'bindings')
            continue;
        if (AttribsWithFuncGeneration.includes(property.name) && property['#text']) {
            const bodyStatements = [
                ts.factory.createExpressionStatement(ts.factory.createIdentifier((0, generate_utils_1.hexHtmlToString)(String(property['#text'])) + '\n')),
            ];
            const functionBody = ts.factory.createBlock(bodyStatements);
            bindingStatements.push(ts.factory.createFunctionDeclaration([], undefined, ts.factory.createIdentifier(getFunctionNameForBinding(widgetClass, name, property.name)), [], 
            // TODO: add check if the args are used in the func
            [], undefined, functionBody));
        }
    }
    return bindingStatements;
}
function generateJSXForViews(views) {
    return views.map(view => {
        let statements = [];
        const currentTag = [];
        const datasources = [];
        let jsx = [];
        let level = 0;
        const bodyStatements = [ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n'))];
        function onEnter(widgetClass, properties) {
            const name = (0, generate_utils_1.getViewName)(properties);
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
            const bindings = (0, generate_utils_1.getViewBindings)(properties);
            const datasourceBinding = bindings.find(binding => binding.sourceExpression === '_dataSource');
            if (datasourceBinding) {
                const attribValue = (0, generate_utils_1.hexHtmlToString)(datasourceBinding.targetLiteralExpression);
                const match = attribValue.match(/@\w+\.(\w+)/) ?? [];
                const datasouceName = match[1];
                if (datasouceName) {
                    datasources.push(datasouceName);
                }
                else {
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
            const props = currentTag.pop();
            datasources.pop();
            level -= 1;
            jsx.push(`${' '.repeat(level * 2)}</${props.tag}>`);
        }
        (0, generate_utils_1.traverseView)(view.file, { onEnter, onExit });
        bodyStatements.push(ts.factory.createReturnStatement(ts.factory.createParenthesizedExpression(ts.factory.createIdentifier(jsx.join('\n')))));
        bodyStatements.push(ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n')));
        const functionBody = ts.factory.createBlock(bodyStatements);
        statements.push(ts.factory.createFunctionDeclaration([ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)], undefined, ts.factory.createIdentifier(`getView_${view.name}`), [], 
        // TODO: add check if the args are used in the func
        [], undefined, functionBody));
        const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const result = printer.printList(ts.ListFormat.MultiLine | ts.ListFormat.PreserveLines | ts.ListFormat.PreferNewLine, ts.factory.createNodeArray(statements), resultFile);
        return ({ name: view.name, code: result });
    });
}
exports.generateJSXForViews = generateJSXForViews;
