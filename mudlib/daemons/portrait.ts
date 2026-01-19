/**
 * Portrait Daemon - Manages AI-generated images for objects.
 *
 * Provides images for:
 * - Players (using their avatar or AI-generated profile portrait)
 * - NPCs (AI-generated from longDesc)
 * - Weapons, Armor, Containers, Items (AI-generated from longDesc)
 *
 * All generated images are cached to disk to avoid regenerating them.
 *
 * Usage:
 *   const daemon = getPortraitDaemon();
 *   const portrait = await daemon.getPortrait(target);
 *   const image = await daemon.getObjectImage(obj, 'weapon');
 */

import { MudObject } from '../std/object.js';
import type { Living } from '../std/living.js';
import { createHash } from 'crypto';

/**
 * Object image types.
 */
export type ObjectImageType = 'player' | 'npc' | 'weapon' | 'armor' | 'container' | 'item' | 'corpse' | 'gold';

/**
 * Cached portrait data.
 */
interface CachedPortrait {
  image: string;       // Base64 image data or SVG for fallback
  mimeType: string;    // 'image/png', 'image/jpeg', or 'image/svg+xml'
  generatedAt: number;
}

/**
 * Fallback SVG for when AI generation fails (for living beings).
 * A simple dark silhouette that works for any creature type.
 */
const FALLBACK_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#1a1a2e"/>
  <ellipse cx="32" cy="24" rx="14" ry="16" fill="#2d2d3d"/>
  <ellipse cx="32" cy="52" rx="18" ry="16" fill="#2d2d3d"/>
  <circle cx="26" cy="22" r="2" fill="#4a4a5a"/>
  <circle cx="38" cy="22" r="2" fill="#4a4a5a"/>
  <text x="32" y="58" text-anchor="middle" fill="#5a5a6a" font-size="8" font-family="sans-serif">?</text>
</svg>`;

/**
 * Fallback SVG for items when AI generation fails.
 * A simple treasure chest icon.
 */
const FALLBACK_ITEM_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#1a1a2e"/>
  <rect x="12" y="24" width="40" height="28" rx="4" fill="#3d2d1d"/>
  <rect x="12" y="20" width="40" height="8" rx="2" fill="#4d3d2d"/>
  <rect x="28" y="32" width="8" height="10" rx="2" fill="#6a5a4a"/>
  <circle cx="32" cy="36" r="2" fill="#8a7a6a"/>
</svg>`;

/**
 * Get the fallback portrait as a data URI.
 */
