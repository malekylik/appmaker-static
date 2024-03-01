"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertOneOrManyToArray = exports.oneOrManyRun = void 0;
const oneOrManyRun = (v, f) => v ? (Array.isArray(v) ? v.forEach(f) : f(v)) : undefined;
exports.oneOrManyRun = oneOrManyRun;
const convertOneOrManyToArray = (v) => (v ? (Array.isArray(v) ? v : [v]) : []);
exports.convertOneOrManyToArray = convertOneOrManyToArray;
