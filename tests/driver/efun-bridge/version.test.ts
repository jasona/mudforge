/**
 * Tests for version-related efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('Version Efuns', () => {
  let efunBridge: EfunBridge;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await createTestEnvironment();
    efunBridge = env.efunBridge;
    cleanup = env.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('driverVersion', () => {
    it('should return version object', () => {
      const version = efunBridge.driverVersion();

      expect(version).toBeDefined();
      expect(typeof version).toBe('object');
    });

    it('should have version string', () => {
      const version = efunBridge.driverVersion();

      expect(typeof version.version).toBe('string');
      expect(version.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should have name field', () => {
      const version = efunBridge.driverVersion();

      expect(typeof version.name).toBe('string');
      expect(version.name.length).toBeGreaterThan(0);
    });

    it('should have MudForge in name', () => {
      const version = efunBridge.driverVersion();

      expect(version.name).toContain('MudForge');
    });
  });

  describe('gameConfig', () => {
    it('should return game configuration object', () => {
      const config = efunBridge.gameConfig();

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should have game name', () => {
      const config = efunBridge.gameConfig();

      expect(typeof config.name).toBe('string');
      expect(config.name.length).toBeGreaterThan(0);
    });

    it('should have tagline', () => {
      const config = efunBridge.gameConfig();

      expect(typeof config.tagline).toBe('string');
    });

    it('should have version', () => {
      const config = efunBridge.gameConfig();

      expect(typeof config.version).toBe('string');
      expect(config.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should have description', () => {
      const config = efunBridge.gameConfig();

      expect(typeof config.description).toBe('string');
    });

    it('should have establishedYear', () => {
      const config = efunBridge.gameConfig();

      expect(typeof config.establishedYear).toBe('number');
      expect(config.establishedYear).toBeGreaterThanOrEqual(2000);
    });

    it('should have website', () => {
      const config = efunBridge.gameConfig();

      expect(typeof config.website).toBe('string');
    });
  });

  describe('versionString', () => {
    it('should return formatted version string', () => {
      const versionStr = efunBridge.versionString();

      expect(typeof versionStr).toBe('string');
      expect(versionStr.length).toBeGreaterThan(0);
    });

    it('should contain version number', () => {
      const versionStr = efunBridge.versionString();
      const version = efunBridge.driverVersion();

      expect(versionStr).toContain(version.version);
    });

    it('should contain driver name', () => {
      const versionStr = efunBridge.versionString();
      const version = efunBridge.driverVersion();

      expect(versionStr).toContain(version.name);
    });
  });
});
