import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Living } from '../../mudlib/std/living.js';
import { Room } from '../../mudlib/std/room.js';
import { MudObject } from '../../mudlib/std/object.js';

describe('Living', () => {
  let living: Living;

  beforeEach(() => {
    living = new Living();
  });

  describe('identity', () => {
    it('should have default name', () => {
      expect(living.name).toBe('someone');
    });

    it('should set name and update shortDesc', () => {
      living.name = 'Bob';

      expect(living.name).toBe('Bob');
      expect(living.shortDesc).toBe('Bob');
    });

    it('should combine name and title', () => {
      living.name = 'Bob';
      living.title = 'the Great';

      expect(living.getDisplayName()).toBe('Bob the Great');
      expect(living.shortDesc).toBe('Bob the Great');
    });
  });

  describe('gender', () => {
    it('should default to neutral', () => {
      expect(living.gender).toBe('neutral');
    });

    it('should provide correct pronouns for male', () => {
      living.gender = 'male';

      expect(living.subjective).toBe('he');
      expect(living.objective).toBe('him');
      expect(living.possessive).toBe('his');
    });

    it('should provide correct pronouns for female', () => {
      living.gender = 'female';

      expect(living.subjective).toBe('she');
      expect(living.objective).toBe('her');
      expect(living.possessive).toBe('her');
    });

    it('should provide correct pronouns for neutral', () => {
      living.gender = 'neutral';

      expect(living.subjective).toBe('they');
      expect(living.objective).toBe('them');
      expect(living.possessive).toBe('their');
    });
  });

  describe('health', () => {
    it('should start with full health', () => {
      expect(living.health).toBe(100);
      expect(living.maxHealth).toBe(100);
      expect(living.alive).toBe(true);
    });

    it('should allow setting max health', () => {
      living.maxHealth = 200;
      living.health = 150;

      expect(living.maxHealth).toBe(200);
      expect(living.health).toBe(150);
    });

    it('should cap health at maxHealth', () => {
      living.maxHealth = 100;
      living.health = 150;

      expect(living.health).toBe(100);
    });

    it('should heal correctly', () => {
      living.health = 50;
      living.heal(30);

      expect(living.health).toBe(80);
    });

    it('should not heal above maxHealth', () => {
      living.health = 90;
      living.heal(50);

      expect(living.health).toBe(100);
    });

    it('should damage correctly', () => {
      living.damage(30);

      expect(living.health).toBe(70);
    });

    it('should die when health reaches 0', () => {
      living.damage(100);

      expect(living.health).toBe(0);
      expect(living.alive).toBe(false);
    });

    it('should not damage when dead', () => {
      living.damage(100);
      living.damage(50); // Should have no effect

      expect(living.health).toBe(0);
    });

    it('should revive correctly', () => {
      living.damage(100);
      living.revive();

      expect(living.alive).toBe(true);
      expect(living.health).toBe(100);
    });

    it('should revive with specified health', () => {
      living.damage(100);
      living.revive(50);

      expect(living.alive).toBe(true);
      expect(living.health).toBe(50);
    });
  });

  describe('command parsing', () => {
    it('should parse simple command', () => {
      const parsed = living.parseCommand('look');

      expect(parsed.verb).toBe('look');
      expect(parsed.args).toBe('');
      expect(parsed.words).toEqual(['look']);
    });

    it('should parse command with arguments', () => {
      const parsed = living.parseCommand('say hello world');

      expect(parsed.verb).toBe('say');
      expect(parsed.args).toBe('hello world');
      expect(parsed.words).toEqual(['say', 'hello', 'world']);
    });

    it('should handle multiple spaces', () => {
      const parsed = living.parseCommand('  look   at   sword  ');

      expect(parsed.verb).toBe('look');
      expect(parsed.args).toBe('at sword');
    });

    it('should lowercase verb', () => {
      const parsed = living.parseCommand('LOOK');

      expect(parsed.verb).toBe('look');
    });
  });

  describe('command execution', () => {
    it('should execute action on self', async () => {
      const handler = vi.fn().mockReturnValue(true);
      living.addAction('test', handler);

      const result = await living.command('test something');

      expect(handler).toHaveBeenCalledWith('something');
      expect(result).toBe(true);
    });

    it('should return false for unknown command', async () => {
      const result = await living.command('nonexistent');

      expect(result).toBe(false);
    });

    it('should track command history', async () => {
      living.addAction('test', () => true);

      await living.command('test 1');
      await living.command('test 2');
      await living.command('test 3');

      const history = living.getHistory();
      expect(history).toContain('test 1');
      expect(history).toContain('test 2');
      expect(history).toContain('test 3');
    });

    it('should clear history', async () => {
      await living.command('test');
      living.clearHistory();

      expect(living.getHistory()).toEqual([]);
    });

    it('should execute action on inventory item', async () => {
      const item = new MudObject();
      const handler = vi.fn().mockReturnValue(true);
      item.addAction('use', handler);
      item.moveTo(living);

      const result = await living.command('use item');

      expect(handler).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('communication', () => {
    it('should have receive method', () => {
      // Default implementation does nothing, but should not throw
      expect(() => living.receive('test message')).not.toThrow();
    });

    it('should say to room', () => {
      const room = new Room();
      const other = new Living();
      const receive = vi.fn();
      (other as Living & { receive: typeof receive }).receive = receive;

      living.name = 'Bob';
      other.moveTo(room);
      living.moveTo(room);

      living.say('Hello!');

      expect(receive).toHaveBeenCalledWith('Bob says: Hello!');
    });

    it('should emote to room', () => {
      const room = new Room();
      const other = new Living();
      const receive = vi.fn();
      (other as Living & { receive: typeof receive }).receive = receive;

      living.name = 'Bob';
      other.moveTo(room);
      living.moveTo(room);

      living.emote('waves hello.');

      expect(receive).toHaveBeenCalledWith('Bob waves hello.');
    });

    it('should whisper to target', () => {
      const target = new Living();
      const receive = vi.fn();
      (target as Living & { receive: typeof receive }).receive = receive;
      target.name = 'Alice';

      living.name = 'Bob';
      living.whisper(target, 'Secret message');

      expect(receive).toHaveBeenCalledWith('Bob whispers: Secret message');
    });
  });

  describe('setup', () => {
    it('should configure with setLiving', () => {
      living.setLiving({
        name: 'Hero',
        title: 'the Brave',
        gender: 'male',
        maxHealth: 200,
        health: 150,
      });

      expect(living.name).toBe('Hero');
      expect(living.title).toBe('the Brave');
      expect(living.gender).toBe('male');
      expect(living.maxHealth).toBe(200);
      expect(living.health).toBe(150);
    });
  });
});
