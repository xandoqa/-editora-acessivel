/* eslint-disable no-console */
/**
 * Logger mínimo com timestamp e nível. Mantido simples de propósito: a saída vai
 * para stdout/stderr, que o Docker já coleta (`docker compose logs api`).
 */
type Level = 'info' | 'warn' | 'error' | 'debug';

function write(level: Level, message: string, extra?: unknown): void {
  if (process.env.NODE_ENV === 'test' && level !== 'error') return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}`;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  if (extra instanceof Error) out(line, '\n', extra.stack ?? extra.message);
  else if (extra !== undefined) out(line, extra);
  else out(line);
}

export const logger = {
  info: (m: string, e?: unknown) => write('info', m, e),
  warn: (m: string, e?: unknown) => write('warn', m, e),
  error: (m: string, e?: unknown) => write('error', m, e),
  debug: (m: string, e?: unknown) => {
    if (process.env.NODE_ENV === 'development') write('debug', m, e);
  },
};
