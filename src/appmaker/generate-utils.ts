import * as ts from 'typescript';

export function hexHtmlToString(str: string): string {
  const REG_HEX = /&#x([a-fA-F0-9]+);/g;
  return str.replace(REG_HEX, function(match, grp){
      const num = parseInt(grp, 16);
      return String.fromCharCode(num);
  });
}

export const getModelName = (name: string): string => `Model_${name}`;

export function createLiteralTypeProperty(name: string, type: ts.TypeNode): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    [], name, undefined, type);
}
