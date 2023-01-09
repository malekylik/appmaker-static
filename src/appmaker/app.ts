import { DataSource, ModelFile, ViewBinding, ViewFile } from '../appmaker';
import { AppMakerModelFolderContent, AppMakerScriptFolderContent, AppMakerViewFolderContent } from '../io';
import { generateDataserviceSourceFile, generateTypeDeclarationFile } from './type-declaration';
import { generateDatasourceSourceFile, generateWidgetEventsSourceFile } from './script-file';
import { getIsRootComponent, getIsViewFragment, getScriptExports, getViewBindings, getViewName } from './generate-utils';
import { generateJSXForViews } from './views-generating';

export interface Model {
  name: string; fields: Array<{ name: string; type: string; required: boolean; autoIncrement: boolean }>; dataSources: Array<DataSource>;
}

export interface View {
  name: string; key: string; class: string; isViewFragment: boolean; isRootComponent: boolean;
  customProperties: Array<{ name: string; type: string }>; bindings: Array<ViewBinding>;
  file: ViewFile;
}

export interface Script {
  name: string; type: 'SERVER' | 'CLIENT'; code: string | null;
  exports: Array<string>;
}

// TODO: add generating of React components (declare function SimpleLabel(props: { children: JSX.Element }): JSX.Element;)
export class App {
  private views: Array<View> = [];
  private models: Array<Model> = [];
  private scripts: Array<Script> = [];

  addView(view: View) {
    this.views.push(view);
  }

  addModel(model: Model) {
    this.models.push(model);
  }

  addScript(script: Script) {
    this.scripts.push(script);
  }

  generateAppDeclarationFile(): string {
    const views = this.views.filter(view => !view.isViewFragment);
    const viewFragments = this.views.filter(view => view.isViewFragment);

    return generateTypeDeclarationFile(views, viewFragments, this.models, this.scripts);
  }

  generateDataserviceSourceFile(): string {
    return generateDataserviceSourceFile(this.models);
  }

  generateDatasourceSourceFile(): string {
    return generateDatasourceSourceFile(this.models);
  }

  generateWidgetEventsSourceFile(): string {
    return generateWidgetEventsSourceFile(this.views);
  }

  generateJSXForViews(): Array<{ name: string; code: string; }> {
    return generateJSXForViews(this.views);
  }
}

function parseModelField(fields: ModelFile['model']['field']): Model['fields'] {
  const strToBool = (str: string): boolean => str === 'true' ? true : false;

  fields = fields ?? [];

  return (Array.isArray(fields) ? fields : [fields]).map(field => {
    return ({ ...field, required: strToBool(field.required), autoIncrement: strToBool(field.autoIncrement) });
  });
}

export function initAppMakerApp(app: App, modelsFiles: AppMakerModelFolderContent, viewsFiles: AppMakerViewFolderContent, scriptsFiles: AppMakerScriptFolderContent): void {
  modelsFiles.forEach((modelFile) => {
    const file = modelFile.file;

    const model: Model = {
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
    };

    app.addView(view);
  });

  scriptsFiles.forEach((scriptFile) => {
    const file = scriptFile.file;

    const script: Script = {
      name: file.script.name,
      type: file.script.type,
      code: file.script['#text'] ?? null,
      exports: file.script['#text'] ? getScriptExports(file.script['#text']) : [],
    };

    app.addScript(script);
  });
}
