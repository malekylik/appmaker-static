import { DataSource, ModelFile, ViewFile } from '../appmaker';
import { AppMakerModelFolderContent, AppMakerViewFolderContent } from '../io';
import { generateDataserviceSourceFile, generateTypeDeclarationFile } from './type-declaration';
import { generateDatasourceSourceFile } from './script-file';

export interface Model {
  name: string; fields: Array<{ name: string; type: string; required: boolean; autoIncrement: boolean }>; dataSources: Array<DataSource>;
}

export interface View {
  name: string; key: string; class: string; isViewFragment: boolean;
}

const getViewProperty = (view: ViewFile, propertyName: string) => view.component.property.find(property => property.name === propertyName);
const getViewName = (view: ViewFile) => getViewProperty(view, 'name')?.['#text'] ?? '';
const getIsViewFragment = (view: ViewFile) => !!getViewProperty(view, 'isCustomWidget')?.['#text'];
const getViewChildren = (view: ViewFile) => getViewProperty(view, 'children')?.['component'];

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
    const views = this.views.filter(view => !view.isViewFragment).map(view => view.name);
    const viewFragments = this.views.filter(view => view.isViewFragment).map(view => view.name);

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

  viewsFiles.forEach((viewFile) => {
    const file = viewFile.file;

    // if (viewFile.name === 'RiskAssesmentView.xml') {
    //   console.log('json for ', viewFile.name);
    //   console.log('component', getViewChildren(file))
    //   file.component.property.forEach((property => console.log(property)));
    // }

    const view: View = {
      name: getViewName(file),
      key: file.component.key,
      class: file.component.class,
      isViewFragment: getIsViewFragment(file),
    };

    app.addView(view);
  });
}
