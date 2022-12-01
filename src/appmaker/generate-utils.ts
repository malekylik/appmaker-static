import * as ts from 'typescript';
import { DataSource, DataSourceWithParams, DataSourceWithProperties, ViewBinding } from '../appmaker';

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

export function converAppMakerPropertyTypeToTSType(type: string): string {
  switch(type) {
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

export function isAppMakerListType(type: string): boolean {
  if (
    type === 'List[Number]' ||
    type === 'List[String]' ||
    type === 'List[Boolean]' ||
    type === 'List[Date]'
  ) {
    return true;
  }

  return false;
}

export function getTypeForProperties(properties: Array<{ name: string; type: string; }> | { name: string; type: string; }, withListInit = true): Array<ts.PropertySignature> {
  const props = Array.isArray(properties) ? properties : [properties];

  let propertiesAsType = props.map(parameter => {
    const typeString = converAppMakerPropertyTypeToTSType(parameter.type);
    let type: ts.TypeNode = ts.factory.createUnionTypeNode([ts.factory.createTypeReferenceNode(typeString), ts.factory.createTypeReferenceNode(ts.factory.createIdentifier('null'))]);

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

  let initListProperties: Array<ts.PropertySignature> = [];

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

export function getScriptExports(code: string): Array<string> {
  const names: Array<string> = [];
  const match = code.match(/exports.[\w.]+\s*=/g) ?? [];

  for (let i = 0; i < match.length; i++) {
    const matchRes = match[i] as string;
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

export const getViewBinding = (bindings: Array<ViewBinding>, sourceExpression: ViewBinding['sourceExpression']): ViewBinding | undefined => bindings.find(binding => binding.sourceExpression === sourceExpression);
export const getDataSourceViewBinding = (bindings: Array<ViewBinding>): ViewBinding | undefined => getViewBinding(bindings, '_dataSource');
export const getDataSourceNameFromBinding = (binding: ViewBinding): string | undefined => binding.targetLiteralExpression.split('.')[1];

export const getNameForDataSourceParams = (modelName: string, dataSourceName: string): string => `${modelName}_${dataSourceName}_Params`;
export const getNameForDataSourceProperties = (modelName: string, dataSourceName: string): string => `${modelName}_${dataSourceName}_Properties`;
export const getNameForView = (viewName: string): string => `${viewName}_View`;
export const getNameForViewFragment = (viewName: string): string => `${viewName}_ViewFragment`;
export const getNameForViewProperties = (viewName: string): string => `${viewName}_View_Custom_Properties`;
export const getNameForViewFragmentProperties = (viewName: string): string => `${viewName}_ViewFragment_Custom_Properties`;

export const isDataSourceContainsParams = (datasource: DataSource): datasource is (DataSource & DataSourceWithParams) => 'parameters' in datasource;
export const isDataSourceContainsProperties = (datasource: DataSource): datasource is (DataSource & DataSourceWithProperties) => 'customProperties' in datasource;
