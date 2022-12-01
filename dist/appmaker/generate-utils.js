"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDataSourceContainsProperties = exports.isDataSourceContainsParams = exports.getNameForViewFragmentProperties = exports.getNameForViewProperties = exports.getNameForViewFragment = exports.getNameForView = exports.getNameForDataSourceProperties = exports.getNameForDataSourceParams = exports.getDataSourceNameFromBinding = exports.getDataSourceViewBinding = exports.getViewBinding = exports.getScriptExports = exports.getTypeForProperties = exports.isAppMakerListType = exports.converAppMakerPropertyTypeToTSType = exports.createLiteralTypeProperty = exports.getModelName = exports.hexHtmlToString = void 0;
const ts = require("typescript");
function hexHtmlToString(str) {
    const REG_HEX = /&#x([a-fA-F0-9]+);/g;
    return str.replace(REG_HEX, function (match, grp) {
        const num = parseInt(grp, 16);
        return String.fromCharCode(num);
    });
}
exports.hexHtmlToString = hexHtmlToString;
const getModelName = (name) => `Model_${name}`;
exports.getModelName = getModelName;
function createLiteralTypeProperty(name, type) {
    return ts.factory.createPropertySignature([], name, undefined, type);
}
exports.createLiteralTypeProperty = createLiteralTypeProperty;
function converAppMakerPropertyTypeToTSType(type) {
    switch (type) {
        case 'Number': return 'number';
        case 'String': return 'string';
        case 'Boolean': return 'boolean';
        case 'Date': return 'Date';
        case 'List[Number]': return 'List<number>';
        case 'List[String]': return 'List<string>';
        case 'List[Boolean]': return 'List<boolean>';
        case 'List[Date]': return 'List<Date>';
        case 'Dynamic': return 'unknown';
    }
    return type;
}
exports.converAppMakerPropertyTypeToTSType = converAppMakerPropertyTypeToTSType;
function isAppMakerListType(type) {
    if (type === 'List[Number]' ||
        type === 'List[String]' ||
        type === 'List[Boolean]' ||
        type === 'List[Date]') {
        return true;
    }
    return false;
}
exports.isAppMakerListType = isAppMakerListType;
function getTypeForProperties(properties, withListInit = true) {
    const props = Array.isArray(properties) ? properties : [properties];
    let propertiesAsType = props.map(parameter => {
        const typeString = converAppMakerPropertyTypeToTSType(parameter.type);
        let type = ts.factory.createUnionTypeNode([ts.factory.createTypeReferenceNode(typeString), ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('null'))]);
        // withListInit isAppMakerListType
        // +            +                   = null
        // -            +                   = not null
        // +            -                   = null
        // -            -                   = null
        if (!withListInit && isAppMakerListType(parameter.type)) {
            type = ts.factory.createTypeReferenceNode(typeString);
        }
        return createLiteralTypeProperty(parameter.name, type);
    });
    let initListProperties = [];
    if (withListInit) {
        const listProperties = props.filter(parameter => isAppMakerListType(parameter.type));
        initListProperties = listProperties.map(parameter => {
            const typeString = converAppMakerPropertyTypeToTSType(parameter.type);
            const type = ts.factory.createFunctionTypeNode(undefined, [], ts.factory.createTypeReferenceNode(typeString));
            return createLiteralTypeProperty(`init${parameter.name.charAt(0).toUpperCase() + parameter.name.slice(1)}`, type);
        });
    }
    propertiesAsType = [...propertiesAsType, ...initListProperties];
    return propertiesAsType;
}
exports.getTypeForProperties = getTypeForProperties;
function getScriptExports(code) {
    const names = [];
    const match = code.match(/exports.[\w.]+\s*=/g) ?? [];
    for (let i = 0; i < match.length; i++) {
        const matchRes = match[i];
        let j = matchRes.length - 1;
        let end = -1;
        while (j >= 0) {
            if (end === -1) {
                if (matchRes[j] !== ' ' && matchRes[j] !== '=') {
                    end = j;
                    break;
                }
            }
            j--;
        }
        const expNames = matchRes.slice(0, end + 1).split('.').slice(1, matchRes.length);
        if (expNames.length > 0) {
            names.push(expNames.join('.'));
        }
    }
    return names;
}
exports.getScriptExports = getScriptExports;
const getViewBinding = (bindings, sourceExpression) => bindings.find(binding => binding.sourceExpression === sourceExpression);
exports.getViewBinding = getViewBinding;
const getDataSourceViewBinding = (bindings) => (0, exports.getViewBinding)(bindings, '_dataSource');
exports.getDataSourceViewBinding = getDataSourceViewBinding;
const getDataSourceNameFromBinding = (binding) => binding.targetLiteralExpression.split('.')[1];
exports.getDataSourceNameFromBinding = getDataSourceNameFromBinding;
const getNameForDataSourceParams = (modelName, dataSourceName) => `${modelName}_${dataSourceName}_Params`;
exports.getNameForDataSourceParams = getNameForDataSourceParams;
const getNameForDataSourceProperties = (modelName, dataSourceName) => `${modelName}_${dataSourceName}_Properties`;
exports.getNameForDataSourceProperties = getNameForDataSourceProperties;
const getNameForView = (viewName) => `${viewName}_View`;
exports.getNameForView = getNameForView;
const getNameForViewFragment = (viewName) => `${viewName}_ViewFragment`;
exports.getNameForViewFragment = getNameForViewFragment;
const getNameForViewProperties = (viewName) => `${viewName}_View_Custom_Properties`;
exports.getNameForViewProperties = getNameForViewProperties;
const getNameForViewFragmentProperties = (viewName) => `${viewName}_ViewFragment_Custom_Properties`;
exports.getNameForViewFragmentProperties = getNameForViewFragmentProperties;
const isDataSourceContainsParams = (datasource) => 'parameters' in datasource;
exports.isDataSourceContainsParams = isDataSourceContainsParams;
const isDataSourceContainsProperties = (datasource) => 'customProperties' in datasource;
exports.isDataSourceContainsProperties = isDataSourceContainsProperties;
