import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EfunBridge, resetEfunBridge } from '../../src/driver/efun-bridge.js';
import { resetRegistry } from '../../src/driver/object-registry.js';
import { resetScheduler } from '../../src/driver/scheduler.js';
import { BaseMudObject } from '../../src/driver/base-object.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

describe('EfunBridge', () => {
  let efunBridge: EfunBridge;
  let testMudlibPath: string;

  beforeEach(async () => {
    resetRegistry();
    resetScheduler();
    resetEfunBridge();

    testMudlibPath = join(process.cwd(), `test-mudlib-${randomUUID()}`);
    await mkdir(testMudlibPath, { recursive: true });

    efunBridge = new EfunBridge({ mudlibPath: testMudlibPath });
  });

  afterEach(async () => {
    resetEfunBridge();
    resetScheduler();
    resetRegistry();

    try {
      await rm(testMudlibPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('context', () => {
    it('should set and get thisObject', () => {
      const obj = new BaseMudObject('/test/obj');

      efunBridge.setContext({ thisObject: obj });

      expect(efunBridge.thisObject()).toBe(obj);
    });

    it('should set and get thisPlayer', () => {
      const player = new BaseMudObject('/players/test');

      efunBridge.setContext({ thisPlayer: player });

      expect(efunBridge.thisPlayer()).toBe(player);
    });

    it('should clear context', () => {
      const obj = new BaseMudObject('/test/obj');
      efunBridge.setContext({ thisObject: obj, thisPlayer: obj });

      efunBridge.clearContext();

      expect(efunBridge.thisObject()).toBeNull();
      expect(efunBridge.thisPlayer()).toBeNull();
    });
  });

  describe('hierarchy efuns', () => {
    it('should get all inventory', () => {
      const container = new BaseMudObject('/room/test');
      const item1 = new BaseMudObject('/obj/item1');
      const item2 = new BaseMudObject('/obj/item2');

      item1.moveTo(container);
      item2.moveTo(container);

      const inventory = efunBridge.allInventory(container);

      expect(inventory).toHaveLength(2);
      expect(inventory).toContain(item1);
      expect(inventory).toContain(item2);
    });

    it('should get environment', () => {
      const room = new BaseMudObject('/room/test');
      const item = new BaseMudObject('/obj/item');

      item.moveTo(room);

      expect(efunBridge.environment(item)).toBe(room);
    });

    it('should move object', async () => {
      const room1 = new BaseMudObject('/room/test1');
      const room2 = new BaseMudObject('/room/test2');
      const item = new BaseMudObject('/obj/item');

      item.moveTo(room1);
      await efunBridge.move(item, room2);

      expect(efunBridge.environment(item)).toBe(room2);
    });
  });

  describe('player efuns', () => {
    it('should return empty array for allPlayers (not implemented)', () => {
      const players = efunBridge.allPlayers();

      expect(players).toEqual([]);
    });

    it('should call receive on send target', () => {
      const player = new BaseMudObject('/players/test') as BaseMudObject & {
        receive: (msg: string) => void;
        receivedMessages: string[];
      };
      player.receivedMessages = [];
      player.receive = (msg: string) => {
        player.receivedMessages.push(msg);
      };

      efunBridge.send(player, 'Hello, world!');

      expect(player.receivedMessages).toContain('Hello, world!');
    });

    it('should handle send to object without receive', () => {
      const obj = new BaseMudObject('/obj/test');

      // Should not throw
      expect(() => efunBridge.send(obj, 'test')).not.toThrow();
    });
  });

  describe('file efuns', () => {
    it('should read file', async () => {
      const testFile = join(testMudlibPath, 'test.txt');
      await writeFile(testFile, 'Hello, MUD!');

      const content = await efunBridge.readFile('/test.txt');

      expect(content).toBe('Hello, MUD!');
    });

    it('should write file', async () => {
      await efunBridge.writeFile('/output.txt', 'Test content');

      const content = await efunBridge.readFile('/output.txt');
      expect(content).toBe('Test content');
    });

    it('should create directories for write', async () => {
      await efunBridge.writeFile('/subdir/nested/file.txt', 'Nested content');

      const content = await efunBridge.readFile('/subdir/nested/file.txt');
      expect(content).toBe('Nested content');
    });

    it('should check file exists', async () => {
      await efunBridge.writeFile('/exists.txt', 'content');

      expect(await efunBridge.fileExists('/exists.txt')).toBe(true);
      expect(await efunBridge.fileExists('/notexists.txt')).toBe(false);
    });

    it('should read directory', async () => {
      await efunBridge.writeFile('/dir/file1.txt', 'a');
      await efunBridge.writeFile('/dir/file2.txt', 'b');

      const files = await efunBridge.readDir('/dir');

      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
    });

    it('should get file stat', async () => {
      await efunBridge.writeFile('/stattest.txt', 'content');

      const stat = await efunBridge.fileStat('/stattest.txt');

      expect(stat.isFile).toBe(true);
      expect(stat.isDirectory).toBe(false);
      expect(stat.size).toBe(7); // 'content'.length
      expect(stat.mtime).toBeInstanceOf(Date);
    });

    it('should prevent path traversal', async () => {
      await expect(efunBridge.readFile('../../../etc/passwd')).rejects.toThrow(
        'Path traversal attempt detected'
      );
    });

    it('should prevent path traversal with absolute paths', async () => {
      // Test with an absolute path that's outside mudlib
      await expect(efunBridge.readFile('C:\\Windows\\System32\\config\\sam')).rejects.toThrow(
        'Path traversal attempt detected'
      );
    });
  });

  describe('utility efuns', () => {
    it('should return current time in seconds', () => {
      const before = Math.floor(Date.now() / 1000);
      const time = efunBridge.time();
      const after = Math.floor(Date.now() / 1000);

      expect(time).toBeGreaterThanOrEqual(before);
      expect(time).toBeLessThanOrEqual(after);
    });

    it('should return current time in milliseconds', () => {
      const before = Date.now();
      const time = efunBridge.timeMs();
      const after = Date.now();

      expect(time).toBeGreaterThanOrEqual(before);
      expect(time).toBeLessThanOrEqual(after);
    });

    it('should generate random number', () => {
      const results = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const r = efunBridge.random(10);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(10);
        results.add(r);
      }
      // Should have some variety
      expect(results.size).toBeGreaterThan(1);
    });

    it('should capitalize string', () => {
      expect(efunBridge.capitalize('hello')).toBe('Hello');
      expect(efunBridge.capitalize('')).toBe('');
      expect(efunBridge.capitalize('HELLO')).toBe('HELLO');
    });

    it('should explode string', () => {
      expect(efunBridge.explode('a,b,c', ',')).toEqual(['a', 'b', 'c']);
      expect(efunBridge.explode('hello world', ' ')).toEqual(['hello', 'world']);
    });

    it('should implode array', () => {
      expect(efunBridge.implode(['a', 'b', 'c'], ',')).toBe('a,b,c');
      expect(efunBridge.implode(['hello', 'world'], ' ')).toBe('hello world');
    });

    it('should trim string', () => {
      expect(efunBridge.trim('  hello  ')).toBe('hello');
      expect(efunBridge.trim('\n\ttest\n')).toBe('test');
    });

    it('should convert to lowercase', () => {
      expect(efunBridge.lower('HELLO')).toBe('hello');
      expect(efunBridge.lower('MiXeD')).toBe('mixed');
    });

    it('should convert to uppercase', () => {
      expect(efunBridge.upper('hello')).toBe('HELLO');
      expect(efunBridge.upper('MiXeD')).toBe('MIXED');
    });
  });

  describe('getEfuns', () => {
    it('should return all efuns as an object', () => {
      const efuns = efunBridge.getEfuns();

      // Object efuns
      expect(typeof efuns.cloneObject).toBe('function');
      expect(typeof efuns.destruct).toBe('function');
      expect(typeof efuns.loadObject).toBe('function');
      expect(typeof efuns.findObject).toBe('function');

      // Hierarchy efuns
      expect(typeof efuns.allInventory).toBe('function');
      expect(typeof efuns.environment).toBe('function');
      expect(typeof efuns.move).toBe('function');

      // Player efuns
      expect(typeof efuns.thisObject).toBe('function');
      expect(typeof efuns.thisPlayer).toBe('function');
      expect(typeof efuns.allPlayers).toBe('function');
      expect(typeof efuns.send).toBe('function');

      // File efuns
      expect(typeof efuns.readFile).toBe('function');
      expect(typeof efuns.writeFile).toBe('function');
      expect(typeof efuns.fileExists).toBe('function');
      expect(typeof efuns.readDir).toBe('function');
      expect(typeof efuns.fileStat).toBe('function');

      // Utility efuns
      expect(typeof efuns.time).toBe('function');
      expect(typeof efuns.timeMs).toBe('function');
      expect(typeof efuns.random).toBe('function');
      expect(typeof efuns.capitalize).toBe('function');
      expect(typeof efuns.explode).toBe('function');
      expect(typeof efuns.implode).toBe('function');
      expect(typeof efuns.trim).toBe('function');
      expect(typeof efuns.lower).toBe('function');
      expect(typeof efuns.upper).toBe('function');

      // Scheduler efuns
      expect(typeof efuns.setHeartbeat).toBe('function');
      expect(typeof efuns.callOut).toBe('function');
      expect(typeof efuns.removeCallOut).toBe('function');
    });
  });
});
