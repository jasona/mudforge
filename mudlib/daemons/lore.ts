/**
 * Lore Daemon - Central registry for world lore entries.
 *
 * Provides a centralized system for managing world lore that can be
 * referenced by NPCs via their knowledgeScope.worldLore property.
 * Lore entries are injected into AI prompts to give NPCs contextual
 * knowledge about the game world.
 *
 * Usage:
 *   const lore = getLoreDaemon();
 *   lore.registerLore({ id: 'world:creation-myth', category: 'world', ... });
 *   const context = lore.buildContext(['world:creation-myth', 'faction:thieves-guild']);
 */

import { MudObject } from '../std/object.js';
import { getPlayableRaces } from '../std/race/definitions.js';

/**
 * Lore categories for organizing world knowledge.
 */
export type LoreCategory =
  | 'world'      // General world facts, cosmology
  | 'region'     // Geographic areas, kingdoms
  | 'faction'    // Organizations, guilds, groups
  | 'history'    // Past eras, timelines
  | 'character'  // Notable NPCs, heroes, villains
  | 'event'      // Major historical events, wars, disasters
  | 'item'       // Artifacts, magical items, item types
  | 'creature'   // Monster types, beasts, supernatural beings
  | 'location'   // Specific notable places (buildings, dungeons)
  | 'economics'  // Trade, currency, commerce
  | 'mechanics'  // World mechanics (magic systems, etc.)
  | 'faith'      // Religions, gods, worship
  | 'race';      // Playable races

/**
 * A single lore entry containing world knowledge.
 */
export interface LoreEntry {
  /** Unique identifier in "category:slug" format (e.g., "history:founding-of-grimhold") */
  id: string;
  /** The category this lore belongs to */
  category: LoreCategory;
  /** Short title for reference */
  title: string;
  /** The actual lore text for AI context */
  content: string;
  /** Tags for filtering (e.g., ["magic", "elves"]) */
  tags?: string[];
  /** IDs of related lore entries */
  relatedLore?: string[];
  /** Higher priority entries are included first when truncating (default: 0) */
  priority?: number;
}

/**
 * Serialized format for persistence.
 */
interface SerializedLore {
  entries: LoreEntry[];
}

/**
 * Valid lore categories for validation.
 */
const VALID_CATEGORIES: LoreCategory[] = [
  'world', 'region', 'faction', 'history', 'character',
  'event', 'item', 'creature', 'location', 'economics',
  'mechanics', 'faith', 'race'
];

/**
 * Lore Daemon class.
 */
export class LoreDaemon extends MudObject {
  private _lore: Map<string, LoreEntry> = new Map();
  private _dirty: boolean = false;
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Lore Daemon';
    this.longDesc = 'The lore daemon manages world lore entries for AI context.';

