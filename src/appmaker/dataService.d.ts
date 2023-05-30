declare type ModelNames = /** generated */ unknown;

declare type ModelNamesToModelTypeMap = {
  /** generated */
}

// Passed by AppMaker to model scripts
declare interface RecordQuery <T extends Record<string, unknown> = Record<string, unknown>> {
  model: ModelNames;
  limit: number | null;
  offset: number;
  parameters: T;
  // asc - default option if ascending is not defined
  sortBy: Array<[fieldPath: string, ascending?: boolean]>;
}

// Passed by user to DataService methods
declare interface QueryRecord<T extends ModelNames> {
  model: T;

  filters?: Record<string, unknown> | undefined;
  // asc - default option if ascending is not defined
  sortBy?: Array<[fieldPath: string, ascending?: boolean]>;
  prefetch?: Array<ModelNames>;
  where?: string;
  limit?: number | null;
  offset?: number | null;
  parameters?: Record<string, string | number | null> | undefined;
}

declare module 'dataService' {
  interface DataService {
    createRecord<T extends ModelNames>(model: T): ModelNamesToModelTypeMap[T];
    createDraftRecord<T extends ModelNames>(model: T): ModelNamesToModelTypeMap[T];
    getAppSingletonRecord<T extends ModelNames>(model: T): ModelNamesToModelTypeMap[T];
    queryRecords<T extends ModelNames>(query: QueryRecord<T>): {
      getRecords(): Array<ModelNamesToModelTypeMap[T]>;
    };
    saveRecords(records: Array<unknown>): void;
    deleteRecords<T extends ModelNames>(model: T, localKeys: Array<string | number | null>): void;
  }

  const dataService: DataService;

  export = dataService;
}
