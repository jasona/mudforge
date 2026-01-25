/**
 * Tests for external API efuns (GitHub, Giphy).
 *
 * Note: These tests verify method signatures and behavior when services aren't configured.
 * Full integration tests would require real API credentials or complex mocking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';
import { getPermissions } from '../../../src/driver/permissions.js';

describe('External API Efuns', () => {
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

  describe('GitHub', () => {
    describe('githubAvailable', () => {
      it('should return false when not configured', () => {
        // Without GITHUB_TOKEN set, should return false
        expect(efunBridge.githubAvailable()).toBe(false);
      });

      it('should return boolean', () => {
        const result = efunBridge.githubAvailable();
        expect(typeof result).toBe('boolean');
      });
    });

    describe('githubCreateIssue', () => {
      beforeEach(() => {
        const admin = createMockPlayer('/players/admin', { name: 'admin', level: 3 });
        efunBridge.setContext({ thisPlayer: admin, thisObject: admin });
        getPermissions().setLevel('admin', 3);
      });

      it('should return error when not configured', async () => {
        const result = await efunBridge.githubCreateIssue('Bug Report', 'Something is broken');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should accept title and body', async () => {
        const result = await efunBridge.githubCreateIssue('Title', 'Body content');

        expect(result).toHaveProperty('success');
      });

      it('should accept optional labels', async () => {
        const result = await efunBridge.githubCreateIssue('Feature', 'Description', ['enhancement']);

        expect(result).toHaveProperty('success');
      });
    });
  });

  describe('Giphy', () => {
    describe('giphyAvailable', () => {
      it('should return false when not configured', () => {
        // Without Giphy config, should return false
        expect(efunBridge.giphyAvailable()).toBe(false);
      });

      it('should return boolean', () => {
        const result = efunBridge.giphyAvailable();
        expect(typeof result).toBe('boolean');
      });
    });

    describe('giphySearch', () => {
      it('should return error when not configured', async () => {
        const result = await efunBridge.giphySearch('funny cat');

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should accept query string', async () => {
        const result = await efunBridge.giphySearch('test query');

        expect(result).toHaveProperty('success');
      });
    });

    describe('giphyGenerateId', () => {
      it('should generate string ID', () => {
        const id = efunBridge.giphyGenerateId();

        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });

      it('should generate unique IDs', () => {
        const id1 = efunBridge.giphyGenerateId();
        const id2 = efunBridge.giphyGenerateId();

        expect(id1).not.toBe(id2);
      });

      it('should generate ID even without client', () => {
        // The implementation provides a fallback
        const id = efunBridge.giphyGenerateId();
        expect(id).toMatch(/^gif_/);
      });
    });

    describe('giphyCacheGif', () => {
      it('should not throw when caching', () => {
        const id = efunBridge.giphyGenerateId();

        expect(() =>
          efunBridge.giphyCacheGif(id, {
            url: 'https://giphy.com/test',
            title: 'Test GIF',
            senderName: 'TestPlayer',
            channelName: 'gossip',
            query: 'test',
          })
        ).not.toThrow();
      });

      it('should accept cache data object', () => {
        const id = efunBridge.giphyGenerateId();

        // Should not throw, even if client isn't configured
        expect(() =>
          efunBridge.giphyCacheGif(id, {
            url: 'https://giphy.com/gif',
            title: 'Title',
            senderName: 'Player',
            channelName: 'channel',
            query: 'search term',
          })
        ).not.toThrow();
      });
    });

    describe('giphyGetCachedGif', () => {
      it('should return undefined when not found', () => {
        const cached = efunBridge.giphyGetCachedGif('nonexistent');

        expect(cached).toBeUndefined();
      });

      it('should return undefined without client', () => {
        const cached = efunBridge.giphyGetCachedGif('any-id');

        expect(cached).toBeUndefined();
      });
    });
  });
});
