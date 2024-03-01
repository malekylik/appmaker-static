"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traverseView = exports.traverseAppMakerView = exports.isAppMakerViewStruct = exports.isValidAppMakerComponentClass = exports.getAppMakerViewAttribs = exports.findAppMakerBindingsProperty = exports.findAppMakerIsCustomWidgetProperty = exports.findAppMakerCustomWidgetKeyProperty = exports.findAppMakerChildrenProperty = exports.findAppMakerNameProperty = exports.findAppMakerProperty = exports.isAppMakerCustomComponentClass = void 0;
const function_1 = require("fp-ts/lib/function");
const E = require("fp-ts/lib/Either");
const O = require("fp-ts/lib/Option");
const appmaker_domain_1 = require("./appmaker-domain");
const appmaker_utils_1 = require("./appmaker-utils");
const isAppMakerCustomComponentClass = (componentClass) => componentClass.startsWith('CustomComponent_');
exports.isAppMakerCustomComponentClass = isAppMakerCustomComponentClass;
const findAppMakerProperty = (properties, propertyName) => (0, function_1.pipe)(properties, ps => ps.find(p => p.name === propertyName), p => p !== undefined ? O.some(p) : O.none);
exports.findAppMakerProperty = findAppMakerProperty;
const findAppMakerNameProperty = (properties) => (0, exports.findAppMakerProperty)(properties, 'name');
exports.findAppMakerNameProperty = findAppMakerNameProperty;
const findAppMakerChildrenProperty = (properties) => (0, exports.findAppMakerProperty)(properties, 'children');
exports.findAppMakerChildrenProperty = findAppMakerChildrenProperty;
// Should be used on a component in a view to get the key of a custom view
const findAppMakerCustomWidgetKeyProperty = (properties) => (0, exports.findAppMakerProperty)(properties, 'customWidgetKey');
exports.findAppMakerCustomWidgetKeyProperty = findAppMakerCustomWidgetKeyProperty;
// Should be used to check if a view is a custom widget
const findAppMakerIsCustomWidgetProperty = (properties) => (0, exports.findAppMakerProperty)(properties, 'isCustomWidget');
exports.findAppMakerIsCustomWidgetProperty = findAppMakerIsCustomWidgetProperty;
const findAppMakerBindingsProperty = (properties) => (0, exports.findAppMakerProperty)(properties, 'bindings');
exports.findAppMakerBindingsProperty = findAppMakerBindingsProperty;
const getAppMakerViewAttribs = (properties) => properties
    .filter(p => p.name !== { name: 'bindings' }.name)
    .filter((p) => '#text' in p);
exports.getAppMakerViewAttribs = getAppMakerViewAttribs;
const isValidAppMakerComponentClass = (componentClass) => {
    switch (componentClass) {
        case appmaker_domain_1.AppMakerComponentClass.Panel:
            return true;
        default: (0, exports.isAppMakerCustomComponentClass)(componentClass);
    }
    return false;
};
exports.isValidAppMakerComponentClass = isValidAppMakerComponentClass;
const isAppMakerViewStruct = (obj) => {
    return (0, function_1.pipe)(obj, (obj) => obj !== null && typeof obj === 'object' && 'component' in obj && obj.component !== null && typeof obj.component === 'object' ? E.right(obj) : E.left('Is not a AppMaker view struct'), E.flatMap((obj) => 'key' in obj.component && typeof obj.component.key === 'string' ? E.right(obj) : E.left('To be a valid AppMaker view an object should contain the key string property')), E.flatMap((obj) => 'class' in obj.component && typeof obj.component.class === 'string' ? E.right(obj) : E.left('To be a valid AppMaker view an object should contain the class string property')), E.flatMap(obj => (0, exports.isValidAppMakerComponentClass)(obj.component.class) ? E.right(obj) : E.left('To be a valid AppMaker view an object should contain the class property with AppMakerComponentClass value, but got: ' + obj.component.class)));
};
exports.isAppMakerViewStruct = isAppMakerViewStruct;
// TODO: depracate
const traverseAppMakerView = (view, onView) => {
    const internalTraverseAppMakerView = (view, onView, level) => {
        onView(view, { level });
        const children = (0, exports.findAppMakerChildrenProperty)(view.property);
        (0, function_1.pipe)(children, O.fold(() => { }, (cp) => cp.component && (0, appmaker_utils_1.oneOrManyRun)(cp.component, v => internalTraverseAppMakerView(v, onView, level + 1))));
    };
    internalTraverseAppMakerView(view, onView, 0);
};
exports.traverseAppMakerView = traverseAppMakerView;
function traverseView(view, callback = {}) {
    callback.onEnter = callback.onEnter ?? (() => { });
    callback.onExit = callback.onExit ?? (() => { });
    const children = (0, exports.findAppMakerChildrenProperty)(view.property);
    callback.onEnter(view);
    (0, function_1.pipe)(children, O.chain(cp => { cp.component && (0, appmaker_utils_1.oneOrManyRun)(cp.component, v => traverseView(v, callback)); return O.some(cp); }));
    callback.onExit(view);
}
exports.traverseView = traverseView;
