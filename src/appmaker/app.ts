export interface Model {
  name: string; fields: Array<{ name: string; type: string; required: boolean; }>; dataSources: Array<{ name: string; }>;
}

export interface View {
  name: string; key: string; class: string; isViewFragment: boolean;
}

function converAppMakerPropertyTypeToTSType(type: string): string {
  switch(type) {
    case 'Number': return 'number';
    case 'String': return 'string';
    case 'Boolean': return 'boolean';
  }

  return type;
}

export class App {
  private views: Array<View> = [];
  private models: Array<Model> = [];

  addView(view: View) {
    this.views.push(view);
  }

  addModel(model: Model) {
    this.models.push(model);
  }

  generateAppDeclarationFile(): string {
    const generateTypeForModel = (fields: Model['fields']) => `{\n${fields.map(field => `${field.name}: ${field.required ? converAppMakerPropertyTypeToTSType(field.type) : converAppMakerPropertyTypeToTSType(field.type) + ' | null'};`).join('\n')}\n}`;
    const generateTypeForDataSource = (datasource: Model['dataSources'][number], modelType: string) => `${datasource.name}: Datasource<${modelType}>;`;
    const dataSources = this.models
      .map(model => ({ modelType: model.name, dataSources: model.dataSources }))
      .flatMap(model => model.dataSources.map(datasource => generateTypeForDataSource(datasource, model.modelType)))
      .join('\n');
    const views = this.views.filter(view => !view.isViewFragment).map(view => `${view.name}: Widget;`).join('\n')
    const viewFragments = this.views.filter(view => view.isViewFragment).map(view => `${view.name}: Widget;`).join('\n')
    const models = this.models.map(model => `declare type ${model.name} = ${generateTypeForModel(model.fields)};`).join('\n\n');

    return `
    declare type List<T> = {
      toArray(): Array<T>;
    }
    
    declare type Datasource<T> = {
      item: T | null;
      items: List<T> | null;
    
      load(config?: { success: () => void; failure?: (e: Error) => void }): void;
      unload(): void;
    };
    
    type WidgetCommon = {
      root: LayoutWidget;
      getDescendant(name: string): Widget | null;
      getDescendantsByClass(name: string): Array<Widget>;
    }
    
    declare type LayoutWidget = {
    } & WidgetCommon;
    
    declare type Panel = {
      styleName: string;
      // TODO: thing about genereting
      children: Record<string, Widget | undefined>;
      // TODO: think about generating
      properties: Record<string, string>;
    } & WidgetCommon;

    declare type View = Panel;
    
    declare type Widget = Panel | LayoutWidget;
    
    declare const app: {
      view: Panel;
      // TODO: can be generated
      views: {
        ${views}
      };
      // TODO: can be generated
      viewFragments: {
        ${viewFragments}
      };
      // TODO: think about generating
      datasources: {
        ${dataSources}
      };
      sanitizer: { sanitizeUrl(url: string): string;  };
    
      executeRemoteScript<A extends Array<unknown>, R>(scriptName: string, functionName: string, args: A, callback: (result: R) => void): void;
    
      closeDialog(): void;
    };
    
    ${models}`;
  }
}
