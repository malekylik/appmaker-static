declare type List<T> = {
  size: number;

  // throws IndexOutOfBoundsException
  get(index: number): T | never;

  toArray(): Array<T>;
}

declare type Datasource<T> = {
  item: T | null;
  items: List<T> | null;
  draftRecord: T;

  itemIndex: number;

  loading: boolean;
  loaded: boolean;

  load(config?: { success: () => void; failure?: (e: Error) => void }): void;
  unload(): void;
};

type WidgetCommon<D = null> = {
  root: LayoutWidget;
  descendants: { [index: string]: Widget<D> | List<Widget<D>>; _values: List<Widget<D>>; };
  getDescendant(name: string): Widget<D> | null;
  getDescendantsByClass(name: string): Array<Widget<D>>;

  datasource: Datasource<D>;
}

declare type LayoutWidget<D = null> = {
} & WidgetCommon<D>;

declare type Panel<D = null> = {
  styleName: string;
  // TODO: thing about genereting
  children: Record<string, Widget<D> | undefined>;
  // TODO: think about generating
  properties: Record<string, string>;
} & WidgetCommon<D>;

declare type Widget<D = null> = Panel<D> | LayoutWidget<D>;

declare type User = {
  email: string;
};

declare const app: {
  view: Panel;
  views: Views;
  viewFragments: ViewFragments;
  datasources: Datasources;
  sanitizer: { sanitizeUrl(url: string): string;  };
  user: User;

  executeRemoteScript<A extends Array<unknown>, R>(scriptName: string, functionName: string, args: A, callback: (result: R) => void): void;

  showDialog(widget: Widget): void;
  closeDialog(): void;

  getUrlParameter(param: string): string | null;
};

declare type Views = /** generated */ unknown;

declare type ViewFragments = /** generated */ unknown;

declare type Datasources = /** generated */ unknown;
