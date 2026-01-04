import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HotReload } from '../../src/driver/hot-reload.js';
import { ObjectRegistry, resetRegistry } from '../../src/driver/object-registry.js';
import { BaseMudObject } from '../../src/driver/base-object.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

class TestObject extends BaseMudObject {
  value: number = 0;
}

describe('HotReload', () => {
  let hotReload: HotReload;
  let registry: ObjectRegistry;
  let testDir: string;

  beforeEach(async () => {
    testDir = `./test-mudlib-hr-${randomUUID().slice(0, 8)}`;
    resetRegistry();
    registry = new ObjectRegistry();
    hotReload = new HotReload({ mudlibPath: testDir }, registry);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'std'), { recursive: true });
  });

  afterEach(async () => {
    hotReload.stopWatching();
    // Wait a bit for file handles to be released
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('update', () => {
    it('should compile and update an object', async () => {
      // Create a test file
      const filePath = join(testDir, 'std', 'test.ts');
      await writeFile(
        filePath,
        `
        export class TestObject {
          value: number = 42;
        }
      `
      );

      const result = await hotReload.update('/std/test');

      expect(result.success).toBe(true);
      expect(result.objectPath).toBe('/std/test');
    });

    it('should return error for compilation failure', async () => {
      const filePath = join(testDir, 'std', 'bad.ts');
      await writeFile(filePath, 'const x = ;');

      const result = await hotReload.update('/std/bad');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for non-existent file', async () => {
      const result = await hotReload.update('/std/nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should count clones to update', async () => {
      // Create a test file
      const filePath = join(testDir, 'std', 'item.ts');
      await writeFile(filePath, 'export class Item {}');

      // Register a blueprint with clones
      const blueprint = new TestObject();
      blueprint._setupAsBlueprint('/std/item');
      registry.registerBlueprint('/std/item', TestObject, blueprint);

      // Create some clones
      await registry.clone('/std/item');
      await registry.clone('/std/item');
      await registry.clone('/std/item');

      // Update
      const result = await hotReload.update('/std/item');

      expect(result.success).toBe(true);
      expect(result.clonesUpdated).toBe(3);
    });
  });

  describe('dependency tracking', () => {
    it('should track dependencies', () => {
      hotReload.trackDependencies('/std/sword', ['/std/item', '/std/weapon']);

      const deps = hotReload.getDependencies('/std/sword');

      expect(deps).toContain('/std/item');
      expect(deps).toContain('/std/weapon');
    });

    it('should track dependents', () => {
      hotReload.trackDependencies('/std/sword', ['/std/item']);
      hotReload.trackDependencies('/std/axe', ['/std/item']);

      const dependents = hotReload.getDependents('/std/item');

      expect(dependents).toContain('/std/sword');
      expect(dependents).toContain('/std/axe');
    });

    it('should update dependents when dependencies change', () => {
      hotReload.trackDependencies('/std/sword', ['/std/item']);
      hotReload.trackDependencies('/std/sword', ['/std/weapon']);

      const itemDependents = hotReload.getDependents('/std/item');
      const weaponDependents = hotReload.getDependents('/std/weapon');

      expect(itemDependents).not.toContain('/std/sword');
      expect(weaponDependents).toContain('/std/sword');
    });

    it('should return empty array for unknown objects', () => {
      const deps = hotReload.getDependencies('/unknown');
      const dependents = hotReload.getDependents('/unknown');

      expect(deps).toEqual([]);
      expect(dependents).toEqual([]);
    });
  });

  describe('updateWithDependents', () => {
    it('should update object and its dependents', async () => {
      // Create test files
      await writeFile(join(testDir, 'std', 'base.ts'), 'export class Base {}');
      await writeFile(join(testDir, 'std', 'child.ts'), 'export class Child {}');

      // Set up dependency
      hotReload.trackDependencies('/std/child', ['/std/base']);

      const results = await hotReload.updateWithDependents('/std/base');

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.objectPath)).toContain('/std/base');
      expect(results.map((r) => r.objectPath)).toContain('/std/child');
    });

    it('should stop if main update fails', async () => {
      // No file for base
      hotReload.trackDependencies('/std/child', ['/std/base']);

      const results = await hotReload.updateWithDependents('/std/base');

      expect(results).toHaveLength(1);
      expect(results[0]!.success).toBe(false);
    });
  });

  describe('file watching', () => {
    it('should start and stop watching', () => {
      expect(hotReload.isWatching).toBe(false);

      hotReload.startWatching();
      expect(hotReload.isWatching).toBe(true);

      hotReload.stopWatching();
      expect(hotReload.isWatching).toBe(false);
    });

    it('should not start watching twice', () => {
      hotReload.startWatching();
      hotReload.startWatching(); // Should not throw

      expect(hotReload.isWatching).toBe(true);
    });
  });

  describe('getCompiler', () => {
    it('should return the compiler instance', () => {
      const compiler = hotReload.getCompiler();

      expect(compiler).toBeDefined();
      expect(compiler.mudlibPath).toBe(testDir);
    });
  });
});
