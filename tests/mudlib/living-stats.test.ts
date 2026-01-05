/**
 * Tests for the Living class stats system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Living, DEFAULT_STAT, MIN_STAT, MAX_STAT, type StatName } from '../../mudlib/std/living.js';

describe('Living Stats', () => {
  let living: Living;

  beforeEach(() => {
    living = new Living();
  });

  describe('default stats', () => {
    it('should have default stats of 1', () => {
      expect(living.strength).toBe(DEFAULT_STAT);
      expect(living.intelligence).toBe(DEFAULT_STAT);
      expect(living.wisdom).toBe(DEFAULT_STAT);
      expect(living.charisma).toBe(DEFAULT_STAT);
      expect(living.dexterity).toBe(DEFAULT_STAT);
      expect(living.constitution).toBe(DEFAULT_STAT);
      expect(living.luck).toBe(DEFAULT_STAT);
    });

    it('should have zero modifiers by default', () => {
      const stats: StatName[] = ['strength', 'intelligence', 'wisdom', 'charisma', 'dexterity', 'constitution', 'luck'];
      for (const stat of stats) {
        expect(living.getStatModifier(stat)).toBe(0);
      }
    });
  });

  describe('setting stats', () => {
    it('should set base stats via setter', () => {
      living.strength = 15;
      expect(living.strength).toBe(15);
      expect(living.getBaseStat('strength')).toBe(15);
    });

    it('should set base stats via setBaseStat', () => {
      living.setBaseStat('intelligence', 18);
      expect(living.intelligence).toBe(18);
    });

    it('should clamp stats to valid range', () => {
      living.strength = 0; // Below minimum
      expect(living.strength).toBe(MIN_STAT);

      living.strength = 200; // Above maximum
      expect(living.strength).toBe(MAX_STAT);
    });

    it('should set multiple stats at once', () => {
      living.setBaseStats({
        strength: 15,
        dexterity: 14,
        constitution: 16,
      });

      expect(living.strength).toBe(15);
      expect(living.dexterity).toBe(14);
      expect(living.constitution).toBe(16);
      // Others should remain default
      expect(living.intelligence).toBe(DEFAULT_STAT);
    });
  });

  describe('stat modifiers', () => {
    it('should apply modifiers to effective stat', () => {
      living.strength = 10;
      living.setStatModifier('strength', 5);
      expect(living.strength).toBe(15);
      expect(living.getBaseStat('strength')).toBe(10);
    });

    it('should add to modifiers', () => {
      living.setStatModifier('dexterity', 2);
      living.addStatModifier('dexterity', 3);
      expect(living.getStatModifier('dexterity')).toBe(5);
    });

    it('should handle negative modifiers', () => {
      living.strength = 10;
      living.setStatModifier('strength', -4);
      expect(living.strength).toBe(6);
    });

    it('should clamp effective stats with modifiers', () => {
      living.strength = 5;
      living.setStatModifier('strength', -10);
      expect(living.strength).toBe(MIN_STAT); // Should not go below minimum
    });

    it('should reset all modifiers', () => {
      living.setStatModifier('strength', 5);
      living.setStatModifier('dexterity', 3);
      living.resetStatModifiers();

      expect(living.getStatModifier('strength')).toBe(0);
      expect(living.getStatModifier('dexterity')).toBe(0);
    });
  });

  describe('stat bonuses', () => {
    it('should have zero bonus by default', () => {
      expect(living.getStatBonus('strength')).toBe(0);
      expect(living.getStatBonus('intelligence')).toBe(0);
    });

    it('should return bonus from equipment/buff modifiers', () => {
      living.setStatModifier('strength', 5);
      expect(living.getStatBonus('strength')).toBe(5);

      living.setStatModifier('dexterity', -2);
      expect(living.getStatBonus('dexterity')).toBe(-2);
    });

    it('should be an alias for getStatModifier', () => {
      living.setStatModifier('wisdom', 10);
      expect(living.getStatBonus('wisdom')).toBe(living.getStatModifier('wisdom'));
    });

    it('should not be affected by base stat value', () => {
      living.strength = 50;
      expect(living.getStatBonus('strength')).toBe(0); // No auto-bonus from stat value

      living.strength = 100;
      expect(living.getStatBonus('strength')).toBe(0); // Still no auto-bonus
    });
  });

  describe('stat checks', () => {
    it('should return success/failure based on roll', () => {
      // With mocked random, this is hard to test deterministically
      // Just verify the structure is correct
      const result = living.statCheck('strength', 10);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('bonus');

      expect(typeof result.success).toBe('boolean');
      expect(result.roll).toBeGreaterThanOrEqual(1);
      expect(result.roll).toBeLessThanOrEqual(20);
    });

    it('should include equipment bonus in total', () => {
      living.setStatModifier('strength', 3); // +3 from equipment
      const result = living.statCheck('strength', 10);

      expect(result.bonus).toBe(3);
      expect(result.total).toBe(result.roll + 3);
    });
  });

  describe('getStats', () => {
    it('should return all effective stats', () => {
      living.strength = 15;
      living.dexterity = 12;
      living.setStatModifier('wisdom', 2);

      const stats = living.getStats();

      expect(stats.strength).toBe(15);
      expect(stats.dexterity).toBe(12);
      expect(stats.wisdom).toBe(DEFAULT_STAT + 2);
      expect(stats.intelligence).toBe(DEFAULT_STAT);
    });

    it('should return a copy, not a reference', () => {
      const stats = living.getStats();
      stats.strength = 99;
      expect(living.strength).toBe(DEFAULT_STAT);
    });
  });

  describe('getBaseStats', () => {
    it('should return all base stats', () => {
      living.strength = 15;
      living.setStatModifier('strength', 5);

      const baseStats = living.getBaseStats();

      expect(baseStats.strength).toBe(15); // Base, not effective
    });

    it('should return a copy, not a reference', () => {
      const baseStats = living.getBaseStats();
      baseStats.strength = 99;
      expect(living.getBaseStat('strength')).toBe(DEFAULT_STAT);
    });
  });

  describe('rollStats', () => {
    it('should generate stats between 3 and 18 (3d6)', () => {
      // Run multiple times to check range
      for (let i = 0; i < 10; i++) {
        living.rollStats();
        const stats = living.getBaseStats();

        for (const value of Object.values(stats)) {
          expect(value).toBeGreaterThanOrEqual(3);
          expect(value).toBeLessThanOrEqual(18);
        }
      }
    });
  });

  describe('rollStatsHeroic', () => {
    it('should generate stats between 3 and 18 (4d6 drop lowest)', () => {
      // Run multiple times to check range
      for (let i = 0; i < 10; i++) {
        living.rollStatsHeroic();
        const stats = living.getBaseStats();

        for (const value of Object.values(stats)) {
          expect(value).toBeGreaterThanOrEqual(3);
          expect(value).toBeLessThanOrEqual(18);
        }
      }
    });
  });

  describe('setLiving with stats', () => {
    it('should set stats via setLiving', () => {
      living.setLiving({
        name: 'Test',
        stats: {
          strength: 16,
          dexterity: 14,
        },
      });

      expect(living.strength).toBe(16);
      expect(living.dexterity).toBe(14);
    });
  });
});
