"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAppMakerApp = exports.App = void 0;
const getViewName = (view) => { var _a, _b; return (_b = (_a = view.component.property.find(property => property.name === 'name')) === null || _a === void 0 ? void 0 : _a['#text']) !== null && _b !== void 0 ? _b : ''; };
const getIsViewFragment = (view) => { var _a; return !!((_a = view.component.property.find(property => property.name === 'isCustomWidget')) === null || _a === void 0 ? void 0 : _a['#text']); };
function converAppMakerPropertyTypeToTSType(type) {
    switch (type) {
        case 'Number': return 'number';
        case 'String': return 'string';
        case 'Boolean': return 'boolean';
    }
    return type;
}
class App {
    constructor() {
        this.views = [];
        this.models = [];
    }
    addView(view) {
        this.views.push(view);
    }
    addModel(model) {
        this.models.push(model);
    }
    generateAppDeclarationFile() {
        const generateTypeForModel = (fields) => `{\n${fields.map(field => `${field.name}: ${field.required ? converAppMakerPropertyTypeToTSType(field.type) : converAppMakerPropertyTypeToTSType(field.type) + ' | null'};`).join('\n')}\n}`;
        const generateTypeForDataSource = (datasource, modelType) => `${datasource.name}: Datasource<${modelType}>;`;
        const dataSources = this.models
            .map(model => ({ modelType: model.name, dataSources: model.dataSources }))
            .flatMap(model => model.dataSources.map(datasource => generateTypeForDataSource(datasource, model.modelType)))
            .join('\n');
        const views = this.views.filter(view => !view.isViewFragment).map(view => `${view.name}: Widget;`).join('\n');
        const viewFragments = this.views.filter(view => view.isViewFragment).map(view => `${view.name}: Widget;`).join('\n');
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
exports.App = App;
function initAppMakerApp(app, modelsFiles, viewsFiles) {
    modelsFiles.forEach((modelFile) => {
        const file = modelFile.file;
        const model = {
            name: file.model.name,
            fields: file.model.field.map(field => ({ ...field, required: field.required === 'true' ? true : false })),
            dataSources: Array.isArray(file.model.dataSource) ? file.model.dataSource : [file.model.dataSource]
        };
        app.addModel(model);
    });
    viewsFiles.forEach((viewFile) => {
        const file = viewFile.file;
        const view = {
            name: getViewName(file),
            key: file.component.key,
            class: file.component.class,
            isViewFragment: getIsViewFragment(file),
        };
        app.addView(view);
    });
}
exports.initAppMakerApp = initAppMakerApp;
