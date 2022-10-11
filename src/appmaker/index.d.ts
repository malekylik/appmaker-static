declare type List<T> = {
  toArray(): Array<T>;
}

declare type Datasource<T> = {
  item: T | null;
  items: List<T> | null;

  load(config?: { success: () => void; failure?: (e: Error) => void }): void;
  unload(): void;
};

type WidgetCommon = {
  root: LayoutWidget;
  getDescendant(name: string): Widget | null;
  getDescendantsByClass(name: string): Array<Widget>;
}

declare type LayoutWidget = {
} & WidgetCommon;

declare type Panel = {
  styleName: string;
  // TODO: thing about genereting
  children: Record<string, Widget | undefined>;
  // TODO: think about generating
  properties: Record<string, string>;
} & WidgetCommon;

declare type Widget = Panel | LayoutWidget;

declare const app: {
  view: Panel;
  // TODO: can be generated
  views: Record<string, Widget | undefined>;
  // TODO: can be generated
  viewFragments: Record<string, Widget | undefined>;
  // TODO: think about generating
  datasources: Record<string, Datasource<unknown> | undefined>;
  sanitizer: { sanitizeUrl(url: string): string;  };

  executeRemoteScript<A extends Array<unknown>, R>(scriptName: string, functionName: string, args: A, callback: (result: R) => void): void;

  closeDialog(): void;
};