import { pipe } from 'fp-ts/lib/function';

import * as O from 'fp-ts/lib/Option';

import type { AppMakerView } from './appmaker-domain';

import { traverseAppMakerView, findAppMakerNameProperty, findAppMakerIsCustomWidgetProperty } from './appmaker-view';
import { logger } from '../../logger';

export const isCustomWidget = (view: AppMakerView) =>
  pipe(
    view,
    (v) => findAppMakerIsCustomWidgetProperty(v.property),
    O.chain(p => O.some(p['#text']))
  )

export function drawAppMakerTreeToConsole(v: AppMakerView, getInfoLine?: (key: string, componentClass: string, name: string) => string) {
  if (getInfoLine === undefined) {
    getInfoLine = (key: string, componentClass: string, name: string) =>
      `${componentClass} - ${name} (${key})`;
  }

  traverseAppMakerView(v, (v, d) => {
    let infoString = pipe(findAppMakerNameProperty(v.property), O.match(() => getInfoLine!(v.key, v.class, ''), (p) => getInfoLine!(v.key, v.class, p['#text'])));

    logger.log(`${' '.repeat(d.level)} | ${infoString}`);
  });
}

export const createCustomWidgetMap = (views: Array<AppMakerView>) => views.reduce((map, v) => {
  pipe(
    v,
    isCustomWidget,
    O.chain(isCustom => { isCustom && map.set(v.key, v); return O.some(isCustom); })
  );

  return map;
}, new Map<string, AppMakerView>);
