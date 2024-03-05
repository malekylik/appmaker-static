import { pipe } from 'fp-ts/lib/function';

import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import * as RA from 'fp-ts/ReadonlyArray'
import * as S from 'fp-ts/Semigroup'
import * as string from 'fp-ts/string'

import type { AppMakerViewStruct } from '../appmaker/appmaker-domain';

import { folderContent, folderFiles, parseXMLFile, readFile } from './filesystem-io';

import { isAppMakerViewStruct } from '../appmaker/appmaker-view';

export const readAppMakerView = (filepath: string): TE.TaskEither<string, { path: string; content: AppMakerViewStruct }> =>
  pipe(
    filepath,
    readFile,
    TE.flatMap(parseXMLFile),
    TE.flatMap(v => TE.fromEither(isAppMakerViewStruct(v))),
    TE.flatMap(v => TE.right({ path: filepath, content: v }))
  );

export const readAppMakerViews = (viewFolderPath: string): TE.TaskEither<string, { path: string; content: AppMakerViewStruct }[]> => pipe(
  folderContent(viewFolderPath),
  TE.chain(folderFiles),
  TE.chain(files => pipe(files, RA.traverse(
    TE.getApplicativeTaskValidation(T.ApplyPar, pipe(string.Semigroup, S.intercalate(', '))))(readAppMakerView)) as TE.TaskEither<string, { path: string; content: AppMakerViewStruct }[]>)
);

