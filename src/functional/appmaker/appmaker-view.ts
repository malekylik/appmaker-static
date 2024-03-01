import { pipe } from 'fp-ts/lib/function';

import * as E from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';

import type {
  AppMakerViewStruct, AppMakerProperty, AppMakerView,
  AppMakerChildKeyProperty, AppMakerNameProperty, AppMakerChildrenProperty,
  AppMakerIsCustomWidgetProperty,
  AppMakerBindingsProperty,
  AppMakerAttrib,
} from './appmaker-domain';

import {
  AppMakerComponentClass,
} from './appmaker-domain';

import { oneOrManyRun } from './appmaker-utils';

export const isAppMakerCustomComponentClass = (componentClass: string): componentClass is `CustomComponent_${string}` =>
    componentClass.startsWith('CustomComponent_');

export const findAppMakerProperty = <T extends AppMakerProperty>(properties: AppMakerProperty[], propertyName: T['name']): O.Option<T> =>
   pipe(
    properties,
    ps => ps.find(p => p.name === propertyName),
    p => p !== undefined ? O.some(p) : O.none
   ) as O.Option<T>;

export const findAppMakerNameProperty = (properties: AppMakerProperty[]): O.Option<AppMakerNameProperty> =>
  findAppMakerProperty(properties, 'name');

export const findAppMakerChildrenProperty = (properties: AppMakerProperty[]): O.Option<AppMakerChildrenProperty> =>
  findAppMakerProperty(properties, 'children');

// Should be used on a component in a view to get the key of a custom view
export const findAppMakerCustomWidgetKeyProperty = (properties: AppMakerProperty[]): O.Option<AppMakerChildKeyProperty> =>
  findAppMakerProperty(properties, 'customWidgetKey');

// Should be used to check if a view is a custom widget
export const findAppMakerIsCustomWidgetProperty = (properties: AppMakerProperty[]): O.Option<AppMakerIsCustomWidgetProperty> =>
  findAppMakerProperty(properties, 'isCustomWidget');

export const findAppMakerBindingsProperty = (properties: AppMakerProperty[]): O.Option<AppMakerBindingsProperty> =>
  findAppMakerProperty(properties, 'bindings');

export const getAppMakerViewAttribs = (properties: AppMakerProperty[]): AppMakerAttrib[] =>
  properties
    .filter(p => p.name !== ({ name: 'bindings' } as { name: AppMakerBindingsProperty['name'] }).name)
    .filter((p): p is AppMakerAttrib => '#text' in p);

export const isValidAppMakerComponentClass = (componentClass: string): componentClass is AppMakerComponentClass => {
  switch (componentClass) {
    case AppMakerComponentClass.Panel:
      return true;
    default: isAppMakerCustomComponentClass(componentClass);
  }

  return false;
}

export const isAppMakerViewStruct = (obj: unknown): E.Either<string, AppMakerViewStruct> => {
    type Step1 = { component: object };
    type Step2 = { component: { key: string } };
    type Step3 = { component: { key: string; class: string } };
  
    return pipe(
      obj,
      (obj): E.Either<string, Step1> => obj !== null && typeof obj === 'object' && 'component' in obj && obj.component !== null && typeof obj.component === 'object' ? E.right(obj as Step1) : E.left('Is not a AppMaker view struct'),
      E.flatMap((obj): E.Either<string, Step2> => 'key' in obj.component && typeof obj.component.key === 'string' ? E.right(obj as Step2) : E.left('To be a valid AppMaker view an object should contain the key string property')),
      E.flatMap((obj): E.Either<string, Step3> => 'class' in obj.component && typeof obj.component.class === 'string' ? E.right(obj as Step3) : E.left('To be a valid AppMaker view an object should contain the class string property')),
      E.flatMap(obj => isValidAppMakerComponentClass(obj.component.class) ? E.right(obj as AppMakerViewStruct) : E.left('To be a valid AppMaker view an object should contain the class property with AppMakerComponentClass value, but got: ' + obj.component.class))
    );
  }

// TODO: depracate
export const traverseAppMakerView = (view: AppMakerView, onView: (view: AppMakerView, d: { level: number }) => void) => {
    const internalTraverseAppMakerView = (view: AppMakerView, onView: (view: AppMakerView, d: { level: number }) => void, level: number) => {
      onView(view, { level });
    
      const children = findAppMakerChildrenProperty(view.property);
    
      pipe(
        children,
        O.fold(
          () => {},
          (cp) => cp.component && oneOrManyRun(cp.component, v => internalTraverseAppMakerView(v, onView, level + 1))
        )
      );
    }
  
    internalTraverseAppMakerView(view, onView, 0);
  }

export type TraverseCallback = (view: AppMakerView) => void;

export function traverseView(view: AppMakerView, callback: { onEnter?: TraverseCallback; onExit?: TraverseCallback } = {}): void {
  callback.onEnter = callback.onEnter ?? (() => {});
  callback.onExit = callback.onExit ?? (() => {});

  const children = findAppMakerChildrenProperty(view.property);

  callback.onEnter(view);

  pipe(
    children,
    O.chain(cp => { cp.component && oneOrManyRun(cp.component, v => traverseView(v, callback)); return O.some(cp); })
  )

  callback.onExit(view);
}

