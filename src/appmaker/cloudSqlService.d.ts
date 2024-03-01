declare interface ResultSet<T> {
  next(): boolean;
  close(): void;

  getInt(field: keyof T): number;
  getString(field: keyof T): string;
  getTimestamp(field: keyof T): Date;
  getBoolean(field: keyof T): boolean;
  // Reports whether the last column read had a value of SQL NULL.
  wasNull(): boolean;
}

declare interface PreparedStatement {
  executeQuery<T>(): ResultSet<T>;
  close(): void;

  setString(parameterIndex: number, x: string): void;
}

declare interface Connection {
  prepareStatement(sql: string): PreparedStatement;
}

declare module 'cloudSqlService' {
  interface CloudSqlService {
    getConnection(): Connection;
  }

  const cloudSqlService: CloudSqlService;

  export = cloudSqlService;
}
