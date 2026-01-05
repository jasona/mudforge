import { describe, it, expect, beforeEach } from 'vitest';
import {
  Serializer,
  getSerializer,
  resetSerializer,
} from '../../../src/driver/persistence/serializer.js';
import type { MudObject } from '../../../src/driver/types.js';

// Mock MudObject implementation
function createMockObject(
  path: string,
  props: Record<string, unknown> = {},
  isClone: boolean = false
): MudObject {
  return {
    objectPath: path,
    objectId: isClone ? `${path}#1` : path,
    isClone,
    blueprint: isClone ? ({ objectPath: path } as MudObject) : undefined,
    environment: null,
    inventory: [],
    moveTo: async () => true,
    onCreate: () => {},
    onDestroy: () => {},
    ...props,
  } as unknown as MudObject;
}

describe('Serializer', () => {
  let serializer: Serializer;

  beforeEach(() => {
    resetSerializer();
    serializer = new Serializer();
  });

  describe('serialize', () => {
    it('should serialize basic object properties', () => {
      const obj = createMockObject('/std/sword', {
        name: 'Excalibur',
        damage: 10,
        weight: 5,
      });

      const state = serializer.serialize(obj);

      expect(state.objectPath).toBe('/std/sword');
      expect(state.isClone).toBe(false);
      expect(state.properties.name).toBe('Excalibur');
      expect(state.properties.damage).toBe(10);
      expect(state.properties.weight).toBe(5);
    });

    it('should serialize clone with correct ID', () => {
      const obj = createMockObject('/std/sword', { name: 'Sword' }, true);

      const state = serializer.serialize(obj);

      expect(state.objectPath).toBe('/std/sword');
      expect(state.isClone).toBe(true);
    });

    it('should skip internal properties', () => {
      const obj = createMockObject('/std/item', {
        objectPath: '/std/item',
        objectId: '/std/item',
        isClone: false,
        _privateField: 'secret',
        publicField: 'visible',
      });

      const state = serializer.serialize(obj);

      expect(state.properties._privateField).toBeUndefined();
      expect(state.properties.objectPath).toBeUndefined();
      expect(state.properties.publicField).toBe('visible');
    });

    it('should skip functions', () => {
      const obj = createMockObject('/std/item', {
        name: 'Item',
        doSomething: () => console.log('action'),
      });

      const state = serializer.serialize(obj);

      expect(state.properties.name).toBe('Item');
      expect(state.properties.doSomething).toBeUndefined();
    });

    it('should serialize arrays', () => {
      const obj = createMockObject('/std/container', {
        contents: ['sword', 'shield', 'potion'],
      });

      const state = serializer.serialize(obj);

      expect(state.properties.contents).toEqual(['sword', 'shield', 'potion']);
    });

    it('should serialize nested objects', () => {
      const obj = createMockObject('/std/player', {
        stats: { hp: 100, mp: 50, str: 10 },
      });

      const state = serializer.serialize(obj);

      expect(state.properties.stats).toEqual({ hp: 100, mp: 50, str: 10 });
    });

    it('should serialize Date objects', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const obj = createMockObject('/std/item', {
        createdAt: date,
      });

      const state = serializer.serialize(obj);

      expect(state.properties.createdAt).toEqual({
        __type: 'date',
        value: '2024-01-01T12:00:00.000Z',
      });
    });

    it('should serialize Map objects', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const obj = createMockObject('/std/item', {
        data: map,
      });

      const state = serializer.serialize(obj);

      expect(state.properties.data).toEqual({
        __type: 'map',
        entries: [
          ['key1', 'value1'],
          ['key2', 'value2'],
        ],
      });
    });

    it('should serialize Set objects', () => {
      const set = new Set(['a', 'b', 'c']);
      const obj = createMockObject('/std/item', {
        tags: set,
      });

      const state = serializer.serialize(obj);

      expect(state.properties.tags).toEqual({
        __type: 'set',
        values: ['a', 'b', 'c'],
      });
    });

    it('should serialize object references in inventory', () => {
      const sword = createMockObject('/std/sword', {}, true);
      const container = createMockObject('/std/container', {});
      container.inventory = [sword];

      const state = serializer.serialize(container);

      expect(state.inventory).toBeDefined();
      expect(state.inventory).toHaveLength(1);
      expect(state.inventory![0].__type).toBe('object_ref');
      expect(state.inventory![0].path).toBe('/std/sword#1');
    });

    it('should serialize environment reference', () => {
      const room = createMockObject('/areas/town/square', {});
      const player = createMockObject('/std/player', {}, true);
      player.environment = room;

      const state = serializer.serialize(player);

      expect(state.environment).toBeDefined();
      expect(state.environment!.__type).toBe('object_ref');
      expect(state.environment!.path).toBe('/areas/town/square');
    });

    it('should handle null environment', () => {
      const obj = createMockObject('/std/item', {});
      obj.environment = null;

      const state = serializer.serialize(obj);

      expect(state.environment).toBeNull();
    });

    it('should include timestamp', () => {
      const obj = createMockObject('/std/item', {});
      const before = Date.now();

      const state = serializer.serialize(obj);

      const after = Date.now();
      expect(state.timestamp).toBeGreaterThanOrEqual(before);
      expect(state.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('deserialize', () => {
    it('should restore basic properties', () => {
      const obj = createMockObject('/std/sword', {});
      const state = {
        objectPath: '/std/sword',
        isClone: false,
        properties: { name: 'Excalibur', damage: 10 },
        timestamp: Date.now(),
      };

      serializer.deserialize(state, obj);

      const o = obj as Record<string, unknown>;
      expect(o.name).toBe('Excalibur');
      expect(o.damage).toBe(10);
    });

    it('should restore Date objects', () => {
      const obj = createMockObject('/std/item', {});
      const state = {
        objectPath: '/std/item',
        isClone: false,
        properties: {
          createdAt: { __type: 'date', value: '2024-01-01T12:00:00.000Z' },
        },
        timestamp: Date.now(),
      };

      serializer.deserialize(state, obj);

      const o = obj as Record<string, unknown>;
      expect(o.createdAt).toBeInstanceOf(Date);
      expect((o.createdAt as Date).toISOString()).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should restore Map objects', () => {
      const obj = createMockObject('/std/item', {});
      const state = {
        objectPath: '/std/item',
        isClone: false,
        properties: {
          data: {
            __type: 'map',
            entries: [
              ['key1', 'value1'],
              ['key2', 'value2'],
            ],
          },
        },
        timestamp: Date.now(),
      };

      serializer.deserialize(state, obj);

      const o = obj as Record<string, unknown>;
      expect(o.data).toBeInstanceOf(Map);
      expect((o.data as Map<string, string>).get('key1')).toBe('value1');
    });

    it('should restore Set objects', () => {
      const obj = createMockObject('/std/item', {});
      const state = {
        objectPath: '/std/item',
        isClone: false,
        properties: {
          tags: { __type: 'set', values: ['a', 'b', 'c'] },
        },
        timestamp: Date.now(),
      };

      serializer.deserialize(state, obj);

      const o = obj as Record<string, unknown>;
      expect(o.tags).toBeInstanceOf(Set);
      expect((o.tags as Set<string>).has('b')).toBe(true);
    });

    it('should restore nested objects', () => {
      const obj = createMockObject('/std/player', {});
      const state = {
        objectPath: '/std/player',
        isClone: false,
        properties: {
          stats: { hp: 100, mp: 50 },
        },
        timestamp: Date.now(),
      };

      serializer.deserialize(state, obj);

      const o = obj as Record<string, unknown>;
      expect(o.stats).toEqual({ hp: 100, mp: 50 });
    });

    it('should restore arrays', () => {
      const obj = createMockObject('/std/container', {});
      const state = {
        objectPath: '/std/container',
        isClone: false,
        properties: {
          items: ['sword', 'shield'],
        },
        timestamp: Date.now(),
      };

      serializer.deserialize(state, obj);

      const o = obj as Record<string, unknown>;
      expect(o.items).toEqual(['sword', 'shield']);
    });
  });

  describe('serializePlayer', () => {
    it('should create player save data', () => {
      const room = createMockObject('/areas/town/square', {});
      const player = createMockObject(
        '/std/player',
        {
          name: 'Hero',
          level: 5,
        },
        true
      );
      player.environment = room;

      const saveData = serializer.serializePlayer(player);

      expect(saveData.name).toBe('Hero');
      expect(saveData.location).toBe('/areas/town/square');
      expect(saveData.state.properties.level).toBe(5);
      expect(saveData.savedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should handle player without environment', () => {
      const player = createMockObject('/std/player', { name: 'Lost' }, true);

      const saveData = serializer.serializePlayer(player);

      expect(saveData.location).toBe('/areas/town/center');
    });
  });

  describe('createWorldSnapshot', () => {
    it('should create world state with all objects', () => {
      const room = createMockObject('/areas/town/square', { name: 'Town Square' });
      const sword = createMockObject('/std/sword', { name: 'Sword' }, true);
      const objects = [room, sword];

      const snapshot = serializer.createWorldSnapshot(objects);

      expect(snapshot.version).toBe(1);
      expect(snapshot.objects).toHaveLength(2);
      expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const s1 = getSerializer();
      const s2 = getSerializer();

      expect(s1).toBe(s2);
    });

    it('should reset instance', () => {
      const s1 = getSerializer();
      resetSerializer();
      const s2 = getSerializer();

      expect(s2).not.toBe(s1);
    });
  });
});
