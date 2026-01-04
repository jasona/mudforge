/**
 * ScriptRunner - Executes scripts in a sandboxed environment with resource limits.
 *
 * Handles compilation, execution, timeout enforcement, and error capture.
 */

import ivm from 'isolated-vm';
import { IsolatePool, getIsolatePool, type PooledIsolate } from './isolate-pool.js';
import { Sandbox, type ExposedFunction } from './sandbox.js';

export interface ScriptRunnerConfig {
  /** Default timeout for script execution in milliseconds */
  defaultTimeoutMs: number;
  /** Memory limit for isolates in MB */
  memoryLimitMb: number;
  /** Maximum number of isolates in the pool */
  maxIsolates: number;
}

export interface ExecutionResult<T = unknown> {
  /** Whether execution succeeded */
  success: boolean;
  /** The return value (if success) */
  value?: T | undefined;
  /** Error message (if failed) */
  error?: string | undefined;
  /** Error type/name */
  errorType?: string | undefined;
  /** Stack trace (if available) */
  stack?: string | undefined;
  /** Execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Runs scripts in isolated V8 environments with resource limits.
 */
export class ScriptRunner {
  private config: ScriptRunnerConfig;
  private pool: IsolatePool;
  private exposedFunctions: ExposedFunction[] = [];

  constructor(config: Partial<ScriptRunnerConfig> = {}) {
    this.config = {
      defaultTimeoutMs: config.defaultTimeoutMs ?? 5000,
      memoryLimitMb: config.memoryLimitMb ?? 128,
      maxIsolates: config.maxIsolates ?? 4,
    };

    this.pool = getIsolatePool({
      maxIsolates: this.config.maxIsolates,
      memoryLimitMb: this.config.memoryLimitMb,
    });
  }

  /**
   * Register a function to be exposed in all sandboxes.
   */
  registerFunction(func: ExposedFunction): void {
    this.exposedFunctions.push(func);
  }

  /**
   * Execute a script in a sandboxed environment.
   * @param code The JavaScript code to execute
   * @param timeoutMs Optional timeout (uses default if not specified)
   */
  async run<T = unknown>(code: string, timeoutMs?: number): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    const timeout = timeoutMs ?? this.config.defaultTimeoutMs;

    let pooledIsolate: PooledIsolate | null = null;
    let sandbox: Sandbox | null = null;

    try {
      // Acquire an isolate from the pool
      pooledIsolate = await this.pool.acquire();

      // Create sandbox
      sandbox = new Sandbox(pooledIsolate.isolate);

      // Register all exposed functions
      for (const func of this.exposedFunctions) {
        sandbox.registerFunction(func);
      }

      // Initialize the sandbox
      await sandbox.initialize();

      // Compile the script
      const script = await pooledIsolate.isolate.compileScript(code);

      // Execute with timeout
      const result = await script.run(sandbox.getContext(), {
        timeout,
      });

      // Get the result value
      const value = result !== undefined ? (result as T) : undefined;

      return {
        success: true,
        value,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleError<T>(error, startTime);
    } finally {
      // Clean up
      if (sandbox) {
        sandbox.dispose();
      }
      if (pooledIsolate) {
        this.pool.release(pooledIsolate);
      }
    }
  }

  /**
   * Execute a compiled module.
   * @param code The JavaScript module code
   * @param exportName The export to call
   * @param args Arguments to pass
   * @param timeoutMs Optional timeout
   */
  async runModule<T = unknown>(
    code: string,
    exportName: string,
    args: unknown[] = [],
    timeoutMs?: number
  ): Promise<ExecutionResult<T>> {
    // Wrap in module execution pattern
    const wrappedCode = `
      ${code}

      // Call the exported function
      (async () => {
        if (typeof ${exportName} === 'function') {
          return await ${exportName}(...${JSON.stringify(args)});
        }
        throw new Error('Export "${exportName}" is not a function');
      })();
    `;

    return this.run<T>(wrappedCode, timeoutMs);
  }

  /**
   * Handle execution errors.
   */
  private handleError<T>(error: unknown, startTime: number): ExecutionResult<T> {
    const executionTimeMs = Date.now() - startTime;

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Script execution timed out')) {
        return {
          success: false,
          error: 'Script execution timed out',
          errorType: 'TimeoutError',
          executionTimeMs,
        };
      }

      if (error.message.includes('Isolate was disposed')) {
        return {
          success: false,
          error: 'Memory limit exceeded',
          errorType: 'MemoryError',
          executionTimeMs,
        };
      }

      return {
        success: false,
        error: error.message,
        errorType: error.name,
        stack: error.stack,
        executionTimeMs,
      };
    }

    return {
      success: false,
      error: String(error),
      errorType: 'UnknownError',
      executionTimeMs,
    };
  }

  /**
   * Get pool statistics.
   */
  getStats(): ReturnType<IsolatePool['getStats']> {
    return this.pool.getStats();
  }

  /**
   * Dispose the script runner and its pool.
   */
  dispose(): void {
    this.pool.dispose();
  }
}

// Singleton instance
let runnerInstance: ScriptRunner | null = null;

/**
 * Get the global ScriptRunner instance.
 */
export function getScriptRunner(config?: Partial<ScriptRunnerConfig>): ScriptRunner {
  if (!runnerInstance) {
    runnerInstance = new ScriptRunner(config);
  }
  return runnerInstance;
}

/**
 * Reset the global runner. Used for testing.
 */
export function resetScriptRunner(): void {
  if (runnerInstance) {
    runnerInstance.dispose();
  }
  runnerInstance = null;
}
