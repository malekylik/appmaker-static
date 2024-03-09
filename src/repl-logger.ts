import * as chalk from 'chalk';

export function getReplUserInputLine(status: { state: 'ready' | 'loading' }) {
  let statusPart = '';

  switch (status.state) {
    case 'ready': { statusPart = chalk.green('ready'); break; };
    case 'loading': { statusPart = chalk.blue('loading'); break; };
  }

  return `repl (${statusPart})$ `;
}
