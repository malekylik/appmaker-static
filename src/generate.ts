import { ScriptFile } from './appmaker';

export function generateResultXML(initXML: ScriptFile, res: string) {
  const prefix = '\n'; // Appmaker puts a new line in the begining of scipts
  return prefix +
    (`<script key="${initXML.script.key}" type="${initXML.script.type}" name="${initXML.script.name}"><![CDATA[${res}]]></script>`);
}
