import { ChildrenPropery, DataSource, IsCustomWidgetPropery, ModelFile, WidgetNamePropery, ViewFile, ViewProperty, ViewChildren, IsRootPropery, BindingsPropery } from '../appmaker';
import { AppMakerModelFolderContent, AppMakerViewFolderContent } from '../io';
import { generateDataserviceSourceFile, generateTypeDeclarationFile } from './type-declaration';
import { generateDatasourceSourceFile } from './script-file';

export interface Model {
  name: string; fields: Array<{ name: string; type: string; required: boolean; autoIncrement: boolean }>; dataSources: Array<DataSource>;
}

export interface View {
  name: string; key: string; class: string; isViewFragment: boolean; isRootComponent: boolean;
  customProperties: Array<{ name: string; type: string }>;
}

const getViewProperty = (properties: Array<ViewProperty>, propertyName: ViewProperty['name']): ViewProperty | undefined => properties.find(property => property.name === propertyName);
const getViewName = (properties: Array<ViewProperty>): string => (getViewProperty(properties, 'name') as WidgetNamePropery | undefined)?.['#text'] ?? '';
const getIsViewFragment = (properties: Array<ViewProperty>): boolean => !!(getViewProperty(properties, 'isCustomWidget') as IsCustomWidgetPropery | undefined)?.['#text'];
const getViewChildren = (properties: Array<ViewProperty>) => (getViewProperty(properties, 'children') as ChildrenPropery | undefined)?.['component'];
const getIsRootComponent = (properties: Array<ViewProperty>): boolean => (getViewProperty(properties, 'isRootComponent') as IsRootPropery | undefined)?.['#text'] ?? false;
const getViewBindings = (properties: Array<ViewProperty>) => (getViewProperty(properties, 'bindings') as BindingsPropery | undefined);

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
    const views = this.views.filter(view => !view.isViewFragment);
    const viewFragments = this.views.filter(view => view.isViewFragment);

    return generateTypeDeclarationFile(views, viewFragments, this.models);
  }

  generateDataserviceSourceFile(): string {
    return generateDataserviceSourceFile(this.models);
  }

  generateDatasourceSourceFile(): string {
    return generateDatasourceSourceFile(this.models);
  }
}

function parseModelField(fields: ModelFile['model']['field']): Model['fields'] {
  const strToBool = (str: string): boolean => str === 'true' ? true : false;

  fields = fields ?? [];

  return (Array.isArray(fields) ? fields : [fields]).map(field => {
    return ({ ...field, required: strToBool(field.required), autoIncrement: strToBool(field.autoIncrement) });
  });
}

export function initAppMakerApp(app: App, modelsFiles: AppMakerModelFolderContent, viewsFiles: AppMakerViewFolderContent): void {
  modelsFiles.forEach((modelFile) => {
    const file = modelFile.file;

    const model: Model = {
      name: file.model.name,
      fields: parseModelField(file.model.field),
      dataSources: Array.isArray(file.model.dataSource) ? file.model.dataSource : [file.model.dataSource]
    };

    app.addModel(model);
  });

  function traverseViewChildren(children: Array<ViewChildren>): void {
    children.forEach((child) => {
      const name = getViewName(child.property);
      const isRoot = getIsRootComponent(child.property);
      const bindings = getViewBindings(child.property);
      const childClass = child.class;
      const children = getViewChildren(child.property);
  
      console.log('---- ', name, ' ----');
      console.log('class', childClass);
      console.log('is root', isRoot);
      console.log('children count', children ? (Array.isArray(children) ? children.length : 1) : 0);
      console.log('bindings', bindings);

      // if (!Array.isArray(children)) {
      //   console.log('warn children is not array', children);
      // }
  
      if (children) {
        traverseViewChildren(Array.isArray(children) ? children : [children]); 
      }
    });
  }

  function traverseView(view: ViewFile): void {
    const name = getViewName(view.component.property);
    const isRoot = getIsRootComponent(view.component.property);
    const bindings = getViewBindings(view.component.property);

    const children = getViewChildren(view.component.property);

    console.log('---- ', name, ' ----');
    console.log('is root', isRoot);
    console.log('children count', children ? (Array.isArray(children) ? children.length : 1) : 0);
    console.log('bindings', bindings);
    // console.log(view.component.)

    // if (!Array.isArray(children)) {
    //   console.log('warn children is not array', children);
    // }

    if (children) {
      traverseViewChildren(Array.isArray(children) ? children : [children]); 
    }
  }

  viewsFiles.forEach((viewFile) => {
    const file = viewFile.file;

    if (viewFile.name === 'RiskAssesmentView.xml') {
      // console.log('json for ', viewFile.name);
      // file.component.property.forEach((property => console.log(property)));

      // traverseView(file);
      // console.log('custom pro', file.component.customProperties?.property);
      // console.log('component', getViewChildren(file));

      // 'properties'
      // 'bindings'
    }

    const view: View = {
      name: getViewName(file.component.property),
      key: file.component.key,
      class: file.component.class,
      isViewFragment: getIsViewFragment(file.component.property),
      isRootComponent: getIsRootComponent(file.component.property), // for some reason it can be omited by AppMaker
      customProperties: file.component.customProperties?.property
        ? (Array.isArray(file.component.customProperties.property) ? file.component.customProperties.property : [file.component.customProperties.property])
        : [],
    };

    // if (view.name === 'MainView') {
    //   console.log('main props', view.customProperties, file.component.customProperties);
    // }

    app.addView(view);
  });
}
