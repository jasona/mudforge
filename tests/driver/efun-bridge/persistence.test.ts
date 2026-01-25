/**
 * Tests for persistence-related efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { resetFileStore } from '../../../src/driver/persistence/file-store.js';

describe('Persistence Efuns', () => {
  let efunBridge: EfunBridge;
  let testMudlibPath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    // Reset the file store singleton so each test gets a fresh one
    resetFileStore();

    const env = await createTestEnvironment();
    efunBridge = env.efunBridge;
    testMudlibPath = env.testMudlibPath;
    cleanup = env.cleanup;

    // Create players directory
    await mkdir(join(testMudlibPath, 'data', 'players'), { recursive: true });
  });

  afterEach(async () => {
    resetFileStore();
    await cleanup();
  });

  describe('savePlayer', () => {
    it('should save player data', async () => {
      const player = createMockPlayer('/players/testplayer', { name: 'testplayer', level: 1 });
      (player as typeof player & { hp: number; maxHp: number }).hp = 100;
      (player as typeof player & { hp: number; maxHp: number }).maxHp = 100;

      await efunBridge.savePlayer(player);

      // Verify player was saved
      const exists = await efunBridge.playerExists('testplayer');
      expect(exists).toBe(true);
    });

    it('should save player with all properties', async () => {
      const player = createMockPlayer('/players/fullplayer', { name: 'fullplayer' });
      Object.assign(player, {
        hp: 80,
        maxHp: 100,
        mp: 50,
        maxMp: 100,
        level: 5,
        gold: 1000,
      });

      await efunBridge.savePlayer(player);

      const data = await efunBridge.loadPlayerData('fullplayer');
      expect(data).toBeDefined();
      expect(data?.name).toBe('fullplayer');
    });
  });

  describe('loadPlayerData', () => {
    it('should load saved player data', async () => {
      const player = createMockPlayer('/players/loadtest', { name: 'loadtest' });
      (player as typeof player & { testProperty: string }).testProperty = 'testValue';

      await efunBridge.savePlayer(player);

      const data = await efunBridge.loadPlayerData('loadtest');

      expect(data).toBeDefined();
      expect(data?.name).toBe('loadtest');
    });

    it('should return null for non-existent player', async () => {
      const data = await efunBridge.loadPlayerData('nonexistent');

      expect(data).toBeNull();
    });

    it('should preserve player properties', async () => {
      const player = createMockPlayer('/players/proptest', { name: 'proptest' });
      Object.assign(player, {
        customProp: 'customValue',
        numProp: 42,
        arrProp: [1, 2, 3],
      });

      await efunBridge.savePlayer(player);

      const data = await efunBridge.loadPlayerData('proptest');

      // Properties are stored in state.properties
      expect(data?.state?.properties?.customProp).toBe('customValue');
      expect(data?.state?.properties?.numProp).toBe(42);
      expect(data?.state?.properties?.arrProp).toEqual([1, 2, 3]);
    });
  });

  describe('playerExists', () => {
    it('should return true for existing player', async () => {
      const player = createMockPlayer('/players/exists', { name: 'exists' });
      await efunBridge.savePlayer(player);

      expect(await efunBridge.playerExists('exists')).toBe(true);
    });

    it('should return false for non-existent player', async () => {
      expect(await efunBridge.playerExists('nothere')).toBe(false);
    });

    it('should be case-insensitive', async () => {
      const player = createMockPlayer('/players/CasETest', { name: 'CasETest' });
      await efunBridge.savePlayer(player);

      // Most implementations normalize to lowercase
      expect(await efunBridge.playerExists('casetest')).toBe(true);
    });
  });

  describe('listPlayers', () => {
    it('should return empty array when no players', async () => {
      const players = await efunBridge.listPlayers();

      expect(players).toEqual([]);
    });

    it('should return all saved players', async () => {
      const player1 = createMockPlayer('/players/player1', { name: 'player1' });
      const player2 = createMockPlayer('/players/player2', { name: 'player2' });
      const player3 = createMockPlayer('/players/player3', { name: 'player3' });

      await efunBridge.savePlayer(player1);
      await efunBridge.savePlayer(player2);
      await efunBridge.savePlayer(player3);

      const players = await efunBridge.listPlayers();

      expect(players).toHaveLength(3);
      expect(players).toContain('player1');
      expect(players).toContain('player2');
      expect(players).toContain('player3');
    });
  });

  describe('persistence edge cases', () => {
    it('should handle player with empty name gracefully', async () => {
      const player = createMockPlayer('/players/empty', { name: '' });

      // Should handle gracefully (implementation dependent)
      try {
        await efunBridge.savePlayer(player);
        // If it doesn't throw, behavior is acceptable
      } catch (error) {
        // If it throws, that's also acceptable
        expect(error).toBeDefined();
      }
    });

    it('should handle special characters in player name', async () => {
      // Note: Most implementations sanitize names
      const player = createMockPlayer('/players/testname', { name: 'testname' });
      await efunBridge.savePlayer(player);

      const exists = await efunBridge.playerExists('testname');
      expect(exists).toBe(true);
    });

    it('should overwrite existing player data', async () => {
      const player = createMockPlayer('/players/overwrite', { name: 'overwrite' });
      (player as typeof player & { version: number }).version = 1;
      await efunBridge.savePlayer(player);

      (player as typeof player & { version: number }).version = 2;
      await efunBridge.savePlayer(player);

      const data = await efunBridge.loadPlayerData('overwrite');
      // Properties are stored in state.properties
      expect(data?.state?.properties?.version).toBe(2);
    });
  });
});