function getFallbackDataUri(): string {
  const base64 = Buffer.from(FALLBACK_SVG).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Get the fallback item image as a data URI.
 */
function getFallbackItemDataUri(): string {
  const base64 = Buffer.from(FALLBACK_ITEM_SVG).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Portrait Daemon class.
 */
export class PortraitDaemon extends MudObject {
  private _cache: Map<string, CachedPortrait> = new Map();
  private _pendingGenerations: Map<string, Promise<string>> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Portrait Daemon';
    this.longDesc = 'The portrait daemon generates and caches portraits for combat display.';
  }

  /**
   * Get a portrait for a living target.
   * Returns SVG markup or data URI for AI-generated portraits.
   */
  async getPortrait(target: Living): Promise<string> {
    // Check if target is a player (has avatar property)
    const asPlayer = target as Living & { avatar?: string; getProperty?: (key: string) => unknown };
    if (asPlayer.avatar) {
      // Check for AI-generated profile portrait first
      if (asPlayer.getProperty) {
        const profilePortrait = asPlayer.getProperty('profilePortrait');
        if (profilePortrait && typeof profilePortrait === 'string') {
          return profilePortrait; // Return the data URI
        }
      }
      // Fall back to built-in avatar
      return this.getPlayerPortrait(asPlayer.avatar);
    }

    // NPC - generate or get cached portrait
    return this.getNpcPortrait(target);
  }

  /**
   * Get a player's portrait from their avatar ID.
   */
  private getPlayerPortrait(avatarId: string): string {
    // Import avatar dynamically to avoid bundling issues
    // The client will use its own avatar system, but we need to send the ID
    // and let the client render it
    return avatarId;
  }

  /**
   * Get an NPC portrait (cached or generated).
   * Returns a data URI suitable for use in an img tag.
   */
  private async getNpcPortrait(npc: Living): Promise<string> {
    const npcPath = npc.objectPath || '';
    if (!npcPath) {
      return getFallbackDataUri();
    }

    const cacheKey = this.getCacheKey(npcPath);

    // Check memory cache
    const cached = this._cache.get(cacheKey);
    if (cached) {
      return `data:${cached.mimeType};base64,${cached.image}`;
    }

    // Check if generation is already in progress
    const pending = this._pendingGenerations.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Check disk cache
    const diskCached = await this.loadFromDisk(cacheKey);
    if (diskCached) {
      this._cache.set(cacheKey, diskCached);
      return `data:${diskCached.mimeType};base64,${diskCached.image}`;
    }

    // Generate new portrait
    const generationPromise = this.generateNpcPortrait(npc, cacheKey);
    this._pendingGenerations.set(cacheKey, generationPromise);

    try {
      const dataUri = await generationPromise;
      return dataUri;
    } finally {
      this._pendingGenerations.delete(cacheKey);
    }
  }

  /**
   * Generate a cache key from an NPC path.
   */
  private getCacheKey(npcPath: string): string {
    // Create a hash of the path for safe filenames
    const hash = createHash('md5').update(npcPath).digest('hex').slice(0, 16);
    return hash;
  }

  /**
   * Load a cached portrait from disk.
   */
  private async loadFromDisk(cacheKey: string): Promise<CachedPortrait | null> {
    if (typeof efuns === 'undefined' || !efuns.readFile) {
      return null;
    }

    try {
      const filePath = `/data/portraits/${cacheKey}.json`;
      const exists = await efuns.fileExists(filePath);
      if (!exists) {
        return null;
      }

      const content = await efuns.readFile(filePath);
      const data = JSON.parse(content) as CachedPortrait;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Save a portrait to disk cache.
   */
  private async saveToDisk(cacheKey: string, portrait: CachedPortrait): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.writeFile) {
      return;
    }

    try {
      // Ensure directory exists
      const dirPath = '/data/portraits';
      const dirExists = await efuns.fileExists(dirPath);
      if (!dirExists) {
        await efuns.makeDir(dirPath, true);
      }

      const filePath = `/data/portraits/${cacheKey}.json`;
      await efuns.writeFile(filePath, JSON.stringify(portrait, null, 2));
    } catch (error) {
      console.error('[PortraitDaemon] Failed to save portrait to disk:', error);
    }
  }

  /**
   * Generate a portrait for an NPC using Gemini AI (Nano Banana).
   */
  private async generateNpcPortrait(npc: Living, cacheKey: string): Promise<string> {
    // Get the NPC's description
    const description = npc.longDesc || npc.shortDesc || 'a mysterious creature';

    // Build the portrait prompt
    const prompt = `Create a small square portrait icon for a fantasy RPG game character:

${description}

Style requirements:
- Dark fantasy art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable`;

    // Try AI image generation with Gemini (Nano Banana)
    const imageResult = await this.callAiImageGeneration(prompt);
    if (imageResult) {
      const portrait: CachedPortrait = {
        image: imageResult.imageBase64,
        mimeType: imageResult.mimeType,
        generatedAt: Date.now(),
      };
      this._cache.set(cacheKey, portrait);
      await this.saveToDisk(cacheKey, portrait);
      return `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`;
    }

    // Fall back to generic silhouette
    return getFallbackDataUri();
  }

  /**
   * Call Gemini AI (Nano Banana) to generate an image.
   * @param prompt The full prompt to send to the AI
   */
  private async callAiImageGeneration(prompt: string): Promise<{ imageBase64: string; mimeType: string } | null> {
    if (typeof efuns === 'undefined' || !efuns.aiImageAvailable?.()) {
      return null;
    }

    try {
      const result = await efuns.aiImageGenerate(prompt, {
        aspectRatio: '1:1',
      });

      if (result && result.success && result.imageBase64 && result.mimeType) {
        return {
          imageBase64: result.imageBase64,
          mimeType: result.mimeType,
        };
      }

      return null;
    } catch (error) {
      console.error('[PortraitDaemon] Gemini image generation failed:', error);
      return null;
    }
  }

  // ========== Object Image Generation ==========

  /**
   * Get an image for any MudObject.
   * Uses AI generation with disk/memory caching.
   * @param obj The object to get an image for
   * @param type The object type for prompt selection
   * @param extraContext Optional extra context for prompt generation
   */
  async getObjectImage(
    obj: MudObject,
    type: ObjectImageType,
    extraContext?: Record<string, unknown>
  ): Promise<string> {
    // For corpses, use the owner name as the unique identifier instead of objectPath
    // since all corpses share the same blueprint path
    // For gold piles, use the size category as the identifier since they're created dynamically
    let cacheIdentifier: string;
    if (type === 'corpse' && 'ownerName' in obj) {
      const corpse = obj as MudObject & { ownerName: string };
      cacheIdentifier = `corpse_${corpse.ownerName}`;
    } else if (type === 'gold' && 'amount' in obj) {
      const goldPile = obj as MudObject & { amount: number };
      // Use size categories to share images between similar pile sizes
      const amount = goldPile.amount;
      let sizeCategory: string;
      if (amount === 1) sizeCategory = 'single';
      else if (amount < 10) sizeCategory = 'few';
      else if (amount < 50) sizeCategory = 'small';
      else if (amount < 200) sizeCategory = 'pile';
      else if (amount < 500) sizeCategory = 'medium';
      else if (amount < 1000) sizeCategory = 'large';
      else if (amount < 5000) sizeCategory = 'huge';
      else sizeCategory = 'hoard';
      cacheIdentifier = `gold_${sizeCategory}`;
    } else {
      cacheIdentifier = obj.objectPath || '';
      if (!cacheIdentifier) {
        return type === 'npc' || type === 'player' ? getFallbackDataUri() : getFallbackItemDataUri();
      }
    }

    const cacheKey = this.getObjectCacheKey(cacheIdentifier, type);

    // Check memory cache
    const cached = this._cache.get(cacheKey);
    if (cached) {
      return `data:${cached.mimeType};base64,${cached.image}`;
    }

    // Check if generation is already in progress
    const pending = this._pendingGenerations.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Check disk cache
    const diskCached = await this.loadObjectFromDisk(cacheKey, type);
    if (diskCached) {
      this._cache.set(cacheKey, diskCached);
      return `data:${diskCached.mimeType};base64,${diskCached.image}`;
    }

    // Generate new image
    const generationPromise = this.generateObjectImage(obj, type, cacheKey, extraContext);
    this._pendingGenerations.set(cacheKey, generationPromise);

    try {
      const dataUri = await generationPromise;
      return dataUri;
    } finally {
      this._pendingGenerations.delete(cacheKey);
    }
  }

  /**
   * Generate a cache key for an object.
   */
  private getObjectCacheKey(objPath: string, type: ObjectImageType): string {
    const hash = createHash('md5').update(objPath).digest('hex').slice(0, 16);
    return `${type}_${hash}`;
  }

  /**
   * Load a cached object image from disk.
   */
  private async loadObjectFromDisk(cacheKey: string, type: ObjectImageType): Promise<CachedPortrait | null> {
    if (typeof efuns === 'undefined' || !efuns.readFile) {
      return null;
    }

    try {
      const filePath = `/data/images/${type}/${cacheKey}.json`;
      const exists = await efuns.fileExists(filePath);
      if (!exists) {
        return null;
      }

      const content = await efuns.readFile(filePath);
      const data = JSON.parse(content) as CachedPortrait;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Save an object image to disk cache.
   */
  private async saveObjectToDisk(cacheKey: string, type: ObjectImageType, portrait: CachedPortrait): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.writeFile) {
      return;
    }

    try {
      // Ensure directory exists
      const dirPath = `/data/images/${type}`;
      const dirExists = await efuns.fileExists(dirPath);
      if (!dirExists) {
        await efuns.makeDir(dirPath, true);
      }

      const filePath = `/data/images/${type}/${cacheKey}.json`;
      await efuns.writeFile(filePath, JSON.stringify(portrait, null, 2));
    } catch (error) {
      console.error('[PortraitDaemon] Failed to save object image to disk:', error);
    }
  }

  /**
   * Generate an AI image for an object.
   */
  private async generateObjectImage(
    obj: MudObject,
    type: ObjectImageType,
    cacheKey: string,
    extraContext?: Record<string, unknown>
  ): Promise<string> {
    const description = obj.longDesc || obj.shortDesc || 'a mysterious object';
    const prompt = this.buildObjectPrompt(description, type, extraContext);

    const imageResult = await this.callAiImageGeneration(prompt);
    if (imageResult) {
      const portrait: CachedPortrait = {
        image: imageResult.imageBase64,
        mimeType: imageResult.mimeType,
        generatedAt: Date.now(),
      };
      this._cache.set(cacheKey, portrait);
      await this.saveObjectToDisk(cacheKey, type, portrait);
      return `data:${imageResult.mimeType};base64,${imageResult.imageBase64}`;
    }

    // Fall back to generic image
    return type === 'npc' || type === 'player' ? getFallbackDataUri() : getFallbackItemDataUri();
  }

  /**
   * Build an AI prompt for an object type.
   */
  private buildObjectPrompt(description: string, type: ObjectImageType, extraContext?: Record<string, unknown>): string {
    switch (type) {
      case 'player':
        return `Create a small square portrait icon for a fantasy RPG player character:

${description}

Style requirements:
- Dark fantasy art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable`;

      case 'npc':
        return `Create a small square portrait icon for a fantasy RPG game character:

${description}

Style requirements:
- Dark fantasy art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable`;

      case 'weapon':
        const damageType = extraContext?.damageType as string | undefined;
        return `Create a fantasy RPG weapon icon:
${description}

Style: Dark fantasy, painterly, dramatic lighting
${damageType ? `Damage type: ${damageType}` : ''}
Square composition, item icon style on a dark background
No text, clean iconic design`;

      case 'armor':
        const slot = extraContext?.slot as string | undefined;
        return `Create a fantasy RPG armor piece icon:
${description}

Style: Dark fantasy, painterly, dramatic lighting
${slot ? `Slot: ${slot}` : ''}
Square composition, item icon style on a dark background
No text, clean iconic design`;

      case 'container':
        const state = extraContext?.isOpen ? 'open' : 'closed';
        return `Create a fantasy RPG container icon:
${description}

Style: Dark fantasy, painterly
State: ${state}
Square composition, item icon style on a dark background
No text, clean iconic design`;

      case 'corpse':
        return `Create a dark fantasy RPG corpse scene:
${description}

Style: Dark fantasy, grim, somber atmosphere
- Fallen body or remains on the ground
- Moody, dramatic lighting with shadows
- Painterly texture suitable for a game UI
Square composition on a dark background
No text, clean dramatic design`;

      case 'gold':
        return `Create a fantasy RPG gold coins icon:
${description}

Style: Dark fantasy, painterly, warm golden glow
- Shiny gold coins with fantasy designs
- Dramatic lighting making the gold gleam
- Treasure/loot aesthetic
Square composition, item icon style on a dark background
No text, clean iconic design`;

      case 'item':
      default:
        return `Create a fantasy RPG item icon:
${description}

Style: Dark fantasy, painterly, dramatic lighting
Square composition, item icon style on a dark background
No text, clean iconic design`;
    }
  }

  /**
   * Get the fallback image for an object type.
   */
  getFallbackImage(type: ObjectImageType): string {
    return type === 'npc' || type === 'player' ? getFallbackDataUri() : getFallbackItemDataUri();
  }

  /**
   * Clear the in-memory cache.
   */
  clearCache(): void {
    this._cache.clear();
  }

  /**
   * Get the number of cached portraits.
   */
  get cacheSize(): number {
    return this._cache.size;
  }

  /**
   * Get the fallback portrait as a data URI.
   */
  getFallbackPortrait(): string {
    return getFallbackDataUri();
  }
}

// Singleton instance
let portraitDaemon: PortraitDaemon | null = null;

/**
 * Get the portrait daemon singleton.
 */
export function getPortraitDaemon(): PortraitDaemon {
  if (!portraitDaemon) {
    portraitDaemon = new PortraitDaemon();
  }
  return portraitDaemon;
}

/**
 * Reset the portrait daemon (for testing).
 */
export function resetPortraitDaemon(): void {
  portraitDaemon = null;
}

export default PortraitDaemon;