    // Register built-in race lore entries
    this.registerRaceLore();
  }

  /**
   * Register built-in race lore entries from race definitions.
   * Lore is generated from the single source of truth in definitions.ts.
   */
  private registerRaceLore(): void {
    const races = getPlayableRaces();

    for (const race of races) {
      const entry: LoreEntry = {
        id: race.loreEntryId,
        category: 'race',
        title: `The ${race.name} People`,
        content: race.longDescription,
        tags: ['race', race.id, 'playable'],
        priority: 8,
      };

      this._lore.set(entry.id, entry);
    }
  }

  // ==================== Core Methods ====================

  /**
   * Register a new lore entry.
   */
  registerLore(entry: LoreEntry): boolean {
    // Validate ID format
    if (!entry.id || !entry.id.includes(':')) {
      console.warn(`[LoreDaemon] Invalid lore ID format: ${entry.id} (should be category:slug)`);
      return false;
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(entry.category)) {
      console.warn(`[LoreDaemon] Invalid category: ${entry.category}`);
      return false;
    }

    // Validate required fields
    if (!entry.title || !entry.content) {
      console.warn(`[LoreDaemon] Missing title or content for lore: ${entry.id}`);
      return false;
    }

    if (this._lore.has(entry.id)) {
      console.warn(`[LoreDaemon] Lore ${entry.id} already registered, updating`);
    }

    // Ensure priority has a default
    const normalizedEntry: LoreEntry = {
      ...entry,
      priority: entry.priority ?? 0,
      tags: entry.tags ?? [],
      relatedLore: entry.relatedLore ?? [],
    };

    this._lore.set(entry.id, normalizedEntry);
    this._dirty = true;
    return true;
  }

  /**
   * Get a specific lore entry by ID.
   */
  getLore(id: string): LoreEntry | undefined {
    return this._lore.get(id);
  }

  /**
   * Get all lore entries in a category.
   */
  getLoreByCategory(category: LoreCategory): LoreEntry[] {
    const results: LoreEntry[] = [];
    for (const entry of this._lore.values()) {
      if (entry.category === category) {
        results.push(entry);
      }
    }
    return results.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Get all lore entries matching any of the given tags.
   */
  getLoreByTags(tags: string[]): LoreEntry[] {
    if (!tags.length) return [];

    const tagSet = new Set(tags.map(t => t.toLowerCase()));
    const results: LoreEntry[] = [];

    for (const entry of this._lore.values()) {
      const entryTags = entry.tags ?? [];
      for (const tag of entryTags) {
        if (tagSet.has(tag.toLowerCase())) {
          results.push(entry);
          break;
        }
      }
    }

    return results.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Get all registered lore entries.
   */
  getAllLore(): LoreEntry[] {
    return Array.from(this._lore.values())
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Remove a lore entry by ID.
   */
  removeLore(id: string): boolean {
    if (!this._lore.has(id)) {
      return false;
    }
    this._lore.delete(id);
    this._dirty = true;
    return true;
  }

  /**
   * Get the number of registered lore entries.
   */
  get count(): number {
    return this._lore.size;
  }

  // ==================== AI Integration ====================

  /**
   * Build an AI-ready context string from a list of lore IDs.
   * Entries are sorted by priority and concatenated, respecting maxLength.
   *
   * @param loreIds - Array of lore IDs to include
   * @param maxLength - Maximum character length for the context (default: 2000)
   * @returns Formatted context string for AI prompts
   */
  buildContext(loreIds: string[], maxLength: number = 2000): string {
    if (!loreIds.length) return '';

    // Collect valid entries
    const entries: LoreEntry[] = [];
    for (const id of loreIds) {
      const entry = this._lore.get(id);
      if (entry) {
        entries.push(entry);
      } else {
        console.warn(`[LoreDaemon] Lore ID not found: ${id}`);
      }
    }

    if (!entries.length) return '';

    // Sort by priority (highest first)
    entries.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Build context string, respecting maxLength
    const parts: string[] = [];
    let totalLength = 0;

    for (const entry of entries) {
      const entryText = `[${entry.title}]: ${entry.content}`;
      const entryLength = entryText.length + 1; // +1 for newline

      if (totalLength + entryLength > maxLength) {
        // Check if we can fit a truncated version
        const remainingSpace = maxLength - totalLength - 4; // -4 for "..."
        if (remainingSpace > 50) {
          parts.push(entryText.slice(0, remainingSpace) + '...');
        }
        break;
      }

      parts.push(entryText);
      totalLength += entryLength;
    }

    return parts.join('\n');
  }

  // ==================== Persistence ====================

  /**
   * Load lore entries from disk.
   */
  async load(): Promise<void> {
    if (this._loaded) return;

    if (typeof efuns === 'undefined' || !efuns.readFile) {
      console.log('[LoreDaemon] efuns not available, starting with empty lore');
      this._loaded = true;
      return;
    }

    try {
      const lorePath = '/data/lore/entries.json';
      const exists = await efuns.fileExists(lorePath);

      if (!exists) {
        console.log('[LoreDaemon] No saved lore found, starting fresh');
        this._loaded = true;
        return;
      }

      const content = await efuns.readFile(lorePath);
      const saved = JSON.parse(content) as SerializedLore;

      let loaded = 0;
      for (const entry of saved.entries ?? []) {
        if (this.registerLore(entry)) {
          loaded++;
        }
      }

      console.log(`[LoreDaemon] Loaded ${loaded} lore entries from disk`);
      this._loaded = true;
      this._dirty = false;
    } catch (error) {
      console.error('[LoreDaemon] Failed to load lore:', error);
      this._loaded = true;
    }
  }

  /**
   * Save lore entries to disk.
   */
  async save(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.writeFile) {
      console.log('[LoreDaemon] efuns not available, cannot save');
      return;
    }

    try {
      const serialized: SerializedLore = {
        entries: Array.from(this._lore.values()),
      };

      const lorePath = '/data/lore/entries.json';

      // Ensure directory exists
      const dirPath = '/data/lore';
      const dirExists = await efuns.fileExists(dirPath);
      if (!dirExists) {
        await efuns.makeDir(dirPath, true);
      }

      await efuns.writeFile(lorePath, JSON.stringify(serialized, null, 2));
      console.log(`[LoreDaemon] Saved ${this._lore.size} lore entries to disk`);
      this._dirty = false;
    } catch (error) {
      console.error('[LoreDaemon] Failed to save lore:', error);
    }
  }

  /**
   * Check if there are unsaved changes.
   */
  get isDirty(): boolean {
    return this._dirty;
  }

  /**
   * Check if lore has been loaded from disk.
   */
  get isLoaded(): boolean {
    return this._loaded;
  }

  // ==================== Utility Methods ====================

  /**
   * Get all valid categories.
   */
  getCategories(): LoreCategory[] {
    return [...VALID_CATEGORIES];
  }

  /**
   * Check if a category is valid.
   */
  isValidCategory(category: string): category is LoreCategory {
    return VALID_CATEGORIES.includes(category as LoreCategory);
  }

  /**
   * Search lore entries by title or content.
   */
  search(query: string): LoreEntry[] {
    const lowerQuery = query.toLowerCase();
    const results: LoreEntry[] = [];

    for (const entry of this._lore.values()) {
      if (
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.content.toLowerCase().includes(lowerQuery)
      ) {
        results.push(entry);
      }
    }

    return results.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
}

// Singleton instance
let loreDaemon: LoreDaemon | null = null;

/**
 * Get the lore daemon singleton.
 * Automatically loads from disk on first access.
 */
export function getLoreDaemon(): LoreDaemon {
  if (!loreDaemon) {
    loreDaemon = new LoreDaemon();
    // Trigger async load (don't await - it will complete in background)
    loreDaemon.load();
  }
  return loreDaemon;
}

/**
 * Reset the lore daemon (for testing).
 */
export function resetLoreDaemon(): void {
  loreDaemon = null;
}

export default LoreDaemon;
