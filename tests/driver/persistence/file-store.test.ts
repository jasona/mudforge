import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileStore, getFileStore, resetFileStore } from '../../../src/driver/persistence/file-store.js';
import { resetSerializer } from '../../../src/driver/persistence/serializer.js';
import type { MudObject } from '../../../src/driver/types.js';
import { rm, mkdir } from 'fs/promises';
import { join } from 'path';

// Test data directory
const TEST_DATA_PATH = './test-data-persistence';

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

describe('FileStore', () => {
  let store: FileStore;

  beforeEach(async () => {
    resetFileStore();
    resetSerializer();

    // Clean up test directory
    try {
      await rm(TEST_DATA_PATH, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
    await mkdir(TEST_DATA_PATH, { recursive: true });

    store = new FileStore({
      dataPath: TEST_DATA_PATH,
    });
  });

  afterEach(async () => {
    store.stopAutoSave();
    resetFileStore();

    // Clean up test directory
    try {
      await rm(TEST_DATA_PATH, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe('Player Persistence', () => {
    it('should save player to file', async () => {
      const room = createMockObject('/areas/town/square', {});
      const player = createMockObject(
        '/std/player',
        {
          name: 'Hero',
          level: 5,
          hp: 100,
        },
        true
      );
      player.environment = room;

      await store.savePlayer(player);

      // Check file exists
      const exists = await store.playerExists('Hero');
      expect(exists).toBe(true);
    });

    it('should load player from file', async () => {
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

      await store.savePlayer(player);

      const loaded = await store.loadPlayer('Hero');

      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('Hero');
      expect(loaded!.location).toBe('/areas/town/square');
      expect(loaded!.state.properties.level).toBe(5);
    });

    it('should return null for non-existent player', async () => {
      const loaded = await store.loadPlayer('NonExistent');
      expect(loaded).toBeNull();
    });

    it('should check if player exists', async () => {
      const player = createMockObject('/std/player', { name: 'Test' }, true);
      await store.savePlayer(player);

      expect(await store.playerExists('Test')).toBe(true);
      expect(await store.playerExists('Other')).toBe(false);
    });

    it('should list all saved players', async () => {
      const p1 = createMockObject('/std/player', { name: 'Alice' }, true);
      const p2 = createMockObject('/std/player', { name: 'Bob' }, true);

      await store.savePlayer(p1);
      await store.savePlayer(p2);

      const players = await store.listPlayers();

      expect(players).toContain('alice');
      expect(players).toContain('bob');
    });

    it('should delete player', async () => {
      const player = createMockObject('/std/player', { name: 'ToDelete' }, true);
      await store.savePlayer(player);

      expect(await store.playerExists('ToDelete')).toBe(true);

      const deleted = await store.deletePlayer('ToDelete');

      expect(deleted).toBe(true);
      expect(await store.playerExists('ToDelete')).toBe(false);
    });

    it('should return false when deleting non-existent player', async () => {
      const deleted = await store.deletePlayer('NonExistent');
      expect(deleted).toBe(false);
    });

    it('should sanitize player name for filename', async () => {
      const player = createMockObject('/std/player', { name: 'Test@User!' }, true);
      await store.savePlayer(player);

      const exists = await store.playerExists('Test@User!');
      expect(exists).toBe(true);
    });
  });

  describe('World State Persistence', () => {
    it('should save world state', async () => {
      const room = createMockObject('/areas/town/square', { name: 'Town Square' });
      const sword = createMockObject('/std/sword', { name: 'Sword' }, true);

      await store.saveWorldState([room, sword]);

      const state = await store.loadWorldState();
      expect(state).not.toBeNull();
      expect(state!.objects).toHaveLength(2);
    });

    it('should load world state with version', async () => {
      const room = createMockObject('/areas/town/square', {});
      await store.saveWorldState([room]);

      const state = await store.loadWorldState();

      expect(state!.version).toBe(1);
      expect(state!.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should return null when no world state exists', async () => {
      const state = await store.loadWorldState();
      expect(state).toBeNull();
    });
  });

  describe('Permissions Persistence', () => {
    it('should save permissions', async () => {
      const data = {
        levels: { admin: 3, builder: 1 },
        domains: { builder: ['/areas/castle/'] },
      };

      await store.savePermissions(data);

      const loaded = await store.loadPermissions();
      expect(loaded).toEqual(data);
    });

    it('should return null when no permissions exist', async () => {
      const loaded = await store.loadPermissions();
      expect(loaded).toBeNull();
    });
  });

  describe('Auto-Save', () => {
    it('should start and stop auto-save', async () => {
      let saveCount = 0;
      const getObjects = () => {
        saveCount++;
        return [];
      };

      store.startAutoSave(50, getObjects);

      await new Promise((resolve) => setTimeout(resolve, 120));

      store.stopAutoSave();

      expect(saveCount).toBeGreaterThanOrEqual(2);
    });

    it('should stop previous auto-save when starting new one', async () => {
      let count1 = 0;
      let count2 = 0;

      store.startAutoSave(50, () => {
        count1++;
        return [];
      });

      await new Promise((resolve) => setTimeout(resolve, 60));

      store.startAutoSave(50, () => {
        count2++;
        return [];
      });

      await new Promise((resolve) => setTimeout(resolve, 120));

      store.stopAutoSave();

      // First should have been called once or twice, second multiple times
      expect(count1).toBeLessThanOrEqual(2);
      expect(count2).toBeGreaterThanOrEqual(2);
    });
  });

  describe('restoreObjectState', () => {
    it('should restore state to object', async () => {
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

      await store.savePlayer(player);

      const loaded = await store.loadPlayer('Hero');
      const newPlayer = createMockObject('/std/player', {}, true);

      store.restoreObjectState(newPlayer, loaded!.state);

      const p = newPlayer as Record<string, unknown>;
      expect(p.level).toBe(5);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const s1 = getFileStore();
      const s2 = getFileStore();

      expect(s1).toBe(s2);
    });

    it('should reset instance', () => {
      const s1 = getFileStore();
      resetFileStore();
      const s2 = getFileStore();

      expect(s2).not.toBe(s1);
    });
  });
});
