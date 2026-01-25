/**
 * Tests for string utility efuns including sprintf.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('String Efuns', () => {
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

  describe('sprintf', () => {
    describe('basic format specifiers', () => {
      it('should handle %s string substitution', () => {
        expect(efunBridge.sprintf('Hello %s!', 'world')).toBe('Hello world!');
        expect(efunBridge.sprintf('%s %s', 'foo', 'bar')).toBe('foo bar');
      });

      it('should handle %d integer formatting', () => {
        expect(efunBridge.sprintf('%d', 42)).toBe('42');
        expect(efunBridge.sprintf('%d', -42)).toBe('-42');
        expect(efunBridge.sprintf('%d', 0)).toBe('0');
      });

      it('should handle %i integer formatting (same as %d)', () => {
        expect(efunBridge.sprintf('%i', 42)).toBe('42');
        expect(efunBridge.sprintf('%i', -42)).toBe('-42');
      });

      it('should handle %f float formatting', () => {
        expect(efunBridge.sprintf('%f', 3.14159)).toBe('3.141590');
        expect(efunBridge.sprintf('%f', -2.5)).toBe('-2.500000');
        expect(efunBridge.sprintf('%f', 0)).toBe('0.000000');
      });

      it('should handle %f float formatting with precision', () => {
        expect(efunBridge.sprintf('%.2f', 3.14159)).toBe('3.14');
        expect(efunBridge.sprintf('%.0f', 3.14159)).toBe('3');
        expect(efunBridge.sprintf('%.4f', 2.5)).toBe('2.5000');
      });

      it('should handle %x lowercase hex formatting', () => {
        expect(efunBridge.sprintf('%x', 255)).toBe('ff');
        expect(efunBridge.sprintf('%x', 16)).toBe('10');
        expect(efunBridge.sprintf('%x', 0)).toBe('0');
      });

      it('should handle %X uppercase hex formatting', () => {
        expect(efunBridge.sprintf('%X', 255)).toBe('FF');
        expect(efunBridge.sprintf('%X', 16)).toBe('10');
        expect(efunBridge.sprintf('%X', 0)).toBe('0');
      });

      it('should handle %o octal formatting', () => {
        expect(efunBridge.sprintf('%o', 8)).toBe('10');
        expect(efunBridge.sprintf('%o', 64)).toBe('100');
        expect(efunBridge.sprintf('%o', 0)).toBe('0');
      });

      it('should handle %b binary formatting', () => {
        expect(efunBridge.sprintf('%b', 5)).toBe('101');
        expect(efunBridge.sprintf('%b', 255)).toBe('11111111');
        expect(efunBridge.sprintf('%b', 0)).toBe('0');
      });

      it('should handle %c character codes', () => {
        expect(efunBridge.sprintf('%c', 65)).toBe('A');
        expect(efunBridge.sprintf('%c', 97)).toBe('a');
        expect(efunBridge.sprintf('%c', 'hello')).toBe('h');
      });

      it('should handle %j JSON formatting (compact)', () => {
        expect(efunBridge.sprintf('%j', { a: 1 })).toBe('{"a":1}');
        expect(efunBridge.sprintf('%j', [1, 2, 3])).toBe('[1,2,3]');
        expect(efunBridge.sprintf('%j', 'string')).toBe('"string"');
      });

      it('should handle %J JSON formatting (pretty)', () => {
        const result = efunBridge.sprintf('%J', { a: 1 });
        expect(result).toContain('"a": 1');
        expect(result).toContain('\n');
      });

      it('should handle %% escape', () => {
        expect(efunBridge.sprintf('100%% complete')).toBe('100% complete');
        expect(efunBridge.sprintf('%d%% of %d', 50, 100)).toBe('50% of 100');
      });
    });

    describe('width and alignment', () => {
      it('should right-align with width specifier', () => {
        expect(efunBridge.sprintf('%10s', 'test')).toBe('      test');
        expect(efunBridge.sprintf('%5d', 42)).toBe('   42');
      });

      it('should left-align with - flag', () => {
        expect(efunBridge.sprintf('%-10s', 'test')).toBe('test      ');
        expect(efunBridge.sprintf('%-5d', 42)).toBe('42   ');
      });

      it('should center-align with |width| syntax', () => {
        expect(efunBridge.sprintf('%|10|s', 'test')).toBe('   test   ');
        expect(efunBridge.sprintf('%|11|s', 'test')).toBe('   test    ');
      });

      it('should center-align with =width= syntax', () => {
        expect(efunBridge.sprintf('%=10=s', 'test')).toBe('   test   ');
        expect(efunBridge.sprintf('%=11=s', 'test')).toBe('   test    ');
      });

      it('should zero-pad with 0 flag', () => {
        expect(efunBridge.sprintf('%05d', 42)).toBe('00042');
        expect(efunBridge.sprintf('%08d', 123)).toBe('00000123');
      });

      it('should handle + flag for positive numbers', () => {
        expect(efunBridge.sprintf('%+d', 42)).toBe('+42');
        expect(efunBridge.sprintf('%+d', -42)).toBe('-42');
        expect(efunBridge.sprintf('%+f', 3.14)).toBe('+3.140000');
      });

      it('should handle space flag for positive numbers', () => {
        expect(efunBridge.sprintf('% d', 42)).toBe(' 42');
        expect(efunBridge.sprintf('% d', -42)).toBe('-42');
      });

      it('should handle # flag for alternate form', () => {
        expect(efunBridge.sprintf('%#x', 255)).toBe('0xff');
        expect(efunBridge.sprintf('%#X', 255)).toBe('0XFF');
        expect(efunBridge.sprintf('%#o', 64)).toBe('0o100');
        expect(efunBridge.sprintf('%#b', 5)).toBe('0b101');
      });

      it('should not add prefix for zero with # flag', () => {
        expect(efunBridge.sprintf('%#x', 0)).toBe('0');
        expect(efunBridge.sprintf('%#o', 0)).toBe('0');
        expect(efunBridge.sprintf('%#b', 0)).toBe('0');
      });
    });

    describe('precision', () => {
      it('should truncate strings with precision', () => {
        expect(efunBridge.sprintf('%.3s', 'hello')).toBe('hel');
        expect(efunBridge.sprintf('%.10s', 'short')).toBe('short');
      });

      it('should set minimum digits for integers with precision', () => {
        expect(efunBridge.sprintf('%.5d', 42)).toBe('00042');
        expect(efunBridge.sprintf('%.3d', 12345)).toBe('12345');
      });

      it('should set decimal places for floats with precision', () => {
        expect(efunBridge.sprintf('%.2f', 3.14159)).toBe('3.14');
        expect(efunBridge.sprintf('%.0f', 3.7)).toBe('4');
        expect(efunBridge.sprintf('%.5f', 1.5)).toBe('1.50000');
      });
    });

    describe('color code handling', () => {
      it('should calculate width ignoring {color} codes', () => {
        // The visible text is "test" (4 chars), so padding should add 6 spaces
        expect(efunBridge.sprintf('%10s', '{red}test{/}')).toBe('      {red}test{/}');
      });

      it('should calculate width ignoring ANSI escape codes', () => {
        const redText = '\x1b[31mtest\x1b[0m';
        const result = efunBridge.sprintf('%10s', redText);
        expect(result).toBe('      \x1b[31mtest\x1b[0m');
      });

      it('should preserve color codes in output', () => {
        expect(efunBridge.sprintf('%s', '{cyan}hello{/}')).toBe('{cyan}hello{/}');
      });
    });

    describe('edge cases', () => {
      it('should handle missing arguments gracefully', () => {
        expect(efunBridge.sprintf('Hello %s %s!', 'world')).toBe('Hello world %s!');
      });

      it('should handle null values', () => {
        expect(efunBridge.sprintf('%s', null)).toBe('');
      });

      it('should handle undefined values', () => {
        expect(efunBridge.sprintf('%s', undefined)).toBe('');
      });

      it('should handle very large numbers', () => {
        expect(efunBridge.sprintf('%d', 1000000000)).toBe('1000000000');
        expect(efunBridge.sprintf('%f', 1e20)).toBe('100000000000000000000.000000');
      });

      it('should handle negative numbers with zero-padding', () => {
        expect(efunBridge.sprintf('%05d', -42)).toBe('-0042');
      });

      it('should handle NaN', () => {
        expect(efunBridge.sprintf('%d', NaN)).toBe('0');
        // NaN with %f uses toFixed which converts to 0
        expect(efunBridge.sprintf('%f', NaN)).toBe('0.000000');
      });

      it('should handle Infinity', () => {
        expect(efunBridge.sprintf('%f', Infinity)).toBe('Infinity');
        expect(efunBridge.sprintf('%f', -Infinity)).toBe('-Infinity');
      });

      it('should handle empty format string', () => {
        expect(efunBridge.sprintf('')).toBe('');
      });

      it('should handle format string without specifiers', () => {
        expect(efunBridge.sprintf('Hello world!')).toBe('Hello world!');
      });

      it('should convert non-number to number for %d', () => {
        expect(efunBridge.sprintf('%d', '42')).toBe('42');
        expect(efunBridge.sprintf('%d', 'abc')).toBe('0');
      });

      it('should handle objects in %s', () => {
        expect(efunBridge.sprintf('%s', { toString: () => 'custom' })).toBe('custom');
      });

      it('should handle circular references in %j gracefully', () => {
        const obj: Record<string, unknown> = { a: 1 };
        obj.self = obj;
        // Should not throw, falls back to String()
        const result = efunBridge.sprintf('%j', obj);
        expect(typeof result).toBe('string');
      });
    });

    describe('combined modifiers', () => {
      it('should handle width and precision together', () => {
        expect(efunBridge.sprintf('%10.3s', 'hello')).toBe('       hel');
        expect(efunBridge.sprintf('%-10.3s', 'hello')).toBe('hel       ');
      });

      it('should handle multiple format specifiers', () => {
        expect(efunBridge.sprintf('%s is %d years old', 'Alice', 30)).toBe('Alice is 30 years old');
        expect(efunBridge.sprintf('[%5d] %s: %.2f', 1, 'Price', 19.99)).toBe('[    1] Price: 19.99');
      });

      it('should handle zero-pad with sign', () => {
        expect(efunBridge.sprintf('%+08d', 42)).toBe('+0000042');
        expect(efunBridge.sprintf('%+08d', -42)).toBe('-0000042');
      });
    });
  });

  describe('formatDuration', () => {
    it('should format less than a minute', () => {
      expect(efunBridge.formatDuration(30)).toBe('less than a minute');
      expect(efunBridge.formatDuration(0)).toBe('less than a minute');
    });

    it('should format minutes', () => {
      expect(efunBridge.formatDuration(60)).toBe('1 minute');
      expect(efunBridge.formatDuration(120)).toBe('2 minutes');
      expect(efunBridge.formatDuration(300)).toBe('5 minutes');
    });

    it('should format hours', () => {
      expect(efunBridge.formatDuration(3600)).toBe('1 hour');
      expect(efunBridge.formatDuration(7200)).toBe('2 hours');
    });

    it('should format days', () => {
      expect(efunBridge.formatDuration(86400)).toBe('1 day');
      expect(efunBridge.formatDuration(172800)).toBe('2 days');
    });

    it('should format combined durations', () => {
      expect(efunBridge.formatDuration(90061)).toBe('1 day, 1 hour, 1 minute');
      expect(efunBridge.formatDuration(180122)).toBe('2 days, 2 hours, 2 minutes');
    });

    it('should skip zero components', () => {
      expect(efunBridge.formatDuration(3660)).toBe('1 hour, 1 minute');
      expect(efunBridge.formatDuration(86460)).toBe('1 day, 1 minute');
      expect(efunBridge.formatDuration(90000)).toBe('1 day, 1 hour');
    });
  });

  describe('formatDate', () => {
    it('should format timestamp in seconds', () => {
      // Use a fixed timestamp
      const timestamp = 1704067200; // Jan 1, 2024 00:00:00 UTC
      const result = efunBridge.formatDate(timestamp);
      // Should be a properly formatted date string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should contain day/month/year pattern
      expect(result).toMatch(/\d{4}/); // Contains a year
    });

    it('should format timestamp in milliseconds', () => {
      // Same timestamp but in milliseconds
      const timestamp = 1704067200000;
      const result = efunBridge.formatDate(timestamp);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should auto-detect seconds vs milliseconds', () => {
      const seconds = 1704067200;
      const milliseconds = 1704067200000;

      // Both should produce the same result
      const resultSec = efunBridge.formatDate(seconds);
      const resultMs = efunBridge.formatDate(milliseconds);

      expect(resultSec).toBe(resultMs);
    });
  });
});
