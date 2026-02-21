import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdir, rm, readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import {
  PromptManager,
  initializePromptManager,
  getPromptManager,
  resetPromptManager,
} from '../../src/driver/prompt-manager.js';

describe('PromptManager', () => {
  let testMudlibPath: string;

  beforeEach(async () => {
    resetPromptManager();
    testMudlibPath = join(process.cwd(), `test-mudlib-prompts-${randomUUID()}`);
    await mkdir(join(testMudlibPath, 'data', 'config'), { recursive: true });
  });

  afterEach(async () => {
    resetPromptManager();
    await rm(testMudlibPath, { recursive: true, force: true });
  });

  describe('defaults', () => {
    it('should have all expected prompt IDs', () => {
      const pm = new PromptManager(testMudlibPath);
      const ids = pm.getIds();
      expect(ids.length).toBeGreaterThanOrEqual(22);
      expect(ids).toContain('generate.system');
      expect(ids).toContain('describe.system');
      expect(ids).toContain('describe.user');
      expect(ids).toContain('npc.dialogue.system');
      expect(ids).toContain('aidescribe.user');
      expect(ids).toContain('npc.generation.user');
      expect(ids).toContain('room.generation.user');
      expect(ids).toContain('area.layout.user');
      expect(ids).toContain('area.room.user');
      expect(ids).toContain('area.npc.user');
      expect(ids).toContain('area.item.user');
      expect(ids).toContain('portrait.creature');
      expect(ids).toContain('portrait.humanoid');
      expect(ids).toContain('portrait.player');
      expect(ids).toContain('portrait.npc');
      expect(ids).toContain('portrait.pet');
      expect(ids).toContain('portrait.weapon');
      expect(ids).toContain('portrait.armor');
      expect(ids).toContain('portrait.container');
      expect(ids).toContain('portrait.corpse');
      expect(ids).toContain('portrait.gold');
      expect(ids).toContain('portrait.item');
    });

    it('should return default templates with get()', () => {
      const pm = new PromptManager(testMudlibPath);
      const template = pm.get('generate.system');
      expect(template).toBeDefined();
      expect(template).toContain('{{gameTheme}} MUD game');
    });

    it('should return undefined for unknown IDs', () => {
      const pm = new PromptManager(testMudlibPath);
      expect(pm.get('nonexistent')).toBeUndefined();
    });
  });

  describe('render', () => {
    it('should render a template with variables', () => {
      const pm = new PromptManager(testMudlibPath);
      const result = pm.render('describe.user', {
        type: 'room',
        name: 'Dark Cave',
        keywords: 'spooky, dark',
      });
      expect(result).toBeDefined();
      expect(result).toContain('room');
      expect(result).toContain('Dark Cave');
      expect(result).toContain('spooky, dark');
    });

    it('should return undefined for unknown IDs', () => {
      const pm = new PromptManager(testMudlibPath);
      expect(pm.render('nonexistent', {})).toBeUndefined();
    });

    it('should auto-inject gameTheme into rendered templates', () => {
      const pm = new PromptManager(testMudlibPath);
      const result = pm.render('generate.system');
      expect(result).toBeDefined();
      // With no EfunBridge available, falls back to "fantasy"
      expect(result).toContain('fantasy MUD game');
    });

    it('should allow caller to override gameTheme', () => {
      const pm = new PromptManager(testMudlibPath);
      const result = pm.render('generate.system', { gameTheme: 'cyberpunk' });
      expect(result).toBeDefined();
      expect(result).toContain('cyberpunk MUD game');
      expect(result).not.toContain('fantasy');
    });

    it('should handle conditional blocks in templates', () => {
      const pm = new PromptManager(testMudlibPath);
      // describe.user has {{#if theme}} blocks
      const withTheme = pm.render('describe.user', {
        type: 'room',
        name: 'Cave',
        theme: 'dark fantasy',
      });
      const withoutTheme = pm.render('describe.user', {
        type: 'room',
        name: 'Cave',
      });
      expect(withTheme).toContain('dark fantasy');
      expect(withoutTheme).not.toContain('Theme:');
    });
  });

  describe('overrides', () => {
    it('should set and get an override', async () => {
      const pm = new PromptManager(testMudlibPath);
      const result = await pm.set('generate.system', 'Custom system prompt.');
      expect(result.success).toBe(true);
      expect(pm.get('generate.system')).toBe('Custom system prompt.');
      expect(pm.hasOverride('generate.system')).toBe(true);
    });

    it('should reject overrides for unknown IDs', async () => {
      const pm = new PromptManager(testMudlibPath);
      const result = await pm.set('nonexistent', 'test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown prompt ID');
    });

    it('should persist overrides to disk', async () => {
      const pm = new PromptManager(testMudlibPath);
      await pm.set('generate.system', 'Persisted prompt.');

      const filePath = join(testMudlibPath, 'data', 'config', 'ai-prompts.json');
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      expect(data['generate.system']).toBe('Persisted prompt.');
    });

    it('should load overrides from disk', async () => {
      const filePath = join(testMudlibPath, 'data', 'config', 'ai-prompts.json');
      await writeFile(filePath, JSON.stringify({ 'generate.system': 'From disk.' }));

      const pm = new PromptManager(testMudlibPath);
      await pm.loadOverrides();
      expect(pm.get('generate.system')).toBe('From disk.');
      expect(pm.hasOverride('generate.system')).toBe(true);
    });

    it('should ignore invalid keys in override file', async () => {
      const filePath = join(testMudlibPath, 'data', 'config', 'ai-prompts.json');
      await writeFile(filePath, JSON.stringify({ 'fake.key': 'ignored', 'generate.system': 'valid' }));

      const pm = new PromptManager(testMudlibPath);
      await pm.loadOverrides();
      expect(pm.get('generate.system')).toBe('valid');
      expect(pm.hasOverride('fake.key' as string)).toBe(false);
    });

    it('should handle missing override file gracefully', async () => {
      const pm = new PromptManager(testMudlibPath);
      await pm.loadOverrides(); // Should not throw
      expect(pm.get('generate.system')).toBeDefined();
      expect(pm.hasOverride('generate.system')).toBe(false);
    });

    it('should reset an override', async () => {
      const pm = new PromptManager(testMudlibPath);
      await pm.set('generate.system', 'Custom.');
      expect(pm.hasOverride('generate.system')).toBe(true);

      const result = await pm.reset('generate.system');
      expect(result.success).toBe(true);
      expect(pm.hasOverride('generate.system')).toBe(false);
      // Should be back to default
      expect(pm.get('generate.system')).toContain('{{gameTheme}} MUD game');
    });

    it('should return getDefault() even when override is set', async () => {
      const pm = new PromptManager(testMudlibPath);
      const original = pm.getDefault('generate.system');
      await pm.set('generate.system', 'Custom.');
      expect(pm.getDefault('generate.system')).toBe(original);
      expect(pm.get('generate.system')).toBe('Custom.');
    });
  });

  describe('singleton', () => {
    it('should initialize and return via getPromptManager', async () => {
      expect(getPromptManager()).toBeNull();

      const pm = await initializePromptManager(testMudlibPath);
      expect(pm).toBeInstanceOf(PromptManager);
      expect(getPromptManager()).toBe(pm);
    });

    it('should reset via resetPromptManager', async () => {
      await initializePromptManager(testMudlibPath);
      expect(getPromptManager()).not.toBeNull();

      resetPromptManager();
      expect(getPromptManager()).toBeNull();
    });
  });

  describe('reload', () => {
    it('should reload overrides from disk', async () => {
      const pm = new PromptManager(testMudlibPath);
      await pm.loadOverrides();
      expect(pm.hasOverride('generate.system')).toBe(false);

      // Write overrides to disk externally
      const filePath = join(testMudlibPath, 'data', 'config', 'ai-prompts.json');
      await writeFile(filePath, JSON.stringify({ 'generate.system': 'Reloaded.' }));

      await pm.reload();
      expect(pm.get('generate.system')).toBe('Reloaded.');
    });
  });
});
