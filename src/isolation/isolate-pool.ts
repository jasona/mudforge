/**
 * IsolatePool - Manages a pool of V8 isolates for sandboxed script execution.
 *
 * Each isolate is a separate V8 instance with its own heap and execution context.
 * Isolates are reused for performance but are fully isolated from each other.
 */

import ivm from 'isolated-vm';

export interface IsolatePoolConfig {
  /** Maximum number of isolates in the pool */
  maxIsolates: number;
  /** Memory limit per isolate in MB */
  memoryLimitMb: number;
}

export interface PooledIsolate {
  /** The V8 isolate */
  isolate: ivm.Isolate;
  /** Whether this isolate is currently in use */
  inUse: boolean;
  /** When this isolate was created */
  createdAt: Date;
  /** Number of scripts executed in this isolate */
  executionCount: number;
}

/**
 * Manages a pool of V8 isolates for efficient script execution.
 */
export class IsolatePool {
  private config: IsolatePoolConfig;
  private isolates: PooledIsolate[] = [];
  private disposed: boolean = false;

  constructor(config: Partial<IsolatePoolConfig> = {}) {
    this.config = {
      maxIsolates: config.maxIsolates ?? 4,
      memoryLimitMb: config.memoryLimitMb ?? 128,
    };
  }

  /**
   * Acquire an isolate from the pool.
   * Creates a new one if needed and pool is not full.
   * Waits if pool is full and all isolates are in use.
   */
  async acquire(): Promise<PooledIsolate> {
    if (this.disposed) {
      throw new Error('IsolatePool has been disposed');
    }

    // Try to find an available isolate
    const available = this.isolates.find((pi) => !pi.inUse);
    if (available) {
      available.inUse = true;
      return available;
    }

    // Create new isolate if pool not full
    if (this.isolates.length < this.config.maxIsolates) {
      const pooledIsolate = this.createIsolate();
      pooledIsolate.inUse = true;
      this.isolates.push(pooledIsolate);
      return pooledIsolate;
    }

    // Pool is full, wait for an isolate to become available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.isolates.find((pi) => !pi.inUse);
        if (available) {
          clearInterval(checkInterval);
          available.inUse = true;
          resolve(available);
        }
      }, 10);
    });
  }

  /**
   * Release an isolate back to the pool.
   */
  release(pooledIsolate: PooledIsolate): void {
    pooledIsolate.inUse = false;
    pooledIsolate.executionCount++;
  }

  /**
   * Create a new isolate with configured memory limit.
   */
  private createIsolate(): PooledIsolate {
    const isolate = new ivm.Isolate({
      memoryLimit: this.config.memoryLimitMb,
    });

    return {
      isolate,
      inUse: false,
      createdAt: new Date(),
      executionCount: 0,
    };
  }

  /**
   * Get current pool statistics.
   */
  getStats(): {
    total: number;
    inUse: number;
    available: number;
    maxIsolates: number;
    memoryLimitMb: number;
  } {
    const inUse = this.isolates.filter((pi) => pi.inUse).length;
    return {
      total: this.isolates.length,
      inUse,
      available: this.isolates.length - inUse,
      maxIsolates: this.config.maxIsolates,
      memoryLimitMb: this.config.memoryLimitMb,
    };
  }

  /**
   * Dispose all isolates in the pool.
   */
  dispose(): void {
    this.disposed = true;
    for (const pooledIsolate of this.isolates) {
      pooledIsolate.isolate.dispose();
    }
    this.isolates = [];
  }

  /**
   * Check if the pool has been disposed.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }
}

// Singleton instance
let poolInstance: IsolatePool | null = null;

/**
 * Get the global IsolatePool instance.
 */
export function getIsolatePool(config?: Partial<IsolatePoolConfig>): IsolatePool {
  if (!poolInstance || poolInstance.isDisposed) {
    poolInstance = new IsolatePool(config);
  }
  return poolInstance;
}

/**
 * Reset the global pool. Used for testing.
 */
export function resetIsolatePool(): void {
  if (poolInstance) {
    poolInstance.dispose();
  }
  poolInstance = null;
}
