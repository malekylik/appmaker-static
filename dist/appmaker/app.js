"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAppMakerApp = exports.App = void 0;
const type_declaration_1 = require("./type-declaration");
const getViewName = (view) => view.component.property.find(property => property.name === 'name')?.['#text'] ?? '';
const getIsViewFragment = (view) => !!view.component.property.find(property => property.name === 'isCustomWidget')?.['#text'];
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
        const views = this.views.filter(view => !view.isViewFragment).map(view => view.name);
        const viewFragments = this.views.filter(view => view.isViewFragment).map(view => view.name);
        return (0, type_declaration_1.generateTypeDeclarationFile)(views, viewFragments, this.models);
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
