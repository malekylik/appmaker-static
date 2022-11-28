declare interface ResultSet<T> {
  next(): boolean;
  close(): void;

  getInt(field: keyof T): number;
  getString(field: keyof T): string;
  getTimestamp(field: keyof T): Date;
}

declare interface PreparedStatement {
  executeQuery<T>(): ResultSet<T>;
  close(): void;
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
