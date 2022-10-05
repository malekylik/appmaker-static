export function generateResultXML(initXML: any, res: string) {
    return (`\
  <script key="${initXML.script.key}" type="${initXML.script.type}" name="${initXML.script.name}"><![CDATA[${res}]]></script>`);
}
