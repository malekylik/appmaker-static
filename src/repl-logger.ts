import * as chalk from 'chalk';

export function getReplUserInputLine(status: { state: 'ready' | 'loading' | 'warn' }) {
  let statusPart = '';

  switch (status.state) {
    case 'ready': { statusPart = chalk.green('ready'); break; };
    case 'loading': { statusPart = chalk.blueBright('loading'); break; };
    case 'warn': { statusPart = chalk.yellow('warning'); break; };
  }

  return `repl (${statusPart})$ `;
}

export function colorPath(path: string): string {
  return chalk.blue(path);
}

export function colorValue(value: string): string {
  return chalk.yellow(value)
}

export function colorImportantMessage(message: string): string {
  return chalk.yellowBright(message);
}
