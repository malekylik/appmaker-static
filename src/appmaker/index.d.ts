declare type List<T> = {
  size: number;

  add(item: T): void;

  // throws IndexOutOfBoundsException
  get(index: number): T | never;

  toArray(): Array<T>;
}

declare type Datasource<T, Q = Record<string, unknown>, P = Record<string, unknown>> = {
  item: T | null;
  items: List<T> | null;
  draftRecord: T;

  itemIndex: number;

  loading: boolean;
  loaded: boolean;

  load(config?: { success: () => void; failure?: (e: Error) => void }): void;
  unload(): void;

  properties: P;
  query: { parameters: Q };
};

type WidgetCommon<D = null> = {
  root: LayoutWidget;
  descendants: { [index: string]: Widget<D> | List<Widget<D>>; _values: List<Widget<D>>; };
  getDescendant(name: string): Widget<D> | null;
  getDescendantsByClass(name: string): Array<Widget<D>>;

  datasource: Datasource<D>;
  styleName: string;
}

// Represents any widget that can contain other widgets inside. Layout widgets are the only widgets which a data source can be set on.
declare type LayoutWidget<D = null, P = undefined> = {
  properties: P;
} & WidgetCommon<D>;

declare type Panel<D = null> = {
  // TODO: thing about genereting
  children: Record<string, Widget<D> | undefined>;
} & WidgetCommon<D>;

declare type Widget<D = null, P = undefined> =
  Panel<D> | LayoutWidget<D, P>;

declare type User = {
  email: string;
};

declare const app: {
  view: Views[keyof Views];
  views: Views;
  viewFragments: ViewFragments;
  datasources: Datasources;
  sanitizer: { sanitizeUrl(url: string): string;  };
  user: User;

  executeRemoteScript<A extends Array<unknown>, R, S extends ServerScriptNames>(scriptName: S, functionName: ServerScriptExportedNamesMap[S], args: A, callback: ((result: R) => void) | { success: (result: R) => void; failure: (err: Error) => void; }): void;

  showDialog(widget: Widget): void;
  closeDialog(): void;

  getUrlParameter(param: string): string | null;
};

declare type Views = /** generated */ unknown;

declare type ViewFragments = /** generated */ unknown;

declare type Datasources = /** generated */ unknown;

declare type ServerScriptNames = /** generated */ unknown;

declare type ServerScriptExportedNamesMap = {
  /** generated */
}
