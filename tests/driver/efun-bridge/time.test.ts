/**
 * Tests for time utility efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('Time Efuns', () => {
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

  describe('time', () => {
    it('should return current timestamp in seconds', () => {
      const before = Math.floor(Date.now() / 1000);
      const result = efunBridge.time();
      const after = Math.floor(Date.now() / 1000);

      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('should return integer value', () => {
      const result = efunBridge.time();
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should be in reasonable range (after year 2020)', () => {
      const result = efunBridge.time();
      const year2020 = 1577836800; // Jan 1, 2020
      expect(result).toBeGreaterThan(year2020);
    });
  });

  describe('timeMs', () => {
    it('should return current timestamp in milliseconds', () => {
      const before = Date.now();
      const result = efunBridge.timeMs();
      const after = Date.now();

      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });

    it('should be approximately 1000x time()', () => {
      const seconds = efunBridge.time();
      const milliseconds = efunBridge.timeMs();

      const diff = Math.abs(milliseconds - seconds * 1000);
      expect(diff).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('toSeconds', () => {
    it('should return seconds unchanged if already in seconds', () => {
      const timestamp = 1704067200; // 10 digits = seconds
      expect(efunBridge.toSeconds(timestamp)).toBe(timestamp);
    });

    it('should convert milliseconds to seconds', () => {
      const milliseconds = 1704067200000; // 13 digits = milliseconds
      expect(efunBridge.toSeconds(milliseconds)).toBe(1704067200);
    });

    it('should handle boundary value (10 billion)', () => {
      // 10 billion exactly is considered seconds
      expect(efunBridge.toSeconds(10000000000)).toBe(10000000000);
      // Just over 10 billion is considered milliseconds
      expect(efunBridge.toSeconds(10000000001)).toBe(10000000);
    });

    it('should handle small values', () => {
      expect(efunBridge.toSeconds(1000)).toBe(1000);
      expect(efunBridge.toSeconds(0)).toBe(0);
    });
  });

  describe('toMilliseconds', () => {
    it('should convert seconds to milliseconds', () => {
      const seconds = 1704067200;
      expect(efunBridge.toMilliseconds(seconds)).toBe(1704067200000);
    });

    it('should return milliseconds unchanged if already in milliseconds', () => {
      const milliseconds = 1704067200000;
      expect(efunBridge.toMilliseconds(milliseconds)).toBe(milliseconds);
    });

    it('should handle boundary value (10 billion)', () => {
      // 10 billion exactly is considered seconds
      expect(efunBridge.toMilliseconds(10000000000)).toBe(10000000000000);
      // Just over 10 billion is considered milliseconds
      expect(efunBridge.toMilliseconds(10000000001)).toBe(10000000001);
    });

    it('should handle small values', () => {
      expect(efunBridge.toMilliseconds(1000)).toBe(1000000);
      expect(efunBridge.toMilliseconds(0)).toBe(0);
    });
  });

  describe('timestamp conversion consistency', () => {
    it('should round-trip from seconds', () => {
      const original = 1704067200;
      const ms = efunBridge.toMilliseconds(original);
      const back = efunBridge.toSeconds(ms);
      expect(back).toBe(original);
    });

    it('should handle current time consistently', () => {
      const nowMs = efunBridge.timeMs();
      const nowSec = efunBridge.time();

      const convertedSec = efunBridge.toSeconds(nowMs);
      const convertedMs = efunBridge.toMilliseconds(nowSec);

      // Should be within 1 second of each other
      expect(Math.abs(convertedSec - nowSec)).toBeLessThan(2);
      expect(Math.abs(convertedMs - nowMs)).toBeLessThan(2000);
    });
  });
});
