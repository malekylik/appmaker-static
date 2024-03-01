"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateResultXML = void 0;
function generateResultXML(initXML, res) {
    const prefix = '\n'; // Appmaker puts a new line in the begining of scipts
    return prefix +
        (`<script key="${initXML.script.key}" type="${initXML.script.type}" name="${initXML.script.name}"><![CDATA[${res}]]></script>`);
}
exports.generateResultXML = generateResultXML;
