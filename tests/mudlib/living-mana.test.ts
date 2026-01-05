/**
 * Tests for the Living class mana (magic points) system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Living } from '../../mudlib/std/living.js';

describe('Living Mana', () => {
  let living: Living;

  beforeEach(() => {
    living = new Living();
  });

  describe('default mana', () => {
    it('should have default mana of 100', () => {
      expect(living.mana).toBe(100);
      expect(living.maxMana).toBe(100);
    });

    it('should have 100% mana by default', () => {
      expect(living.manaPercent).toBe(100);
    });
  });

  describe('setting mana', () => {
    it('should set mana via setter', () => {
      living.mana = 50;
      expect(living.mana).toBe(50);
    });

    it('should set maxMana via setter', () => {
      living.maxMana = 200;
      expect(living.maxMana).toBe(200);
    });

    it('should clamp mana to valid range', () => {
      living.mana = -10;
      expect(living.mana).toBe(0);

      living.mana = 150; // Above max
      expect(living.mana).toBe(100);
    });

    it('should clamp mana when maxMana changes', () => {
      living.mana = 100;
      living.maxMana = 50;
      expect(living.mana).toBeLessThanOrEqual(50);
    });

    it('should set mana via setLiving', () => {
      living.setLiving({
        mana: 75,
        maxMana: 150,
      });

      expect(living.mana).toBe(75);
      expect(living.maxMana).toBe(150);
    });
  });

  describe('useMana', () => {
    it('should use mana when sufficient', () => {
      living.mana = 100;
      const result = living.useMana(30);
      expect(result).toBe(true);
      expect(living.mana).toBe(70);
    });

    it('should not use mana when insufficient', () => {
      living.mana = 20;
      const result = living.useMana(30);
      expect(result).toBe(false);
      expect(living.mana).toBe(20);
    });

    it('should use exact mana amount', () => {
      living.mana = 50;
      const result = living.useMana(50);
      expect(result).toBe(true);
      expect(living.mana).toBe(0);
    });

    it('should handle zero mana cost', () => {
      living.mana = 50;
      const result = living.useMana(0);
      expect(result).toBe(true);
      expect(living.mana).toBe(50);
    });
  });

  describe('hasMana', () => {
    it('should return true when enough mana', () => {
      living.mana = 100;
      expect(living.hasMana(50)).toBe(true);
    });

    it('should return false when not enough mana', () => {
      living.mana = 30;
      expect(living.hasMana(50)).toBe(false);
    });

    it('should return true for exact amount', () => {
      living.mana = 50;
      expect(living.hasMana(50)).toBe(true);
    });

    it('should return true for zero cost', () => {
      living.mana = 0;
      expect(living.hasMana(0)).toBe(true);
    });
  });

  describe('restoreMana', () => {
    it('should restore mana', () => {
      living.mana = 50;
      living.restoreMana(30);
      expect(living.mana).toBe(80);
    });

    it('should not exceed maxMana', () => {
      living.mana = 80;
      living.restoreMana(50);
      expect(living.mana).toBe(100);
    });

    it('should handle restoring from zero', () => {
      living.mana = 0;
      living.restoreMana(25);
      expect(living.mana).toBe(25);
    });
  });

  describe('manaPercent', () => {
    it('should calculate percentage correctly', () => {
      living.mana = 50;
      living.maxMana = 100;
      expect(living.manaPercent).toBe(50);
    });

    it('should return 0 when no mana', () => {
      living.mana = 0;
      expect(living.manaPercent).toBe(0);
    });

    it('should return 100 when full', () => {
      living.mana = 100;
      living.maxMana = 100;
      expect(living.manaPercent).toBe(100);
    });

    it('should round percentage', () => {
      living.mana = 33;
      living.maxMana = 100;
      expect(living.manaPercent).toBe(33);
    });
  });

  describe('healthPercent', () => {
    it('should calculate health percentage correctly', () => {
      living.health = 50;
      living.maxHealth = 100;
      expect(living.healthPercent).toBe(50);
    });

    it('should return 0 when no health', () => {
      living.health = 0;
      expect(living.healthPercent).toBe(0);
    });

    it('should return 100 when full health', () => {
      living.health = 100;
      living.maxHealth = 100;
      expect(living.healthPercent).toBe(100);
    });
  });
});
