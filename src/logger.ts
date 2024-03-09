import * as chalk from 'chalk';

export function coloringNumber(text: string | number): string {
  return chalk.yellowBright(text);
}

export function coloringPath(text: string | number): string {
  return chalk.cyan(text);
}

export function coloringCode(text: string | number): string {
  return chalk.blackBright(text);
}

class Logger {
  private queuePr: Promise<void> | null = null;
  private logQueue: unknown[] = [];
  private putQueue: unknown[] = [];
  private lastEndedWithPutLine = false;

  log(message: unknown, ...messages: unknown[]): void {
    if (this.queuePr === null) {
      this.queuePr = Promise.resolve()
        .then(() => this.emptyQueue());
    }

    this.logQueue = this.logQueue.concat([message]).concat(messages);
  }

  putLine(message: unknown, ...messages: unknown[]): void {
    if (this.queuePr === null) {
      this.queuePr = Promise.resolve()
        .then(() => this.emptyQueue());
    }

    this.putQueue = this.putQueue.concat([message]).concat(messages);
  }

  private emptyQueue() {
    if (this.lastEndedWithPutLine) {
      console.log('');
    }

    this.logQueue.forEach(message => { console.log(message); });
    this.putQueue.forEach(message => { process.stdout.write(String(message)); });

    this.lastEndedWithPutLine = this.putQueue.length > 0;

    this.logQueue = [];
    this.putQueue = [];
    this.queuePr = null;
  }
}

export const logger = new Logger();
