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
import type { GeneratedItemData } from '../std/loot/types.js';
// Sandbox-safe hash for cache keys (not cryptographic).

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash >>> 0) * 0x01000193;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function cacheKeyHash16(input: string): string {
  const h1 = fnv1aHex(input);
  const h2 = fnv1aHex(`${input}#`);
  return (h1 + h2).slice(0, 16);
}

/**
 * Interface for objects with generated item data.
 */
interface GeneratedItem extends MudObject {
  getGeneratedItemData(): GeneratedItemData;
}

/**
 * Check if an object is a generated item.
 */
function isGeneratedItem(obj: MudObject): obj is GeneratedItem {
  return 'getGeneratedItemData' in obj && typeof (obj as GeneratedItem).getGeneratedItemData === 'function';
}

/**
 * Strip MUD color codes from a string for use in prompts.
 */
function stripColorCodes(str: string): string {
  return str.replace(/\{[^}]*\}/g, '');
}

/**
 * Object image types.
 */
export type ObjectImageType = 'player' | 'npc' | 'pet' | 'weapon' | 'armor' | 'container' | 'item' | 'corpse' | 'gold';

/**
 * Cached portrait data.
 */
interface CachedPortrait {
  image: string;       // Base64 image data or SVG for fallback
  mimeType: string;    // 'image/png', 'image/jpeg', or 'image/svg+xml'
  generatedAt: number;
}

type NpcEngageKind = 'humanoid' | 'creature';

/**
 * Pre-encoded fallback SVG for living beings (base64).
 * A simple dark silhouette that works for any creature type.
 */
const FALLBACK_SVG_BASE64 = 'PHN2ZyB2aWV3Qm94PSIwIDAgNjQgNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMWExYTJlIi8+CiAgPGVsbGlwc2UgY3g9IjMyIiBjeT0iMjQiIHJ4PSIxNCIgcnk9IjE2IiBmaWxsPSIjMmQyZDNkIi8+CiAgPGVsbGlwc2UgY3g9IjMyIiBjeT0iNTIiIHJ4PSIxOCIgcnk9IjE2IiBmaWxsPSIjMmQyZDNkIi8+CiAgPGNpcmNsZSBjeD0iMjYiIGN5PSIyMiIgcj0iMiIgZmlsbD0iIzRhNGE1YSIvPgogIDxjaXJjbGUgY3g9IjM4IiBjeT0iMjIiIHI9IjIiIGZpbGw9IiM0YTRhNWEiLz4KICA8dGV4dCB4PSIzMiIgeT0iNTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM1YTVhNmEiIGZvbnQtc2l6ZT0iOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPj88L3RleHQ+Cjwvc3ZnPg==';

/**
 * Pre-encoded fallback SVG for items (base64).
 * A simple treasure chest icon.
 */
const FALLBACK_ITEM_SVG_BASE64 = 'PHN2ZyB2aWV3Qm94PSIwIDAgNjQgNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMWExYTJlIi8+CiAgPHJlY3QgeD0iMTIiIHk9IjI0IiB3aWR0aD0iNDAiIGhlaWdodD0iMjgiIHJ4PSI0IiBmaWxsPSIjM2QyZDFkIi8+CiAgPHJlY3QgeD0iMTIiIHk9IjIwIiB3aWR0aD0iNDAiIGhlaWdodD0iOCIgcng9IjIiIGZpbGw9IiM0ZDNkMmQiLz4KICA8cmVjdCB4PSIyOCIgeT0iMzIiIHdpZHRoPSI4IiBoZWlnaHQ9IjEwIiByeD0iMiIgZmlsbD0iIzZhNWE0YSIvPgogIDxjaXJjbGUgY3g9IjMyIiBjeT0iMzYiIHI9IjIiIGZpbGw9IiM4YTdhNmEiLz4KPC9zdmc+';

/**
 * Get the fallback portrait as a data URI.
 */
function getFallbackDataUri(): string {
  return `data:image/svg+xml;base64,${FALLBACK_SVG_BASE64}`;
}

/**
 * Get the fallback item image as a data URI.
 */
function getFallbackItemDataUri(): string {
  return `data:image/svg+xml;base64,${FALLBACK_ITEM_SVG_BASE64}`;
}

/**
 * Portrait Daemon class.
 */
