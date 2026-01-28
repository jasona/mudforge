import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, validateConfig, type DriverConfig } from '../../src/driver/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return default values when no env vars are set', () => {
    // Clear relevant env vars
    delete process.env['PORT'];
    delete process.env['HOST'];
    delete process.env['MUDLIB_PATH'];
    delete process.env['LOG_LEVEL'];

    const config = loadConfig();

    expect(config.port).toBe(3000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.mudlibPath).toBe('./mudlib');
    expect(config.masterObject).toBe('/master');
    expect(config.logLevel).toBe('info');
    expect(config.logPretty).toBe(true);
    expect(config.isolateMemoryMb).toBe(64);
    expect(config.maxIsolates).toBe(2);
    expect(config.scriptTimeoutMs).toBe(5000);
    expect(config.heartbeatIntervalMs).toBe(2000);
    expect(config.autoSaveIntervalMs).toBe(300000);
    expect(config.devMode).toBe(true);
    expect(config.hotReload).toBe(true);
  });

  it('should parse PORT from environment', () => {
    process.env['PORT'] = '8080';

    const config = loadConfig();

    expect(config.port).toBe(8080);
  });

  it('should parse LOG_LEVEL from environment', () => {
    process.env['LOG_LEVEL'] = 'debug';

    const config = loadConfig();

    expect(config.logLevel).toBe('debug');
  });

  it('should default to info for invalid LOG_LEVEL', () => {
    process.env['LOG_LEVEL'] = 'invalid';

    const config = loadConfig();

    expect(config.logLevel).toBe('info');
  });

  it('should parse boolean values correctly', () => {
    process.env['DEV_MODE'] = 'false';
    process.env['HOT_RELOAD'] = '0';
    process.env['LOG_PRETTY'] = 'no';

    const config = loadConfig();

    expect(config.devMode).toBe(false);
    expect(config.hotReload).toBe(false);
    expect(config.logPretty).toBe(false);
  });

  it('should parse truthy boolean values', () => {
    process.env['DEV_MODE'] = 'true';
    process.env['HOT_RELOAD'] = '1';
    process.env['LOG_PRETTY'] = 'yes';

    const config = loadConfig();

    expect(config.devMode).toBe(true);
    expect(config.hotReload).toBe(true);
    expect(config.logPretty).toBe(true);
  });

  it('should handle invalid number values by using defaults', () => {
    process.env['PORT'] = 'not-a-number';
    process.env['ISOLATE_MEMORY_MB'] = 'abc';

    const config = loadConfig();

    expect(config.port).toBe(3000);
    expect(config.isolateMemoryMb).toBe(64);
  });
});

describe('validateConfig', () => {
  const validConfig: DriverConfig = {
    port: 3000,
    host: '0.0.0.0',
    mudlibPath: './mudlib',
    masterObject: '/master',
    logLevel: 'info',
    logPretty: true,
    isolateMemoryMb: 64,
    maxIsolates: 2,
    scriptTimeoutMs: 5000,
    heartbeatIntervalMs: 2000,
    autoSaveIntervalMs: 300000,
    dataPath: './mudlib/data',
    devMode: true,
    hotReload: true,
  };

  it('should return no errors for valid config', () => {
    const errors = validateConfig(validConfig);

    expect(errors).toHaveLength(0);
  });

  it('should return error for invalid port (too low)', () => {
    const config = { ...validConfig, port: 0 };

    const errors = validateConfig(config);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Invalid port');
  });

  it('should return error for invalid port (too high)', () => {
    const config = { ...validConfig, port: 70000 };

    const errors = validateConfig(config);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Invalid port');
  });

  it('should return error for isolate memory too low', () => {
    const config = { ...validConfig, isolateMemoryMb: 8 };

    const errors = validateConfig(config);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Isolate memory too low');
  });

  it('should return error for script timeout too low', () => {
    const config = { ...validConfig, scriptTimeoutMs: 50 };

    const errors = validateConfig(config);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Script timeout too low');
  });

  it('should return error for heartbeat interval too low', () => {
    const config = { ...validConfig, heartbeatIntervalMs: 50 };

    const errors = validateConfig(config);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Heartbeat interval too low');
  });

  it('should return multiple errors for multiple invalid values', () => {
    const config = {
      ...validConfig,
      port: 0,
      isolateMemoryMb: 8,
      scriptTimeoutMs: 50,
    };

    const errors = validateConfig(config);

    expect(errors).toHaveLength(3);
  });
});
