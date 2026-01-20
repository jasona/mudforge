/**
 * Tests for the Help Daemon.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HelpDaemon,
  getHelpDaemon,
  resetHelpDaemon,
  type HelpTopic,
} from '../../mudlib/daemons/help.js';
import { MudObject } from '../../mudlib/std/object.js';

// Mock player for testing
class MockPlayer extends MudObject {
  name = 'TestPlayer';
  permissionLevel = 0;
  _class: string | undefined = undefined;
  _messages: string[] = [];
  _properties: Map<string, unknown> = new Map();

  receive(message: string): void {
    this._messages.push(message);
  }

  override getProperty(key: string): unknown {
    if (key === 'class') return this._class;
    return this._properties.get(key);
  }

  override setProperty(key: string, value: unknown): void {
    this._properties.set(key, value);
  }
}

describe('HelpDaemon', () => {
  let helpDaemon: HelpDaemon;
  let player: MockPlayer;

  beforeEach(() => {
    resetHelpDaemon();
    helpDaemon = getHelpDaemon();
    player = new MockPlayer();
  });

  describe('topic registration', () => {
    it('should register a topic', () => {
      const topic: HelpTopic = {
        name: 'test-topic',
        title: 'Test Topic',
        category: 'gameplay',
        content: 'This is test content.',
      };

      const result = helpDaemon.registerTopic(topic);
      expect(result).toBe(true);

      const retrieved = helpDaemon.getTopic('test-topic');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Topic');
    });

    it('should not register duplicate topics', () => {
      const topic: HelpTopic = {
        name: 'duplicate',
        title: 'Duplicate Topic',
        category: 'gameplay',
        content: 'Content',
      };

      expect(helpDaemon.registerTopic(topic)).toBe(true);
      expect(helpDaemon.registerTopic(topic)).toBe(false);
    });

    it('should handle aliases', () => {
      const topic: HelpTopic = {
        name: 'main-topic',
        title: 'Main Topic',
        category: 'gameplay',
        content: 'Content',
        aliases: ['alias1', 'alias2'],
      };

      helpDaemon.registerTopic(topic);

      expect(helpDaemon.getTopic('main-topic')).toBeDefined();
      expect(helpDaemon.getTopic('alias1')).toBeDefined();
      expect(helpDaemon.getTopic('alias2')).toBeDefined();
      expect(helpDaemon.getTopic('alias1')?.name).toBe('main-topic');
    });

    it('should unregister topics and their aliases', () => {
      const topic: HelpTopic = {
        name: 'removable',
        title: 'Removable Topic',
        category: 'gameplay',
        content: 'Content',
        aliases: ['remove-alias'],
      };

      helpDaemon.registerTopic(topic);
      expect(helpDaemon.getTopic('removable')).toBeDefined();
      expect(helpDaemon.getTopic('remove-alias')).toBeDefined();

      helpDaemon.unregisterTopic('removable');
      expect(helpDaemon.getTopic('removable')).toBeUndefined();
      expect(helpDaemon.getTopic('remove-alias')).toBeUndefined();
    });
  });

  describe('access control', () => {
    it('should allow access to topics without restrictions', () => {
      const topic: HelpTopic = {
        name: 'public',
        title: 'Public Topic',
        category: 'gameplay',
        content: 'Anyone can see this.',
      };

      helpDaemon.registerTopic(topic);
      expect(helpDaemon.canAccess(player, topic)).toBe(true);
    });

    it('should restrict by permission level', () => {
      const builderTopic: HelpTopic = {
        name: 'builder-only',
        title: 'Builder Topic',
        category: 'building',
        content: 'Builders only.',
        access: { minPermission: 1 },
      };

      helpDaemon.registerTopic(builderTopic);

      // Player (level 0) cannot access
      player.permissionLevel = 0;
      expect(helpDaemon.canAccess(player, builderTopic)).toBe(false);

      // Builder (level 1) can access
      player.permissionLevel = 1;
      expect(helpDaemon.canAccess(player, builderTopic)).toBe(true);

      // Admin (level 3) can access
      player.permissionLevel = 3;
      expect(helpDaemon.canAccess(player, builderTopic)).toBe(true);
    });

    it('should restrict by class', () => {
      const fighterTopic: HelpTopic = {
        name: 'fighter-skill',
        title: 'Fighter Skill',
        category: 'skills',
        content: 'Fighter specific.',
        access: { requiredClass: 'fighter' },
      };

      helpDaemon.registerTopic(fighterTopic);

      // No class - cannot access
      player._class = undefined;
      expect(helpDaemon.canAccess(player, fighterTopic)).toBe(false);

      // Wrong class - cannot access
      player._class = 'thief';
      expect(helpDaemon.canAccess(player, fighterTopic)).toBe(false);

      // Correct class - can access
      player._class = 'fighter';
      expect(helpDaemon.canAccess(player, fighterTopic)).toBe(true);

      // Case insensitive
      player._class = 'Fighter';
      expect(helpDaemon.canAccess(player, fighterTopic)).toBe(true);
    });

    it('should restrict by property', () => {
      const guildTopic: HelpTopic = {
        name: 'guild-secrets',
        title: 'Guild Secrets',
        category: 'world',
        content: 'Guild members only.',
        access: { requiredProperty: { key: 'guild', value: 'thieves' } },
      };

      helpDaemon.registerTopic(guildTopic);

      // No property - cannot access
      expect(helpDaemon.canAccess(player, guildTopic)).toBe(false);

      // Wrong value - cannot access
      player._properties.set('guild', 'warriors');
      expect(helpDaemon.canAccess(player, guildTopic)).toBe(false);

      // Correct value - can access
      player._properties.set('guild', 'thieves');
      expect(helpDaemon.canAccess(player, guildTopic)).toBe(true);
    });
  });

  describe('searching', () => {
    it('should search by name', () => {
      const topic: HelpTopic = {
        name: 'searchable',
        title: 'Searchable Topic',
        category: 'gameplay',
        content: 'Some content here.',
      };

      helpDaemon.registerTopic(topic);
      const results = helpDaemon.searchTopics(player, 'search');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.name === 'searchable')).toBe(true);
    });

    it('should search by keywords', () => {
      const topic: HelpTopic = {
        name: 'keyword-test',
        title: 'Keyword Test',
        category: 'gameplay',
        content: 'Basic content.',
        keywords: ['special', 'unique', 'findme'],
      };

      helpDaemon.registerTopic(topic);
      const results = helpDaemon.searchTopics(player, 'findme');
      expect(results.some(t => t.name === 'keyword-test')).toBe(true);
    });

    it('should search by content', () => {
      const topic: HelpTopic = {
        name: 'content-search',
        title: 'Content Search',
        category: 'gameplay',
        content: 'This contains a very unique phrase for testing.',
      };

      helpDaemon.registerTopic(topic);
      const results = helpDaemon.searchTopics(player, 'unique phrase');
      expect(results.some(t => t.name === 'content-search')).toBe(true);
    });

    it('should respect access control in search', () => {
      const adminTopic: HelpTopic = {
        name: 'admin-secret',
        title: 'Admin Secret',
        category: 'admin',
        content: 'Very secret admin content.',
        access: { minPermission: 3 },
      };

      helpDaemon.registerTopic(adminTopic);

      // Player cannot find it
      player.permissionLevel = 0;
      let results = helpDaemon.searchTopics(player, 'secret');
      expect(results.some(t => t.name === 'admin-secret')).toBe(false);

      // Admin can find it
      player.permissionLevel = 3;
      results = helpDaemon.searchTopics(player, 'secret');
      expect(results.some(t => t.name === 'admin-secret')).toBe(true);
    });
  });

  describe('category filtering', () => {
    it('should get topics by category', () => {
      const topics = helpDaemon.getTopicsByCategory(player, 'commands');
      expect(topics.length).toBeGreaterThan(0);
      expect(topics.every(t => t.category === 'commands')).toBe(true);
    });

    it('should get available categories', () => {
      const categories = helpDaemon.getAvailableCategories(player);
      expect(categories).toContain('commands');
      expect(categories).toContain('gameplay');
    });

    it('should not show restricted categories', () => {
      player.permissionLevel = 0;
      const categories = helpDaemon.getAvailableCategories(player);

      // Players shouldn't see admin categories if all admin topics are restricted
      const adminTopics = helpDaemon.getTopicsByCategory(player, 'admin');
      if (adminTopics.length === 0) {
        expect(categories).not.toContain('admin');
      }
    });
  });

  describe('formatting', () => {
    it('should format topic with color codes', () => {
      const topic: HelpTopic = {
        name: 'format-test',
        title: 'Format Test',
        category: 'gameplay',
        content: 'Test content with {bold}bold{/} text.',
        seeAlso: ['other-topic'],
      };

      helpDaemon.registerTopic(topic);
      const formatted = helpDaemon.formatTopic(topic);

      expect(formatted).toContain('Format Test');
      expect(formatted).toContain('Test content');
      expect(formatted).toContain('See also');
      expect(formatted).toContain('other-topic');
    });

    it('should format index', () => {
      const index = helpDaemon.formatIndex(player);
      expect(index).toContain('Help System');
      expect(index).toContain('Available Categories');
    });

    it('should format category listing', () => {
      const listing = helpDaemon.formatCategory(player, 'commands');
      expect(listing).toContain('Commands');
      expect(listing.length).toBeGreaterThan(100); // Has content
    });

    it('should format search results', () => {
      const results = helpDaemon.searchTopics(player, 'look');
      const formatted = helpDaemon.formatSearchResults(results, 'look');
      expect(formatted).toContain('Search Results');
      expect(formatted).toContain('look');
    });
  });

  describe('default topics', () => {
    it('should have introduction topic', () => {
      const topic = helpDaemon.getTopic('introduction');
      expect(topic).toBeDefined();
      expect(topic?.aliases).toContain('intro');
    });

    it('should have movement topic', () => {
      const topic = helpDaemon.getTopic('movement');
      expect(topic).toBeDefined();
    });

    it('should have commands topic', () => {
      const topic = helpDaemon.getTopic('commands');
      expect(topic).toBeDefined();
    });

    it('should have combat topic', () => {
      const topic = helpDaemon.getTopic('combat');
      expect(topic).toBeDefined();
    });

    it('should have class-restricted topics', () => {
      const fighterTopic = helpDaemon.getTopic('fighter');
      expect(fighterTopic).toBeDefined();
      expect(fighterTopic?.access?.requiredClass).toBe('fighter');
    });
  });
});
