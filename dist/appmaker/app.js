"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAppMakerApp = exports.App = void 0;
const type_declaration_1 = require("./type-declaration");
const script_file_1 = require("./script-file");
const generate_utils_1 = require("./generate-utils");
class App {
    constructor() {
        this.views = [];
        this.models = [];
        this.scripts = [];
    }
    addView(view) {
        this.views.push(view);
    }
    addModel(model) {
        this.models.push(model);
    }
    addScript(script) {
        this.scripts.push(script);
    }
    generateAppDeclarationFile() {
        const views = this.views.filter(view => !view.isViewFragment);
        const viewFragments = this.views.filter(view => view.isViewFragment);
        return (0, type_declaration_1.generateTypeDeclarationFile)(views, viewFragments, this.models, this.scripts);
    }
    generateDataserviceSourceFile() {
        return (0, type_declaration_1.generateDataserviceSourceFile)(this.models);
    }
    generateDatasourceSourceFile() {
        return (0, script_file_1.generateDatasourceSourceFile)(this.models);
    }
    generateWidgetEventsSourceFile() {
        return (0, script_file_1.generateWidgetEventsSourceFile)(this.views);
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
function initAppMakerApp(app, modelsFiles, viewsFiles, scriptsFiles) {
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
        const bindings = (0, generate_utils_1.getViewBindings)(file.component.property);
        const view = {
            name: (0, generate_utils_1.getViewName)(file.component.property),
            key: file.component.key,
            class: file.component.class,
            isViewFragment: (0, generate_utils_1.getIsViewFragment)(file.component.property),
            isRootComponent: (0, generate_utils_1.getIsRootComponent)(file.component.property),
            customProperties: file.component.customProperties?.property
                ? (Array.isArray(file.component.customProperties.property) ? file.component.customProperties.property : [file.component.customProperties.property])
                : [],
            bindings: bindings && bindings.binding
                ? (Array.isArray(bindings.binding) ? bindings.binding : [bindings.binding])
                : [],
            file: file,
        };
        app.addView(view);
    });
    scriptsFiles.forEach((scriptFile) => {
        const file = scriptFile.file;
        const script = {
            name: file.script.name,
            type: file.script.type,
            code: file.script['#text'] ?? null,
            exports: file.script['#text'] ? (0, generate_utils_1.getScriptExports)(file.script['#text']) : [],
        };
        app.addScript(script);
    });
}
exports.initAppMakerApp = initAppMakerApp;
