/**
 * Portrait Daemon - Manages portrait generation for combat target display.
 *
 * Provides portraits for players (using their avatar) and NPCs (AI-generated
 * or fallback silhouette). NPC portraits are cached to disk to avoid
 * regenerating them.
 *
 * Usage:
 *   const daemon = getPortraitDaemon();
 *   const svg = await daemon.getPortrait(target);
 */

import { MudObject } from '../std/object.js';
import type { Living } from '../std/living.js';
import { createHash } from 'crypto';

/**
 * Cached portrait data.
 */
interface CachedPortrait {
  svg: string;
  generatedAt: number;
}

/**
 * Fallback SVG for when AI generation fails.
 * A simple dark silhouette that works for any creature type.
 */
const FALLBACK_PORTRAIT = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#1a1a2e"/>
  <ellipse cx="32" cy="24" rx="14" ry="16" fill="#2d2d3d"/>
  <ellipse cx="32" cy="52" rx="18" ry="16" fill="#2d2d3d"/>
  <circle cx="26" cy="22" r="2" fill="#4a4a5a"/>
  <circle cx="38" cy="22" r="2" fill="#4a4a5a"/>
  <text x="32" y="58" text-anchor="middle" fill="#5a5a6a" font-size="8" font-family="sans-serif">?</text>
</svg>`;

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
   * Returns SVG markup.
   */
  async getPortrait(target: Living): Promise<string> {
    // Check if target is a player (has avatar property)
    const asPlayer = target as Living & { avatar?: string };
    if (asPlayer.avatar) {
      // Player - return their avatar SVG
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
   */
  private async getNpcPortrait(npc: Living): Promise<string> {
    const npcPath = npc.objectPath || '';
    if (!npcPath) {
      return FALLBACK_PORTRAIT;
    }

    const cacheKey = this.getCacheKey(npcPath);

    // Check memory cache
    const cached = this._cache.get(cacheKey);
    if (cached) {
      return cached.svg;
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
      return diskCached.svg;
    }

    // Generate new portrait
    const generationPromise = this.generateNpcPortrait(npc, cacheKey);
    this._pendingGenerations.set(cacheKey, generationPromise);

    try {
      const svg = await generationPromise;
      return svg;
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
   * Generate a portrait for an NPC using AI.
   */
  private async generateNpcPortrait(npc: Living, cacheKey: string): Promise<string> {
    // Get the NPC's description
    const description = npc.longDesc || npc.shortDesc || 'a mysterious creature';

    // Try AI generation
    const aiSvg = await this.callAiGeneration(description);
    if (aiSvg) {
      const portrait: CachedPortrait = {
        svg: aiSvg,
        generatedAt: Date.now(),
      };
      this._cache.set(cacheKey, portrait);
      await this.saveToDisk(cacheKey, portrait);
      return aiSvg;
    }

    // Fall back to generic silhouette
    const portrait: CachedPortrait = {
      svg: FALLBACK_PORTRAIT,
      generatedAt: Date.now(),
    };
    this._cache.set(cacheKey, portrait);
    return FALLBACK_PORTRAIT;
  }

  /**
   * Call AI to generate an SVG portrait.
   */
  private async callAiGeneration(description: string): Promise<string | null> {
    if (typeof efuns === 'undefined' || !efuns.aiAvailable?.()) {
      return null;
    }

    try {
      const prompt = `Generate a 64x64 SVG portrait for: ${description}

Requirements:
- Use viewBox="0 0 64 64"
- Dark fantasy style with muted colors
- Simple, iconic representation suitable for a small display
- Dark background (#1a1a2e or similar)
- Return ONLY valid SVG markup, no explanation
- Keep it simple - no complex gradients or filters`;

      const result = await efuns.aiGenerate(prompt, {
        maxTokens: 1500,
        temperature: 0.7,
      });

      if (result && result.success && result.text) {
        const svg = this.extractSvg(result.text);
        if (svg && this.isValidSvg(svg)) {
          return svg;
        }
      }

      return null;
    } catch (error) {
      console.error('[PortraitDaemon] AI generation failed:', error);
      return null;
    }
  }

  /**
   * Extract SVG from AI response text.
   */
  private extractSvg(text: string): string | null {
    // Try to find SVG tags
    const match = text.match(/<svg[\s\S]*?<\/svg>/i);
    if (match) {
      return match[0];
    }
    return null;
  }

  /**
   * Basic validation that the string is valid SVG.
   */
  private isValidSvg(svg: string): boolean {
    if (!svg.startsWith('<svg')) {
      return false;
    }
    if (!svg.endsWith('</svg>')) {
      return false;
    }
    if (!svg.includes('viewBox')) {
      return false;
    }
    return true;
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
   * Get the fallback portrait SVG.
   */
  getFallbackPortrait(): string {
    return FALLBACK_PORTRAIT;
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
