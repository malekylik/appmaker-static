export interface Model {
  name: string; fields: Array<{ name: string; type: string; }>; dataSources: Array<{ name: string; }>;
}

export class App {
  private models: Array<Model> = [];

  addModel(model: Model) {
    this.models.push(model);
  }

  generateAppDeclarationFile(): string {
    const generateTypeForModel = (fields: Model['fields']) => `{ ${fields.map(field => `${field.name}: ${field.type};`).join('\n')} }`;
    const generateTypeForDataSource = (datasource: Model['dataSources'][number], modelType: string) => `${datasource.name}: Datasource<${modelType}>;`;
    const dataSources = this.models
      .map(model => ({ modelType: generateTypeForModel(model.fields), dataSources: model.dataSources }))
      .flatMap(model => model.dataSources.map(datasource => generateTypeForDataSource(datasource, model.modelType)))
      .join('\n');

    return `
    declare type List<T> = {
      toArray(): Array<T>;
    }
    
    declare type Datasource<T> = {
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
    
    declare type Widget = Panel | LayoutWidget;
    
    declare const app: {
      view: Panel;
      // TODO: can be generated
      views: Record<string, Widget | undefined>;
      // TODO: can be generated
      viewFragments: Record<string, Widget | undefined>;
      // TODO: think about generating
      datasources: {
        ${dataSources}
      };
      sanitizer: { sanitizeUrl(url: string): string;  };
    
      executeRemoteScript<A extends Array<unknown>, R>(scriptName: string, functionName: string, args: A, callback: (result: R) => void): void;
    
      closeDialog(): void;
    };
    `;
  }
}
