/**
 * Tests for the page efun (interactive pager).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestEnvironment, createMockPlayer } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('Pager Efun', () => {
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

  describe('basic functionality', () => {
    it('should display content to player', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const content = 'Line 1\nLine 2\nLine 3';
      efunBridge.page(content);

      // Should have received some output
      expect(player.receivedMessages.length).toBeGreaterThan(0);
    });

    it('should display all content when it fits on one page', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const content = ['Line 1', 'Line 2', 'Line 3'];
      efunBridge.page(content, { linesPerPage: 10 });

      // Should display all lines without pagination
      const output = player.receivedMessages.join('');
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 2');
      expect(output).toContain('Line 3');
    });

    it('should handle string content', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const content = 'Single line content';
      efunBridge.page(content);

      const output = player.receivedMessages.join('');
      expect(output).toContain('Single line content');
    });

    it('should handle array content', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const content = ['First', 'Second', 'Third'];
      efunBridge.page(content);

      const output = player.receivedMessages.join('');
      expect(output).toContain('First');
    });

    it('should throw when no player context', () => {
      efunBridge.clearContext();

      expect(() => efunBridge.page('content')).toThrow('No player context');
    });
  });

  describe('pagination', () => {
    it('should paginate long content', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      // Create content longer than one page
      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 10 });

      // Should set up an input handler for navigation
      expect(player.inputHandler).toBeDefined();
    });

    it('should display first page', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 5 });

      const output = player.receivedMessages.join('');
      expect(output).toContain('Line 1');
      expect(output).toContain('Line 5');
    });
  });

  describe('options', () => {
    it('should display title when provided', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      efunBridge.page('content', { title: 'Test Title' });

      const output = player.receivedMessages.join('');
      expect(output).toContain('Test Title');
    });

    it('should show line numbers when enabled', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const content = ['Line A', 'Line B', 'Line C'];
      efunBridge.page(content, { showLineNumbers: true });

      const output = player.receivedMessages.join('');
      // Line numbers should be present
      expect(output).toMatch(/\d+.*Line A/);
    });

    it('should use custom lines per page', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 5 });

      // Should set up handler because content exceeds 5 lines
      expect(player.inputHandler).toBeDefined();
    });

    it('should call onExit callback when provided', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });
      const onExit = vi.fn();

      // Short content that fits on one page
      efunBridge.page(['Short content'], { onExit });

      // onExit should be called immediately for content that fits
      expect(onExit).toHaveBeenCalled();
    });
  });

  describe('navigation commands', () => {
    it('should advance page on Enter/n', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 10 });

      // Clear messages after first page
      player.receivedMessages = [];

      // Simulate pressing Enter
      if (player.inputHandler) {
        player.inputHandler('');
      }

      // Should show next page content
      const output = player.receivedMessages.join('');
      expect(output).toContain('Line 11');
    });

    it('should quit on q', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 10 });

      // Simulate pressing q
      if (player.inputHandler) {
        player.inputHandler('q');
      }

      // Input handler should be cleared
      expect(player.inputHandler).toBeNull();
    });

    it('should go to top on g', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 10 });

      // Advance a few pages
      if (player.inputHandler) {
        player.inputHandler('');
        player.inputHandler('');
      }

      player.receivedMessages = [];

      // Go to top (pager uses 'g' for beginning)
      if (player.inputHandler) {
        player.inputHandler('g');
      }

      const output = player.receivedMessages.join('');
      expect(output).toContain('Line 1');
    });

    it('should go to end by navigating to last page', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 10 });

      // Navigate forward until reaching the end
      if (player.inputHandler) {
        player.inputHandler(''); // Page 2
        player.inputHandler(''); // Page 3
        player.inputHandler(''); // Page 4
        player.inputHandler(''); // Page 5 (last page with lines 41-50)
      }

      const output = player.receivedMessages.join('');
      expect(output).toContain('Line 50');
    });

    it('should go back on p/b', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 10 });

      // Advance
      if (player.inputHandler) {
        player.inputHandler('');
        player.inputHandler('');
      }

      player.receivedMessages = [];

      // Go back
      if (player.inputHandler) {
        player.inputHandler('p');
      }

      const output = player.receivedMessages.join('');
      expect(output).toContain('Line 11');
    });

    it('should jump to specific line number', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 10 });

      player.receivedMessages = [];

      // Jump to line 41 (pager uses line numbers, not page numbers)
      if (player.inputHandler) {
        player.inputHandler('41');
      }

      const output = player.receivedMessages.join('');
      expect(output).toContain('Line 41');
    });
  });

  describe('search functionality', () => {
    it('should search forward with /', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      lines[25] = 'SEARCH TARGET';
      efunBridge.page(lines, { linesPerPage: 10 });

      // Search for target
      if (player.inputHandler) {
        player.inputHandler('/SEARCH');
      }

      // Should show the page containing the search target
      const output = player.receivedMessages.join('');
      expect(output).toContain('SEARCH TARGET');
    });

    it('should handle no matches', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`);
      efunBridge.page(lines, { linesPerPage: 10 });

      player.receivedMessages = [];

      // Search for something that doesn't exist
      if (player.inputHandler) {
        player.inputHandler('/NONEXISTENT');
      }

      // Should show "not found" message
      const output = player.receivedMessages.join('');
      expect(output.toLowerCase()).toContain('not found');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(() => efunBridge.page('')).not.toThrow();
    });

    it('should handle empty array', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      expect(() => efunBridge.page([])).not.toThrow();
    });

    it('should handle content with color codes', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const content = '{red}Red text{/}\n{blue}Blue text{/}';
      efunBridge.page(content);

      const output = player.receivedMessages.join('');
      expect(output).toContain('Red text');
      expect(output).toContain('Blue text');
    });

    it('should handle very long lines', () => {
      const player = createMockPlayer();
      efunBridge.setContext({ thisPlayer: player, thisObject: player });

      const longLine = 'x'.repeat(1000);
      expect(() => efunBridge.page(longLine)).not.toThrow();
    });
  });
});
