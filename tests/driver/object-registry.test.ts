import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectRegistry, resetRegistry } from '../../src/driver/object-registry.js';
import { BaseMudObject } from '../../src/driver/base-object.js';

// Test fixture: Simple object class
class TestObject extends BaseMudObject {
  value: number = 0;

  override onCreate(): void {
    this.value = 42;
  }
}

// Test fixture: Room class
class TestRoom extends BaseMudObject {
  exits: Map<string, string> = new Map();

  constructor() {
    super();
    this.shortDesc = 'a test room';
    this.longDesc = 'This is a room for testing.';
  }
}

// Test fixture: Item class
class TestItem extends BaseMudObject {
  weight: number = 1;

  constructor() {
    super();
    this.shortDesc = 'a test item';
    this.longDesc = 'This is an item for testing.';
  }
}

describe('ObjectRegistry', () => {
  let registry: ObjectRegistry;

  beforeEach(() => {
    resetRegistry();
    registry = new ObjectRegistry();
  });

  describe('registerBlueprint', () => {
    it('should register a blueprint object', () => {
      const instance = new TestObject();
      instance._setupAsBlueprint('/std/test');

      registry.registerBlueprint('/std/test', TestObject, instance);

      expect(registry.has('/std/test')).toBe(true);
      expect(registry.find('/std/test')).toBe(instance);
      expect(registry.blueprintCount).toBe(1);
    });

    it('should throw if blueprint already registered', () => {
      const instance = new TestObject();
      instance._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, instance);

      const instance2 = new TestObject();
      expect(() => {
        registry.registerBlueprint('/std/test', TestObject, instance2);
      }).toThrow('Blueprint already registered');
    });
  });

  describe('register', () => {
    it('should register an object by ID', () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/std/test');

      registry.register(obj);

      expect(registry.has('/std/test')).toBe(true);
      expect(registry.find('/std/test')).toBe(obj);
    });

    it('should throw if object already registered', () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/std/test');
      registry.register(obj);

      expect(() => {
        registry.register(obj);
      }).toThrow('Object already registered');
    });
  });

  describe('find', () => {
    it('should return undefined for non-existent object', () => {
      expect(registry.find('/nonexistent')).toBeUndefined();
    });

    it('should find blueprint by path', () => {
      const instance = new TestObject();
      instance._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, instance);

      expect(registry.find('/std/test')).toBe(instance);
    });
  });

  describe('clone', () => {
    it('should create a clone with unique ID', async () => {
      const blueprint = new TestObject();
      blueprint._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, blueprint);

      const clone = await registry.clone('/std/test');

      expect(clone).toBeDefined();
      expect(clone!.objectId).toBe('/std/test#1');
      expect(clone!.objectPath).toBe('/std/test');
      expect(clone!.isClone).toBe(true);
      expect(clone!.blueprint).toBe(blueprint);
    });

    it('should increment clone counter for each clone', async () => {
      const blueprint = new TestObject();
      blueprint._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, blueprint);

      const clone1 = await registry.clone('/std/test');
      const clone2 = await registry.clone('/std/test');
      const clone3 = await registry.clone('/std/test');

      expect(clone1!.objectId).toBe('/std/test#1');
      expect(clone2!.objectId).toBe('/std/test#2');
      expect(clone3!.objectId).toBe('/std/test#3');
    });

    it('should call onCreate and onClone on new clone', async () => {
      const blueprint = new TestObject();
      blueprint._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, blueprint);

      const clone = await registry.clone('/std/test');

      // onCreate sets value to 42
      expect((clone as TestObject).value).toBe(42);
    });

    it('should return undefined for non-existent blueprint', async () => {
      const clone = await registry.clone('/nonexistent');
      expect(clone).toBeUndefined();
    });

    it('should register clone in registry', async () => {
      const blueprint = new TestObject();
      blueprint._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, blueprint);

      const clone = await registry.clone('/std/test');

      expect(registry.has('/std/test#1')).toBe(true);
      expect(registry.find('/std/test#1')).toBe(clone);
    });
  });

  describe('destroy', () => {
    it('should remove object from registry', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/std/test');
      registry.register(obj);

      await registry.destroy(obj);

      expect(registry.has('/std/test')).toBe(false);
    });

    it('should call onDestroy', async () => {
      const obj = new TestObject();
      obj._setupAsBlueprint('/std/test');
      const onDestroySpy = vi.spyOn(obj, 'onDestroy');
      registry.register(obj);

      await registry.destroy(obj);

      expect(onDestroySpy).toHaveBeenCalled();
    });

    it('should remove clone from blueprint tracking', async () => {
      const blueprint = new TestObject();
      blueprint._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, blueprint);

      const clone = await registry.clone('/std/test');
      const blueprintInfo = registry.findBlueprint('/std/test');

      expect(blueprintInfo!.clones.has('/std/test#1')).toBe(true);

      await registry.destroy(clone!);

      expect(blueprintInfo!.clones.has('/std/test#1')).toBe(false);
    });

    it('should remove object from environment', async () => {
      const room = new TestRoom();
      room._setupAsBlueprint('/rooms/test');
      registry.register(room);

      const item = new TestItem();
      item._setupAsBlueprint('/items/test');
      registry.register(item);

      await item.moveTo(room);
      expect(room.inventory).toContain(item);

      await registry.destroy(item);

      expect(room.inventory).not.toContain(item);
    });
  });

  describe('object counts', () => {
    it('should track object count', async () => {
      expect(registry.objectCount).toBe(0);

      const blueprint = new TestObject();
      blueprint._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, blueprint);

      expect(registry.objectCount).toBe(1);

      await registry.clone('/std/test');
      await registry.clone('/std/test');

      expect(registry.objectCount).toBe(3);
    });

    it('should track blueprint count', () => {
      expect(registry.blueprintCount).toBe(0);

      const blueprint1 = new TestObject();
      blueprint1._setupAsBlueprint('/std/test1');
      registry.registerBlueprint('/std/test1', TestObject, blueprint1);

      const blueprint2 = new TestRoom();
      blueprint2._setupAsBlueprint('/std/test2');
      registry.registerBlueprint('/std/test2', TestRoom, blueprint2);

      expect(registry.blueprintCount).toBe(2);
    });
  });

  describe('unregisterBlueprint', () => {
    it('should destroy all clones and blueprint', async () => {
      const blueprint = new TestObject();
      blueprint._setupAsBlueprint('/std/test');
      registry.registerBlueprint('/std/test', TestObject, blueprint);

      await registry.clone('/std/test');
      await registry.clone('/std/test');

      expect(registry.objectCount).toBe(3);

      await registry.unregisterBlueprint('/std/test');

      expect(registry.objectCount).toBe(0);
      expect(registry.blueprintCount).toBe(0);
    });
  });

  describe('getAllObjects', () => {
    it('should iterate over all objects', () => {
      const obj1 = new TestObject();
      obj1._setupAsBlueprint('/std/test1');
      registry.register(obj1);

      const obj2 = new TestRoom();
      obj2._setupAsBlueprint('/std/test2');
      registry.register(obj2);

      const all = Array.from(registry.getAllObjects());
      expect(all).toHaveLength(2);
      expect(all).toContain(obj1);
      expect(all).toContain(obj2);
    });
  });
});
