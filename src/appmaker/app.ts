import { AppMakerVarType, DataSource, ModelFile, ViewBinding, ViewFile } from '../appmaker';
import { AppMakerModelContent, AppMakerModelFolderContent, AppMakerScriptContent, AppMakerScriptFolderContent, AppMakerViewContent, AppMakerViewFolderContent } from '../io';
import { generateDataserviceSourceFile, generateTypeDeclarationFile } from './type-declaration';
import { generateDatasourceSourceFile, generateWidgetEventsSourceFile } from './script-file';
import { getIsRootComponent, getIsViewFragment, getScriptExports, getViewBindings, getViewName } from './generate-utils';
import { generateJSXForViews } from './views-generating';
import { createCustomWidgetMap } from '../functional/appmaker/appmaker-view-utils';
import { AppValidator } from './app-validatior';
import type { AppMakerView, AppMakerViewStruct } from '../functional/appmaker/appmaker-domain';

export interface Model {
  path: string;
  name: string; fields: Array<{ name: string; type: string; required: boolean; autoIncrement: boolean }>; dataSources: Array<DataSource>;
}

export interface View {
  path: string;
  name: string; key: string; class: string; isViewFragment: boolean; isRootComponent: boolean;
  customProperties: Array<{ name: string; type: string }>; bindings: Array<ViewBinding>;
  file: ViewFile;
}

export interface Script {
  path: string; key: string;
  name: string; type: 'SERVER' | 'CLIENT'; code: string | null;
  exports: Array<string>;
}


export function updateScript(script: Script, newCode: string): void {
  script.code = newCode;
  // TODO: should be synced with the new code
  // script.exports 
}

// TODO: add generating of React components (declare function SimpleLabel(props: { children: JSX.Element }): JSX.Element;)
export class App {
  // TODO: replace with newViews
  private oldViews: Array<View> = [];
  private views: Array<{ path: string; view: AppMakerView }> = [];
  private models: Array<Model> = [];
  // TODO: shouldnt be public
  public scripts: Array<Script> = [];

  private customWidgetMap = new Map<string, AppMakerView>();

  private validatior: AppValidator = new AppValidator();

  addOldView(view: View) {
    this.oldViews.push(view);
  }

  addView(view: { path: string; view: AppMakerView }) {
    // TODO: add to customWidgetMap
  
    this.views.push(view);
  }

  addViews(views: Array<{ path: string; view: AppMakerView }>) {
    this.views = this.views.concat(views);

    this.customWidgetMap = createCustomWidgetMap(this.views.map(v => v.view));
  }

  addModel(model: Model) {
    this.models.push(model);
  }

  addScript(script: Script) {
    this.scripts.push(script);
  }

  generateAppDeclarationFile(): string {
    const views = this.oldViews.filter(view => !view.isViewFragment);
    const viewFragments = this.oldViews.filter(view => view.isViewFragment);

    return generateTypeDeclarationFile(views, viewFragments, this.models, this.scripts);
  }

  generateDataserviceSourceFile(): string {
    return generateDataserviceSourceFile(this.models);
  }

  generateDatasourceSourceFile(): string {
    return generateDatasourceSourceFile(this.models);
  }

  generateWidgetEventsSourceFile(): string {
    return generateWidgetEventsSourceFile(this.oldViews);
  }

  generateJSXForViews(): Array<{ path: string; code: string; name: string }> {
    return generateJSXForViews(this.views, this.customWidgetMap);
  }

  setAppValidator(validator: AppValidator): void {
    this.validatior = validator;
  }

  getAppValidator(): AppValidator {
    return this.validatior;
  }
}

function parseModelField(fields: ModelFile['model']['field']): Model['fields'] {
  const strToBool = (str: string): boolean => str === 'true' ? true : false;

  fields = fields ?? [];

  return (Array.isArray(fields) ? fields : [fields]).map(field => {
    return ({ ...field, required: strToBool(field.required), autoIncrement: strToBool(field.autoIncrement) });
  });
}

export function initAppMakerApp(
  app: App,
  modelsFiles: AppMakerModelFolderContent,
  viewsFiles: AppMakerViewFolderContent, scriptsFiles: AppMakerScriptFolderContent,
  newViews: Array<{ path: string, content: AppMakerViewStruct }>
): void {
  modelsFiles.forEach((modelFile) => {
    const file = modelFile.file;

    const model: Model = {
      path: modelFile.path,
      name: file.model.name,
      fields: parseModelField(file.model.field),
      dataSources: Array.isArray(file.model.dataSource) ? file.model.dataSource : [file.model.dataSource]
    };

    app.addModel(model);
  });

  viewsFiles.forEach((viewFile) => {
    const file = viewFile.file;

    const bindings = getViewBindings(file.component.property);

    const view: View = {
      name: getViewName(file.component.property),
      key: file.component.key,
      class: file.component.class,
      isViewFragment: getIsViewFragment(file.component.property),
      isRootComponent: getIsRootComponent(file.component.property), // for some reason it can be omited by AppMaker
      customProperties: file.component.customProperties?.property
        ? (Array.isArray(file.component.customProperties.property) ? file.component.customProperties.property : [file.component.customProperties.property])
        : [],
      bindings: bindings,
      file: file,
      path: viewFile.path
    };

    app.addOldView(view);
  });

  scriptsFiles.forEach((scriptFile) => {
    const file = scriptFile.file;

    const script: Script = {
      path: scriptFile.path,
      name: file.script.name,
      type: file.script.type,
      key: file.script.key,
      code: file.script['#text'] ?? null,
      exports: file.script['#text'] ? getScriptExports(file.script['#text']) : [],
    };

    app.addScript(script);
  });

  app.addViews(newViews.map(viewFile => ({ path: viewFile.path, view: viewFile.content.component })));
}
