/**
 * Configuration loading for the MUD driver.
 * Loads settings from environment variables with sensible defaults.
 */

export interface DriverConfig {
  // Server
  port: number;
  host: string;

  // Mudlib
  mudlibPath: string;
  masterObject: string;

  // Logging
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  logPretty: boolean;

  // Isolation/Sandbox
  isolateMemoryMb: number;
  scriptTimeoutMs: number;

  // Scheduler
  heartbeatIntervalMs: number;

  // Persistence
  autoSaveIntervalMs: number;
  dataPath: string;

  // Development
  devMode: boolean;
  hotReload: boolean;

  // Claude AI
  claudeApiKey: string;
  claudeModel: string;
  claudeMaxTokens: number;
  claudeRateLimitPerMinute: number;
  claudeCacheTtlMs: number;
}

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

function parseLogLevel(value: string | undefined, defaultLevel: LogLevel): LogLevel {
  if (!value) return defaultLevel;
  const lower = value.toLowerCase();
  if (LOG_LEVELS.includes(lower as LogLevel)) {
    return lower as LogLevel;
  }
  return defaultLevel;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const lower = value.toLowerCase();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Load configuration from environment variables.
 * All settings have sensible defaults for development.
 */
export function loadConfig(): DriverConfig {
  return {
    // Server
    port: parseNumber(process.env['PORT'], 3000),
    host: process.env['HOST'] ?? '0.0.0.0',

    // Mudlib
    mudlibPath: process.env['MUDLIB_PATH'] ?? './mudlib',
    masterObject: process.env['MASTER_OBJECT'] ?? '/master',

    // Logging
    logLevel: parseLogLevel(process.env['LOG_LEVEL'], 'info'),
    // Default to pretty logs in development, JSON logs in production
    logPretty: parseBoolean(process.env['LOG_PRETTY'], process.env['NODE_ENV'] !== 'production'),

    // Isolation/Sandbox
    isolateMemoryMb: parseNumber(process.env['ISOLATE_MEMORY_MB'], 128),
    scriptTimeoutMs: parseNumber(process.env['SCRIPT_TIMEOUT_MS'], 5000),

    // Scheduler
    heartbeatIntervalMs: parseNumber(process.env['HEARTBEAT_INTERVAL_MS'], 2000),

    // Persistence
    autoSaveIntervalMs: parseNumber(process.env['AUTO_SAVE_INTERVAL_MS'], 300000),
    dataPath: process.env['DATA_PATH'] ?? './mudlib/data',

    // Development
    devMode: parseBoolean(process.env['DEV_MODE'], true),
    hotReload: parseBoolean(process.env['HOT_RELOAD'], true),

    // Claude AI
    claudeApiKey: process.env['CLAUDE_API_KEY'] ?? '',
    claudeModel: process.env['CLAUDE_MODEL'] ?? 'claude-sonnet-4-20250514',
    claudeMaxTokens: parseNumber(process.env['CLAUDE_MAX_TOKENS'], 1024),
    claudeRateLimitPerMinute: parseNumber(process.env['CLAUDE_RATE_LIMIT'], 20),
    claudeCacheTtlMs: parseNumber(process.env['CLAUDE_CACHE_TTL_MS'], 300000),
  };
}

/**
 * Validate configuration and return any errors.
 */
export function validateConfig(config: DriverConfig): string[] {
  const errors: string[] = [];

  if (config.port < 1 || config.port > 65535) {
    errors.push(`Invalid port: ${config.port}. Must be between 1 and 65535.`);
  }

  if (config.isolateMemoryMb < 16) {
    errors.push(`Isolate memory too low: ${config.isolateMemoryMb}MB. Minimum is 16MB.`);
  }

  if (config.scriptTimeoutMs < 100) {
    errors.push(`Script timeout too low: ${config.scriptTimeoutMs}ms. Minimum is 100ms.`);
  }

  if (config.heartbeatIntervalMs < 100) {
    errors.push(`Heartbeat interval too low: ${config.heartbeatIntervalMs}ms. Minimum is 100ms.`);
  }

  return errors;
}
