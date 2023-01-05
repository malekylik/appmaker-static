"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJSXForViews = void 0;
const ts = require("typescript");
const generate_utils_1 = require("./generate-utils");
function generateJSXForViews(views) {
    return views.map(view => {
        const statements = [];
        const currentTag = [];
        let jsx = [];
        let level = 0;
        const bodyStatements = [ts.factory.createExpressionStatement(ts.factory.createIdentifier('\n'))];
        function onEnter(widgetClass, properties) {
            const name = (0, generate_utils_1.getViewName)(properties);
            const styleName = (0, generate_utils_1.getViewStyleName)(properties);
            const visible = (0, generate_utils_1.getViewVisible)(properties);
            const enabled = (0, generate_utils_1.getViewEnabled)(properties);
            const css = (0, generate_utils_1.getViewCss)(properties);
            const _bindings = (0, generate_utils_1.getViewBindings)(properties);
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
            const props = currentTag.pop();
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
