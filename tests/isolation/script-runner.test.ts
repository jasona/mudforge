import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScriptRunner, resetScriptRunner } from '../../src/isolation/script-runner.js';
import { resetIsolatePool } from '../../src/isolation/isolate-pool.js';

describe('ScriptRunner', () => {
  let runner: ScriptRunner;

  beforeEach(() => {
    resetScriptRunner();
    resetIsolatePool();
    runner = new ScriptRunner({
      defaultTimeoutMs: 1000,
      memoryLimitMb: 64,
      maxIsolates: 2,
    });
  });

  afterEach(() => {
    runner.dispose();
  });

  describe('basic execution', () => {
    it('should execute simple expressions', async () => {
      const result = await runner.run<number>('1 + 1');

      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    it('should execute multi-line code', async () => {
      const result = await runner.run<number>(`
        const a = 5;
        const b = 10;
        a + b;
      `);

      expect(result.success).toBe(true);
      expect(result.value).toBe(15);
    });

    it('should return undefined for statements', async () => {
      const result = await runner.run('const x = 5;');

      expect(result.success).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it('should handle string results', async () => {
      const result = await runner.run<string>('"hello" + " world"');

      expect(result.success).toBe(true);
      expect(result.value).toBe('hello world');
    });

    it('should record execution time', async () => {
      const result = await runner.run('1 + 1');

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should catch syntax errors', async () => {
      const result = await runner.run('const x = ;');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errorType).toBe('SyntaxError');
    });

    it('should catch runtime errors', async () => {
      const result = await runner.run('throw new Error("test error");');

      expect(result.success).toBe(false);
      expect(result.error).toContain('test error');
    });

    it('should catch reference errors', async () => {
      const result = await runner.run('undefinedVariable.foo');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('ReferenceError');
    });

    it('should catch type errors', async () => {
      const result = await runner.run('null.foo');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('TypeError');
    });

    it('should not crash the driver on script errors', async () => {
      // Execute a bad script
      await runner.run('throw new Error("crash");');

      // Runner should still work
      const result = await runner.run<number>('1 + 1');
      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });
  });

  describe('timeout enforcement', () => {
    it('should timeout long-running scripts', async () => {
      const result = await runner.run('while(true) {}', 100);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('TimeoutError');
      expect(result.error).toContain('timed out');
    });

    it('should complete fast scripts within timeout', async () => {
      const result = await runner.run<number>('1 + 1', 1000);

      expect(result.success).toBe(true);
      expect(result.value).toBe(2);
    });

    it('should use default timeout if not specified', async () => {
      // Runner was created with 1000ms default timeout
      // This tight loop should timeout
      const result = await runner.run('while(true) {}');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('TimeoutError');
    });
  });

  describe('isolation', () => {
    it('should not have access to Node.js globals', async () => {
      const result = await runner.run('typeof require');

      expect(result.success).toBe(true);
      expect(result.value).toBe('undefined');
    });

    it('should not have access to process', async () => {
      const result = await runner.run('typeof process');

      expect(result.success).toBe(true);
      expect(result.value).toBe('undefined');
    });

    it('should not have access to __dirname', async () => {
      const result = await runner.run('typeof __dirname');

      expect(result.success).toBe(true);
      expect(result.value).toBe('undefined');
    });

    it('should have access to console', async () => {
      const result = await runner.run('typeof console.log');

      expect(result.success).toBe(true);
      expect(result.value).toBe('function');
    });

    it('should isolate variables between runs', async () => {
      await runner.run('var x = 42;');
      const result = await runner.run('typeof x');

      expect(result.success).toBe(true);
      expect(result.value).toBe('undefined');
    });
  });

  describe('exposed functions', () => {
    it('should call exposed sync function', async () => {
      let called = false;
      runner.registerFunction({
        name: 'testFn',
        implementation: () => {
          called = true;
          return 'success';
        },
      });

      const result = await runner.run<string>('testFn()');

      expect(called).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should pass arguments to exposed function', async () => {
      let receivedArgs: unknown[] = [];
      runner.registerFunction({
        name: 'captureArgs',
        implementation: (...args: unknown[]) => {
          receivedArgs = args;
          return args.length;
        },
      });

      const result = await runner.run<number>('captureArgs(1, 2, 3)');

      expect(result.success).toBe(true);
      expect(result.value).toBe(3);
      expect(receivedArgs).toEqual([1, 2, 3]);
    });
  });

  describe('getStats', () => {
    it('should return pool stats', async () => {
      await runner.run('1 + 1');

      const stats = runner.getStats();

      expect(stats.total).toBeGreaterThanOrEqual(1);
      expect(stats.maxIsolates).toBe(2);
      expect(stats.memoryLimitMb).toBe(64);
    });
  });

  describe('multiple executions', () => {
    it('should handle sequential executions', async () => {
      const results = await Promise.all([
        runner.run<number>('1'),
        runner.run<number>('2'),
        runner.run<number>('3'),
      ]);

      expect(results[0]!.value).toBe(1);
      expect(results[1]!.value).toBe(2);
      expect(results[2]!.value).toBe(3);
    });

    it('should recover from errors between executions', async () => {
      await runner.run('throw new Error("fail")');
      const result = await runner.run<number>('42');

      expect(result.success).toBe(true);
      expect(result.value).toBe(42);
    });
  });
});
