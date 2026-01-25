/**
 * Tests for Gemini AI efuns (image generation).
 *
 * Note: These tests verify method signatures and behavior when Gemini is not configured.
 * Full integration tests with a mocked Gemini client would require more complex setup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('AI Gemini Efuns', () => {
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

  describe('aiImageAvailable', () => {
    it('should return false when Gemini is not configured', () => {
      // Without GEMINI_API_KEY set, should return false
      expect(efunBridge.aiImageAvailable()).toBe(false);
    });

    it('should return boolean', () => {
      const result = efunBridge.aiImageAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('aiImageGenerate', () => {
    it('should return error when Gemini not configured', async () => {
      const result = await efunBridge.aiImageGenerate('A magical sword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Gemini AI not configured');
    });

    it('should accept prompt string', async () => {
      const result = await efunBridge.aiImageGenerate('Test image prompt');

      expect(result).toHaveProperty('success');
    });

    it('should accept options parameter', async () => {
      const result = await efunBridge.aiImageGenerate('A portrait', {
        aspectRatio: '1:1',
      });

      expect(result).toHaveProperty('success');
    });

    it('should accept various aspect ratios', async () => {
      const aspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] as const;

      for (const aspectRatio of aspectRatios) {
        const result = await efunBridge.aiImageGenerate('Test', { aspectRatio });
        expect(result).toHaveProperty('success');
      }
    });

    it('should handle special characters in prompt', async () => {
      const result = await efunBridge.aiImageGenerate('A sword & shield with "magic" effects');

      expect(result).toHaveProperty('success');
    });

    it('should handle long prompts', async () => {
      const longPrompt = 'A detailed fantasy scene showing various elements. '.repeat(10);
      const result = await efunBridge.aiImageGenerate(longPrompt);

      expect(result).toHaveProperty('success');
    });
  });
});
