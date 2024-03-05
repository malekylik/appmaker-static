"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResultXML = void 0;
function generateResultXML(script, res) {
    const prefix = '\n'; // AppMaker puts a new line in the beginning of scripts
    return prefix +
        (`<script key="${script.key}" type="${script.type}" name="${script.name}"><![CDATA[${res}]]></script>`);
}
exports.generateResultXML = generateResultXML;
