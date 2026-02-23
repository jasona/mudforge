/**
 * Filesystem-specific adapter tests.
 * Tests atomic writes, backups, key sanitization, and directory handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import { FilesystemAdapter } from '../../../src/driver/persistence/filesystem-adapter.js';
import type { PlayerSaveData } from '../../../src/driver/persistence/serializer.js';

const TEST_DATA_PATH = './test-data-fs-adapter';

function createPlayerData(name: string): PlayerSaveData {
  return {
    name,
    location: '/areas/void/void',
    state: {
      objectPath: `/std/player#${Math.floor(Math.random() * 1000)}`,
      isClone: true,
      properties: { name, level: 1 },
      timestamp: Date.now(),
    },
    savedAt: Date.now(),
  };
}

describe('FilesystemAdapter', () => {
  let adapter: FilesystemAdapter;

  beforeEach(async () => {
    try { await rm(TEST_DATA_PATH, { recursive: true }); } catch { /* ignore */ }
    adapter = new FilesystemAdapter({ dataPath: TEST_DATA_PATH });
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.shutdown();
    try { await rm(TEST_DATA_PATH, { recursive: true }); } catch { /* ignore */ }
  });

  describe('initialization', () => {
    it('should create data directory on initialize', async () => {
      await access(TEST_DATA_PATH, constants.F_OK);
    });

    it('should create players directory on initialize', async () => {
      await access(join(TEST_DATA_PATH, 'players'), constants.F_OK);
    });
  });

  describe('atomic writes', () => {
    it('should create backup files for players', async () => {
      // Save twice to trigger backup
      await adapter.savePlayer(createPlayerData('backuptest'));
      await adapter.savePlayer(createPlayerData('backuptest'));

      const bakPath = join(TEST_DATA_PATH, 'players', 'backuptest.json.bak');
      await access(bakPath, constants.F_OK);
    });

    it('should write valid JSON', async () => {
      await adapter.savePlayer(createPlayerData('jsontest'));

      const filePath = join(TEST_DATA_PATH, 'players', 'jsontest.json');
      const content = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.name).toBe('jsontest');
    });

    it('should create backup files for world state', async () => {
      const state = { version: 1, objects: [], timestamp: Date.now() };
      await adapter.saveWorldState(state);
      await adapter.saveWorldState(state);

      const bakPath = join(TEST_DATA_PATH, 'world-state.json.bak');
      await access(bakPath, constants.F_OK);
    });
  });

  describe('key sanitization', () => {
    it('should sanitize player names', async () => {
      await adapter.savePlayer(createPlayerData('Test-Player_123'));
      expect(await adapter.playerExists('test-player_123')).toBe(true);
    });

    it('should prevent path traversal in data keys', async () => {
      await adapter.saveData('test', 'safe-key', { ok: true });
      const loaded = await adapter.loadData('test', 'safe-key');
      expect(loaded).toEqual({ ok: true });

      // Path traversal characters should be sanitized
      await adapter.saveData('test', '../../../etc/passwd', { bad: true });
      // Should still be loadable with the same key
      const loaded2 = await adapter.loadData('test', '../../../etc/passwd');
      expect(loaded2).toEqual({ bad: true });
      // The file should NOT exist outside the data directory
      try {
        await access('/etc/passwd.json', constants.F_OK);
      } catch {
        // Expected - file should not exist at traversal target
      }
    });

    it('should sanitize namespace names', async () => {
      await adapter.saveData('my.namespace', 'key', { value: 1 });
      const loaded = await adapter.loadData('my.namespace', 'key');
      expect(loaded).toEqual({ value: 1 });
    });
  });

  describe('directory auto-creation', () => {
    it('should auto-create namespace directories', async () => {
      await adapter.saveData('new-namespace', 'test', { created: true });
      await access(join(TEST_DATA_PATH, 'new-namespace'), constants.F_OK);
    });

    it('should handle nested data paths', async () => {
      await adapter.saveData('images-weapon', 'hash123', { image: 'base64data' });
      const loaded = await adapter.loadData('images-weapon', 'hash123');
      expect(loaded).toEqual({ image: 'base64data' });
    });
  });

  describe('generic data operations', () => {
    it('should overwrite existing data', async () => {
      await adapter.saveData('ns', 'key', { v: 1 });
      await adapter.saveData('ns', 'key', { v: 2 });

      const loaded = await adapter.loadData<{ v: number }>('ns', 'key');
      expect(loaded!.v).toBe(2);
    });

    it('should list only json files', async () => {
      await adapter.saveData('mixed', 'a', { v: 1 });
      await adapter.saveData('mixed', 'b', { v: 2 });

      const keys = await adapter.listKeys('mixed');
      expect(keys).toHaveLength(2);
      expect(keys.sort()).toEqual(['a', 'b']);
    });
  });
});
