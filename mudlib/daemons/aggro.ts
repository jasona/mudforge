/**
 * Aggro Daemon - Manages grudges and NPC memory across respawns.
 *
 * Tracks players who attacked NPCs and fled, so NPCs can remember
 * and prioritize those players when they re-encounter them.
 *
 * Usage:
 *   const daemon = getAggroDaemon();
 *   daemon.addGrudge({ npcPath: '/areas/forest/wolf', playerName: 'bob', ... });
 *   const grudges = daemon.getGrudges('/areas/forest/wolf', 'bob');
 */

import { MudObject } from '../std/object.js';

/**
 * A grudge record representing an NPC's memory of a player.
 */
export interface GrudgeRecord {
  /** NPC's object path (e.g., "/areas/forest/wolf") */
  npcPath: string;
  /** Player's name in lowercase */
  playerName: string;
  /** Historical damage dealt by player */
  totalDamage: number;
  /** Number of times the player fled from this NPC type */
  fleeCount: number;
  /** Timestamp of last encounter */
  lastSeen: number;
  /** Initial threat when re-encountered (max 500) */
  intensity: number;
}

/**
 * Grudge expiration time in milliseconds (24 hours).
 */
const GRUDGE_EXPIRATION = 24 * 60 * 60 * 1000;

/**
 * Maximum grudge intensity.
 */
const MAX_GRUDGE_INTENSITY = 500;

/**
 * Flee bonus multiplier for grudge intensity.
 */
const FLEE_BONUS_MULTIPLIER = 1.5;

/**
 * Threat to intensity conversion rate.
 */
const THREAT_TO_INTENSITY_RATE = 0.15;

/**
 * Aggro Daemon class.
 */
export class AggroDaemon extends MudObject {
  /** Grudge storage keyed by npcPath */
  private _grudges: Map<string, GrudgeRecord[]> = new Map();
  private _dirty: boolean = false;
  private _loaded: boolean = false;

  /** Data file path */
  private static readonly DATA_FILE = '/data/combat/grudges.json';

  constructor() {
    super();
    this.shortDesc = 'Aggro Daemon';
    this.longDesc = 'The aggro daemon manages NPC grudges and memory.';
  }

  // ==================== Grudge Management ====================

  /**
   * Add or update a grudge record.
   * @param record The grudge record to add
   */
  addGrudge(record: GrudgeRecord): void {
    const { npcPath, playerName } = record;
    const normalizedPlayer = playerName.toLowerCase();

    let npcGrudges = this._grudges.get(npcPath);
    if (!npcGrudges) {
      npcGrudges = [];
      this._grudges.set(npcPath, npcGrudges);
    }

    // Find existing grudge for this player
    const existing = npcGrudges.find(g => g.playerName === normalizedPlayer);

    if (existing) {
      // Update existing grudge
      existing.totalDamage += record.totalDamage;
      existing.fleeCount += record.fleeCount;
      existing.lastSeen = record.lastSeen;
      // Increase intensity but cap at max
      existing.intensity = Math.min(
        MAX_GRUDGE_INTENSITY,
        existing.intensity + record.intensity
      );
    } else {
      // Add new grudge
      npcGrudges.push({
        ...record,
        playerName: normalizedPlayer,
        intensity: Math.min(MAX_GRUDGE_INTENSITY, record.intensity),
      });
    }

    this._dirty = true;
  }

  /**
   * Get grudges for an NPC, optionally filtered by player.
   * Automatically filters out expired grudges.
   * @param npcPath The NPC's object path
   * @param playerName Optional player name to filter by
   * @returns Array of matching grudge records
   */
  getGrudges(npcPath: string, playerName?: string): GrudgeRecord[] {
    const npcGrudges = this._grudges.get(npcPath);
    if (!npcGrudges) return [];

    const now = Date.now();
    const normalizedPlayer = playerName?.toLowerCase();

    // Filter expired and optionally by player
    const valid = npcGrudges.filter(g => {
      // Check expiration
      if (now - g.lastSeen > GRUDGE_EXPIRATION) {
        return false;
      }
      // Check player filter
      if (normalizedPlayer && g.playerName !== normalizedPlayer) {
        return false;
      }
      return true;
    });

    return valid;
  }

