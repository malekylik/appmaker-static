export interface ScriptFile {
  script: {
    '#text'?: string;
    key: string;
    type: 'CLIENT' | 'SERVER',
    name: string;
  };
}

export type AppMakerVarType = 'Number'
  | 'String'
  | 'Boolean'
  | 'Date'
  | 'List[Number]'
  | 'List[String]'
  | 'List[Boolean]'
  | 'List[Date]'
  | 'AppChildKey' // key of custom ViewFragment
  | 'Dynamic';

export type DataSourceParam = { name: string; type: string; isNull: 'true' | 'false'; };
export type DataSourceProperty = { name: string; type: string; };

export type DataSourceWithParams = {
  parameters: { property: Array<DataSourceParam> | DataSourceParam };
}

export type DataSourceWithProperties = {
  customProperties: { property: Array<DataSourceProperty> | DataSourceProperty };
}

type DataSourceWithParamsOrProperties = DataSourceWithParams | DataSourceWithProperties;

export type QueryDataSource = {
  type: 'QUERY';
  name: string;
  customQuery?: string; // code of the query
} & DataSourceWithParamsOrProperties;

export type SQLScriptDataSource = {
  type: 'SQL';
  name: string;
} & DataSourceWithParamsOrProperties;

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

export type WidgetClass =
    'Panel'
  | 'SimpleLabel'
  | 'Dropdown'
  | 'SimpleButton'
  | 'CheckBoxComponent'
  | 'MultiSelectBox'
  | `CustomComponent_${string}`;

export type ViewChildren = { property: Array<ViewProperty>, key: string, class: WidgetClass };

export type ViewBinding = {
  sourceExpression: '_dataSource' | string;
  targetExpression: string;
  targetLiteralExpression: 'string';
};

export type ChildrenPropery = { name: 'children'; type: string; '#text'?: string; component: Array<ViewChildren> | ViewChildren; };
export type IsCustomWidgetPropery = { name: 'isCustomWidget'; '#text': string };
export type WidgetNamePropery = { name: 'name'; '#text': string; type: AppMakerVarType };
export type WidgetStyleNamePropery = { name: 'styleName'; '#text'?: string; type: AppMakerVarType };
export type WidgetVisiblePropery = { name: 'visible'; '#text'?: string; };
export type WidgetEnabledPropery = { name: 'enabled'; '#text'?: string; };
export type WidgetCssPropery = { name: 'css'; '#text'?: string; type: AppMakerVarType };
export type BindingsPropery = {
  name: 'bindings';
  binding?: ViewBinding | Array<ViewBinding>;
};
export type IsRootPropery = { name: 'isRootComponent'; '#text': boolean; type: 'Boolean'; };
export type ActionType = 'onLoad' | 'onUnload' | 'onDataLoad' | 'action' | 'onValidate' | 'onChange' | 'onValueEdit' | 'onValuesChange';
export type ActionPropery = { name: ActionType; '#text'?: string; isNull: true; } | { name: ActionType; '#text': string; isNull?: true; };

// export type properties = { name: 'properties' };
// customProperties

export type ViewProperty =
  (  ChildrenPropery
  | IsCustomWidgetPropery
  | WidgetNamePropery
  | BindingsPropery
  | IsRootPropery
  | ActionPropery
  | WidgetStyleNamePropery
  | WidgetVisiblePropery
  | WidgetEnabledPropery
  | WidgetCssPropery) & { isNull?: true; type: AppMakerVarType };

export interface ViewFile {
  component: {
    property: Array<ViewProperty>;
    key: string;
    permission: unknown;
    class: WidgetClass;
    customProperties?: {
      property: Array<
        {
          key: string;
          name: string;
          type: string;
        }
      > | {
        key: string;
        name: string;
        type: string;
      };
    };
  };
}
