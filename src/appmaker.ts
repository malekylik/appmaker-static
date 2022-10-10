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
    field: Array<{}>;
    permission: Array<{}>;
    dataSource: Array<DataSource> | DataSource;
  };
}
