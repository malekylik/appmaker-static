"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAppMakerApp = exports.App = void 0;
const type_declaration_1 = require("./type-declaration");
const script_file_1 = require("./script-file");
const getViewProperty = (properties, propertyName) => properties.find(property => property.name === propertyName);
const getViewName = (properties) => getViewProperty(properties, 'name')?.['#text'] ?? '';
const getIsViewFragment = (properties) => !!getViewProperty(properties, 'isCustomWidget')?.['#text'];
const getViewChildren = (properties) => getViewProperty(properties, 'children')?.['component'];
const getIsRootComponent = (properties) => getViewProperty(properties, 'isRootComponent')?.['#text'] ?? false;
const getViewBindings = (properties) => getViewProperty(properties, 'bindings');
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
        const views = this.views.filter(view => !view.isViewFragment);
        const viewFragments = this.views.filter(view => view.isViewFragment);
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
    function traverseViewChildren(children) {
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
    function traverseView(view) {
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
        const view = {
            name: getViewName(file.component.property),
            key: file.component.key,
            class: file.component.class,
            isViewFragment: getIsViewFragment(file.component.property),
            isRootComponent: getIsRootComponent(file.component.property),
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
exports.initAppMakerApp = initAppMakerApp;
