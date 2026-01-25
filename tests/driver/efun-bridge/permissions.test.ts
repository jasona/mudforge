/**
 * Tests for permission-related efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { getPermissions } from '../../../src/driver/permissions.js';

describe('Permission Efuns', () => {
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

  describe('checkReadPermission', () => {
    it('should return true when player can read', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);

      expect(efunBridge.checkReadPermission('/test/file.ts')).toBe(true);
    });

    it('should return true for public path', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      // Players can read public areas
      expect(efunBridge.checkReadPermission('/areas/town/main.ts')).toBe(true);
    });
  });

  describe('checkWritePermission', () => {
    it('should return true for admin', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);

      expect(efunBridge.checkWritePermission('/anywhere/file.ts')).toBe(true);
    });

    it('should return false for player on protected path', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(efunBridge.checkWritePermission('/std/room.ts')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin player', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);

      expect(efunBridge.isAdmin()).toBe(true);
    });

    it('should return false for non-admin player', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(efunBridge.isAdmin()).toBe(false);
    });

    it('should return false when no player context', () => {
      efunBridge.clearContext();

      expect(efunBridge.isAdmin()).toBe(false);
    });
  });

  describe('isBuilder', () => {
    it('should return true for builder player', () => {
      const builder = createMockPlayer('/players/builder', { name: 'builder', level: 1 });
      efunBridge.setContext({ thisPlayer: builder, thisObject: builder });
      getPermissions().setLevel('builder', 1);

      expect(efunBridge.isBuilder()).toBe(true);
    });

    it('should return true for admin (higher level)', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);

      expect(efunBridge.isBuilder()).toBe(true);
    });

    it('should return false for regular player', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(efunBridge.isBuilder()).toBe(false);
    });
  });

  describe('getPermissionLevel', () => {
    it('should return correct level for player', () => {
      const player = createMockPlayer('/players/test', { name: 'test', level: 2 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });
      getPermissions().setLevel('test', 2);

      expect(efunBridge.getPermissionLevel()).toBe(2);
    });

    it('should return 0 when no player context', () => {
      efunBridge.clearContext();

      expect(efunBridge.getPermissionLevel()).toBe(0);
    });
  });

  describe('getPlayerPermissionLevel', () => {
    it('should return level for any player by name', () => {
      getPermissions().setLevel('testplayer', 2);

      expect(efunBridge.getPlayerPermissionLevel('testplayer')).toBe(2);
    });

    it('should return 0 for unknown player', () => {
      expect(efunBridge.getPlayerPermissionLevel('unknown')).toBe(0);
    });
  });

  describe('setPermissionLevel', () => {
    it('should set level when admin', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);

      const result = efunBridge.setPermissionLevel('newbuilder', 1);

      expect(result.success).toBe(true);
      expect(efunBridge.getPlayerPermissionLevel('newbuilder')).toBe(1);
    });

    it('should reject when not admin', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const result = efunBridge.setPermissionLevel('target', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin permission required');
    });

    it('should reject invalid level', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);

      const result = efunBridge.setPermissionLevel('target', 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid level (must be 0-3)');
    });

    it('should reject negative level', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);

      const result = efunBridge.setPermissionLevel('target', -1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid level (must be 0-3)');
    });

    it('should allow first admin when no context and no existing admins', () => {
      efunBridge.clearContext();

      const result = efunBridge.setPermissionLevel('firstadmin', 3);

      expect(result.success).toBe(true);
      expect(efunBridge.getPlayerPermissionLevel('firstadmin')).toBe(3);
    });
  });

  describe('getPermissionLevelName', () => {
    it('should return correct names for each level', () => {
      expect(efunBridge.getPermissionLevelName(0)).toBe('Player');
      expect(efunBridge.getPermissionLevelName(1)).toBe('Builder');
      expect(efunBridge.getPermissionLevelName(2)).toBe('Senior Builder');
      expect(efunBridge.getPermissionLevelName(3)).toBe('Administrator');
    });
  });

  describe('getDomains', () => {
    it('should return empty array when no domains assigned', () => {
      const builder = createMockPlayer('/players/builder', { name: 'builder', level: 1 });
      efunBridge.setContext({ thisPlayer: builder, thisObject: builder });

      expect(efunBridge.getDomains()).toEqual([]);
    });

    it('should return empty array when no player context', () => {
      efunBridge.clearContext();

      expect(efunBridge.getDomains()).toEqual([]);
    });
  });

  describe('addDomain', () => {
    it('should add domain when admin', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);

      const result = efunBridge.addDomain('builder', '/areas/forest');

      expect(result.success).toBe(true);
    });

    it('should reject when not admin', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const result = efunBridge.addDomain('builder', '/areas/forest');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Admin permission required');
    });
  });

  describe('removeDomain', () => {
    it('should remove domain when admin', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);
      getPermissions().addDomain('builder', '/areas/forest');

      const result = efunBridge.removeDomain('builder', '/areas/forest');

      expect(result.success).toBe(true);
    });

    it('should reject when not admin', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const result = efunBridge.removeDomain('builder', '/areas/forest');

      expect(result.success).toBe(false);
    });
  });

  describe('builder path management', () => {
    beforeEach(() => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);
    });

    it('should get builder paths', () => {
      const paths = efunBridge.getBuilderPaths();
      expect(Array.isArray(paths)).toBe(true);
    });

    it('should add builder path', () => {
      const result = efunBridge.addBuilderPath('/areas/newzone');
      expect(result.success).toBe(true);
    });

    it('should remove builder path', () => {
      efunBridge.addBuilderPath('/areas/tempzone');
      const result = efunBridge.removeBuilderPath('/areas/tempzone');
      expect(result.success).toBe(true);
    });

    it('should return error when removing non-existent path', () => {
      const result = efunBridge.removeBuilderPath('/nonexistent/path');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Path not found');
    });
  });

  describe('senior path management', () => {
    beforeEach(() => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);
    });

    it('should get senior paths', () => {
      const paths = efunBridge.getSeniorPaths();
      expect(Array.isArray(paths)).toBe(true);
    });

    it('should add senior path', () => {
      const result = efunBridge.addSeniorPath('/std/newclass');
      expect(result.success).toBe(true);
    });

    it('should remove senior path', () => {
      efunBridge.addSeniorPath('/std/tempclass');
      const result = efunBridge.removeSeniorPath('/std/tempclass');
      expect(result.success).toBe(true);
    });
  });

  describe('protected path management', () => {
    beforeEach(() => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);
    });

    it('should get protected paths', () => {
      const paths = efunBridge.getProtectedPaths();
      expect(Array.isArray(paths)).toBe(true);
    });

    it('should add protected path', () => {
      const result = efunBridge.addProtectedPath('/secure/secrets');
      expect(result.success).toBe(true);
    });

    it('should remove protected path', () => {
      efunBridge.addProtectedPath('/secure/temp');
      const result = efunBridge.removeProtectedPath('/secure/temp');
      expect(result.success).toBe(true);
    });
  });

  describe('forbidden files management', () => {
    beforeEach(() => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
      getPermissions().setLevel('admin', 3);
    });

    it('should get forbidden files', () => {
      const files = efunBridge.getForbiddenFiles();
      expect(Array.isArray(files)).toBe(true);
    });

    it('should add forbidden file', () => {
      const result = efunBridge.addForbiddenFile('/data/secrets.json');
      expect(result.success).toBe(true);
    });

    it('should remove forbidden file', () => {
      efunBridge.addForbiddenFile('/data/temp.json');
      const result = efunBridge.removeForbiddenFile('/data/temp.json');
      expect(result.success).toBe(true);
    });

    it('should return error when removing non-existent file', () => {
      const result = efunBridge.removeForbiddenFile('/nonexistent/file.json');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('permission denied scenarios', () => {
    it('should reject builder path changes from non-admin', () => {
      const builder = createMockPlayer('/players/builder', { name: 'builder', level: 1 });
      efunBridge.setContext({ thisPlayer: builder, thisObject: builder });

      expect(efunBridge.addBuilderPath('/test').success).toBe(false);
      expect(efunBridge.removeBuilderPath('/test').success).toBe(false);
    });

    it('should reject senior path changes from non-admin', () => {
      const builder = createMockPlayer('/players/builder', { name: 'builder', level: 1 });
      efunBridge.setContext({ thisPlayer: builder, thisObject: builder });

      expect(efunBridge.addSeniorPath('/test').success).toBe(false);
      expect(efunBridge.removeSeniorPath('/test').success).toBe(false);
    });

    it('should reject protected path changes from non-admin', () => {
      const senior = createMockPlayer('/players/senior', { name: 'senior', level: 2 });
      efunBridge.setContext({ thisPlayer: senior, thisObject: senior });

      expect(efunBridge.addProtectedPath('/test').success).toBe(false);
      expect(efunBridge.removeProtectedPath('/test').success).toBe(false);
    });

    it('should reject forbidden file changes from non-admin', () => {
      const builder = createMockPlayer('/players/builder', { name: 'builder', level: 1 });
      efunBridge.setContext({ thisPlayer: builder, thisObject: builder });

      expect(efunBridge.addForbiddenFile('/test').success).toBe(false);
      expect(efunBridge.removeForbiddenFile('/test').success).toBe(false);
    });
  });
});
