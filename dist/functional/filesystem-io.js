"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.folderFiles = exports.folderContent = exports.isFile = exports.readDir = exports.readFile = void 0;
const T = require("fp-ts/lib/Task");
const TE = require("fp-ts/lib/TaskEither");
const RA = require("fp-ts/ReadonlyArray");
const A = require("fp-ts/Array");
const S = require("fp-ts/Semigroup");
const string = require("fp-ts/string");
const function_1 = require("fp-ts/lib/function");
const node_fs_1 = require("node:fs");
const node_util_1 = require("node:util");
const { readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile, rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess, constants, } = require('fs');
// const { promisify } = require('util');
// const { T } = require('fp-ts/Task');
const _readFile = (fileName) => (0, node_util_1.promisify)(oldReadFile)(fileName, { encoding: 'utf-8' });
const _readdir = (0, node_util_1.promisify)(oldReaddir);
const _access = (0, node_util_1.promisify)(oldAccess);
const _writeFile = (0, node_util_1.promisify)(oldWriteFile);
const _rm = (0, node_util_1.promisify)(oldRm);
const _mkdir = (0, node_util_1.promisify)(oldMkDir);
const _copyFile = (0, node_util_1.promisify)(oldCopyFile);
const _stat = (0, node_util_1.promisify)(node_fs_1.stat);
const readFile = (fileName) => TE.tryCatch(() => _readFile(fileName), r => r instanceof Error ? r.message : 'readFile: unknown reason');
exports.readFile = readFile;
const readDir = (path) => TE.tryCatch(() => _readdir(path), r => r instanceof Error ? r.message : 'readDir: unknown reason');
exports.readDir = readDir;
const isFile = (path) => (0, function_1.pipe)(TE.tryCatch(() => _stat(path), r => r instanceof Error ? r.message : 'isFile: unknown reason'), TE.chain(stats => TE.right(stats.isFile())));
exports.isFile = isFile;
const folderContent = (folderPath) => (0, function_1.pipe)(folderPath, exports.readDir, TE.chain(fs => TE.right(fs.map(f => folderPath + '/' + f))));
exports.folderContent = folderContent;
const folderFiles = (filesPathes) => {
    const isFiles = (0, function_1.pipe)(filesPathes, (ps => (0, function_1.pipe)(ps, RA.traverse(TE.getApplicativeTaskValidation(T.ApplyPar, (0, function_1.pipe)(string.Semigroup, S.intercalate(', '))))(exports.isFile))));
    return (0, function_1.pipe)(isFiles, TE.chain(fielsStat => (0, function_1.pipe)(filesPathes, (files => TE.right(A.zip(files)(fielsStat))))), TE.chain(files => TE.right(files.filter(([_isFile]) => _isFile))), TE.chain(files => TE.right(A.unzip(files)[1])));
};
exports.folderFiles = folderFiles;
