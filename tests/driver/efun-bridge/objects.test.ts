/**
 * Tests for object management efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { BaseMudObject } from '../../../src/driver/base-object.js';
import { getRegistry } from '../../../src/driver/object-registry.js';

describe('Object Efuns', () => {
  let efunBridge: EfunBridge;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await createTestEnvironment();
    efunBridge = env.efunBridge;
    cleanup = env.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('findObject', () => {
    it('should find registered object by path', () => {
      const obj = new BaseMudObject();
      obj._setupAsBlueprint('/test/findme');
      getRegistry().register(obj);

      const found = efunBridge.findObject('/test/findme');

      expect(found).toBe(obj);
    });

    it('should return undefined for non-existent object', () => {
      const found = efunBridge.findObject('/test/nonexistent');

      expect(found).toBeUndefined();
    });

    it('should find cloned object by instance path', () => {
      const blueprint = new BaseMudObject();
      blueprint._setupAsBlueprint('/test/blueprint');
      getRegistry().register(blueprint);

      // Clone creates instance path like /test/blueprint#1
      const clone = new BaseMudObject();
      clone._setupAsClone('/test/blueprint', '/test/blueprint#1', blueprint);
      getRegistry().register(clone);

      const found = efunBridge.findObject('/test/blueprint#1');

      expect(found).toBe(clone);
    });
  });

  describe('getAllObjects', () => {
    it('should return empty array when no objects', () => {
      const objects = efunBridge.getAllObjects();

      expect(objects).toEqual([]);
    });

    it('should return all registered objects', () => {
      const obj1 = new BaseMudObject();
      obj1._setupAsBlueprint('/test/obj1');
      const obj2 = new BaseMudObject();
      obj2._setupAsBlueprint('/test/obj2');
      getRegistry().register(obj1);
      getRegistry().register(obj2);

      const objects = efunBridge.getAllObjects();

      expect(objects).toContain(obj1);
      expect(objects).toContain(obj2);
    });
  });

  describe('destruct', () => {
    it('should destruct registered object', async () => {
      const obj = new BaseMudObject();
      obj._setupAsBlueprint('/test/destruct');
      getRegistry().register(obj);

      await efunBridge.destruct(obj);

      expect(efunBridge.findObject('/test/destruct')).toBeUndefined();
    });

    it('should remove object from inventory', async () => {
      const container = new BaseMudObject();
      container._setupAsBlueprint('/room/container');
      const item = new BaseMudObject();
      item._setupAsBlueprint('/obj/item');
      getRegistry().register(container);
      getRegistry().register(item);

      item.moveTo(container);
      expect(efunBridge.allInventory(container)).toContain(item);

      await efunBridge.destruct(item);

      expect(efunBridge.allInventory(container)).not.toContain(item);
    });

    it('should handle destructing object with inventory', async () => {
      const container = new BaseMudObject();
      container._setupAsBlueprint('/room/container2');
      const item1 = new BaseMudObject();
      item1._setupAsBlueprint('/obj/item1');
      const item2 = new BaseMudObject();
      item2._setupAsBlueprint('/obj/item2');
      getRegistry().register(container);
      getRegistry().register(item1);
      getRegistry().register(item2);

      item1.moveTo(container);
      item2.moveTo(container);

      await efunBridge.destruct(container);

      // Container should be destructed
      expect(efunBridge.findObject('/room/container2')).toBeUndefined();
    });
  });

  describe('hierarchy efuns', () => {
    it('should get all inventory', () => {
      const container = new BaseMudObject();
      const item1 = new BaseMudObject();
      const item2 = new BaseMudObject();

      item1.moveTo(container);
      item2.moveTo(container);

      const inventory = efunBridge.allInventory(container);

      expect(inventory).toHaveLength(2);
      expect(inventory).toContain(item1);
      expect(inventory).toContain(item2);
    });

    it('should return empty array for object with no inventory', () => {
      const obj = new BaseMudObject();

      const inventory = efunBridge.allInventory(obj);

      expect(inventory).toEqual([]);
    });

    it('should get environment', () => {
      const room = new BaseMudObject();
      const item = new BaseMudObject();

      item.moveTo(room);

      expect(efunBridge.environment(item)).toBe(room);
    });

    it('should return null for object with no environment', () => {
      const obj = new BaseMudObject();

      expect(efunBridge.environment(obj)).toBeNull();
    });

    it('should move object', async () => {
      const room1 = new BaseMudObject();
      const room2 = new BaseMudObject();
      const item = new BaseMudObject();

      item.moveTo(room1);

      await efunBridge.move(item, room2);

      expect(efunBridge.environment(item)).toBe(room2);
      expect(efunBridge.allInventory(room1)).not.toContain(item);
      expect(efunBridge.allInventory(room2)).toContain(item);
    });

    it('should move to object found by path', async () => {
      const room = new BaseMudObject();
      room._setupAsBlueprint('/room/dest');
      const item = new BaseMudObject();
      getRegistry().register(room);

      // Find destination by path, then move
      const dest = efunBridge.findObject('/room/dest');
      expect(dest).toBeDefined();
      await efunBridge.move(item, dest!);

      expect(efunBridge.environment(item)).toBe(room);
    });
  });

  // Note: deepInventory and present methods are not currently implemented on EfunBridge.
  // These would test:
  // - deepInventory(obj): Get all nested objects in inventory recursively
  // - present(id, container): Find object by id in container's inventory

  describe('context', () => {
    it('should set and get thisObject', () => {
      const obj = new BaseMudObject();

      efunBridge.setContext({ thisObject: obj });

      expect(efunBridge.thisObject()).toBe(obj);
    });

    it('should set and get thisPlayer', () => {
      const player = createMockPlayer();

      efunBridge.setContext({ thisPlayer: player });

      expect(efunBridge.thisPlayer()).toBe(player);
    });

    it('should clear context', () => {
      const obj = new BaseMudObject();
      efunBridge.setContext({ thisObject: obj, thisPlayer: obj });

      efunBridge.clearContext();

      expect(efunBridge.thisObject()).toBeNull();
      expect(efunBridge.thisPlayer()).toBeNull();
    });
  });
});
