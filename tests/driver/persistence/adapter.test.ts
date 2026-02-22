/**
 * Shared adapter test suite.
 * These tests can run against any PersistenceAdapter implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'fs/promises';
import { FilesystemAdapter } from '../../../src/driver/persistence/filesystem-adapter.js';
import type { PersistenceAdapter } from '../../../src/driver/persistence/adapter.js';
import type { PlayerSaveData, WorldState } from '../../../src/driver/persistence/serializer.js';

const TEST_DATA_PATH = './test-data-adapter';

function createPlayerData(name: string, props: Record<string, unknown> = {}): PlayerSaveData {
  return {
    name,
    location: '/areas/void/void',
    state: {
      objectPath: `/std/player#${Math.floor(Math.random() * 1000)}`,
      isClone: true,
      properties: { name, level: 1, ...props },
      timestamp: Date.now(),
    },
    savedAt: Date.now(),
  };
}

function createWorldState(): WorldState {
  return {
    version: 1,
    objects: [
      {
        objectPath: '/areas/town/square',
        isClone: false,
        properties: { name: 'Town Square' },
        timestamp: Date.now(),
      },
    ],
    timestamp: Date.now(),
  };
}

describe('PersistenceAdapter (Filesystem)', () => {
  let adapter: PersistenceAdapter;

  beforeEach(async () => {
    try { await rm(TEST_DATA_PATH, { recursive: true }); } catch { /* ignore */ }
    await mkdir(TEST_DATA_PATH, { recursive: true });
    adapter = new FilesystemAdapter({ dataPath: TEST_DATA_PATH });
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.shutdown();
    try { await rm(TEST_DATA_PATH, { recursive: true }); } catch { /* ignore */ }
  });

  // ========== Player Tests ==========

  describe('player persistence', () => {
    it('should save and load a player', async () => {
      const data = createPlayerData('hero', { level: 5, gold: 100 });
      await adapter.savePlayer(data);

      const loaded = await adapter.loadPlayer('hero');
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('hero');
      expect(loaded!.state.properties.level).toBe(5);
      expect(loaded!.state.properties.gold).toBe(100);
    });

    it('should return null for non-existent player', async () => {
      const loaded = await adapter.loadPlayer('nobody');
      expect(loaded).toBeNull();
    });

    it('should check player existence', async () => {
      expect(await adapter.playerExists('hero')).toBe(false);
      await adapter.savePlayer(createPlayerData('hero'));
      expect(await adapter.playerExists('hero')).toBe(true);
    });

    it('should list players', async () => {
      await adapter.savePlayer(createPlayerData('alpha'));
      await adapter.savePlayer(createPlayerData('beta'));
      await adapter.savePlayer(createPlayerData('gamma'));

      const players = await adapter.listPlayers();
      expect(players).toHaveLength(3);
      expect(players).toContain('alpha');
      expect(players).toContain('beta');
      expect(players).toContain('gamma');
    });

    it('should delete a player', async () => {
      await adapter.savePlayer(createPlayerData('doomed'));
      expect(await adapter.playerExists('doomed')).toBe(true);

      const deleted = await adapter.deletePlayer('doomed');
      expect(deleted).toBe(true);
      expect(await adapter.playerExists('doomed')).toBe(false);
    });

    it('should return false when deleting non-existent player', async () => {
      const deleted = await adapter.deletePlayer('ghost');
      expect(deleted).toBe(false);
    });

    it('should overwrite existing player data', async () => {
      await adapter.savePlayer(createPlayerData('hero', { level: 1 }));
      await adapter.savePlayer(createPlayerData('hero', { level: 10 }));

      const loaded = await adapter.loadPlayer('hero');
      expect(loaded!.state.properties.level).toBe(10);
    });

    it('should be case-insensitive for player names', async () => {
      await adapter.savePlayer(createPlayerData('Hero'));
      expect(await adapter.playerExists('hero')).toBe(true);
    });
  });

  // ========== World State Tests ==========

  describe('world state', () => {
    it('should save and load world state', async () => {
      const state = createWorldState();
      await adapter.saveWorldState(state);

      const loaded = await adapter.loadWorldState();
      expect(loaded).not.toBeNull();
      expect(loaded!.version).toBe(1);
      expect(loaded!.objects).toHaveLength(1);
    });

    it('should return null when no world state', async () => {
      const loaded = await adapter.loadWorldState();
      expect(loaded).toBeNull();
    });
  });

  // ========== Permissions Tests ==========

  describe('permissions', () => {
    it('should save and load permissions', async () => {
      const perms = {
        levels: { admin: 3, builder: 1 },
        domains: { builder: ['/areas/forest/'] },
      };
      await adapter.savePermissions(perms);

      const loaded = await adapter.loadPermissions();
      expect(loaded).not.toBeNull();
      expect(loaded!.levels.admin).toBe(3);
      expect(loaded!.domains.builder).toEqual(['/areas/forest/']);
    });

    it('should return null when no permissions', async () => {
      const loaded = await adapter.loadPermissions();
      expect(loaded).toBeNull();
    });
  });

  // ========== Generic Data Store Tests ==========

  describe('generic data store', () => {
    it('should save and load data', async () => {
      await adapter.saveData('config', 'settings', { theme: 'dark', fontSize: 14 });

      const loaded = await adapter.loadData<{ theme: string; fontSize: number }>('config', 'settings');
      expect(loaded).not.toBeNull();
      expect(loaded!.theme).toBe('dark');
      expect(loaded!.fontSize).toBe(14);
    });

    it('should return null for non-existent data', async () => {
      const loaded = await adapter.loadData('config', 'missing');
      expect(loaded).toBeNull();
    });

    it('should check data existence', async () => {
      expect(await adapter.dataExists('config', 'settings')).toBe(false);
      await adapter.saveData('config', 'settings', { value: true });
      expect(await adapter.dataExists('config', 'settings')).toBe(true);
    });

    it('should delete data', async () => {
      await adapter.saveData('config', 'settings', { value: true });
      expect(await adapter.dataExists('config', 'settings')).toBe(true);

      const deleted = await adapter.deleteData('config', 'settings');
      expect(deleted).toBe(true);
      expect(await adapter.dataExists('config', 'settings')).toBe(false);
    });

    it('should return false when deleting non-existent data', async () => {
      const deleted = await adapter.deleteData('config', 'missing');
      expect(deleted).toBe(false);
    });

    it('should list keys in a namespace', async () => {
      await adapter.saveData('bots', 'bot1', { name: 'Bot 1' });
      await adapter.saveData('bots', 'bot2', { name: 'Bot 2' });
      await adapter.saveData('bots', 'bot3', { name: 'Bot 3' });

      const keys = await adapter.listKeys('bots');
      expect(keys).toHaveLength(3);
      expect(keys).toContain('bot1');
      expect(keys).toContain('bot2');
      expect(keys).toContain('bot3');
    });

    it('should return empty array for non-existent namespace', async () => {
      const keys = await adapter.listKeys('nonexistent');
      expect(keys).toEqual([]);
    });

    it('should isolate namespaces', async () => {
      await adapter.saveData('ns1', 'key', { v: 1 });
      await adapter.saveData('ns2', 'key', { v: 2 });

      const d1 = await adapter.loadData<{ v: number }>('ns1', 'key');
      const d2 = await adapter.loadData<{ v: number }>('ns2', 'key');

      expect(d1!.v).toBe(1);
      expect(d2!.v).toBe(2);
    });

    it('should handle complex data structures', async () => {
      const complexData = {
        entries: [
          { id: 'a', tags: ['x', 'y'], nested: { deep: true } },
          { id: 'b', tags: ['z'], nested: { deep: false } },
        ],
        metadata: { count: 2 },
      };

      await adapter.saveData('test', 'complex', complexData);
      const loaded = await adapter.loadData<typeof complexData>('test', 'complex');

      expect(loaded).toEqual(complexData);
    });
  });
});