export class PortraitDaemon extends MudObject {
  private _cache: Map<string, CachedPortrait> = new Map();
  private _pendingGenerations: Map<string, Promise<string>> = new Map();
  private _generationQueue: Array<() => void> = [];
  private _activeGenerations = 0;
  private readonly MAX_CONCURRENT_GENERATIONS = 2;

  private stripPngAncillaryChunks(base64: string): string {
    try {
      const input = Buffer.from(base64, 'base64');
      if (input.length < 8) {
        return base64;
      }
      const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      if (!input.subarray(0, 8).equals(pngSig)) {
        return base64;
      }

      const chunks: Buffer[] = [pngSig];
      let offset = 8;
      while (offset + 8 <= input.length) {
        const length = input.readUInt32BE(offset);
        const chunkTotal = 12 + length;
        if (offset + chunkTotal > input.length) {
          return base64;
        }

        const type = input.subarray(offset + 4, offset + 8);
        const firstTypeByte = type[0] ?? 0;
        const isAncillary = (firstTypeByte & 0x20) !== 0;

        if (!isAncillary) {
          chunks.push(input.subarray(offset, offset + chunkTotal));
        }

        offset += chunkTotal;

        if (type[0] === 0x49 && type[1] === 0x45 && type[2] === 0x4e && type[3] === 0x44) {
          break;
        }
      }

      if (chunks.length <= 1) {
        return base64;
      }

      const stripped = Buffer.concat(chunks).toString('base64');
      return stripped.length < base64.length ? stripped : base64;
    } catch {
      return base64;
    }
  }

  private normalizeEncodedImage(imageBase64: string, mimeType: string): string {
    if (mimeType === 'image/png') {
      return this.stripPngAncillaryChunks(imageBase64);
    }
    return imageBase64;
  }

