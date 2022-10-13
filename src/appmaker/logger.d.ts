declare module 'logger' {
  interface Logger {
    error(s: string): void;
  }

  const logger: Logger;

  export = logger;
}