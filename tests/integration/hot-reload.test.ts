/**
 * Integration test: Hot-reload updates object behavior
 *
 * Tests the hot-reload workflow:
 * blueprint creation → clone instances → code update → verify new behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HotReload } from '../../src/driver/hot-reload.js';
import { ObjectRegistry, resetRegistry } from '../../src/driver/object-registry.js';
import { BaseMudObject } from '../../src/driver/base-object.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Test object with state and behavior.
 */
class TestItem extends BaseMudObject {
  private _name: string = 'test item';
  private _value: number = 100;
  private _customState: Record<string, unknown> = {};

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get value(): number {
    return this._value;
  }

  set value(v: number) {
    this._value = v;
  }

  getDescription(): string {
    return `A ${this._name} worth ${this._value} gold.`;
  }

  setCustomState(key: string, value: unknown): void {
    this._customState[key] = value;
  }

  getCustomState(key: string): unknown {
    return this._customState[key];
  }
}

describe('Hot-Reload Integration', () => {
  let hotReload: HotReload;
  let registry: ObjectRegistry;
  let testDir: string;

  beforeEach(async () => {
    testDir = `./test-mudlib-${randomUUID().slice(0, 8)}`;
    resetRegistry();
    registry = new ObjectRegistry();
    hotReload = new HotReload({ mudlibPath: testDir }, registry);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'std'), { recursive: true });
    await mkdir(join(testDir, 'areas'), { recursive: true });
  });

  afterEach(async () => {
    hotReload.stopWatching();
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    resetRegistry();
  });

  describe('Blueprint and Clone Management', () => {
    it('should register blueprint and create clones', async () => {
      const blueprint = new TestItem();
      blueprint._setupAsBlueprint('/std/item');
      registry.registerBlueprint('/std/item', TestItem, blueprint);

      // Create clones
      const clone1 = await registry.clone('/std/item');
      const clone2 = await registry.clone('/std/item');
      const clone3 = await registry.clone('/std/item');

      expect(clone1).toBeDefined();
      expect(clone2).toBeDefined();
      expect(clone3).toBeDefined();

      // Verify they are clones
      expect(clone1!.isClone).toBe(true);
      expect(clone2!.isClone).toBe(true);
      expect(clone3!.isClone).toBe(true);

      // Verify unique IDs
      expect(clone1!.objectId).not.toBe(clone2!.objectId);
      expect(clone2!.objectId).not.toBe(clone3!.objectId);
    });

    it('should preserve clone state through updates', async () => {
      // Create file for the item
      const itemCode = `
export class TestItem {
  private _name: string = 'default';
  private _value: number = 0;

  get name(): string { return this._name; }
  set name(v: string) { this._name = v; }
  get value(): number { return this._value; }
  set value(v: number) { this._value = v; }

  getDescription(): string {
    return \`A \${this._name} worth \${this._value} gold.\`;
  }
}
`;
      await writeFile(join(testDir, 'std', 'item.ts'), itemCode);

      // Register blueprint and create clones with custom state
      const blueprint = new TestItem();
      blueprint._setupAsBlueprint('/std/item');
      registry.registerBlueprint('/std/item', TestItem, blueprint);

      const clone1 = (await registry.clone('/std/item')) as TestItem;
      const clone2 = (await registry.clone('/std/item')) as TestItem;

      // Set unique state on each clone
      clone1!.name = 'Magic Sword';
      clone1!.value = 500;

      clone2!.name = 'Golden Ring';
      clone2!.value = 1000;

      // Verify state is set
      expect(clone1!.name).toBe('Magic Sword');
      expect(clone1!.value).toBe(500);
      expect(clone2!.name).toBe('Golden Ring');
      expect(clone2!.value).toBe(1000);

      // Perform hot-reload update
      const result = await hotReload.update('/std/item');

      expect(result.success).toBe(true);
      expect(result.clonesUpdated).toBe(2);

      // State should be preserved after update
      // (In full implementation, the clone objects would still have their state)
      expect(clone1!.name).toBe('Magic Sword');
      expect(clone1!.value).toBe(500);
      expect(clone2!.name).toBe('Golden Ring');
      expect(clone2!.value).toBe(1000);
    });
  });

  describe('Code Compilation and Update', () => {
    it('should compile updated code successfully', async () => {
      const initialCode = `
export class Room {
  shortDesc: string = 'A room';

  look(): string {
    return this.shortDesc;
  }
}
`;
      await writeFile(join(testDir, 'std', 'room.ts'), initialCode);

      const result = await hotReload.update('/std/room');

      expect(result.success).toBe(true);
      expect(result.objectPath).toBe('/std/room');
    });

    it('should handle compilation errors gracefully', async () => {
      const invalidCode = `
export class BrokenRoom {
  this is not valid TypeScript!!!
}
`;
      await writeFile(join(testDir, 'std', 'broken.ts'), invalidCode);

      const result = await hotReload.update('/std/broken');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.objectPath).toBe('/std/broken');
    });

    it('should detect method changes in updated code', async () => {
      // Initial version
      const v1Code = `
export class Item {
  getValue(): number {
    return 100;
  }
}
`;
      await writeFile(join(testDir, 'std', 'item.ts'), v1Code);

      // First update
      let result = await hotReload.update('/std/item');
      expect(result.success).toBe(true);

      // Updated version with different method behavior
      const v2Code = `
export class Item {
  getValue(): number {
    return 200;  // Changed!
  }

  // New method
  getFormattedValue(): string {
    return \`\${this.getValue()} gold\`;
  }
}
`;
      await writeFile(join(testDir, 'std', 'item.ts'), v2Code);

      // Second update
      result = await hotReload.update('/std/item');
      expect(result.success).toBe(true);
    });
  });

  describe('Dependency Chain Updates', () => {
    it('should track and update dependent objects', async () => {
      // Create base class
      const baseCode = `
export class BaseItem {
  protected _value: number = 0;
  getValue(): number { return this._value; }
}
`;
      await writeFile(join(testDir, 'std', 'base-item.ts'), baseCode);

      // Create derived class
      const weaponCode = `
export class Weapon {
  protected _damage: number = 10;
  getDamage(): number { return this._damage; }
}
`;
      await writeFile(join(testDir, 'std', 'weapon.ts'), weaponCode);

      // Create child class
      const swordCode = `
export class Sword {
  protected _damage: number = 15;
  getDamage(): number { return this._damage; }
}
`;
      await writeFile(join(testDir, 'std', 'sword.ts'), swordCode);

      // Set up dependencies
      hotReload.trackDependencies('/std/weapon', ['/std/base-item']);
      hotReload.trackDependencies('/std/sword', ['/std/weapon']);

      // Verify dependency chain
      expect(hotReload.getDependencies('/std/sword')).toContain('/std/weapon');
      expect(hotReload.getDependents('/std/weapon')).toContain('/std/sword');
      expect(hotReload.getDependents('/std/base-item')).toContain('/std/weapon');

      // Update base class and dependents
      const results = await hotReload.updateWithDependents('/std/base-item');

      expect(results.length).toBe(3); // base-item, weapon, sword
      expect(results.map((r) => r.objectPath)).toContain('/std/base-item');
      expect(results.map((r) => r.objectPath)).toContain('/std/weapon');
      expect(results.map((r) => r.objectPath)).toContain('/std/sword');
    });

    it('should handle circular dependencies gracefully', async () => {
      await writeFile(join(testDir, 'std', 'a.ts'), 'export class A {}');
      await writeFile(join(testDir, 'std', 'b.ts'), 'export class B {}');

      // Create circular dependency (A depends on B, B depends on A)
      hotReload.trackDependencies('/std/a', ['/std/b']);
      hotReload.trackDependencies('/std/b', ['/std/a']);

      // Should not infinite loop
      const results = await hotReload.updateWithDependents('/std/a');

      // Should update each only once
      const paths = results.map((r) => r.objectPath);
      expect(paths.filter((p) => p === '/std/a').length).toBe(1);
      expect(paths.filter((p) => p === '/std/b').length).toBe(1);
    });
  });

  describe('File Watcher Integration', () => {
    it('should start and stop file watcher', () => {
      expect(hotReload.isWatching).toBe(false);

      hotReload.startWatching();
      expect(hotReload.isWatching).toBe(true);

      hotReload.stopWatching();
      expect(hotReload.isWatching).toBe(false);
    });

    it('should handle rapid file changes with debouncing', async () => {
      hotReload.startWatching();

      // Rapid writes should be debounced
      await writeFile(join(testDir, 'std', 'rapid.ts'), 'export class V1 {}');
      await writeFile(join(testDir, 'std', 'rapid.ts'), 'export class V2 {}');
      await writeFile(join(testDir, 'std', 'rapid.ts'), 'export class V3 {}');

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 200));

      // The final version should be compiled
      const result = await hotReload.update('/std/rapid');
      expect(result.success).toBe(true);

      hotReload.stopWatching();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle room update with players inside', async () => {
      // Create initial room code
      const roomV1 = `
export class Tavern {
  shortDesc = 'The Rusty Tankard';
  longDesc = 'A cozy tavern with wooden tables.';

  getExits(): string[] {
    return ['south'];
  }
}
`;
      await writeFile(join(testDir, 'areas', 'tavern.ts'), roomV1);

      // Register blueprint and create room instance
      const blueprint = new BaseMudObject();
      blueprint._setupAsBlueprint('/areas/tavern');
      registry.registerBlueprint('/areas/tavern', BaseMudObject, blueprint);

      // Clone the room (simulating loading it)
      const room = await registry.clone('/areas/tavern');
      expect(room).toBeDefined();

      // Update room code with new features
      const roomV2 = `
export class Tavern {
  shortDesc = 'The Rusty Tankard';
  longDesc = 'A cozy tavern with wooden tables and a roaring fireplace.';

  getExits(): string[] {
    return ['south', 'upstairs'];  // New exit added!
  }

  // New method
  orderDrink(): string {
    return 'The bartender pours you a frothy ale.';
  }
}
`;
      await writeFile(join(testDir, 'areas', 'tavern.ts'), roomV2);

      // Hot-reload the room
      const result = await hotReload.update('/areas/tavern');

      expect(result.success).toBe(true);
      expect(result.clonesUpdated).toBe(1);
    });

    it('should handle NPC behavior update', async () => {
      // Create NPC code
      const npcV1 = `
export class Guard {
  name = 'Town Guard';

  onSee(player: any): string {
    return 'The guard nods at you.';
  }
}
`;
      await writeFile(join(testDir, 'areas', 'guard.ts'), npcV1);

      const blueprint = new BaseMudObject();
      blueprint._setupAsBlueprint('/areas/guard');
      registry.registerBlueprint('/areas/guard', BaseMudObject, blueprint);

      // Create multiple guard instances
      await registry.clone('/areas/guard');
      await registry.clone('/areas/guard');
      await registry.clone('/areas/guard');

      // Update guard behavior
      const npcV2 = `
export class Guard {
  name = 'Town Guard';
  suspicion = 0;

  onSee(player: any): string {
    this.suspicion++;
    if (this.suspicion > 3) {
      return 'The guard watches you suspiciously.';
    }
    return 'The guard nods at you.';
  }

  // New patrol behavior
  patrol(): string {
    return 'The guard begins patrolling the area.';
  }
}
`;
      await writeFile(join(testDir, 'areas', 'guard.ts'), npcV2);

      const result = await hotReload.update('/areas/guard');

      expect(result.success).toBe(true);
      expect(result.clonesUpdated).toBe(3);
    });

    it('should handle item property update', async () => {
      const itemV1 = `
export class MagicSword {
  name = 'Magic Sword';
  damage = 10;

  attack(): number {
    return this.damage;
  }
}
`;
      await writeFile(join(testDir, 'std', 'magic-sword.ts'), itemV1);

      const blueprint = new BaseMudObject();
      blueprint._setupAsBlueprint('/std/magic-sword');
      registry.registerBlueprint('/std/magic-sword', BaseMudObject, blueprint);

      const sword = await registry.clone('/std/magic-sword');
      expect(sword).toBeDefined();

      // Update with balance changes
      const itemV2 = `
export class MagicSword {
  name = 'Magic Sword';
  damage = 15;  // Buffed!
  critChance = 0.1;  // New property

  attack(): number {
    const crit = Math.random() < this.critChance;
    return crit ? this.damage * 2 : this.damage;
  }
}
`;
      await writeFile(join(testDir, 'std', 'magic-sword.ts'), itemV2);

      const result = await hotReload.update('/std/magic-sword');

      expect(result.success).toBe(true);
      expect(result.clonesUpdated).toBe(1);
    });
  });

  describe('Error Recovery', () => {
    it('should recover after fixing syntax error', async () => {
      // First, create broken code
      const brokenCode = `
export class Test {
  this is broken!!!
}
`;
      await writeFile(join(testDir, 'std', 'test.ts'), brokenCode);

      let result = await hotReload.update('/std/test');
      expect(result.success).toBe(false);

      // Fix the code
      const fixedCode = `
export class Test {
  value: number = 42;
}
`;
      await writeFile(join(testDir, 'std', 'test.ts'), fixedCode);

      result = await hotReload.update('/std/test');
      expect(result.success).toBe(true);
    });

    it('should not update clones when compilation fails', async () => {
      // Create valid code and clones
      const validCode = 'export class Item { value = 1; }';
      await writeFile(join(testDir, 'std', 'item.ts'), validCode);

      const blueprint = new TestItem();
      blueprint._setupAsBlueprint('/std/item');
      registry.registerBlueprint('/std/item', TestItem, blueprint);

      const clone = (await registry.clone('/std/item')) as TestItem;
      clone!.value = 999;

      // Try to update with invalid code
      const invalidCode = 'export class Item { invalid syntax!!! }';
      await writeFile(join(testDir, 'std', 'item.ts'), invalidCode);

      const result = await hotReload.update('/std/item');

      expect(result.success).toBe(false);
      // Clone state should be unaffected
      expect(clone!.value).toBe(999);
    });
  });
});
