/**
 * Tests for Claude AI efuns.
 *
 * Note: These tests verify method signatures and behavior when AI is not configured.
 * Full integration tests with a mocked AI client would require more complex setup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('AI Claude Efuns', () => {
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

  describe('aiAvailable', () => {
    it('should return false when Claude is not configured', () => {
      // Without CLAUDE_API_KEY set, should return false
      expect(efunBridge.aiAvailable()).toBe(false);
    });

    it('should return boolean', () => {
      const result = efunBridge.aiAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('aiGenerate', () => {
    it('should return error when AI not configured', async () => {
      const result = await efunBridge.aiGenerate('Write a greeting');

      expect(result.success).toBe(false);
      expect(result.error).toBe('AI not configured');
    });

    it('should accept prompt string', async () => {
      const result = await efunBridge.aiGenerate('Test prompt');

      expect(result).toHaveProperty('success');
    });

    it('should accept prompt with context', async () => {
      const result = await efunBridge.aiGenerate('Test prompt', 'Context information');

      expect(result).toHaveProperty('success');
    });

    it('should accept options object', async () => {
      const result = await efunBridge.aiGenerate('Test', undefined, {
        maxTokens: 100,
        temperature: 0.7,
        cacheKey: 'test-key',
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('aiDescribe', () => {
    it('should return error when AI not configured', async () => {
      const result = await efunBridge.aiDescribe('item', {
        name: 'Sword of Fire',
        keywords: ['weapon', 'sword', 'fire', 'magic'],
        theme: 'fantasy',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('AI not configured');
    });

    it('should accept room type', async () => {
      const result = await efunBridge.aiDescribe('room', {
        name: 'Dark Forest Clearing',
        keywords: ['forest', 'dark', 'clearing'],
        theme: 'dark fantasy',
      });

      expect(result).toHaveProperty('success');
    });

    it('should accept item type', async () => {
      const result = await efunBridge.aiDescribe('item', {
        name: 'Magic Ring',
        keywords: ['ring', 'magic'],
      });

      expect(result).toHaveProperty('success');
    });

    it('should accept npc type', async () => {
      const result = await efunBridge.aiDescribe('npc', {
        name: 'Old Wizard',
        keywords: ['wizard', 'old', 'wise'],
        theme: 'fantasy',
      });

      expect(result).toHaveProperty('success');
    });

    it('should accept weapon type', async () => {
      const result = await efunBridge.aiDescribe('weapon', {
        name: 'Ancient Blade',
        keywords: ['sword', 'ancient'],
      });

      expect(result).toHaveProperty('success');
    });

    it('should accept armor type', async () => {
      const result = await efunBridge.aiDescribe('armor', {
        name: 'Dragon Scale Mail',
        keywords: ['armor', 'dragon', 'scales'],
      });

      expect(result).toHaveProperty('success');
    });

    it('should accept style parameter', async () => {
      const result = await efunBridge.aiDescribe(
        'room',
        { name: 'Test Room', keywords: [] },
        'verbose'
      );

      expect(result).toHaveProperty('success');
    });
  });

  describe('aiNpcResponse', () => {
    it('should return error when AI not configured', async () => {
      const npcContext = {
        name: 'Bartender Bob',
        personality: 'Friendly and chatty',
        background: 'Has worked at the tavern for 20 years',
      };

      const result = await efunBridge.aiNpcResponse(npcContext, 'Hello there!', 'TestPlayer');

      expect(result.success).toBe(false);
      expect(result.error).toBe('AI not configured');
    });

    it('should accept minimal NPC context', async () => {
      const npcContext = {
        name: 'Test NPC',
        personality: 'Helpful',
        background: 'A shopkeeper',
      };

      const result = await efunBridge.aiNpcResponse(npcContext, 'Hello', 'Player');

      expect(result).toHaveProperty('success');
    });

    it('should accept NPC context with speaking style', async () => {
      const npcContext = {
        name: 'Noble Knight',
        personality: 'Honorable and formal',
        background: 'A knight of the realm',
        speakingStyle: {
          formality: 'formal' as const,
          verbosity: 'normal' as const,
        },
      };

      const result = await efunBridge.aiNpcResponse(npcContext, 'Greetings', 'Player');

      expect(result).toHaveProperty('success');
    });

    it('should accept NPC context with knowledge scope', async () => {
      const npcContext = {
        name: 'Town Guard',
        personality: 'Stern but helpful',
        background: 'Guards the town gate',
        knowledgeScope: {
          topics: ['town', 'gate', 'travelers'],
          forbidden: ['royal secrets'],
        },
      };

      const result = await efunBridge.aiNpcResponse(npcContext, 'What do you know?', 'Player');

      expect(result).toHaveProperty('success');
    });

    it('should accept maxResponseLength option', async () => {
      const npcContext = {
        name: 'Brief Bob',
        personality: 'Man of few words',
        background: 'Quiet type',
        maxResponseLength: 50,
      };

      const result = await efunBridge.aiNpcResponse(npcContext, 'Hello', 'Player');

      expect(result).toHaveProperty('success');
    });

    it('should accept currentMood option', async () => {
      const npcContext = {
        name: 'Moody Merchant',
        personality: 'Temperamental',
        background: 'Sells goods',
        currentMood: 'happy',
      };

      const result = await efunBridge.aiNpcResponse(npcContext, 'What do you have?', 'Player');

      expect(result).toHaveProperty('success');
    });
  });
});
