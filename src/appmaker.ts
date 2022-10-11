export interface ScriptFile {
  script: {
    '#text'?: string;
    key: string;
    type: 'CLIENT' | 'SERVER',
    name: string;
  };
}

export interface DataSource {
  name: string;
}

export interface ModelFile {
  model: {
    modelPermission: {};
    field: Array<{ name: string; type: string; }>;
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
    property: Array<{ name: string; type: string; '#text'?: string; }>;
    key: string;
    permission: unknown;
    class: string;
  };
}
