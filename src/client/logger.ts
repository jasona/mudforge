/**
 * Logger - Central logging system for the MudForge client.
 *
 * Provides log levels, circular buffer storage, and console interception
 * for use with the debug panel.
 */

/**
 * Log levels in order of severity.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A single log entry.
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown[];
}

/**
 * Logger configuration options.
 */
interface LoggerOptions {
  maxEntries?: number;
  interceptConsole?: boolean;
}

/**
 * Event handler type for log events.
 */
type LogEventHandler = (entry: LogEntry) => void;

/**
 * Central logger class with console interception and buffering.
 */
class Logger {
  private entries: LogEntry[] = [];
  private maxEntries: number;
  private handlers: Set<LogEventHandler> = new Set();
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  constructor(options: LoggerOptions = {}) {
    this.maxEntries = options.maxEntries ?? 500;

    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    // Intercept console if requested (default true)
    if (options.interceptConsole !== false) {
      this.interceptConsole();
    }

    // Always capture uncaught errors and unhandled rejections
    this.captureGlobalErrors();
  }

  /**
   * Capture uncaught errors and unhandled promise rejections.
   */
  private captureGlobalErrors(): void {
    // Capture uncaught errors
    window.addEventListener('error', (event: ErrorEvent) => {
      const message = event.message || 'Unknown error';
      const source = event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : '';
      this.addEntry('error', [`[Uncaught] ${message}${source}`]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      let message: string;
      if (event.reason instanceof Error) {
        message = `${event.reason.name}: ${event.reason.message}`;
        if (event.reason.stack) {
          // Include first line of stack trace
          const stackLine = event.reason.stack.split('\n')[1]?.trim() || '';
          if (stackLine) {
            message += ` (${stackLine})`;
          }
        }
      } else if (typeof event.reason === 'string') {
        message = event.reason;
      } else {
        try {
          message = JSON.stringify(event.reason);
        } catch {
          message = String(event.reason);
        }
      }
      this.addEntry('error', [`[Unhandled Rejection] ${message}`]);
    });
  }

  /**
   * Intercept console.* calls to capture them in the log buffer.
   */
  private interceptConsole(): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    console.log = function (...args: unknown[]) {
      self.addEntry('info', args);
      self.originalConsole.log(...args);
    };

    console.info = function (...args: unknown[]) {
      self.addEntry('info', args);
      self.originalConsole.info(...args);
    };

    console.warn = function (...args: unknown[]) {
      self.addEntry('warn', args);
      self.originalConsole.warn(...args);
    };

    console.error = function (...args: unknown[]) {
      self.addEntry('error', args);
      self.originalConsole.error(...args);
    };

    console.debug = function (...args: unknown[]) {
      self.addEntry('debug', args);
      self.originalConsole.debug(...args);
    };
  }

  /**
   * Add a log entry to the buffer.
   */
  private addEntry(level: LogLevel, args: unknown[]): void {
    const message = args
      .map((arg) => {
        if (typeof arg === 'string') {
          return arg;
        }
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data: args.length > 1 || typeof args[0] !== 'string' ? args : undefined,
    };

    this.entries.push(entry);

    // Trim to max size
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Notify handlers
    for (const handler of this.handlers) {
      try {
        handler(entry);
      } catch {
        // Don't let handler errors break logging
      }
    }
  }

  /**
   * Log a debug message.
   */
  debug(...args: unknown[]): void {
    this.addEntry('debug', args);
    this.originalConsole.debug(...args);
  }

  /**
   * Log an info message.
   */
  info(...args: unknown[]): void {
    this.addEntry('info', args);
    this.originalConsole.info(...args);
  }

  /**
   * Log a warning message.
   */
  warn(...args: unknown[]): void {
    this.addEntry('warn', args);
    this.originalConsole.warn(...args);
  }

  /**
   * Log an error message.
   */
  error(...args: unknown[]): void {
    this.addEntry('error', args);
    this.originalConsole.error(...args);
  }

  /**
   * Subscribe to log events.
   */
  on(handler: LogEventHandler): void {
    this.handlers.add(handler);
  }

  /**
   * Unsubscribe from log events.
   */
  off(handler: LogEventHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Get all log entries.
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries filtered by level.
   */
  getEntriesByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter((e) => e.level === level);
  }

  /**
   * Get the last N entries.
   */
  getRecentEntries(count: number): LogEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Clear all log entries.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Export logs as JSON string.
   */
  exportJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Export logs as formatted text.
   */
  exportText(): string {
    return this.entries
      .map((entry) => {
        const time = new Date(entry.timestamp).toISOString();
        const level = entry.level.toUpperCase().padEnd(5);
        return `[${time}] [${level}] ${entry.message}`;
      })
      .join('\n');
  }

  /**
   * Get entry count.
   */
  get count(): number {
    return this.entries.length;
  }
}

// Export singleton instance
export const logger = new Logger();

// Also export class for testing
export { Logger };
