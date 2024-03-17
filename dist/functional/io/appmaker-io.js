"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAppMakerViews = exports.readAppMakerView = void 0;
const function_1 = require("fp-ts/lib/function");
const T = require("fp-ts/lib/Task");
const TE = require("fp-ts/lib/TaskEither");
const RA = require("fp-ts/ReadonlyArray");
const S = require("fp-ts/Semigroup");
const string = require("fp-ts/string");
const filesystem_io_1 = require("./filesystem-io");
const appmaker_view_1 = require("../appmaker/appmaker-view");
const readAppMakerView = (filepath) => (0, function_1.pipe)(filepath, filesystem_io_1.readFile, TE.flatMap(filesystem_io_1.parseXMLFile), TE.flatMap(v => TE.fromEither((0, appmaker_view_1.isAppMakerViewStruct)(v))), TE.flatMap(v => TE.right({ path: filepath, content: v })));
exports.readAppMakerView = readAppMakerView;
const readAppMakerViews = (viewFolderPath) => (0, function_1.pipe)((0, filesystem_io_1.folderContent)(viewFolderPath), TE.chain(filesystem_io_1.folderFiles), TE.chain(files => (0, function_1.pipe)(files, RA.traverse(TE.getApplicativeTaskValidation(T.ApplyPar, (0, function_1.pipe)(string.Semigroup, S.intercalate(', '))))(exports.readAppMakerView))));
exports.readAppMakerViews = readAppMakerViews;
