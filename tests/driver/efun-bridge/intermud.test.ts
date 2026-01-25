/**
 * Tests for intermud efuns (Grapevine).
 *
 * Note: These tests verify method signatures and behavior when Grapevine is not connected.
 * Full integration tests would require a real connection or complex mocking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('Intermud Efuns', () => {
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

  describe('Grapevine Protocol', () => {
    describe('grapevineIsConnected', () => {
      it('should return false when not connected', () => {
        expect(efunBridge.grapevineIsConnected()).toBe(false);
      });

      it('should return boolean', () => {
        const result = efunBridge.grapevineIsConnected();
        expect(typeof result).toBe('boolean');
      });
    });

    describe('grapevineGetState', () => {
      it('should return disconnected when not connected', () => {
        const state = efunBridge.grapevineGetState();
        expect(state).toBe('disconnected');
      });

      it('should return string', () => {
        const state = efunBridge.grapevineGetState();
        expect(typeof state).toBe('string');
      });
    });

    describe('grapevineSubscribe', () => {
      it('should return false when not connected', async () => {
        const result = await efunBridge.grapevineSubscribe('testing');
        expect(result).toBe(false);
      });

      it('should accept channel name', async () => {
        const result = await efunBridge.grapevineSubscribe('gossip');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('grapevineUnsubscribe', () => {
      it('should return false when not connected', async () => {
        const result = await efunBridge.grapevineUnsubscribe('testing');
        expect(result).toBe(false);
      });

      it('should accept channel name', async () => {
        const result = await efunBridge.grapevineUnsubscribe('gossip');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('grapevineSend', () => {
      it('should return false when not connected', () => {
        const result = efunBridge.grapevineSend('testing', 'TestPlayer', 'Hello Grapevine!');
        expect(result).toBe(false);
      });

      it('should accept channel, player name, and message', () => {
        const result = efunBridge.grapevineSend('gossip', 'Player', 'Message');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('grapevineOnMessage', () => {
      it('should accept callback function', () => {
        const callback = vi.fn();
        expect(() => efunBridge.grapevineOnMessage(callback)).not.toThrow();
      });

      it('should register callback without throwing', () => {
        const callback = (channel: string, sender: string, message: string) => {
          console.log(`[${channel}] ${sender}: ${message}`);
        };
        expect(() => efunBridge.grapevineOnMessage(callback)).not.toThrow();
      });
    });
  });
});
