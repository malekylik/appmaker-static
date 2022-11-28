declare type ModelNames = /** generated */ unknown;

declare type ModelNamesToModelTypeMap = {
  /** generated */
}

// Passed by AppMaker to model scripts
declare interface RecordQuery <T extends Record<string, unknown> = Record<string, unknown>> {
  model: ModelNames;
  limit?: number;
  parameters: T;
}

// Passed by user to DataService methods
declare interface QueryRecord<T extends ModelNames> {
  model: T;

  filters?: Record<string, unknown>;
  // asc - default option if ascending is not defined
  sortBy?: Array<[fieldPath: string, ascending?: boolean]>;
  prefetch?: Array<ModelNames>;
}

declare module 'dataService' {
  interface DataService {
    createRecord<T extends ModelNames>(model: T): ModelNamesToModelTypeMap[T];
    createDraftRecord<T extends ModelNames>(model: T): ModelNamesToModelTypeMap[T];
    queryRecords<T extends ModelNames>(query: QueryRecord<T>): {
      getRecords(): Array<ModelNamesToModelTypeMap[T]>;
    };
  }

  const dataService: DataService;

  export = dataService;
}
