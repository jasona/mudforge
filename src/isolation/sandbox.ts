/**
 * Sandbox - Sets up a restricted execution environment within an isolate.
 *
 * Provides controlled access to driver APIs (efuns) while preventing
 * access to Node.js internals and the host system.
 */

import ivm from 'isolated-vm';
import { getLogger } from '../driver/logger.js';

const logger = getLogger();

export interface ExposedFunction {
  /** The function name to expose in the sandbox */
  name: string;
  /** The actual function implementation (runs in host) */
  implementation: (...args: unknown[]) => unknown | Promise<unknown>;
  /** Whether the function is async */
  async?: boolean;
}

/**
 * Creates a sandboxed execution environment within an isolate.
 */
export class Sandbox {
  private isolate: ivm.Isolate;
  private context: ivm.Context | null = null;
  private exposedFunctions: Map<string, ExposedFunction> = new Map();

  constructor(isolate: ivm.Isolate) {
    this.isolate = isolate;
  }

  /**
   * Initialize the sandbox context.
   */
  async initialize(): Promise<void> {
    // Create a new context within the isolate
    this.context = await this.isolate.createContext();

    // Get the global object
    const jail = this.context.global;

    // Set up the global object reference
    await jail.set('global', jail.derefInto());

    // Set up console (safe subset)
    await this.setupConsole(jail);

    // Expose all registered functions
    for (const [name, func] of this.exposedFunctions) {
      await this.exposeFunction(jail, name, func);
    }
  }

  /**
   * Set up a safe console object.
   */
  private async setupConsole(jail: ivm.Reference<Record<string, unknown>>): Promise<void> {
    const consoleObj: Record<string, unknown> = {};

    // Create log function that captures output
    const createLogFn = (level: string) => {
      return new ivm.Callback((...args: unknown[]) => {
        const message = args.map((a) => String(a)).join(' ');
        logger.debug({ sandboxLevel: level }, message);
      });
    };

    consoleObj['log'] = createLogFn('log');
    consoleObj['info'] = createLogFn('info');
    consoleObj['warn'] = createLogFn('warn');
    consoleObj['error'] = createLogFn('error');
    consoleObj['debug'] = createLogFn('debug');

    await jail.set('console', consoleObj, { copy: true });
  }

  /**
   * Register a function to be exposed in the sandbox.
   * Must be called before initialize().
   */
  registerFunction(func: ExposedFunction): void {
    this.exposedFunctions.set(func.name, func);
  }

  /**
   * Expose a function to the sandbox.
   */
  private async exposeFunction(
    jail: ivm.Reference<Record<string, unknown>>,
    name: string,
    func: ExposedFunction
  ): Promise<void> {
    if (func.async) {
      // For async functions, we need to use a Reference callback
      const callback = new ivm.Reference(async (...args: unknown[]) => {
        return await func.implementation(...args);
      });
      await jail.set(name, callback);
    } else {
      // For sync functions, use Callback
      const callback = new ivm.Callback((...args: unknown[]) => {
        return func.implementation(...args);
      });
      await jail.set(name, callback);
    }
  }

  /**
   * Get the sandbox context.
   */
  getContext(): ivm.Context {
    if (!this.context) {
      throw new Error('Sandbox not initialized. Call initialize() first.');
    }
    return this.context;
  }

  /**
   * Clean up the sandbox.
   */
  dispose(): void {
    if (this.context) {
      this.context.release();
      this.context = null;
    }
  }
}
