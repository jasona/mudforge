import { describe, it, expect, beforeEach } from 'vitest';
import { MudObject } from '../../mudlib/std/object.js';

describe('MudObject', () => {
  let obj: MudObject;

  beforeEach(() => {
    obj = new MudObject();
  });

  describe('identity', () => {
    it('should have default descriptions', () => {
      expect(obj.shortDesc).toBe('an object');
      expect(obj.longDesc).toBe('You see nothing special.');
    });

    it('should allow setting descriptions', () => {
      obj.shortDesc = 'a shiny sword';
      obj.longDesc = 'This is a magnificent sword.';

      expect(obj.shortDesc).toBe('a shiny sword');
      expect(obj.longDesc).toBe('This is a magnificent sword.');
    });

    it('should match exact short description with id()', () => {
      obj.shortDesc = 'a red ball';

      expect(obj.id('a red ball')).toBe(true);
      expect(obj.id('A Red Ball')).toBe(true); // case insensitive
    });

    it('should match words in short description with id()', () => {
      obj.shortDesc = 'a shiny red sword';

      expect(obj.id('sword')).toBe(true);
      expect(obj.id('shiny')).toBe(true);
      expect(obj.id('red')).toBe(true);
      expect(obj.id('blue')).toBe(false);
    });
  });

  describe('hierarchy', () => {
    it('should start with no environment', () => {
      expect(obj.environment).toBeNull();
    });

    it('should start with empty inventory', () => {
      expect(obj.inventory).toEqual([]);
    });

    it('should move to environment', () => {
      const room = new MudObject();
      room.shortDesc = 'a room';

      obj.moveTo(room);

      expect(obj.environment).toBe(room);
      expect(room.inventory).toContain(obj);
    });

    it('should remove from old environment when moving', () => {
      const room1 = new MudObject();
      const room2 = new MudObject();

      obj.moveTo(room1);
      obj.moveTo(room2);

      expect(obj.environment).toBe(room2);
      expect(room1.inventory).not.toContain(obj);
      expect(room2.inventory).toContain(obj);
    });

    it('should remove from environment when moving to null', () => {
      const room = new MudObject();

      obj.moveTo(room);
      obj.moveTo(null);

      expect(obj.environment).toBeNull();
      expect(room.inventory).not.toContain(obj);
    });
  });

  describe('actions', () => {
    it('should add action', () => {
      const handler = () => true;
      obj.addAction('test', handler);

      const action = obj.getAction('test');
      expect(action).toBeDefined();
      expect(action!.verb).toBe('test');
      expect(action!.handler).toBe(handler);
    });

    it('should get actions sorted by priority', () => {
      obj.addAction('low', () => true, 1);
      obj.addAction('high', () => true, 10);
      obj.addAction('medium', () => true, 5);

      const actions = obj.getActions();
      expect(actions[0].verb).toBe('high');
      expect(actions[1].verb).toBe('medium');
      expect(actions[2].verb).toBe('low');
    });

    it('should remove action', () => {
      obj.addAction('test', () => true);
      obj.removeAction('test');

      expect(obj.getAction('test')).toBeUndefined();
    });

    it('should be case-insensitive for verbs', () => {
      obj.addAction('TEST', () => true);

      expect(obj.getAction('test')).toBeDefined();
      expect(obj.getAction('Test')).toBeDefined();
      expect(obj.getAction('TEST')).toBeDefined();
    });
  });

  describe('properties', () => {
    it('should set and get properties', () => {
      obj.setProperty('name', 'test');
      obj.setProperty('value', 42);

      expect(obj.getProperty('name')).toBe('test');
      expect(obj.getProperty('value')).toBe(42);
    });

    it('should return undefined for missing properties', () => {
      expect(obj.getProperty('nonexistent')).toBeUndefined();
    });

    it('should check property existence', () => {
      obj.setProperty('exists', true);

      expect(obj.hasProperty('exists')).toBe(true);
      expect(obj.hasProperty('missing')).toBe(false);
    });

    it('should delete properties', () => {
      obj.setProperty('temp', 'value');
      obj.deleteProperty('temp');

      expect(obj.hasProperty('temp')).toBe(false);
    });

    it('should list property keys', () => {
      obj.setProperty('a', 1);
      obj.setProperty('b', 2);
      obj.setProperty('c', 3);

      const keys = obj.getPropertyKeys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });
  });

  describe('lifecycle hooks', () => {
    it('should have default lifecycle methods', () => {
      // These should not throw
      expect(() => obj.onCreate()).not.toThrow();
      expect(() => obj.onDestroy()).not.toThrow();
      expect(() => obj.onClone(obj)).not.toThrow();
      expect(() => obj.onReset()).not.toThrow();
      expect(() => obj.heartbeat()).not.toThrow();
    });
  });
});
