export interface ScriptFile {
  script: {
    '#text'?: string;
    key: string;
    type: 'CLIENT' | 'SERVER',
    name: string;
  };
}

export interface QueryDataSource {
  type: 'QUERY';
  name: string;
  customQuery?: string; // code of the query
}

export interface SQLScriptDataSource {
  type: 'SQL';
  name: string;
}

export type DataSource = QueryDataSource | SQLScriptDataSource;

export interface ModelFile {
  model: {
    name: string;
    modelPermission: {};
    field?: Array<{ name: string; type: string; required: 'true' | 'false'; autoIncrement: 'true' | 'false'; }>;
    permission: Array<{}>;
    dataSource: Array<DataSource> | DataSource;
  };
}

// <property name="onLoad" type="String">require('menu').applyLayout();
// app.views.EditProcess.properties.onClose = function () {
//  app.datasources.RCOProcesses.load();
// };</property>
// <property name="onUnload" type="String" isNull="true"/>
// <property name="onDataLoad" type="String" isNull="true"/>
// <property name="action" type="String" isNull="true"/>
export interface ViewFile {
  component: {
    property: Array<{ name: string; type: string; '#text'?: string; component: Array<unknown> }>;
    key: string;
    permission: unknown;
    class: string;
  };
}
