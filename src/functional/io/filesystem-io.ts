import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import * as RA from 'fp-ts/ReadonlyArray'
import * as A from 'fp-ts/Array'
import * as S from 'fp-ts/Semigroup'
import * as string from 'fp-ts/string'
import { pipe } from 'fp-ts/lib/function';

import { XMLParser } from 'fast-xml-parser';

import { stat } from 'node:fs';
import { promisify } from 'node:util';
import * as path from 'node:path';

const {
  readdir: oldReaddir, readFile: oldReadFile, writeFile: oldWriteFile,
  rm: oldRm, mkdir: oldMkDir, copyFile: oldCopyFile, access: oldAccess,
} = require('fs');

const _readFile = (fileName: string): Promise<string> => promisify(oldReadFile)(fileName, { encoding: 'utf-8' });
const _readdir: (path: string) => Promise<string[]> = promisify(oldReaddir);
const _access = promisify(oldAccess);
const _writeFile = promisify(oldWriteFile);
const _rm = promisify(oldRm);
const _mkdir = promisify(oldMkDir);
const _copyFile = promisify(oldCopyFile);
const _stat = promisify(stat);

export const parseFilePath = (fullPath: string): { fullPath: string; path: string; fullName: string; name: string; extension: string; } => {
  const pathParts = fullPath.split(path.sep)
  const _path = pathParts.slice(0, pathParts.length - 1);
  const namePart = pathParts[pathParts.length - 1] || '';
  const nameParts = namePart.split('.');
  const extension = nameParts[nameParts.length - 1] || '';

  return { fullPath, path: _path.join(path.sep), fullName: namePart, name: nameParts.slice(0, nameParts.length - 1).join('.'), extension };
};

export const readFile = (fileName: string): TE.TaskEither<string, string> => TE.tryCatch(() => _readFile(fileName), r => r instanceof Error ? r.message : 'readFile: unknown reason');
export const readDir = (path: string): TE.TaskEither<string, string[]> => TE.tryCatch(() => _readdir(path), r => r instanceof Error ? r.message : 'readDir: unknown reason');

export const isFile = (path: string): TE.TaskEither<string, boolean> =>
  pipe(
    TE.tryCatch(() => _stat(path), r => r instanceof Error ? r.message : 'isFile: unknown reason'),
    TE.chain(stats => TE.right(stats.isFile()))
  );

export const folderContent = (folderPath: string): TE.TaskEither<string, string[]> => pipe(
  folderPath,
  readDir,
  TE.chain(fs => TE.right(fs.map(f => folderPath + '/' + f)))
);

export const folderFiles = (filesPathes: string[]): TE.TaskEither<string, string[]> => {
  const isFiles: TE.TaskEither<string, readonly boolean[]> = pipe(
    filesPathes,
    (ps => pipe(ps, RA.traverse(
      TE.getApplicativeTaskValidation(T.ApplyPar, pipe(string.Semigroup, S.intercalate(', ')))
    )(isFile)))
  );

  return pipe(
    isFiles,
    TE.chain<string, readonly boolean[], [boolean, string][]>(
      fielsStat => pipe(
        filesPathes,
        (files => TE.right(A.zip(files)(fielsStat as boolean[])))
      )
    ),
    TE.chain(files => TE.right(files.filter(([_isFile]) => _isFile))),
    TE.chain(files => TE.right(A.unzip(files)[1]))
  );
}

export function parseXMLFile(xml: string): TE.TaskEither<string, unknown>  {
  const options = {
    ignoreAttributes : false,
    attributeNamePrefix: '',
  };

  try {
    const parser = new XMLParser(options);
    const jsonObj = parser.parse(xml);

    return TE.right(jsonObj as unknown);
  } catch (e) {
    return TE.left(e instanceof Error ? e.message : `Error to parse XML File: ${e}`);
  }
}
