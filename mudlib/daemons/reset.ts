/**
 * Reset Daemon - Manages periodic room resets.
 *
 * The reset daemon schedules periodic room resets to:
 * - Clean up dropped items that don't belong to players
 * - Re-clone room default items (if missing)
 * - Call room.onReset() for custom reset behavior
 *
 * Configuration (via config daemon):
 *   reset.intervalMinutes - Minutes between resets (default: 15)
 *   reset.cleanupDroppedItems - Clean up non-player items (default: true)
 */

import { MudObject } from '../std/object.js';
import { Room } from '../std/room.js';
import { getConfigDaemon } from './config.js';

/**
 * Statistics tracked by the reset daemon.
 */
export interface ResetStats {
  /** Total number of resets performed */
  totalResets: number;
  /** Total items cleaned up */
  itemsCleaned: number;
  /** Last reset timestamp */
  lastResetTime: number;
  /** Next scheduled reset timestamp */
  nextResetTime: number;
}

/**
 * Reset Daemon class.
 */
export class ResetDaemon extends MudObject {
  private _resetTimerId: number = 0;
  private _stats: ResetStats = {
    totalResets: 0,
    itemsCleaned: 0,
    lastResetTime: 0,
    nextResetTime: 0,
  };
  private _started: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Reset Daemon';
    this.longDesc = 'The reset daemon manages periodic room resets.';

    // Schedule startup after construction
    setTimeout(() => {
      this.start();
    }, 0);
  }

  /**
   * Get the reset interval in milliseconds from config.
   */
  private getIntervalMs(): number {
    const config = getConfigDaemon();
    const minutes = config.get<number>('reset.intervalMinutes') ?? 15;
    return minutes * 60 * 1000;
  }

  /**
   * Check if dropped item cleanup is enabled.
   */
  private shouldCleanupItems(): boolean {
    const config = getConfigDaemon();
    return config.get<boolean>('reset.cleanupDroppedItems') ?? true;
  }

  /**
   * Start the reset daemon.
   */
  start(): void {
    if (this._started) return;
    this._started = true;

    console.log('[ResetDaemon] Starting periodic room resets');
    this.scheduleNextReset();
  }

  /**
   * Stop the reset daemon.
   */
  stop(): void {
    if (!this._started) return;
    this._started = false;

    if (this._resetTimerId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(this._resetTimerId);
      this._resetTimerId = 0;
    }

    console.log('[ResetDaemon] Stopped');
  }

  /**
   * Schedule the next reset.
   */
  private scheduleNextReset(): void {
    if (!this._started) return;

    const intervalMs = this.getIntervalMs();
    this._stats.nextResetTime = Date.now() + intervalMs;

    if (typeof efuns !== 'undefined' && efuns.callOut) {
      this._resetTimerId = efuns.callOut(() => {
        this.performReset();
      }, intervalMs);
    }
  }

  /**
   * Perform a full reset cycle on all loaded rooms.
   */
  async performReset(): Promise<void> {
    const startTime = Date.now();
    let roomsReset = 0;
    let itemsCleaned = 0;

    // Get all loaded objects
    if (typeof efuns === 'undefined' || !efuns.getAllObjects) {
      this.scheduleNextReset();
      return;
    }

    const allObjects = efuns.getAllObjects();

    for (const obj of allObjects) {
      // Only process rooms
      if (!(obj instanceof Room)) continue;

      const room = obj as Room;

      // Clean up dropped items if enabled
      if (this.shouldCleanupItems()) {
        const cleaned = await this.cleanupRoomItems(room);
        itemsCleaned += cleaned;
      }

      // Call the room's onReset hook
      try {
        await room.onReset();
        roomsReset++;
      } catch (error) {
        console.error(`[ResetDaemon] Error resetting room ${room.objectId}:`, error);
      }
    }

    // Update stats
    this._stats.totalResets++;
    this._stats.itemsCleaned += itemsCleaned;
    this._stats.lastResetTime = startTime;

    const duration = Date.now() - startTime;
    console.log(
      `[ResetDaemon] Reset complete: ${roomsReset} rooms, ${itemsCleaned} items cleaned (${duration}ms)`
    );

    // Schedule next reset
    this.scheduleNextReset();
  }

  /**
   * Clean up non-player-owned items in a room.
   * Items are considered "dropped" if they don't have an owner
   * or their owner is not currently in the game.
   * @param room The room to clean
   * @returns Number of items cleaned up
   */
  private async cleanupRoomItems(room: Room): Promise<number> {
    let cleaned = 0;
    const itemsToClean: MudObject[] = [];

    for (const obj of room.inventory) {
      // Skip players and NPCs (livings)
      if ('isLiving' in obj || 'connection' in obj) continue;

      // Skip items that are still in the room that spawned them
      const spawnRoom = (obj as MudObject & { spawnRoom?: MudObject | null }).spawnRoom;
      if (spawnRoom && spawnRoom === room) {
        continue;
      }

      // Skip items that are not "takeable" (probably room features)
      const takeable = (obj as MudObject & { takeable?: boolean }).takeable;
      if (takeable === false) continue;

      // Check if item has an owner that's still in the game
      const ownerId = (obj as MudObject & { ownerId?: string }).ownerId;
      if (ownerId && typeof efuns !== 'undefined' && efuns.findObject) {
        const owner = efuns.findObject(ownerId);
        if (owner) continue; // Owner exists, keep the item
      }

      // This item should be cleaned up
      itemsToClean.push(obj);
    }

    // Clean up items
    for (const item of itemsToClean) {
      try {
        if (typeof efuns !== 'undefined' && efuns.destruct) {
          await efuns.destruct(item);
          cleaned++;
        }
      } catch (error) {
        console.error(`[ResetDaemon] Error cleaning up item ${item.objectId}:`, error);
      }
    }

    return cleaned;
  }

  /**
   * Force an immediate reset of all rooms.
   * Useful for admin commands.
   */
  async forceReset(): Promise<void> {
    // Cancel scheduled reset
    if (this._resetTimerId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(this._resetTimerId);
      this._resetTimerId = 0;
    }

    // Perform reset now
    await this.performReset();
  }

  /**
   * Force reset a single room.
   * @param room The room to reset
   */
  async resetRoom(room: Room): Promise<{ itemsCleaned: number }> {
    let itemsCleaned = 0;

    if (this.shouldCleanupItems()) {
      itemsCleaned = await this.cleanupRoomItems(room);
      this._stats.itemsCleaned += itemsCleaned;
    }

    await room.onReset();

    return { itemsCleaned };
  }

  /**
   * Get reset statistics.
   */
  getStats(): ResetStats {
    return { ...this._stats };
  }

  /**
   * Get time until next reset in milliseconds.
   */
  getTimeUntilReset(): number {
    if (this._stats.nextResetTime === 0) return -1;
    return Math.max(0, this._stats.nextResetTime - Date.now());
  }

  /**
   * Check if the daemon is running.
   */
  isRunning(): boolean {
    return this._started;
  }
}

// Singleton instance
let resetDaemon: ResetDaemon | null = null;

/**
 * Get the reset daemon singleton.
 */
export function getResetDaemon(): ResetDaemon {
  if (!resetDaemon) {
    resetDaemon = new ResetDaemon();
  }
  return resetDaemon;
}

/**
 * Reset the daemon (for testing).
 */
export function resetResetDaemon(): void {
  if (resetDaemon) {
    resetDaemon.stop();
  }
  resetDaemon = null;
}

export default ResetDaemon;
