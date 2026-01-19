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
  logHttpRequests: boolean;

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

  // Gemini AI (Nano Banana image generation)
  geminiApiKey: string;
  geminiModel: string;
  geminiRateLimitPerMinute: number;
  geminiCacheTtlMs: number;

  // Intermud 3
  i3Enabled: boolean;
  i3MudName: string;
  i3AdminEmail: string;
  i3RouterHost: string;
  i3RouterPort: number;

  // Intermud 2
  i2Enabled: boolean;
  i2MudName: string;
  i2UdpPort: number;
  i2Host: string;

  // Grapevine
  grapevineEnabled: boolean;
  grapevineClientId: string;
  grapevineClientSecret: string;
  grapevineGameName: string;
  grapevineDefaultChannels: string[];
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
    // HTTP request logging (default off to reduce noise)
    logHttpRequests: parseBoolean(process.env['LOG_HTTP_REQUESTS'], false),

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

    // Gemini AI (Nano Banana image generation)
    geminiApiKey: process.env['GEMINI_API_KEY'] ?? '',
    geminiModel: process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash-preview-05-20',
    geminiRateLimitPerMinute: parseNumber(process.env['GEMINI_RATE_LIMIT'], 10),
    geminiCacheTtlMs: parseNumber(process.env['GEMINI_CACHE_TTL_MS'], 3600000),

    // Intermud 3
    i3Enabled: parseBoolean(process.env['I3_ENABLED'], false),
    i3MudName: process.env['I3_MUD_NAME'] ?? 'MudForge',
    i3AdminEmail: process.env['I3_ADMIN_EMAIL'] ?? '',
    i3RouterHost: process.env['I3_ROUTER_HOST'] ?? '97.107.133.86',
    i3RouterPort: parseNumber(process.env['I3_ROUTER_PORT'], 8787),

    // Intermud 2
    i2Enabled: parseBoolean(process.env['I2_ENABLED'], false),
    i2MudName: process.env['I2_MUD_NAME'] ?? process.env['I3_MUD_NAME'] ?? 'MudForge',
    i2UdpPort: parseNumber(process.env['I2_UDP_PORT'], 0), // 0 = game port + 4
    i2Host: process.env['I2_HOST'] ?? '0.0.0.0',

    // Grapevine
    grapevineEnabled: parseBoolean(process.env['GRAPEVINE_ENABLED'], false),
    grapevineClientId: process.env['GRAPEVINE_CLIENT_ID'] ?? '',
    grapevineClientSecret: process.env['GRAPEVINE_CLIENT_SECRET'] ?? '',
    grapevineGameName:
      process.env['GRAPEVINE_GAME_NAME'] ?? process.env['I3_MUD_NAME'] ?? 'MudForge',
    grapevineDefaultChannels: (process.env['GRAPEVINE_CHANNELS'] ?? 'gossip')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
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

  // Intermud 3 validation
  if (config.i3Enabled) {
    if (!config.i3AdminEmail) {
      errors.push('I3_ADMIN_EMAIL is required when I3 is enabled.');
    }
    if (!config.i3MudName) {
      errors.push('I3_MUD_NAME is required when I3 is enabled.');
    }
    if (config.i3RouterPort < 1 || config.i3RouterPort > 65535) {
      errors.push(`Invalid I3 router port: ${config.i3RouterPort}. Must be between 1 and 65535.`);
    }
  }

  // Grapevine validation
  if (config.grapevineEnabled) {
    if (!config.grapevineClientId) {
      errors.push('GRAPEVINE_CLIENT_ID is required when Grapevine is enabled.');
    }
    if (!config.grapevineClientSecret) {
      errors.push('GRAPEVINE_CLIENT_SECRET is required when Grapevine is enabled.');
    }
  }

  return errors;
}
