import { describe, it, expect, beforeEach } from 'vitest';
import { BaseMudObject } from '../../src/driver/base-object.js';

// Test fixture: Room class
class TestRoom extends BaseMudObject {
  constructor() {
    super();
    this.shortDesc = 'a test room';
    this.longDesc = 'This is a room for testing purposes.';
  }
}

// Test fixture: Item class
class TestItem extends BaseMudObject {
  constructor() {
    super();
    this.shortDesc = 'a rusty sword';
    this.longDesc = 'This is a rusty old sword.';
  }
}

// Test fixture: Player class
class TestPlayer extends BaseMudObject {
  constructor() {
    super();
    this.shortDesc = 'a brave adventurer';
    this.longDesc = 'A brave adventurer stands here.';
  }
}

describe('BaseMudObject', () => {
  describe('identity', () => {
    it('should setup as blueprint correctly', () => {
      const obj = new TestItem();
      obj._setupAsBlueprint('/std/sword');

      expect(obj.objectPath).toBe('/std/sword');
      expect(obj.objectId).toBe('/std/sword');
      expect(obj.isClone).toBe(false);
      expect(obj.blueprint).toBeUndefined();
    });

    it('should setup as clone correctly', () => {
      const blueprint = new TestItem();
      blueprint._setupAsBlueprint('/std/sword');

      const clone = new TestItem();
      clone._setupAsClone('/std/sword', '/std/sword#1', blueprint);

      expect(clone.objectPath).toBe('/std/sword');
      expect(clone.objectId).toBe('/std/sword#1');
      expect(clone.isClone).toBe(true);
      expect(clone.blueprint).toBe(blueprint);
    });
  });

  describe('descriptions', () => {
    it('should have default descriptions', () => {
      const obj = new BaseMudObject();
      expect(obj.shortDesc).toBe('an object');
      expect(obj.longDesc).toBe('You see nothing special.');
    });

    it('should allow setting descriptions', () => {
      const obj = new BaseMudObject();
      obj.shortDesc = 'a shiny gem';
      obj.longDesc = 'This gem sparkles with inner light.';

      expect(obj.shortDesc).toBe('a shiny gem');
      expect(obj.longDesc).toBe('This gem sparkles with inner light.');
    });
  });

  describe('id matching', () => {
    it('should match words in shortDesc', () => {
      const item = new TestItem(); // shortDesc: "a rusty sword"

      expect(item.id('sword')).toBe(true);
      expect(item.id('rusty')).toBe(true);
      expect(item.id('a')).toBe(true);
    });

    it('should be case insensitive', () => {
      const item = new TestItem();

      expect(item.id('SWORD')).toBe(true);
      expect(item.id('Rusty')).toBe(true);
      expect(item.id('SwOrD')).toBe(true);
    });

    it('should not match partial words', () => {
      const item = new TestItem();

      expect(item.id('swor')).toBe(false);
      expect(item.id('rust')).toBe(false);
      expect(item.id('swordy')).toBe(false);
    });

    it('should not match unrelated words', () => {
      const item = new TestItem();

      expect(item.id('axe')).toBe(false);
      expect(item.id('shield')).toBe(false);
    });
  });

  describe('movement', () => {
    let room1: TestRoom;
    let room2: TestRoom;
    let item: TestItem;
    let player: TestPlayer;

    beforeEach(() => {
      room1 = new TestRoom();
      room1._setupAsBlueprint('/rooms/room1');

      room2 = new TestRoom();
      room2._setupAsBlueprint('/rooms/room2');

      item = new TestItem();
      item._setupAsBlueprint('/items/sword');

      player = new TestPlayer();
      player._setupAsBlueprint('/players/test');
    });

    it('should move object into environment', async () => {
      await item.moveTo(room1);

      expect(item.environment).toBe(room1);
      expect(room1.inventory).toContain(item);
    });

    it('should remove object from old environment when moving', async () => {
      await item.moveTo(room1);
      await item.moveTo(room2);

      expect(item.environment).toBe(room2);
      expect(room1.inventory).not.toContain(item);
      expect(room2.inventory).toContain(item);
    });

    it('should remove object from world when moving to null', async () => {
      await item.moveTo(room1);
      await item.moveTo(null);

      expect(item.environment).toBeNull();
      expect(room1.inventory).not.toContain(item);
    });

    it('should support nested containers', async () => {
      // Player in room
      await player.moveTo(room1);
      // Item in player (inventory)
      await item.moveTo(player);

      expect(player.environment).toBe(room1);
      expect(item.environment).toBe(player);
      expect(room1.inventory).toContain(player);
      expect(player.inventory).toContain(item);
    });

    it('should handle multiple items in same container', async () => {
      const item2 = new TestItem();
      item2._setupAsBlueprint('/items/sword2');

      await item.moveTo(room1);
      await item2.moveTo(room1);

      expect(room1.inventory).toHaveLength(2);
      expect(room1.inventory).toContain(item);
      expect(room1.inventory).toContain(item2);
    });

    it('should return true on successful move', async () => {
      const result = await item.moveTo(room1);
      expect(result).toBe(true);
    });
  });

  describe('actions', () => {
    let item: TestItem;

    beforeEach(() => {
      item = new TestItem();
      item._setupAsBlueprint('/items/lever');
    });

    it('should register an action', () => {
      const handler = () => true;
      item.addAction('pull', handler);

      const actions = item.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.verb).toBe('pull');
      expect(actions[0]!.handler).toBe(handler);
    });

    it('should register action with default priority 0', () => {
      item.addAction('push', () => true);

      const actions = item.getActions();
      expect(actions[0]!.priority).toBe(0);
    });

    it('should register action with custom priority', () => {
      item.addAction('push', () => true, 10);

      const actions = item.getActions();
      expect(actions[0]!.priority).toBe(10);
    });

    it('should convert verb to lowercase', () => {
      item.addAction('PULL', () => true);

      const actions = item.getActions();
      expect(actions[0]!.verb).toBe('pull');
    });

    it('should remove an action', () => {
      item.addAction('pull', () => true);
      item.addAction('push', () => true);

      item.removeAction('pull');

      const actions = item.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.verb).toBe('push');
    });

    it('should remove action case-insensitively', () => {
      item.addAction('pull', () => true);
      item.removeAction('PULL');

      const actions = item.getActions();
      expect(actions).toHaveLength(0);
    });

    it('should handle removing non-existent action', () => {
      item.removeAction('nonexistent');
      // Should not throw
      expect(item.getActions()).toHaveLength(0);
    });

    it('should overwrite action with same verb', () => {
      const handler1 = () => true;
      const handler2 = () => false;

      item.addAction('pull', handler1);
      item.addAction('pull', handler2);

      const actions = item.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0]!.handler).toBe(handler2);
    });
  });

  describe('lifecycle hooks', () => {
    it('should have default lifecycle hooks that do nothing', async () => {
      const obj = new BaseMudObject();

      // These should not throw
      await obj.onCreate();
      await obj.onDestroy();
      await obj.onClone(obj);
      await obj.onReset();
    });

    it('should allow overriding lifecycle hooks', async () => {
      let createCalled = false;
      let destroyCalled = false;

      class LifecycleObject extends BaseMudObject {
        override onCreate() {
          createCalled = true;
        }
        override onDestroy() {
          destroyCalled = true;
        }
      }

      const obj = new LifecycleObject();
      await obj.onCreate();
      await obj.onDestroy();

      expect(createCalled).toBe(true);
      expect(destroyCalled).toBe(true);
    });
  });
});
