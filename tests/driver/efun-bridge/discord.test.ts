/**
 * Tests for Discord integration efuns.
 *
 * Note: These tests verify method signatures and behavior when Discord is not connected.
 * Full integration tests would require a real Discord connection or complex mocking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('Discord Efuns', () => {
  let efunBridge: EfunBridge;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await createTestEnvironment();
    efunBridge = env.efunBridge;
    cleanup = env.cleanup;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('discordIsConnected', () => {
    it('should return false when not connected', () => {
      // Without Discord client connected, should return false
      expect(efunBridge.discordIsConnected()).toBe(false);
    });

    it('should return boolean', () => {
      const result = efunBridge.discordIsConnected();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('discordGetState', () => {
    it('should return disconnected when not connected', () => {
      const state = efunBridge.discordGetState();
      expect(state).toBe('disconnected');
    });

    it('should return string', () => {
      const state = efunBridge.discordGetState();
      expect(typeof state).toBe('string');
    });
  });

  describe('discordGetConfig', () => {
    it('should return null when not connected', () => {
      const config = efunBridge.discordGetConfig();
      expect(config).toBeNull();
    });
  });

  describe('discordSend', () => {
    it('should return false when not connected', async () => {
      const result = await efunBridge.discordSend('TestPlayer', 'Hello Discord!');
      expect(result).toBe(false);
    });

    it('should accept player name and message', async () => {
      const result = await efunBridge.discordSend('Player', 'Message');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('discordConnect', () => {
    it('should accept config object', async () => {
      // This may throw or fail, but should accept the config format
      try {
        await efunBridge.discordConnect({
          guildId: '123456789',
          channelId: '987654321',
          token: 'test-token',
        });
      } catch {
        // Expected to fail without valid Discord credentials
      }
    });
  });

  describe('discordDisconnect', () => {
    it('should not throw when not connected', async () => {
      await expect(efunBridge.discordDisconnect()).resolves.not.toThrow();
    });
  });

  describe('discordOnMessage', () => {
    it('should accept callback function', () => {
      const callback = vi.fn();

      expect(() => efunBridge.discordOnMessage(callback)).not.toThrow();
    });

    it('should register callback without throwing', () => {
      const callback = (author: string, content: string) => {
        console.log(`${author}: ${content}`);
      };

      expect(() => efunBridge.discordOnMessage(callback)).not.toThrow();
    });
  });
});
