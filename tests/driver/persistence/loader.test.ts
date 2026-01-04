import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Loader, getLoader, resetLoader } from '../../../src/driver/persistence/loader.js';
import { getFileStore, resetFileStore } from '../../../src/driver/persistence/file-store.js';
import { resetSerializer } from '../../../src/driver/persistence/serializer.js';
import type { MudObject } from '../../../src/driver/types.js';
import { rm, mkdir } from 'fs/promises';

// Test data directory
const TEST_DATA_PATH = './test-data-loader';

// Mock MudObject implementation
function createMockObject(
  path: string,
  props: Record<string, unknown> = {},
  isClone: boolean = false
): MudObject {
  return {
    objectPath: path,
    objectId: isClone ? `${path}#${Math.floor(Math.random() * 1000)}` : path,
    isClone,
    blueprint: isClone ? ({ objectPath: path } as MudObject) : undefined,
    environment: null,
    inventory: [],
    moveTo: vi.fn(async () => true),
    onCreate: () => {},
    onDestroy: () => {},
    ...props,
  } as unknown as MudObject;
}

describe('Loader', () => {
  let loader: Loader;
  let loadedObjects: Map<string, MudObject>;

  beforeEach(async () => {
    resetLoader();
    resetFileStore();
    resetSerializer();

    // Clean up test directory
    try {
      await rm(TEST_DATA_PATH, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
    await mkdir(TEST_DATA_PATH, { recursive: true });

    // Initialize file store with test path
    getFileStore({ dataPath: TEST_DATA_PATH });

    loadedObjects = new Map();

    loader = new Loader();
    loader.configure({
      loadObject: async (path) => {
        const obj = createMockObject(path);
        loadedObjects.set(path, obj);
        return obj;
      },
      cloneObject: async (path) => {
        const obj = createMockObject(path, {}, true);
        loadedObjects.set(obj.objectId, obj);
        return obj;
      },
      findObject: (pathOrId) => loadedObjects.get(pathOrId),
    });
  });

  afterEach(async () => {
    resetLoader();
    resetFileStore();

    // Clean up test directory
    try {
      await rm(TEST_DATA_PATH, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  describe('configure', () => {
    it('should require configuration before use', async () => {
      resetLoader();
      const unconfigured = new Loader();

      await expect(unconfigured.preload(['/test'])).rejects.toThrow('Loader not configured');
    });
  });

  describe('preload', () => {
    it('should preload objects from paths', async () => {
      const result = await loader.preload(['/std/room', '/std/item', '/std/weapon']);

      expect(result.total).toBe(3);
      expect(result.success).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
    });

    it('should track failed loads', async () => {
      loader.configure({
        loadObject: async (path) => {
          if (path === '/bad/path') return undefined;
          return createMockObject(path);
        },
        cloneObject: async () => undefined,
        findObject: () => undefined,
      });

      const result = await loader.preload(['/std/room', '/bad/path', '/std/item']);

      expect(result.total).toBe(3);
      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed).toContain('/bad/path');
    });

    it('should handle load errors gracefully', async () => {
      loader.configure({
        loadObject: async (path) => {
          if (path === '/error/path') throw new Error('Load failed');
          return createMockObject(path);
        },
        cloneObject: async () => undefined,
        findObject: () => undefined,
      });

      const result = await loader.preload(['/std/room', '/error/path']);

      expect(result.success).toHaveLength(1);
      expect(result.failed).toContain('/error/path');
    });
  });

  describe('loadWorld', () => {
    it('should return empty stats when no world state', async () => {
      const stats = await loader.loadWorld();

      expect(stats.loaded).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.skipped).toBe(0);
    });

    it('should load world state from file', async () => {
      // Save a world state first
      const fileStore = getFileStore();
      const room = createMockObject('/areas/town/square', { name: 'Town Square' });
      await fileStore.saveWorldState([room]);

      // Load it back
      const stats = await loader.loadWorld();

      expect(stats.loaded).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should restore object state', async () => {
      // Save with properties
      const fileStore = getFileStore();
      const room = createMockObject('/areas/town/square', {
        name: 'Town Square',
        description: 'A busy square',
      });
      await fileStore.saveWorldState([room]);

      // Clear and reload
      loadedObjects.clear();
      await loader.loadWorld();

      // Find the reloaded object
      const reloaded = loadedObjects.get('/areas/town/square');
      expect(reloaded).toBeDefined();
      expect((reloaded as Record<string, unknown>).name).toBe('Town Square');
    });
  });

  describe('loadPlayer', () => {
    it('should load existing player', async () => {
      // Save player first
      const fileStore = getFileStore();
      const room = createMockObject('/areas/void/void', {});
      const player = createMockObject(
        '/std/player',
        {
          name: 'Hero',
          level: 10,
        },
        true
      );
      player.environment = room;
      await fileStore.savePlayer(player);

      // Make room available
      loadedObjects.set('/areas/void/void', room);

      // Load player
      const loaded = await loader.loadPlayer('Hero');

      expect(loaded).not.toBeNull();
      const p = loaded as Record<string, unknown>;
      expect(p.name).toBe('Hero');
      expect(p.level).toBe(10);
    });

    it('should return null for non-existent player', async () => {
      const loaded = await loader.loadPlayer('NonExistent');
      expect(loaded).toBeNull();
    });

    it('should move player to last location', async () => {
      const fileStore = getFileStore();
      const room = createMockObject('/areas/town/square', {});
      const player = createMockObject('/std/player', { name: 'Hero' }, true);
      player.environment = room;
      await fileStore.savePlayer(player);

      loadedObjects.set('/areas/town/square', room);

      const loaded = await loader.loadPlayer('Hero');

      expect(loaded!.moveTo).toHaveBeenCalledWith(room);
    });
  });

  describe('createPlayer', () => {
    it('should create new player', async () => {
      const room = createMockObject('/areas/void/void', {});
      loadedObjects.set('/areas/void/void', room);

      const player = await loader.createPlayer('NewHero');

      expect(player).not.toBeNull();
      const p = player as Record<string, unknown>;
      expect(p.name).toBe('NewHero');
    });

    it('should move player to starting room', async () => {
      const room = createMockObject('/areas/void/void', {});
      loadedObjects.set('/areas/void/void', room);

      const player = await loader.createPlayer('NewHero');

      expect(player!.moveTo).toHaveBeenCalledWith(room);
    });

    it('should use custom starting room', async () => {
      const customRoom = createMockObject('/areas/custom/start', {});
      loadedObjects.set('/areas/custom/start', customRoom);

      const player = await loader.createPlayer('NewHero', '/std/player', '/areas/custom/start');

      expect(player!.moveTo).toHaveBeenCalledWith(customRoom);
    });
  });

  describe('playerExists', () => {
    it('should check if player exists', async () => {
      const fileStore = getFileStore();
      const player = createMockObject('/std/player', { name: 'Existing' }, true);
      await fileStore.savePlayer(player);

      expect(await loader.playerExists('Existing')).toBe(true);
      expect(await loader.playerExists('NonExisting')).toBe(false);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const l1 = getLoader();
      const l2 = getLoader();

      expect(l1).toBe(l2);
    });

    it('should reset instance', () => {
      const l1 = getLoader();
      resetLoader();
      const l2 = getLoader();

      expect(l2).not.toBe(l1);
    });
  });
});