  /**
   * Clear grudges.
   * @param npcPath Optional NPC path; if omitted, clears all grudges
   * @param playerName Optional player name; if provided with npcPath, clears only that combo
   */
  clearGrudges(npcPath?: string, playerName?: string): void {
    if (!npcPath) {
      // Clear all
      this._grudges.clear();
      this._dirty = true;
      return;
    }

    if (!playerName) {
      // Clear all for this NPC
      this._grudges.delete(npcPath);
      this._dirty = true;
      return;
    }

    // Clear specific player for this NPC
    const npcGrudges = this._grudges.get(npcPath);
    if (npcGrudges) {
      const normalizedPlayer = playerName.toLowerCase();
      const filtered = npcGrudges.filter(g => g.playerName !== normalizedPlayer);
      if (filtered.length !== npcGrudges.length) {
        if (filtered.length === 0) {
          this._grudges.delete(npcPath);
        } else {
          this._grudges.set(npcPath, filtered);
        }
        this._dirty = true;
      }
    }
  }

  /**
   * Calculate grudge intensity from threat and flee status.
   * @param threat Current threat value
   * @param fled Whether the player fled
   * @returns Calculated intensity value
   */
  calculateIntensity(threat: number, fled: boolean): number {
    let intensity = Math.floor(threat * THREAT_TO_INTENSITY_RATE);
    if (fled) {
      intensity = Math.floor(intensity * FLEE_BONUS_MULTIPLIER);
    }
    return Math.min(MAX_GRUDGE_INTENSITY, intensity);
  }

  /**
   * Clean up expired grudges.
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = false;

    for (const [npcPath, grudges] of this._grudges) {
      const valid = grudges.filter(g => now - g.lastSeen <= GRUDGE_EXPIRATION);
      if (valid.length !== grudges.length) {
        if (valid.length === 0) {
          this._grudges.delete(npcPath);
        } else {
          this._grudges.set(npcPath, valid);
        }
        cleaned = true;
      }
    }

    if (cleaned) {
      this._dirty = true;
    }
  }

  // ==================== Statistics ====================

  /**
   * Get total number of active grudges.
   */
  get grudgeCount(): number {
    let count = 0;
    for (const grudges of this._grudges.values()) {
      count += grudges.length;
    }
    return count;
  }

  /**
   * Get number of NPCs with active grudges.
   */
  get npcCount(): number {
    return this._grudges.size;
  }

  // ==================== Persistence ====================

  /**
   * Load grudges from disk.
   */
  async load(): Promise<void> {
    if (this._loaded) return;

    try {
      if (typeof efuns !== 'undefined' && efuns.fileExists) {
        const exists = await efuns.fileExists(AggroDaemon.DATA_FILE);
        if (exists && efuns.readFile) {
          const content = await efuns.readFile(AggroDaemon.DATA_FILE);
          const data = JSON.parse(content) as { grudges: Record<string, GrudgeRecord[]> };

          // Restore grudges
          this._grudges.clear();
          for (const [npcPath, records] of Object.entries(data.grudges || {})) {
            this._grudges.set(npcPath, records);
          }

          // Cleanup expired on load
          this.cleanupExpired();

          console.log(`[AggroDaemon] Loaded ${this.grudgeCount} grudges for ${this.npcCount} NPCs`);
        }
      }
    } catch (error) {
      console.error('[AggroDaemon] Failed to load grudges:', error);
    }

    this._loaded = true;
  }

  /**
   * Save grudges to disk.
   */
  async save(): Promise<void> {
    if (!this._dirty) return;

    try {
      // Cleanup expired before saving
      this.cleanupExpired();

      // Convert Map to object for JSON
      const grudgesObj: Record<string, GrudgeRecord[]> = {};
      for (const [npcPath, records] of this._grudges) {
        grudgesObj[npcPath] = records;
      }

      const data = { grudges: grudgesObj };

      if (typeof efuns !== 'undefined' && efuns.writeFile) {
        await efuns.writeFile(AggroDaemon.DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`[AggroDaemon] Saved ${this.grudgeCount} grudges for ${this.npcCount} NPCs`);
      }

      this._dirty = false;
    } catch (error) {
      console.error('[AggroDaemon] Failed to save grudges:', error);
    }
  }

  get isDirty(): boolean {
    return this._dirty;
  }

  get isLoaded(): boolean {
    return this._loaded;
  }
}

// Singleton instance
let aggroDaemon: AggroDaemon | null = null;

/**
 * Get the AggroDaemon singleton.
 */
export function getAggroDaemon(): AggroDaemon {
  if (!aggroDaemon) {
    aggroDaemon = new AggroDaemon();
  }
  return aggroDaemon;
}

/**
 * Reset the aggro daemon (for testing).
 */
export function resetAggroDaemon(): void {
  aggroDaemon = null;
}

export default AggroDaemon;
