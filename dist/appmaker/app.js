"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAppMakerApp = exports.App = void 0;
const type_declaration_1 = require("./type-declaration");
const script_file_1 = require("./script-file");
const getViewProperty = (view, propertyName) => view.component.property.find(property => property.name === propertyName);
const getViewName = (view) => getViewProperty(view, 'name')?.['#text'] ?? '';
const getIsViewFragment = (view) => !!getViewProperty(view, 'isCustomWidget')?.['#text'];
const getViewChildren = (view) => getViewProperty(view, 'children')?.['component'];
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
        const views = this.views.filter(view => !view.isViewFragment).map(view => view.name);
        const viewFragments = this.views.filter(view => view.isViewFragment).map(view => view.name);
        return (0, type_declaration_1.generateTypeDeclarationFile)(views, viewFragments, this.models);
    }
    generateDataserviceSourceFile() {
        return (0, type_declaration_1.generateDataserviceSourceFile)(this.models);
    }
    generateDatasourceSourceFile() {
        return (0, script_file_1.generateDatasourceSourceFile)(this.models);
    }
}
exports.App = App;
function parseModelField(fields) {
    const strToBool = (str) => str === 'true' ? true : false;
    fields = fields ?? [];
    return (Array.isArray(fields) ? fields : [fields]).map(field => {
        return ({ ...field, required: strToBool(field.required), autoIncrement: strToBool(field.autoIncrement) });
    });
}
function initAppMakerApp(app, modelsFiles, viewsFiles) {
    modelsFiles.forEach((modelFile) => {
        const file = modelFile.file;
        const model = {
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
