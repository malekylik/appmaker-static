import { Script } from './appmaker/app';

export function generateResultXML(script: Script, res: string) {
  const prefix = '\n'; // AppMaker puts a new line in the beginning of scripts
  return prefix +
    (`<script key="${script.key}" type="${script.type}" name="${script.name}"><![CDATA[${res}]]></script>`);
}
