import * as ts from 'typescript';
import { DataSource, DataSourceWithParams, DataSourceWithProperties } from '../appmaker';

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

export const getNameForDataSourceParams = (modelName: string, dataSourceName: string): string => `${modelName}_${dataSourceName}_Params`;
export const getNameForDataSourceProperties = (modelName: string, dataSourceName: string): string => `${modelName}_${dataSourceName}_Properties`;

export const isDataSourceContainsParams = (datasource: DataSource): datasource is (DataSource & DataSourceWithParams) => 'parameters' in datasource;
export const isDataSourceContainsProperties = (datasource: DataSource): datasource is (DataSource & DataSourceWithProperties) => 'customProperties' in datasource;
