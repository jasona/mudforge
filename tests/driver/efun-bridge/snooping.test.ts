/**
 * Tests for snooping efuns.
 *
 * Note: snoopRegister requires a connection in this.context.thisPlayer.connection,
 * which is difficult to fully mock in unit tests. These tests verify the method
 * signatures and basic behavior without real connections.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { getPermissions } from '../../../src/driver/permissions.js';

describe('Snooping Efuns', () => {
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

  describe('snoopRegister', () => {
    it('should return false when context has no player', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      const target = createMockPlayer('/players/target', { name: 'target', level: 0 });
      getPermissions().setLevel('admin', 3);
      // Don't set context - should return false
      efunBridge.clearContext();

      const result = efunBridge.snoopRegister(admin, target);

      expect(result).toBe(false);
    });

    it('should return false when context player has no connection', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      const target = createMockPlayer('/players/target', { name: 'target', level: 0 });
      getPermissions().setLevel('admin', 3);
      // Set context but without connection
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });

      const result = efunBridge.snoopRegister(admin, target);

      // Returns false because mock player has no connection
      expect(result).toBe(false);
    });

    it('should accept two MudObject parameters', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      const target = createMockPlayer('/players/target', { name: 'target', level: 0 });
      efunBridge.setContext({ thisPlayer: admin, thisObject: admin });

      // Should not throw
      expect(() => efunBridge.snoopRegister(admin, target)).not.toThrow();
    });
  });

  describe('snoopUnregister', () => {
    it('should not throw when unregistering non-existent session', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      getPermissions().setLevel('admin', 3);

      expect(() => efunBridge.snoopUnregister(admin)).not.toThrow();
    });

    it('should accept MudObject parameter', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });

      expect(() => efunBridge.snoopUnregister(admin)).not.toThrow();
    });
  });

  describe('snoopGetTarget', () => {
    it('should return null when not snooping', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
      getPermissions().setLevel('admin', 3);

      const snoopTarget = efunBridge.snoopGetTarget(admin);

      expect(snoopTarget).toBeNull();
    });

    it('should accept MudObject parameter', () => {
      const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });

      expect(() => efunBridge.snoopGetTarget(admin)).not.toThrow();
    });
  });

  describe('snoopGetSnoopers', () => {
    it('should return empty array when no snoopers', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      const snoopers = efunBridge.snoopGetSnoopers(player);

      expect(snoopers).toEqual([]);
    });

    it('should return array', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      const snoopers = efunBridge.snoopGetSnoopers(player);

      expect(Array.isArray(snoopers)).toBe(true);
    });
  });

  describe('snoopForward', () => {
    it('should not throw when no snoopers', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      expect(() => efunBridge.snoopForward(player, 'message')).not.toThrow();
    });

    it('should accept MudObject and string parameters', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      expect(() => efunBridge.snoopForward(player, 'Test message')).not.toThrow();
    });
  });

  describe('snoopTargetDisconnected', () => {
    it('should not throw when called', () => {
      const target = createMockPlayer('/players/target', { name: 'target', level: 0 });

      expect(() => efunBridge.snoopTargetDisconnected(target)).not.toThrow();
    });

    it('should handle target with no snoopers', () => {
      const target = createMockPlayer('/players/target', { name: 'target', level: 0 });

      expect(() => efunBridge.snoopTargetDisconnected(target)).not.toThrow();

      // Verify it doesn't create any snoop sessions
      expect(efunBridge.snoopGetSnoopers(target)).toEqual([]);
    });
  });
});
