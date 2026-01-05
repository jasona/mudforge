import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Driver, resetDriver } from '../../src/driver/driver.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

describe('Driver', () => {
  let testMudlibPath: string;

  beforeEach(async () => {
    resetDriver();

    // Create a unique test mudlib directory
    testMudlibPath = join(process.cwd(), `test-mudlib-${randomUUID()}`);
    await mkdir(testMudlibPath, { recursive: true });
    await mkdir(join(testMudlibPath, 'daemons'), { recursive: true });
    await mkdir(join(testMudlibPath, 'cmds', 'player'), { recursive: true });
    await mkdir(join(testMudlibPath, 'cmds', 'builder'), { recursive: true });
    await mkdir(join(testMudlibPath, 'cmds', 'senior'), { recursive: true });
    await mkdir(join(testMudlibPath, 'cmds', 'admin'), { recursive: true });

    // Create a minimal master object
    const masterContent = `
      export default class Master {
        onDriverStart() {
          // Driver started
        }

        onPreload() {
          return [];
        }

        onShutdown() {
          // Driver shutting down
        }
      }
    `;
    await writeFile(join(testMudlibPath, 'master.ts'), masterContent);

    // Create a minimal login daemon
    const loginContent = `
      export class LoginDaemon {
        startSession(connection: unknown) {
          // Start login session
        }

        processInput(connection: unknown, input: string) {
          // Process input
        }

        handleDisconnect(connection: unknown) {
          // Handle disconnect
        }
      }

      export default LoginDaemon;
    `;
    await writeFile(join(testMudlibPath, 'daemons', 'login.ts'), loginContent);
  });

  afterEach(async () => {
    resetDriver();

    try {
      await rm(testMudlibPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create driver with default config', () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });

      expect(driver.getState()).toBe('stopped');
    });

    it('should create driver with custom config', () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
        port: 4000,
        heartbeatIntervalMs: 1000,
      });

      const config = driver.getConfig();
      expect(config.port).toBe(4000);
      expect(config.heartbeatIntervalMs).toBe(1000);
    });

    it('should throw on invalid config', () => {
      expect(
        () =>
          new Driver({
            mudlibPath: testMudlibPath,
            masterObject: '/master',
            port: -1,
          })
      ).toThrow('Configuration errors');
    });
  });

  describe('subsystem access', () => {
    it('should provide access to registry', () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });

      expect(driver.getRegistry()).toBeDefined();
      expect(typeof driver.getRegistry().find).toBe('function');
    });

    it('should provide access to scheduler', () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });

      expect(driver.getScheduler()).toBeDefined();
      expect(typeof driver.getScheduler().start).toBe('function');
    });

    it('should provide access to efun bridge', () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });

      expect(driver.getEfunBridge()).toBeDefined();
      expect(typeof driver.getEfunBridge().thisObject).toBe('function');
    });

    it('should provide access to compiler', () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });

      expect(driver.getCompiler()).toBeDefined();
      expect(typeof driver.getCompiler().compile).toBe('function');
    });

    it('should provide access to hot-reload', () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });

      expect(driver.getHotReload()).toBeDefined();
      expect(typeof driver.getHotReload().startWatching).toBe('function');
    });

    it('should provide access to logger', () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });

      expect(driver.getLogger()).toBeDefined();
      expect(typeof driver.getLogger().info).toBe('function');
    });
  });

  describe('start', () => {
    it('should transition to running state', async () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
        logLevel: 'error', // Reduce noise
        hotReload: false,
      });

      await driver.start();

      expect(driver.getState()).toBe('running');
      expect(driver.getScheduler().isRunning).toBe(true);

      await driver.stop();
    });

    it('should throw when starting non-stopped driver', async () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
        logLevel: 'error',
        hotReload: false,
      });

      await driver.start();

      await expect(driver.start()).rejects.toThrow('Cannot start driver in state');

      await driver.stop();
    });
  });

  describe('stop', () => {
    it('should transition to stopped state', async () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
        logLevel: 'error',
        hotReload: false,
      });

      await driver.start();
      await driver.stop();

      expect(driver.getState()).toBe('stopped');
      expect(driver.getScheduler().isRunning).toBe(false);
    });

    it('should be idempotent when not running', async () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
        logLevel: 'error',
      });

      // Should not throw
      await driver.stop();
      await driver.stop();

      expect(driver.getState()).toBe('stopped');
    });
  });

  describe('handleError', () => {
    it('should handle runtime errors', async () => {
      const driver = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
        logLevel: 'error',
      });

      const error = new Error('Test runtime error');

      // Should not throw
      await driver.handleError(error, null);
    });
  });

  describe('resetDriver', () => {
    it('should reset all subsystems', () => {
      const driver1 = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });
      driver1.getRegistry(); // Ensure registry is created

      resetDriver();

      const driver2 = new Driver({
        mudlibPath: testMudlibPath,
        masterObject: '/master',
      });

      // Should get fresh instances
      expect(driver2).not.toBe(driver1);
    });
  });
});
