export type OneOrMany<T> = T | Array<T>;

export type AppMakerVarType = 'Number'
  | 'String'
  | 'Boolean'
  | 'Date'
  | 'List[Number]'
  | 'List[String]'
  | 'List[Boolean]'
  | 'List[Date]'
  | 'List[BindingInfo]'
  | 'List[ComponentInfo]'
  | 'AppChildKey' // key of custom ViewFragment
  | 'Dynamic';

export type ViewBinding = {
  sourceExpression: '_dataSource' | string;
  targetExpression: string;
  targetLiteralExpression: 'string';
};

export enum AppMakerComponentClass {
  Panel = 'Panel',
}

export interface AppMakerProperty {
  name: string; type: AppMakerVarType; isNull?: 'true';
};

export interface AppMakerAttrib extends AppMakerProperty {
  '#text': string;
}

export interface AppMakerNameProperty extends AppMakerProperty {
  '#text': string; name: 'name'; type: 'String';
}

export interface AppMakerChildrenProperty extends AppMakerProperty {
  component?: OneOrMany<AppMakerView>; name: 'children'; type: 'List[ComponentInfo]';
}

export interface AppMakerChildKeyProperty extends AppMakerProperty {
  '#text': string; name: 'customWidgetKey'; type: 'AppChildKey';
}

export interface AppMakerIsCustomWidgetProperty extends AppMakerProperty {
  '#text': true; name: 'isCustomWidget'; type: 'Boolean';
}

export interface AppMakerBindingsProperty extends AppMakerProperty {
  name: 'bindings'; binding?: OneOrMany<ViewBinding>; type: 'List[BindingInfo]';
}

export type AppMakerView = {
  key: string;
  class: AppMakerComponentClass | `CustomComponent_${string}`;
  property: AppMakerProperty[];
  customProperties?: { property: OneOrMany<{ key: string; name: string; type: AppMakerVarType }> };
};

export type AppMakerViewStruct = {
  component: AppMakerView;
};
