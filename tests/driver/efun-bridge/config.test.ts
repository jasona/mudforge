/**
 * Tests for configuration efuns.
 * Note: getMudConfig(key) returns a value for a specific key, not the whole config object.
 * setMudConfig(key, value) requires the config daemon to be loaded.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { getPermissions } from '../../../src/driver/permissions.js';

describe('Config Efuns', () => {
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

  describe('getMudConfig', () => {
    it('should return undefined for non-existent key', () => {
      const value = efunBridge.getMudConfig('nonexistent.key');

      expect(value).toBeUndefined();
    });

    it('should return undefined when config daemon not loaded', () => {
      // Without the config daemon loaded, getMudConfig returns undefined
      const value = efunBridge.getMudConfig('some.key');

      expect(value).toBeUndefined();
    });

    it('should accept string key parameter', () => {
      // This verifies the method signature accepts a string key
      expect(() => efunBridge.getMudConfig('test.key')).not.toThrow();
    });

    it('should handle nested key paths', () => {
      // Nested keys like 'giphy.enabled' or 'disconnect.timeoutMinutes'
      const value = efunBridge.getMudConfig('giphy.enabled');
      // Returns undefined when daemon not loaded
      expect(value).toBeUndefined();
    });
  });

  describe('setMudConfig', () => {
    beforeEach(() => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);
    });

    it('should reject when not admin', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const result = efunBridge.setMudConfig('key', 'value');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied: admin required');
    });

    it('should return error when config daemon not loaded', () => {
      // Without config daemon loaded, setMudConfig fails
      const result = efunBridge.setMudConfig('testKey', 'testValue');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Config daemon not loaded');
    });

    it('should accept key and value parameters', () => {
      // This verifies the method signature
      const result = efunBridge.setMudConfig('test.key', 'value');

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle various value types', () => {
      // Test that different types can be passed (even if daemon isn't loaded)
      expect(() => efunBridge.setMudConfig('stringVal', 'text')).not.toThrow();
      expect(() => efunBridge.setMudConfig('numberVal', 42)).not.toThrow();
      expect(() => efunBridge.setMudConfig('boolVal', true)).not.toThrow();
      expect(() => efunBridge.setMudConfig('arrayVal', [1, 2, 3])).not.toThrow();
      expect(() => efunBridge.setMudConfig('objectVal', { nested: 'value' })).not.toThrow();
    });
  });
});
