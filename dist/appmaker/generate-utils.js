"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDataSourceContainsProperties = exports.isDataSourceContainsParams = exports.getNameForDataSourceProperties = exports.getNameForDataSourceParams = exports.isAppMakerListType = exports.converAppMakerPropertyTypeToTSType = exports.createLiteralTypeProperty = exports.getModelName = exports.hexHtmlToString = void 0;
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
const getNameForDataSourceParams = (modelName, dataSourceName) => `${modelName}_${dataSourceName}_Params`;
exports.getNameForDataSourceParams = getNameForDataSourceParams;
const getNameForDataSourceProperties = (modelName, dataSourceName) => `${modelName}_${dataSourceName}_Properties`;
exports.getNameForDataSourceProperties = getNameForDataSourceProperties;
const isDataSourceContainsParams = (datasource) => 'parameters' in datasource;
exports.isDataSourceContainsParams = isDataSourceContainsParams;
const isDataSourceContainsProperties = (datasource) => 'customProperties' in datasource;
exports.isDataSourceContainsProperties = isDataSourceContainsProperties;
