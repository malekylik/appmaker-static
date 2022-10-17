declare module 'logger' {
  interface Logger {
    debug(s: unknown): void;
    warning(s: unknown): void;
    error(s: unknown): void;
  }

  const logger: Logger;

  export = logger;
}