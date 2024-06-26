"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAppMakerApp = exports.App = exports.updateScript = void 0;
const type_declaration_1 = require("./type-declaration");
const script_file_1 = require("./script-file");
const generate_utils_1 = require("./generate-utils");
const views_generating_1 = require("./views-generating");
const appmaker_view_utils_1 = require("../functional/appmaker/appmaker-view-utils");
const app_validatior_1 = require("./app-validatior");
function updateScript(script, newCode) {
    script.code = newCode;
    // TODO: should be synced with the new code
    // script.exports 
}
exports.updateScript = updateScript;
// TODO: add generating of React components (declare function SimpleLabel(props: { children: JSX.Element }): JSX.Element;)
class App {
    constructor() {
        // TODO: replace with newViews
        this.oldViews = [];
        this.views = [];
        this.models = [];
        // TODO: shouldnt be public
        this.scripts = [];
        this.customWidgetMap = new Map();
        this.validatior = new app_validatior_1.AppValidator();
    }
    addOldView(view) {
        this.oldViews.push(view);
    }
    addView(view) {
        // TODO: add to customWidgetMap
        this.views.push(view);
    }
    addViews(views) {
        this.views = this.views.concat(views);
        this.customWidgetMap = (0, appmaker_view_utils_1.createCustomWidgetMap)(this.views.map(v => v.view));
    }
    addModel(model) {
        this.models.push(model);
    }
    addScript(script) {
        this.scripts.push(script);
    }
    generateAppDeclarationFile() {
        const views = this.oldViews.filter(view => !view.isViewFragment);
        const viewFragments = this.oldViews.filter(view => view.isViewFragment);
        return (0, type_declaration_1.generateTypeDeclarationFile)(views, viewFragments, this.models, this.scripts);
    }
    generateDataserviceSourceFile() {
        return (0, type_declaration_1.generateDataserviceSourceFile)(this.models);
    }
    generateDatasourceSourceFile() {
        return (0, script_file_1.generateDatasourceSourceFile)(this.models);
    }
    generateWidgetEventsSourceFile() {
        return (0, script_file_1.generateWidgetEventsSourceFile)(this.oldViews);
    }
    generateJSXForViews() {
        return (0, views_generating_1.generateJSXForViews)(this.views, this.customWidgetMap);
    }
    setAppValidator(validator) {
        this.validatior = validator;
    }
    getAppValidator() {
        return this.validatior;
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
function initAppMakerApp(app, modelsFiles, viewsFiles, scriptsFiles, newViews) {
    modelsFiles.forEach((modelFile) => {
        const file = modelFile.file;
        const model = {
            path: modelFile.path,
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
            isRootComponent: (0, generate_utils_1.getIsRootComponent)(file.component.property), // for some reason it can be omited by AppMaker
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
        const script = {
            path: scriptFile.path,
            name: file.script.name,
            type: file.script.type,
            key: file.script.key,
            code: file.script['#text'] ?? null,
            exports: file.script['#text'] ? (0, generate_utils_1.getScriptExports)(file.script['#text']) : [],
        };
        app.addScript(script);
    });
    app.addViews(newViews.map(viewFile => ({ path: viewFile.path, view: viewFile.content.component })));
}
exports.initAppMakerApp = initAppMakerApp;
