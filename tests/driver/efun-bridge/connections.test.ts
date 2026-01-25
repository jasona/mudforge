/**
 * Tests for connection management efuns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestEnvironment, createMockPlayer, createMockConnection } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { BaseMudObject } from '../../../src/driver/base-object.js';

describe('Connection Efuns', () => {
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

  describe('bindPlayerToConnection', () => {
    it('should bind player when callback is set', () => {
      const callback = vi.fn();
      efunBridge.setBindPlayerCallback(callback);

      const connection = createMockConnection();
      const player = createMockPlayer();

      efunBridge.bindPlayerToConnection(connection, player);

      expect(callback).toHaveBeenCalledWith(connection, player);
    });

    it('should not throw when callback is not set', () => {
      const connection = createMockConnection();
      const player = createMockPlayer();

      expect(() => efunBridge.bindPlayerToConnection(connection, player)).not.toThrow();
    });
  });

  describe('findConnectedPlayer', () => {
    it('should find player when callback is set', () => {
      const mockPlayer = createMockPlayer('/players/testuser', { name: 'testuser' });
      const callback = vi.fn().mockReturnValue(mockPlayer);
      efunBridge.setFindConnectedPlayerCallback(callback);

      const found = efunBridge.findConnectedPlayer('testuser');

      expect(callback).toHaveBeenCalledWith('testuser');
      expect(found).toBe(mockPlayer);
    });

    it('should return undefined when callback is not set', () => {
      const found = efunBridge.findConnectedPlayer('anyone');

      expect(found).toBeUndefined();
    });

    it('should return undefined when player not found', () => {
      const callback = vi.fn().mockReturnValue(undefined);
      efunBridge.setFindConnectedPlayerCallback(callback);

      const found = efunBridge.findConnectedPlayer('notexist');

      expect(found).toBeUndefined();
    });
  });

  describe('transferConnection', () => {
    it('should transfer connection when callback is set', () => {
      const callback = vi.fn();
      efunBridge.setTransferConnectionCallback(callback);

      const connection = createMockConnection();
      const player = createMockPlayer();

      efunBridge.transferConnection(connection, player);

      expect(callback).toHaveBeenCalledWith(connection, player);
    });

    it('should not throw when callback is not set', () => {
      const connection = createMockConnection();
      const player = createMockPlayer();

      expect(() => efunBridge.transferConnection(connection, player)).not.toThrow();
    });
  });

  describe('findActivePlayer', () => {
    it('should find active player when callback is set', () => {
      const mockPlayer = createMockPlayer('/players/active', { name: 'active' });
      const callback = vi.fn().mockReturnValue(mockPlayer);
      efunBridge.setFindActivePlayerCallback(callback);

      const found = efunBridge.findActivePlayer('active');

      expect(callback).toHaveBeenCalledWith('active');
      expect(found).toBe(mockPlayer);
    });

    it('should return undefined when callback is not set', () => {
      const found = efunBridge.findActivePlayer('anyone');

      expect(found).toBeUndefined();
    });
  });

  describe('registerActivePlayer', () => {
    it('should register player when callback is set', () => {
      const callback = vi.fn();
      efunBridge.setRegisterActivePlayerCallback(callback);

      const player = createMockPlayer();

      efunBridge.registerActivePlayer(player);

      expect(callback).toHaveBeenCalledWith(player);
    });

    it('should not throw when callback is not set', () => {
      const player = createMockPlayer();

      expect(() => efunBridge.registerActivePlayer(player)).not.toThrow();
    });
  });

  describe('unregisterActivePlayer', () => {
    it('should unregister player when callback is set', () => {
      const callback = vi.fn();
      efunBridge.setUnregisterActivePlayerCallback(callback);

      const player = createMockPlayer();

      efunBridge.unregisterActivePlayer(player);

      expect(callback).toHaveBeenCalledWith(player);
    });

    it('should not throw when callback is not set', () => {
      const player = createMockPlayer();

      expect(() => efunBridge.unregisterActivePlayer(player)).not.toThrow();
    });
  });

  describe('allPlayers', () => {
    it('should return players when callback is set', () => {
      const player1 = createMockPlayer('/players/player1', { name: 'player1' });
      const player2 = createMockPlayer('/players/player2', { name: 'player2' });
      const callback = vi.fn().mockReturnValue([player1, player2]);
      efunBridge.setAllPlayersCallback(callback);

      const players = efunBridge.allPlayers();

      expect(players).toHaveLength(2);
      expect(players).toContain(player1);
      expect(players).toContain(player2);
    });

    it('should return empty array when callback is not set', () => {
      const players = efunBridge.allPlayers();

      expect(players).toEqual([]);
    });
  });

  describe('send', () => {
    it('should call receive on target', () => {
      const player = createMockPlayer();

      efunBridge.send(player, 'Hello, player!');

      expect(player.receivedMessages).toContain('Hello, player!');
    });

    it('should handle object without receive method', () => {
      const obj = new BaseMudObject('/test/obj');

      expect(() => efunBridge.send(obj, 'test')).not.toThrow();
    });

    it('should send multiple messages', () => {
      const player = createMockPlayer();

      efunBridge.send(player, 'Message 1');
      efunBridge.send(player, 'Message 2');
      efunBridge.send(player, 'Message 3');

      expect(player.receivedMessages).toHaveLength(3);
      expect(player.receivedMessages).toContain('Message 1');
      expect(player.receivedMessages).toContain('Message 2');
      expect(player.receivedMessages).toContain('Message 3');
    });
  });

  describe('executeCommand', () => {
    it('should execute command when callback is set', async () => {
      const callback = vi.fn().mockResolvedValue(true);
      efunBridge.setExecuteCommandCallback(callback);

      const player = createMockPlayer();
      const result = await efunBridge.executeCommand(player, 'look', 0);

      expect(callback).toHaveBeenCalledWith(player, 'look', 0);
      expect(result).toBe(true);
    });

    it('should return false when callback is not set', async () => {
      const player = createMockPlayer();
      const result = await efunBridge.executeCommand(player, 'look', 0);

      expect(result).toBe(false);
    });

    it('should pass permission level', async () => {
      const callback = vi.fn().mockResolvedValue(true);
      efunBridge.setExecuteCommandCallback(callback);

      const player = createMockPlayer();
      await efunBridge.executeCommand(player, 'admin_cmd', 3);

      expect(callback).toHaveBeenCalledWith(player, 'admin_cmd', 3);
    });

    it('should return false for unknown command', async () => {
      const callback = vi.fn().mockResolvedValue(false);
      efunBridge.setExecuteCommandCallback(callback);

      const player = createMockPlayer();
      const result = await efunBridge.executeCommand(player, 'unknowncmd', 0);

      expect(result).toBe(false);
    });
  });
});
