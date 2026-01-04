import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IsolatePool, resetIsolatePool } from '../../src/isolation/isolate-pool.js';

describe('IsolatePool', () => {
  let pool: IsolatePool;

  beforeEach(() => {
    resetIsolatePool();
    pool = new IsolatePool({ maxIsolates: 2, memoryLimitMb: 64 });
  });

  afterEach(() => {
    pool.dispose();
  });

  describe('acquire', () => {
    it('should acquire an isolate', async () => {
      const pooledIsolate = await pool.acquire();

      expect(pooledIsolate).toBeDefined();
      expect(pooledIsolate.isolate).toBeDefined();
      expect(pooledIsolate.inUse).toBe(true);
    });

    it('should create new isolate if pool is empty', async () => {
      const stats1 = pool.getStats();
      expect(stats1.total).toBe(0);

      await pool.acquire();

      const stats2 = pool.getStats();
      expect(stats2.total).toBe(1);
    });

    it('should reuse released isolate', async () => {
      const isolate1 = await pool.acquire();
      pool.release(isolate1);

      const isolate2 = await pool.acquire();

      expect(isolate2).toBe(isolate1);
      expect(pool.getStats().total).toBe(1);
    });

    it('should create multiple isolates up to max', async () => {
      const isolate1 = await pool.acquire();
      const isolate2 = await pool.acquire();

      expect(isolate1).not.toBe(isolate2);
      expect(pool.getStats().total).toBe(2);
    });

    it('should throw if pool is disposed', async () => {
      pool.dispose();

      await expect(pool.acquire()).rejects.toThrow('IsolatePool has been disposed');
    });
  });

  describe('release', () => {
    it('should mark isolate as not in use', async () => {
      const pooledIsolate = await pool.acquire();
      expect(pooledIsolate.inUse).toBe(true);

      pool.release(pooledIsolate);

      expect(pooledIsolate.inUse).toBe(false);
    });

    it('should increment execution count', async () => {
      const pooledIsolate = await pool.acquire();
      expect(pooledIsolate.executionCount).toBe(0);

      pool.release(pooledIsolate);

      expect(pooledIsolate.executionCount).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      const stats1 = pool.getStats();
      expect(stats1.total).toBe(0);
      expect(stats1.inUse).toBe(0);
      expect(stats1.available).toBe(0);
      expect(stats1.maxIsolates).toBe(2);
      expect(stats1.memoryLimitMb).toBe(64);

      const isolate1 = await pool.acquire();
      await pool.acquire();

      const stats2 = pool.getStats();
      expect(stats2.total).toBe(2);
      expect(stats2.inUse).toBe(2);
      expect(stats2.available).toBe(0);

      pool.release(isolate1);

      const stats3 = pool.getStats();
      expect(stats3.inUse).toBe(1);
      expect(stats3.available).toBe(1);
    });
  });

  describe('dispose', () => {
    it('should dispose all isolates', async () => {
      await pool.acquire();
      await pool.acquire();

      pool.dispose();

      expect(pool.isDisposed).toBe(true);
      expect(pool.getStats().total).toBe(0);
    });

    it('should set disposed flag', () => {
      expect(pool.isDisposed).toBe(false);

      pool.dispose();

      expect(pool.isDisposed).toBe(true);
    });
  });
});
