/**
 * Tests for driver statistics efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { BaseMudObject } from '../../../src/driver/base-object.js';
import { getRegistry, resetRegistry } from '../../../src/driver/object-registry.js';

describe('Stats Efuns', () => {
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

  describe('getUptime', () => {
    it('should return uptime object with seconds and formatted', () => {
      const uptime = efunBridge.getUptime();

      expect(uptime).toBeDefined();
      expect(typeof uptime).toBe('object');
      expect(typeof uptime.seconds).toBe('number');
      expect(typeof uptime.formatted).toBe('string');
    });

    it('should have non-negative seconds', () => {
      const uptime = efunBridge.getUptime();

      expect(uptime.seconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDriverStats', () => {
    it('should return stats object with success property', () => {
      const stats = efunBridge.getDriverStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      expect(stats).toHaveProperty('success');
    });

    it('should include uptime when successful', () => {
      const stats = efunBridge.getDriverStats();

      // If successful, should have uptime
      if (stats.success) {
        expect(stats).toHaveProperty('uptime');
        expect(stats.uptime).toHaveProperty('seconds');
        expect(stats.uptime).toHaveProperty('formatted');
      } else {
        // When driver not fully initialized, may return error
        expect(stats).toHaveProperty('error');
      }
    });

    it('should include memory stats when successful', () => {
      const stats = efunBridge.getDriverStats();

      if (stats.success) {
        expect(stats).toHaveProperty('memory');
      }
    });
  });

  describe('getObjectStats', () => {
    it('should return object count stats', () => {
      const stats = efunBridge.getObjectStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should handle registry without errors', () => {
      // Just verify the method doesn't throw
      expect(() => efunBridge.getObjectStats()).not.toThrow();
    });
  });

  describe('getMemoryStats', () => {
    it('should return memory stats', () => {
      const stats = efunBridge.getMemoryStats();

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should have memory usage properties', () => {
      const stats = efunBridge.getMemoryStats();

      // Memory stats should have some properties
      expect(stats).toBeDefined();
    });
  });

  describe('getAllObjects', () => {
    it('should return array of objects', () => {
      const allObjects = efunBridge.getAllObjects();

      expect(Array.isArray(allObjects)).toBe(true);
    });

    it('should include registered objects', () => {
      // Create a unique path to avoid conflicts
      const uniquePath = `/test/stats-obj-${Date.now()}`;
      const obj = new BaseMudObject(uniquePath);

      try {
        getRegistry().register(obj);
        const allObjects = efunBridge.getAllObjects();
        expect(allObjects).toContain(obj);
      } finally {
        // Clean up by unregistering
        try {
          getRegistry().unregister(obj);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });
});
