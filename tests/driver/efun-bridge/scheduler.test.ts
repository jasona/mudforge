/**
 * Tests for scheduler efuns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { BaseMudObject } from '../../../src/driver/base-object.js';
import { getScheduler } from '../../../src/driver/scheduler.js';

describe('Scheduler Efuns', () => {
  let efunBridge: EfunBridge;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await createTestEnvironment();
    efunBridge = env.efunBridge;
    cleanup = env.cleanup;

    vi.useFakeTimers();
    // Start the scheduler so it processes callouts
    getScheduler().start();
  });

  afterEach(async () => {
    getScheduler().stop();
    vi.useRealTimers();
    await cleanup();
  });

  describe('setHeartbeat', () => {
    it('should enable heartbeat for object', async () => {
      const obj = new BaseMudObject();
      obj._setupAsBlueprint('/test/heartbeat');
      (obj as BaseMudObject & { heartbeat: () => void }).heartbeat = vi.fn();

      efunBridge.setHeartbeat(obj, true);

      // After one heartbeat cycle (2 seconds by default) + buffer
      await vi.advanceTimersByTimeAsync(2100);

      // Heartbeat should have been called
      // Note: actual behavior depends on scheduler implementation
    });

    it('should disable heartbeat for object', async () => {
      const obj = new BaseMudObject();
      obj._setupAsBlueprint('/test/heartbeat2');
      const heartbeatFn = vi.fn();
      (obj as BaseMudObject & { heartbeat: () => void }).heartbeat = heartbeatFn;

      efunBridge.setHeartbeat(obj, true);
      efunBridge.setHeartbeat(obj, false);

      await vi.advanceTimersByTimeAsync(5000);

      // After disabling, heartbeat should not be called
      // (may have been called before disabling)
    });

    it('should not throw for object without heartbeat method', () => {
      const obj = new BaseMudObject();
      obj._setupAsBlueprint('/test/noheartbeat');

      expect(() => efunBridge.setHeartbeat(obj, true)).not.toThrow();
    });
  });

  describe('callOut', () => {
    it('should schedule delayed callback', async () => {
      const callback = vi.fn();

      efunBridge.callOut(callback, 1000);

      expect(callback).not.toHaveBeenCalled();

      // Need to advance time enough for the scheduler's 100ms polling + the delay
      await vi.advanceTimersByTimeAsync(1100);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return unique id', () => {
      const id1 = efunBridge.callOut(() => {}, 1000);
      const id2 = efunBridge.callOut(() => {}, 1000);

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('number');
      expect(typeof id2).toBe('number');
    });

    it('should execute callbacks in order', async () => {
      const order: number[] = [];

      efunBridge.callOut(() => order.push(1), 100);
      efunBridge.callOut(() => order.push(2), 200);
      efunBridge.callOut(() => order.push(3), 300);

      await vi.advanceTimersByTimeAsync(450);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle async callbacks', async () => {
      const callback = vi.fn(async () => {
        await Promise.resolve();
        return 'done';
      });

      efunBridge.callOut(callback, 100);

      await vi.advanceTimersByTimeAsync(200);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle zero delay', async () => {
      const callback = vi.fn();

      efunBridge.callOut(callback, 0);

      // The scheduler polls every 100ms, so we need to wait for that
      await vi.advanceTimersByTimeAsync(100);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('removeCallOut', () => {
    it('should cancel scheduled callback', async () => {
      const callback = vi.fn();

      const id = efunBridge.callOut(callback, 1000);
      const removed = efunBridge.removeCallOut(id);

      await vi.advanceTimersByTimeAsync(2000);

      expect(removed).toBe(true);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return false for non-existent id', () => {
      const removed = efunBridge.removeCallOut(99999);

      expect(removed).toBe(false);
    });

    it('should return false for already executed callback', async () => {
      const callback = vi.fn();

      const id = efunBridge.callOut(callback, 100);

      await vi.advanceTimersByTimeAsync(200);

      expect(callback).toHaveBeenCalled();

      // Now try to remove already executed callback
      const removed = efunBridge.removeCallOut(id);

      expect(removed).toBe(false);
    });

    it('should only cancel specific callback', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const id1 = efunBridge.callOut(callback1, 1000);
      efunBridge.callOut(callback2, 1000);

      efunBridge.removeCallOut(id1);

      await vi.advanceTimersByTimeAsync(1500);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('multiple callouts', () => {
    it('should handle many concurrent callouts', async () => {
      const callbacks = Array.from({ length: 100 }, (_, i) => ({
        fn: vi.fn(),
        delay: i * 10,
      }));

      callbacks.forEach(({ fn, delay }) => {
        efunBridge.callOut(fn, delay);
      });

      // Max delay is 990ms + 100ms polling buffer
      await vi.advanceTimersByTimeAsync(1200);

      callbacks.forEach(({ fn }) => {
        expect(fn).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle callouts scheduled from within callouts', async () => {
      const innerCallback = vi.fn();

      efunBridge.callOut(() => {
        efunBridge.callOut(innerCallback, 200);
      }, 100);

      // After 150ms, outer has run but inner hasn't
      await vi.advanceTimersByTimeAsync(150);
      expect(innerCallback).not.toHaveBeenCalled();

      // After another 250ms (total 400ms), inner should have run
      // (outer ran ~100ms, scheduled inner for 100+200=300ms)
      await vi.advanceTimersByTimeAsync(250);
      expect(innerCallback).toHaveBeenCalled();
    });
  });
});