  /**
   * Normalize a data URI image payload.
   * Currently strips ancillary PNG chunks to reduce size.
   */
  normalizeDataUri(dataUri: string): string {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return dataUri;
    }
    const mimeType = match[1] ?? '';
    const base64 = match[2] ?? '';
    const normalized = this.normalizeEncodedImage(base64, mimeType);
    if (normalized === base64) {
      return dataUri;
    }
    return `data:${mimeType};base64,${normalized}`;
  }

  constructor() {
    super();
    this.shortDesc = 'Portrait Daemon';
    this.longDesc = 'The portrait daemon generates and caches portraits for combat display.';
  }

  /**
   * Concurrency-limited wrapper for AI image generation.
   * Limits the number of simultaneous Gemini API calls to prevent
   * flooding the API and causing lag (e.g. "equip all" with 8 items).
   */
  private async withGenerationLimit<T>(fn: () => Promise<T>): Promise<T> {
    if (this._activeGenerations >= this.MAX_CONCURRENT_GENERATIONS) {
      await new Promise<void>(resolve => {
        this._generationQueue.push(resolve);
      });
    }

    this._activeGenerations++;
    try {
      return await fn();
    } finally {
      this._activeGenerations--;
      const next = this._generationQueue.shift();
      if (next) next();
    }
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
          return this.normalizeDataUri(profilePortrait);
        }
      }
      // Fall back to built-in avatar
      return this.getPlayerPortrait(asPlayer.avatar);
    }

    // NPC - generate or get cached portrait
    return this.getNpcPortrait(target);
  }

  /**
   * Get a portrait URL for client-side HTTP loading when available.
   * Falls back to avatar/data URI when the image is not disk-cached.
   */
  async getPortraitUrl(target: Living): Promise<string> {
    const asPlayer = target as Living & { avatar?: string; getProperty?: (key: string) => unknown };
    if (asPlayer.avatar) {
      if (asPlayer.getProperty) {
        const profilePortrait = asPlayer.getProperty('profilePortrait');
        if (profilePortrait && typeof profilePortrait === 'string') {
          return this.normalizeDataUri(profilePortrait);
        }
      }
      return this.getPlayerPortrait(asPlayer.avatar);
    }

    const cacheKey = this.getNpcCacheKey(target);
    if (!cacheKey) {
      return getFallbackDataUri();
    }

    const portrait = await this.getNpcPortrait(target);

    if (typeof efuns !== 'undefined' && efuns.fileExists) {
      const filePath = `/data/portraits/${cacheKey}.json`;
      const exists = await efuns.fileExists(filePath);
      if (exists) {
        return `/api/images/portrait/${cacheKey}`;
      }
    }

    return portrait;
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
    const cacheKey = this.getNpcCacheKey(npc);
    if (!cacheKey) {
      return getFallbackDataUri();
    }
    const engageKind = this.getNpcEngageKind(npc);

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
    const generationPromise = this.generateNpcPortrait(npc, cacheKey, engageKind);
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
    const hash = cacheKeyHash16(npcPath);
    return hash;
  }

  private getNpcEngageKind(npc: Living): NpcEngageKind {
    const maybeKind = (npc as Living & { engageKind?: unknown }).engageKind;
    return maybeKind === 'creature' ? 'creature' : 'humanoid';
  }

  private getNpcCacheKey(npc: Living): string | null {
    const npcPath = npc.objectPath || '';
    if (!npcPath) {
      return null;
    }
    const engageKind = this.getNpcEngageKind(npc);
    return this.getCacheKey(`${npcPath}_${engageKind}`);
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
      data.image = this.normalizeEncodedImage(data.image, data.mimeType);
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
  private async generateNpcPortrait(
    npc: Living,
    cacheKey: string,
    engageKind: NpcEngageKind
  ): Promise<string> {
    // Get the NPC's description
    const description = npc.longDesc || npc.shortDesc || 'a mysterious creature';

    // Build the portrait prompt
    const prompt = engageKind === 'creature'
      ? `Create a small square portrait icon for a fantasy RPG creature or beast:

${description}

Style requirements:
- Dark fantasy art style with rich, moody colors
- Portrait composition focused on the creature's face and body
- This is an animal or beast, not a humanoid character
- Do not depict a werewolf, person, or humanoid hybrid unless explicitly described
- Show the creature in its natural form
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`
      : `Create a small square portrait icon for a fantasy RPG game character:

${description}

Style requirements:
- Dark fantasy art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`;

    // Try AI image generation with Gemini (Nano Banana) - concurrency limited
    const imageResult = await this.withGenerationLimit(() => this.callAiImageGeneration(prompt));
    if (imageResult) {
      const portrait: CachedPortrait = {
        image: this.normalizeEncodedImage(imageResult.imageBase64, imageResult.mimeType),
        mimeType: imageResult.mimeType,
        generatedAt: Date.now(),
      };
      this._cache.set(cacheKey, portrait);
      await this.saveToDisk(cacheKey, portrait);
      return `data:${portrait.mimeType};base64,${portrait.image}`;
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
    // For pets, use the template type since they're dynamically created
    const cacheIdentifier = this.getObjectCacheIdentifier(obj, type);
    if (!cacheIdentifier) {
      return type === 'npc' || type === 'player' || type === 'pet'
        ? getFallbackDataUri()
        : getFallbackItemDataUri();
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
   * Get an object image URL for client-side HTTP loading when available.
   * Falls back to data URI when no disk cache exists.
   */
  async getObjectImageUrl(
    obj: MudObject,
    type: ObjectImageType,
    extraContext?: Record<string, unknown>
  ): Promise<string> {
    const cacheIdentifier = this.getObjectCacheIdentifier(obj, type);
    const fallback = type === 'npc' || type === 'player' || type === 'pet'
      ? getFallbackDataUri()
      : getFallbackItemDataUri();
    if (!cacheIdentifier) {
      return fallback;
    }

    const cacheKey = this.getObjectCacheKey(cacheIdentifier, type);
    const image = await this.getObjectImage(obj, type, extraContext);
    if (image === fallback) {
      return image;
    }

    if (typeof efuns !== 'undefined' && efuns.fileExists) {
      const filePath = `/data/images/${type}/${cacheKey}.json`;
      const exists = await efuns.fileExists(filePath);
      if (exists) {
        return `/api/images/object/${cacheKey}`;
      }
    }

    return image;
  }

  /**
   * Get deterministic cache key for object images.
   */
  getObjectImageCacheKey(obj: MudObject, type: ObjectImageType): string | null {
    const cacheIdentifier = this.getObjectCacheIdentifier(obj, type);
    if (!cacheIdentifier) {
      return null;
    }
    return this.getObjectCacheKey(cacheIdentifier, type);
  }

  private getObjectCacheIdentifier(obj: MudObject, type: ObjectImageType): string | null {
    // Material items share one blueprint path; key by material identity instead.
    if ('getProperty' in obj && typeof obj.getProperty === 'function') {
      const materialId = obj.getProperty('materialId');
      if (typeof materialId === 'string' && materialId.length > 0) {
        const quality = obj.getProperty('quality');
        const qualityPart = typeof quality === 'string' && quality.length > 0 ? quality : 'common';
        return `material_${materialId}_${qualityPart}`;
      }
    }

    // Resource nodes all share the same blueprint path, so cache by node definition.
    // Include node size so small/medium/large variants can render differently.
    if ('getProperty' in obj && typeof obj.getProperty === 'function') {
      const nodeDefinitionId = obj.getProperty('nodeDefinitionId');
      if (typeof nodeDefinitionId === 'string' && nodeDefinitionId.length > 0) {
        const nodeSize = obj.getProperty('nodeSize');
        const sizePart = typeof nodeSize === 'string' && nodeSize.length > 0 ? nodeSize : 'default';
        return `resource_${nodeDefinitionId}_${sizePart}`;
      }
    }

    if (type === 'pet' && 'templateType' in obj) {
      const pet = obj as MudObject & { templateType: string };
      return `pet_${pet.templateType}`;
    }
    if (type === 'corpse' && 'ownerName' in obj) {
      const corpse = obj as MudObject & { ownerName: string };
      return `corpse_${corpse.ownerName}`;
    }
    if (type === 'gold' && 'amount' in obj) {
      const goldPile = obj as MudObject & { amount: number };
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
      return `gold_${sizeCategory}`;
    }
    if (isGeneratedItem(obj)) {
      const genData = obj.getGeneratedItemData();
      return `generated_${genData.generatedType}_${genData.seed}`;
    }
    return obj.objectPath || null;
  }

  /**
   * Generate a cache key for an object.
   */
  private getObjectCacheKey(objPath: string, type: ObjectImageType): string {
    const hash = cacheKeyHash16(objPath);
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
      data.image = this.normalizeEncodedImage(data.image, data.mimeType);
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
    // Strip color codes from description for cleaner AI prompts
    const rawDescription = obj.longDesc || obj.shortDesc || 'a mysterious object';
    const description = stripColorCodes(rawDescription);

    // For generated items, enhance the context with quality and item data
    let enhancedContext = extraContext || {};
    if (isGeneratedItem(obj)) {
      const genData = obj.getGeneratedItemData();
      enhancedContext = {
        ...enhancedContext,
        quality: genData.quality,
        itemName: stripColorCodes(genData.baseName),
        generatedType: genData.generatedType,
        weaponType: genData.weaponType,
        armorType: genData.armorType,
        armorSlot: genData.armorSlot,
        baubleType: genData.baubleType,
        damageType: genData.damageType,
      };
    }

    const prompt = this.buildObjectPrompt(description, type, enhancedContext);

    // Concurrency-limited to prevent flooding Gemini API
    const imageResult = await this.withGenerationLimit(() => this.callAiImageGeneration(prompt));
    if (imageResult) {
      const portrait: CachedPortrait = {
        image: this.normalizeEncodedImage(imageResult.imageBase64, imageResult.mimeType),
        mimeType: imageResult.mimeType,
        generatedAt: Date.now(),
      };
      this._cache.set(cacheKey, portrait);
      await this.saveObjectToDisk(cacheKey, type, portrait);
      return `data:${portrait.mimeType};base64,${portrait.image}`;
    }

    // Fall back to generic image
    return type === 'npc' || type === 'player' || type === 'pet' ? getFallbackDataUri() : getFallbackItemDataUri();
  }

  /**
   * Build an AI prompt for an object type.
   */
  private buildObjectPrompt(description: string, type: ObjectImageType, extraContext?: Record<string, unknown>): string {
    switch (type) {
      case 'player': {
        // Check for race appearance info
        const raceInfo = extraContext?.race as string | undefined;
        const raceName = extraContext?.raceName as string | undefined;
        const raceFeatures = extraContext?.raceFeatures as string | undefined;
        const raceBuild = extraContext?.raceBuild as string | undefined;
        const raceStyleHints = extraContext?.raceStyleHints as string | undefined;

        let raceSection = '';
        if (raceName) {
          raceSection = `\nRace: ${raceName}`;
          if (raceFeatures) {
            raceSection += `\nDistinctive features: ${raceFeatures}`;
          }
          if (raceBuild) {
            raceSection += `\nBuild: ${raceBuild}`;
          }
          if (raceStyleHints) {
            raceSection += `\nStyle hints: ${raceStyleHints}`;
          }
        }

        return `Create a small square portrait icon for a fantasy RPG player character:

${description}${raceSection}

Style requirements:
- Dark fantasy art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`;
      }

      case 'npc':
        return `Create a small square portrait icon for a fantasy RPG game character:

${description}

Style requirements:
- Dark fantasy art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`;

      case 'pet':
        return `Create a small square portrait icon for a fantasy RPG pet/companion:

${description}

Style requirements:
- Dark fantasy art style with rich, warm colors
- Portrait composition focused on the creature's face/body
- Friendly but noble appearance
- Dramatic lighting with soft shadows
- Painterly texture suitable for a game UI
- Should look like a companion portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`;

      case 'weapon': {
        const damageType = extraContext?.damageType as string | undefined;
        const quality = extraContext?.quality as string | undefined;
        const weaponType = extraContext?.weaponType as string | undefined;

        // Quality-specific style hints
        let qualityStyle = '';
        if (quality === 'legendary' || quality === 'unique') {
          qualityStyle = '\n- Glowing magical aura, legendary artifact appearance';
        } else if (quality === 'epic') {
          qualityStyle = '\n- Subtle magical glow, masterwork craftsmanship';
        } else if (quality === 'rare') {
          qualityStyle = '\n- Fine craftsmanship, hint of magical properties';
        }

        return `Create a fantasy RPG weapon icon:
${description}

Style: Dark fantasy, painterly, dramatic lighting${qualityStyle}
${weaponType ? `Weapon type: ${weaponType}` : ''}
${damageType ? `Damage type: ${damageType}` : ''}
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`;
      }

      case 'armor': {
        const slot = extraContext?.slot as string | undefined;
        const armorSlot = extraContext?.armorSlot as string | undefined;
        const armorQuality = extraContext?.quality as string | undefined;
        const armorType = extraContext?.armorType as string | undefined;

        // Quality-specific style hints
        let armorQualityStyle = '';
        if (armorQuality === 'legendary' || armorQuality === 'unique') {
          armorQualityStyle = '\n- Glowing magical enchantments, legendary artifact appearance';
        } else if (armorQuality === 'epic') {
          armorQualityStyle = '\n- Subtle magical glow, masterwork craftsmanship';
        } else if (armorQuality === 'rare') {
          armorQualityStyle = '\n- Fine craftsmanship, hint of magical properties';
        }

        return `Create a fantasy RPG armor piece icon:
${description}

Style: Dark fantasy, painterly, dramatic lighting${armorQualityStyle}
${armorType ? `Armor type: ${armorType}` : ''}
${slot || armorSlot ? `Slot: ${slot || armorSlot}` : ''}
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`;
      }

      case 'container':
        const state = extraContext?.isOpen ? 'open' : 'closed';
        return `Create a fantasy RPG container icon:
${description}

Style: Dark fantasy, painterly
State: ${state}
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`;

      case 'corpse':
        return `Create a dark fantasy RPG corpse scene:
${description}

Style: Dark fantasy, grim, somber atmosphere
- Fallen body or remains on the ground
- Moody, dramatic lighting with shadows
- Painterly texture suitable for a game UI
Square composition on a dark background
No text, clean dramatic design
Fill entire canvas edge to edge, no borders or margins`;

      case 'gold':
        return `Create a fantasy RPG gold coins icon:
${description}

Style: Dark fantasy, painterly, warm golden glow
- Shiny gold coins with fantasy designs
- Dramatic lighting making the gold gleam
- Treasure/loot aesthetic
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`;

      case 'item':
      default: {
        const itemQuality = extraContext?.quality as string | undefined;
        const baubleType = extraContext?.baubleType as string | undefined;

        // Quality-specific style hints for items/baubles
        let itemQualityStyle = '';
        if (itemQuality === 'legendary' || itemQuality === 'unique') {
          itemQualityStyle = '\n- Glowing magical aura, legendary artifact appearance';
        } else if (itemQuality === 'epic') {
          itemQualityStyle = '\n- Subtle magical glow, precious craftsmanship';
        } else if (itemQuality === 'rare') {
          itemQualityStyle = '\n- Fine craftsmanship, hint of magical properties';
        }

        return `Create a fantasy RPG item icon:
${description}

Style: Dark fantasy, painterly, dramatic lighting${itemQualityStyle}
${baubleType ? `Item type: ${baubleType}` : ''}
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`;
      }
    }
  }

  /**
   * Get the fallback image for an object type.
   */
  getFallbackImage(type: ObjectImageType): string {
    return type === 'npc' || type === 'player' || type === 'pet' ? getFallbackDataUri() : getFallbackItemDataUri();
  }

  /**
   * Fetch and cache an image on an item's 'cachedImage' property.
   * This is called when items are equipped to ensure the sidebar can display them.
   * Fire-and-forget - does not return a value or throw errors.
   */
  async cacheItemImage(item: MudObject, type: ObjectImageType = 'item'): Promise<void> {
    try {
      // Determine correct type
      let itemType = type;
      if ('minDamage' in item && 'maxDamage' in item) {
        itemType = 'weapon';
      } else if ('armor' in item && 'slot' in item) {
        itemType = 'armor';
      }

      // Skip if already cached with a non-fallback image.
      const existing = item.getProperty('cachedImage');
      const fallback = this.getFallbackImage(itemType);
      if (typeof existing === 'string' && existing.startsWith('data:') && existing !== fallback) {
        const existingUrl = item.getProperty('cachedImageUrl');
        if (typeof existingUrl !== 'string') {
          const cacheKey = this.getObjectImageCacheKey(item, itemType);
          if (cacheKey) {
            item.setProperty('cachedImageUrl', `/api/images/object/${cacheKey}`);
          }
        }
        if (existing.startsWith('data:image/png;base64,')) {
          const prefix = 'data:image/png;base64,';
          const normalized = this.stripPngAncillaryChunks(existing.slice(prefix.length));
          if (normalized !== existing.slice(prefix.length)) {
            item.setProperty('cachedImage', `${prefix}${normalized}`);
          }
        }
        return;
      }

      // Get extra context for image generation
      let extraContext: Record<string, unknown> | undefined;
      if (itemType === 'weapon') {
        const weapon = item as MudObject & { damageType?: string };
        extraContext = weapon.damageType ? { damageType: weapon.damageType } : undefined;
      } else if (itemType === 'armor') {
        const armor = item as MudObject & { slot?: string };
        extraContext = armor.slot ? { slot: armor.slot } : undefined;
      }

      // Fetch the image
      const image = await this.getObjectImage(item, itemType, extraContext);

      // Don't pin fallback forever; allow retry on next refresh/equip cycle.
      if (image === fallback) {
        return;
      }

      // Cache on the item.
      item.setProperty('cachedImage', image);
      const cacheKey = this.getObjectImageCacheKey(item, itemType);
      if (cacheKey) {
        item.setProperty('cachedImageUrl', `/api/images/object/${cacheKey}`);
      }
    } catch {
      // Silently fail - image caching is best-effort
    }
  }

  /**
   * Build a race-aware portrait prompt for AI generation.
   * Used by the portrait command to include race appearance details.
   */
  buildRaceAwarePrompt(
    description: string,
    raceName: string,
    raceFeatures: string,
    raceBuild: string,
    raceStyleHints: string
  ): string {
    let raceSection = '';
    if (raceName) {
      raceSection = `\nRace: ${raceName}`;
      if (raceFeatures) {
        raceSection += `\nDistinctive features: ${raceFeatures}`;
      }
      if (raceBuild) {
        raceSection += `\nBuild: ${raceBuild}`;
      }
      if (raceStyleHints) {
        raceSection += `\nStyle hints: ${raceStyleHints}`;
      }
    }

    return `Create a portrait for a fantasy RPG character:

${description}${raceSection}

Style requirements:
- Dark fantasy art style with rich, moody colors
- Portrait/headshot composition
- Dramatic lighting with shadows
- 64x64 pixel icon style, bold and recognizable
- Fill entire canvas edge to edge`;
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
