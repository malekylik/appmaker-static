"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLiteralTypeProperty = exports.getModelName = exports.hexHtmlToString = void 0;
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
