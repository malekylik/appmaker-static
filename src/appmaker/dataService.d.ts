declare interface RecordQuery <T extends Record<string, unknown> = Record<string, unknown>> {
  // TODO: add generation
  model: string;
  limit?: number;
  parameters: T;
}

declare module 'dataService' {
  interface DataService {
    // TODO: add generation
    createRecord(model: string): unknown;
    queryRecords(query: unknown): { getRecords(): Array<unknown>; };
  }

  const dataService: DataService;

  export = dataService;
}
