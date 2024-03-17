"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomWidgetMap = exports.drawAppMakerTreeToConsole = exports.isCustomWidget = void 0;
const function_1 = require("fp-ts/lib/function");
const O = require("fp-ts/lib/Option");
const appmaker_view_1 = require("./appmaker-view");
const logger_1 = require("../../logger");
const isCustomWidget = (view) => (0, function_1.pipe)(view, (v) => (0, appmaker_view_1.findAppMakerIsCustomWidgetProperty)(v.property), O.chain(p => O.some(p['#text'])));
exports.isCustomWidget = isCustomWidget;
function drawAppMakerTreeToConsole(v, getInfoLine) {
    if (getInfoLine === undefined) {
        getInfoLine = (key, componentClass, name) => `${componentClass} - ${name} (${key})`;
    }
    (0, appmaker_view_1.traverseAppMakerView)(v, (v, d) => {
        let infoString = (0, function_1.pipe)((0, appmaker_view_1.findAppMakerNameProperty)(v.property), O.match(() => getInfoLine(v.key, v.class, ''), (p) => getInfoLine(v.key, v.class, p['#text'])));
        logger_1.logger.log(`${' '.repeat(d.level)} | ${infoString}`);
    });
}
exports.drawAppMakerTreeToConsole = drawAppMakerTreeToConsole;
const createCustomWidgetMap = (views) => views.reduce((map, v) => {
    (0, function_1.pipe)(v, exports.isCustomWidget, O.chain(isCustom => { isCustom && map.set(v.key, v); return O.some(isCustom); }));
    return map;
}, new Map);
exports.createCustomWidgetMap = createCustomWidgetMap;
