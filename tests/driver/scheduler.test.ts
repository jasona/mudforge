import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Scheduler, resetScheduler } from '../../src/driver/scheduler.js';
import { BaseMudObject } from '../../src/driver/base-object.js';

class TestObject extends BaseMudObject {
  heartbeatCount = 0;

  heartbeat(): void {
    this.heartbeatCount++;
  }
}

describe('Scheduler', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    resetScheduler();
    scheduler = new Scheduler({ heartbeatIntervalMs: 100 });
  });

  afterEach(() => {
    scheduler.stop();
    scheduler.clear();
  });

  describe('heartbeat', () => {
    it('should register an object for heartbeat', () => {
      const obj = new TestObject();

      scheduler.setHeartbeat(obj, true);

      expect(scheduler.hasHeartbeat(obj)).toBe(true);
      expect(scheduler.heartbeatCount).toBe(1);
    });

    it('should unregister an object from heartbeat', () => {
      const obj = new TestObject();
      scheduler.setHeartbeat(obj, true);

      scheduler.setHeartbeat(obj, false);

      expect(scheduler.hasHeartbeat(obj)).toBe(false);
      expect(scheduler.heartbeatCount).toBe(0);
    });

    it('should call heartbeat on registered objects', async () => {
      const obj = new TestObject();
      scheduler.setHeartbeat(obj, true);
      scheduler.start();

      // Wait for heartbeat to trigger
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(obj.heartbeatCount).toBeGreaterThan(0);
    });

    it('should continue on heartbeat errors', async () => {
      const obj1 = new TestObject();
      const obj2 = new TestObject();

      // Make obj1's heartbeat throw
      obj1.heartbeat = () => {
        throw new Error('test error');
      };

      scheduler.setHeartbeat(obj1, true);
      scheduler.setHeartbeat(obj2, true);
      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(obj2.heartbeatCount).toBeGreaterThan(0);
    });
  });

  describe('callOut', () => {
    it('should schedule a callback', () => {
      const callback = vi.fn();

      const id = scheduler.callOut(callback, 1000);

      expect(id).toBe(1);
      expect(scheduler.callOutCount).toBe(1);
    });

    it('should execute callback after delay', async () => {
      const callback = vi.fn();
      scheduler.callOut(callback, 50);
      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalled();
    });

    it('should remove one-time callOut after execution', async () => {
      const callback = vi.fn();
      scheduler.callOut(callback, 50);
      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(scheduler.callOutCount).toBe(0);
    });

    it('should handle recurring callOuts', async () => {
      const callback = vi.fn();
      scheduler.callOutRepeat(callback, 50);
      scheduler.start();

      // Scheduler checks every 100ms, so wait long enough for multiple checks
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Should have been called multiple times
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(scheduler.callOutCount).toBe(1); // Still registered
    });
  });

  describe('removeCallOut', () => {
    it('should cancel a scheduled callOut', async () => {
      const callback = vi.fn();
      const id = scheduler.callOut(callback, 50);
      scheduler.start();

      scheduler.removeCallOut(id);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should return false for non-existent callOut', () => {
      const result = scheduler.removeCallOut(999);

      expect(result).toBe(false);
    });

    it('should return true when callOut is cancelled', () => {
      const id = scheduler.callOut(() => {}, 1000);

      const result = scheduler.removeCallOut(id);

      expect(result).toBe(true);
    });
  });

  describe('getCallOut', () => {
    it('should return callOut info', () => {
      const callback = () => {};
      const id = scheduler.callOut(callback, 1000);

      const info = scheduler.getCallOut(id);

      expect(info).toBeDefined();
      expect(info!.id).toBe(id);
      expect(info!.callback).toBe(callback);
      expect(info!.recurring).toBe(false);
    });

    it('should return undefined for non-existent callOut', () => {
      const info = scheduler.getCallOut(999);

      expect(info).toBeUndefined();
    });
  });

  describe('start/stop', () => {
    it('should start the scheduler', () => {
      expect(scheduler.isRunning).toBe(false);

      scheduler.start();

      expect(scheduler.isRunning).toBe(true);
    });

    it('should stop the scheduler', () => {
      scheduler.start();

      scheduler.stop();

      expect(scheduler.isRunning).toBe(false);
    });

    it('should not double-start', () => {
      scheduler.start();
      scheduler.start(); // Should not throw

      expect(scheduler.isRunning).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all heartbeats and callOuts', () => {
      const obj = new TestObject();
      scheduler.setHeartbeat(obj, true);
      scheduler.callOut(() => {}, 1000);

      scheduler.clear();

      expect(scheduler.heartbeatCount).toBe(0);
      expect(scheduler.callOutCount).toBe(0);
    });
  });
});
