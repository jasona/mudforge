/**
 * Tests for the Player class experience and leveling system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../mudlib/std/player.js';
import { Living } from '../../mudlib/std/living.js';

describe('Living Level', () => {
  let living: Living;

  beforeEach(() => {
    living = new Living();
  });

  describe('default level', () => {
    it('should start at level 1', () => {
      expect(living.level).toBe(1);
    });
  });

  describe('setting level', () => {
    it('should set level via setter', () => {
      living.level = 5;
      expect(living.level).toBe(5);
    });

    it('should not go below level 1', () => {
      living.level = 0;
      expect(living.level).toBe(1);

      living.level = -5;
      expect(living.level).toBe(1);
    });

    it('should set level via setLiving', () => {
      living.setLiving({ level: 10 });
      expect(living.level).toBe(10);
    });
  });
});

describe('Player Experience', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player();
  });

  describe('default experience', () => {
    it('should start with 0 XP', () => {
      expect(player.experience).toBe(0);
    });

    it('should start at level 1', () => {
      expect(player.level).toBe(1);
    });
  });

  describe('setting experience', () => {
    it('should set experience via setter', () => {
      player.experience = 500;
      expect(player.experience).toBe(500);
    });

    it('should not go below 0', () => {
      player.experience = -100;
      expect(player.experience).toBe(0);
    });
  });

  describe('gainExperience', () => {
    it('should add experience', () => {
      player.gainExperience(100);
      expect(player.experience).toBe(100);
    });

    it('should accumulate experience', () => {
      player.gainExperience(100);
      player.gainExperience(50);
      expect(player.experience).toBe(150);
    });

    it('should ignore zero or negative amounts', () => {
      player.gainExperience(100);
      player.gainExperience(0);
      player.gainExperience(-50);
      expect(player.experience).toBe(100);
    });
  });

  describe('xpForLevel', () => {
    it('should return 0 for level 1', () => {
      expect(Player.xpForLevel(1)).toBe(0);
    });

    it('should calculate XP correctly', () => {
      expect(Player.xpForLevel(2)).toBe(400);   // 2^2 * 100
      expect(Player.xpForLevel(3)).toBe(900);   // 3^2 * 100
      expect(Player.xpForLevel(5)).toBe(2500);  // 5^2 * 100
      expect(Player.xpForLevel(10)).toBe(10000); // 10^2 * 100
    });
  });

  describe('xpForNextLevel', () => {
    it('should return XP for next level', () => {
      player.level = 1;
      expect(player.xpForNextLevel).toBe(400); // Level 2
    });

    it('should update when level changes', () => {
      player.level = 5;
      expect(player.xpForNextLevel).toBe(3600); // Level 6: 6^2 * 100
    });
  });

  describe('xpToNextLevel', () => {
    it('should calculate remaining XP needed', () => {
      player.level = 1;
      player.experience = 100;
      expect(player.xpToNextLevel).toBe(300); // 400 - 100
    });

    it('should not go negative', () => {
      player.level = 1;
      player.experience = 500;
      expect(player.xpToNextLevel).toBe(0);
    });
  });

  describe('levelUp', () => {
    it('should fail without enough XP', () => {
      player.experience = 300;
      const result = player.levelUp();
      expect(result).toBe(false);
      expect(player.level).toBe(1);
      expect(player.experience).toBe(300);
    });

    it('should succeed with enough XP', () => {
      player.experience = 400;
      const result = player.levelUp();
      expect(result).toBe(true);
      expect(player.level).toBe(2);
      expect(player.experience).toBe(0);
    });

    it('should keep excess XP', () => {
      player.experience = 500;
      player.levelUp();
      expect(player.level).toBe(2);
      expect(player.experience).toBe(100);
    });

    it('should increase maxHealth on level up', () => {
      const initialMaxHealth = player.maxHealth;
      player.experience = 400;
      player.levelUp();
      expect(player.maxHealth).toBe(initialMaxHealth + 10);
    });

    it('should increase maxMana on level up', () => {
      const initialMaxMana = player.maxMana;
      player.experience = 400;
      player.levelUp();
      expect(player.maxMana).toBe(initialMaxMana + 5);
    });
  });

  describe('xpToRaiseStat', () => {
    it('should calculate cost based on current stat', () => {
      player.setBaseStat('strength', 1);
      expect(player.xpToRaiseStat('strength')).toBe(50); // 1 * 50

      player.setBaseStat('strength', 10);
      expect(player.xpToRaiseStat('strength')).toBe(500); // 10 * 50

      player.setBaseStat('strength', 50);
      expect(player.xpToRaiseStat('strength')).toBe(2500); // 50 * 50
    });
  });

  describe('raiseStat', () => {
    it('should fail without enough XP', () => {
      player.setBaseStat('strength', 10);
      player.experience = 400;
      const result = player.raiseStat('strength');
      expect(result).toBe(false);
      expect(player.getBaseStat('strength')).toBe(10);
    });

    it('should succeed with enough XP', () => {
      player.setBaseStat('strength', 10);
      player.experience = 500;
      const result = player.raiseStat('strength');
      expect(result).toBe(true);
      expect(player.getBaseStat('strength')).toBe(11);
      expect(player.experience).toBe(0);
    });

    it('should fail at max stat', () => {
      player.setBaseStat('strength', 100);
      player.experience = 10000;
      const result = player.raiseStat('strength');
      expect(result).toBe(false);
      expect(player.getBaseStat('strength')).toBe(100);
    });

    it('should work for all stats', () => {
      player.experience = 10000;
      player.setBaseStat('intelligence', 5);

      const result = player.raiseStat('intelligence');
      expect(result).toBe(true);
      expect(player.getBaseStat('intelligence')).toBe(6);
    });
  });

  describe('save and restore', () => {
    it('should save level and experience', () => {
      player.level = 5;
      player.experience = 1234;

      const data = player.save();

      expect(data.level).toBe(5);
      expect(data.experience).toBe(1234);
    });

    it('should restore level and experience', () => {
      const data = {
        name: 'Test',
        title: '',
        gender: 'neutral' as const,
        level: 10,
        experience: 5000,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        stats: {
          strength: 1,
          intelligence: 1,
          wisdom: 1,
          charisma: 1,
          dexterity: 1,
          constitution: 1,
          luck: 1,
        },
        location: '/test',
        inventory: [],
        properties: {},
        createdAt: Date.now(),
        lastLogin: Date.now(),
        playTime: 0,
      };

      player.restore(data);

      expect(player.level).toBe(10);
      expect(player.experience).toBe(5000);
    });

    it('should handle missing level/experience for backwards compatibility', () => {
      const data = {
        name: 'Test',
        title: '',
        gender: 'neutral' as const,
        health: 100,
        maxHealth: 100,
        stats: {
          strength: 1,
          intelligence: 1,
          wisdom: 1,
          charisma: 1,
          dexterity: 1,
          constitution: 1,
          luck: 1,
        },
        location: '/test',
        inventory: [],
        properties: {},
        createdAt: Date.now(),
        lastLogin: Date.now(),
        playTime: 0,
      } as unknown as Parameters<typeof player.restore>[0]; // Cast to simulate old data format

      player.restore(data);

      // Should keep defaults
      expect(player.level).toBe(1);
      expect(player.experience).toBe(0);
    });
  });
});
