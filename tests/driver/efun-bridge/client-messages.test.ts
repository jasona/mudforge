/**
 * Tests for client message efuns (GUI, IDE, Sound, Comm).
 *
 * Note: These methods require players with real connections to send messages.
 * Without connections, they either throw errors or silently fail.
 * These tests verify method signatures and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge, CommMessage, SoundCategory } from '../../../src/driver/efun-bridge.js';

describe('Client Message Efuns', () => {
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

  describe('guiSend', () => {
    it('should throw when no player context', () => {
      efunBridge.clearContext();

      expect(() =>
        efunBridge.guiSend({ action: 'open' })
      ).toThrow('No player context for GUI');
    });

    it('should throw when player has no connection', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(() =>
        efunBridge.guiSend({ action: 'open' })
      ).toThrow('Player has no connection');
    });

    it('should accept GUIMessage with action property', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      // Even though it throws, it should accept the message format
      try {
        efunBridge.guiSend({ action: 'open', modal: 'test' });
      } catch (e) {
        // Expected to throw due to no connection
        expect((e as Error).message).toBe('Player has no connection');
      }
    });
  });

  describe('ideOpen', () => {
    it('should throw when no player context', () => {
      efunBridge.clearContext();

      expect(() =>
        efunBridge.ideOpen({ action: 'open', path: '/test/file.ts' })
      ).toThrow('No player context for IDE');
    });

    it('should throw when player has no connection', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(() =>
        efunBridge.ideOpen({ action: 'open', path: '/test/file.ts' })
      ).toThrow('Player has no connection');
    });

    it('should accept IdeMessage with action and path', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      // Should throw due to no connection, but validates the message format
      try {
        efunBridge.ideOpen({
          action: 'open',
          path: '/test/file.ts',
          content: 'file content',
          readOnly: true,
        });
      } catch (e) {
        expect((e as Error).message).toBe('Player has no connection');
      }
    });
  });

  describe('playSound', () => {
    it('should silently fail when player is null', () => {
      // Should not throw
      expect(() =>
        efunBridge.playSound(null as unknown as never, 'combat', 'hit')
      ).not.toThrow();
    });

    it('should silently fail when player has no connection', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      // Should not throw (silently fails)
      expect(() =>
        efunBridge.playSound(player, 'combat', 'hit')
      ).not.toThrow();
    });

    it('should accept valid sound categories', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      const categories: SoundCategory[] = [
        'combat', 'spell', 'skill', 'potion', 'quest',
        'celebration', 'discussion', 'alert', 'ambient', 'ui'
      ];

      for (const category of categories) {
        expect(() =>
          efunBridge.playSound(player, category, 'test-sound')
        ).not.toThrow();
      }
    });

    it('should accept options parameter', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      expect(() =>
        efunBridge.playSound(player, 'combat', 'hit', { volume: 0.5, id: 'sound-1' })
      ).not.toThrow();
    });
  });

  describe('loopSound', () => {
    it('should silently fail when player is null', () => {
      expect(() =>
        efunBridge.loopSound(null as unknown as never, 'ambient', 'music', 'loop-1')
      ).not.toThrow();
    });

    it('should silently fail when player has no connection', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      expect(() =>
        efunBridge.loopSound(player, 'ambient', 'music', 'loop-1')
      ).not.toThrow();
    });

    it('should accept required and optional parameters', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      expect(() =>
        efunBridge.loopSound(player, 'ambient', 'music', 'loop-1', { volume: 0.3 })
      ).not.toThrow();
    });
  });

  describe('stopSound', () => {
    it('should silently fail when player is null', () => {
      expect(() =>
        efunBridge.stopSound(null as unknown as never, 'combat')
      ).not.toThrow();
    });

    it('should silently fail when player has no connection', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      expect(() =>
        efunBridge.stopSound(player, 'combat')
      ).not.toThrow();
    });

    it('should accept optional id parameter', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      expect(() =>
        efunBridge.stopSound(player, 'combat', 'sound-1')
      ).not.toThrow();
    });
  });

  describe('sendComm', () => {
    it('should silently fail when player is null', () => {
      const commMessage: CommMessage = {
        type: 'comm',
        commType: 'say',
        sender: 'TestPlayer',
        message: 'Hello world',
        timestamp: Date.now(),
      };

      expect(() =>
        efunBridge.sendComm(null as unknown as never, commMessage)
      ).not.toThrow();
    });

    it('should silently fail when player has no connection', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      const commMessage: CommMessage = {
        type: 'comm',
        commType: 'say',
        sender: 'TestPlayer',
        message: 'Hello world',
        timestamp: Date.now(),
      };

      expect(() =>
        efunBridge.sendComm(player, commMessage)
      ).not.toThrow();
    });

    it('should accept different commType values', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      const sayMessage: CommMessage = {
        type: 'comm',
        commType: 'say',
        sender: 'TestPlayer',
        message: 'Hello',
        timestamp: Date.now(),
      };
      expect(() => efunBridge.sendComm(player, sayMessage)).not.toThrow();

      const tellMessage: CommMessage = {
        type: 'comm',
        commType: 'tell',
        sender: 'TestPlayer',
        message: 'Private message',
        timestamp: Date.now(),
      };
      expect(() => efunBridge.sendComm(player, tellMessage)).not.toThrow();

      const channelMessage: CommMessage = {
        type: 'comm',
        commType: 'channel',
        sender: 'TestPlayer',
        message: 'Channel message',
        channel: 'gossip',
        timestamp: Date.now(),
      };
      expect(() => efunBridge.sendComm(player, channelMessage)).not.toThrow();
    });
  });

  describe('sendQuestUpdate', () => {
    it('should silently fail when no player context', () => {
      efunBridge.clearContext();

      expect(() =>
        efunBridge.sendQuestUpdate([
          {
            questId: 'quest1',
            name: 'Test Quest',
            progress: 50,
            progressText: '1/2 objectives complete',
            status: 'active',
          },
        ])
      ).not.toThrow();
    });

    it('should silently fail when player has no connection', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(() =>
        efunBridge.sendQuestUpdate([
          {
            questId: 'quest1',
            name: 'Test Quest',
            progress: 100,
            progressText: 'Complete!',
            status: 'completed',
          },
        ])
      ).not.toThrow();
    });

    it('should accept targetPlayer parameter', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });

      expect(() =>
        efunBridge.sendQuestUpdate(
          [
            {
              questId: 'quest1',
              name: 'Test Quest',
              progress: 75,
              progressText: '3/4 done',
              status: 'active',
            },
          ],
          player
        )
      ).not.toThrow();
    });

    it('should accept array of quests', () => {
      const player = createMockPlayer('/players/player', { name: 'player', level: 0 });
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(() =>
        efunBridge.sendQuestUpdate([
          {
            questId: 'quest1',
            name: 'Quest One',
            progress: 50,
            progressText: 'In progress',
            status: 'active',
          },
          {
            questId: 'quest2',
            name: 'Quest Two',
            progress: 100,
            progressText: 'Done',
            status: 'completed',
          },
        ])
      ).not.toThrow();
    });
  });
});
