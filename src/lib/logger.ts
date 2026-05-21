/**
 * Structured JSON logger for Vercel Functions.
 * In development, output is pretty-printed. In production, each log line
 * is a JSON object consumed by Vercel's log aggregation.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context: object = {}): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const output = JSON.stringify(entry);

  if (level === 'error' || level === 'warn') {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, context?: object) => log('debug', message, context),
  info: (message: string, context?: object) => log('info', message, context),
  warn: (message: string, context?: object) => log('warn', message, context),
  error: (message: string, context?: object) => log('error', message, context),
};
