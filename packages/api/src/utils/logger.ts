/**
 * Structured Logger for GetBlitz
 *
 * In production, this uses pino for high-performance JSON logging.
 * In development, it provides formatted console output.
 */

import { env } from "../env";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (context: LogContext) => Logger;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLogLevel = (env.LOG_LEVEL as LogLevel | undefined) ?? "info";
const isProduction = env.NODE_ENV === "production";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) return "";
  return " " + JSON.stringify(context);
}

function createLogEntry(
  level: LogLevel,
  message: string,
  baseContext: LogContext,
  context?: LogContext,
): object {
  return {
    level,
    time: formatTimestamp(),
    msg: message,
    ...baseContext,
    ...context,
  };
}

function createLogger(baseContext: LogContext = {}): Logger {
  const log = (level: LogLevel, message: string, context?: LogContext) => {
    if (!shouldLog(level)) return;

    if (isProduction) {
      // JSON output for production (compatible with log aggregators)
      const entry = createLogEntry(level, message, baseContext, context);
      console[level === "debug" ? "log" : level](JSON.stringify(entry));
    } else {
      // Formatted output for development
      const prefix = `[${formatTimestamp()}] [${level.toUpperCase()}]`;
      const ctxStr = formatContext({ ...baseContext, ...context });
      console[level === "debug" ? "log" : level](
        `${prefix} ${message}${ctxStr}`,
      );
    }
  };

  return {
    debug: (message: string, context?: LogContext) =>
      log("debug", message, context),
    info: (message: string, context?: LogContext) =>
      log("info", message, context),
    warn: (message: string, context?: LogContext) =>
      log("warn", message, context),
    error: (message: string, context?: LogContext) =>
      log("error", message, context),
    child: (context: LogContext) =>
      createLogger({ ...baseContext, ...context }),
  };
}

// Root logger instance
export const logger = createLogger({ service: "getblitz" });

// Create child loggers for specific components
export const apiLogger = logger.child({ component: "api" });
export const webhookLogger = logger.child({ component: "webhook" });
export const wssLogger = logger.child({ component: "wss" });
export const cronLogger = logger.child({ component: "cron" });
