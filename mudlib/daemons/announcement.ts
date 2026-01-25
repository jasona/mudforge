/**
 * Announcement Daemon - Central registry for game announcements.
 *
 * Provides a centralized system for managing announcements that are
 * displayed on the login screen and viewable in-game via modals.
 *
 * Usage:
 *   const daemon = getAnnouncementDaemon();
 *   daemon.create('Welcome', 'Welcome to the game!', 'Admin');
 *   const latest = daemon.getLatest();
 */

import { MudObject } from '../std/object.js';

/**
 * A single announcement entry.
 */
export interface Announcement {
  /** Unique identifier (e.g., "ann_1706123456789") */
  id: string;
  /** Title of the announcement */
  title: string;
  /** Content in markdown format */
  content: string;
  /** Author's name */
  author: string;
  /** Timestamp when created (Unix ms) */
  createdAt: number;
  /** Timestamp when last updated (Unix ms) */
  updatedAt?: number;
}

/**
 * Serialized format for persistence.
 */
interface SerializedAnnouncements {
  announcements: Announcement[];
  nextId?: number;
}

/**
 * Announcement Daemon class.
 */
export class AnnouncementDaemon extends MudObject {
  private _announcements: Map<string, Announcement> = new Map();
  private _nextId: number = 1;
  private _dirty: boolean = false;
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Announcement Daemon';
    this.longDesc = 'The announcement daemon manages game announcements for players.';
  }

  // ==================== Core Methods ====================

  /**
   * Generate a unique announcement ID.
   */
  private generateId(): string {
    return String(this._nextId++);
  }

  /**
   * Create a new announcement.
   */
  create(title: string, content: string, author: string): Announcement {
    const announcement: Announcement = {
      id: this.generateId(),
      title,
      content,
      author,
      createdAt: Date.now(),
    };

    this._announcements.set(announcement.id, announcement);
    this._dirty = true;

    return announcement;
  }

  /**
   * Update an existing announcement.
   */
  update(id: string, title: string, content: string): boolean {
    const announcement = this._announcements.get(id);
    if (!announcement) {
      return false;
    }

    announcement.title = title;
    announcement.content = content;
    announcement.updatedAt = Date.now();

    this._dirty = true;
    return true;
  }

  /**
   * Delete an announcement.
   */
  delete(id: string): boolean {
    if (!this._announcements.has(id)) {
      return false;
    }

    this._announcements.delete(id);
    this._dirty = true;
    return true;
  }

  /**
   * Get an announcement by ID.
   */
  getById(id: string): Announcement | null {
    return this._announcements.get(id) || null;
  }

  /**
   * Get the latest announcement.
   */
  getLatest(): Announcement | null {
    if (this._announcements.size === 0) {
      return null;
    }

    let latest: Announcement | null = null;
    for (const ann of this._announcements.values()) {
      if (!latest || ann.createdAt > latest.createdAt) {
        latest = ann;
      }
    }

    return latest;
  }

  /**
   * Get all announcements sorted by date (newest first).
   */
  getAll(): Announcement[] {
    return Array.from(this._announcements.values())
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get the number of announcements.
   */
  get count(): number {
    return this._announcements.size;
  }

  // ==================== Persistence ====================

  /**
   * Load announcements from disk.
   */
  async load(): Promise<void> {
    if (this._loaded) return;

    if (typeof efuns === 'undefined' || !efuns.readFile) {
      console.log('[AnnouncementDaemon] efuns not available, starting with empty announcements');
      this._loaded = true;
      return;
    }

    try {
      const announcementsPath = '/data/announcements/announcements.json';
      const exists = await efuns.fileExists(announcementsPath);

      if (!exists) {
        console.log('[AnnouncementDaemon] No saved announcements found, starting fresh');
        this._loaded = true;
        return;
      }

      const content = await efuns.readFile(announcementsPath);
      const saved = JSON.parse(content) as SerializedAnnouncements;

      // Load nextId or calculate from existing
      let maxId = 0;
      for (const announcement of saved.announcements ?? []) {
        if (announcement.id && announcement.title && announcement.content) {
          this._announcements.set(announcement.id, announcement);
          const numId = parseInt(announcement.id, 10);
          if (!isNaN(numId) && numId > maxId) {
            maxId = numId;
          }
        }
      }
      this._nextId = saved.nextId ?? (maxId + 1);

      console.log(`[AnnouncementDaemon] Loaded ${this._announcements.size} announcements from disk`);
      this._loaded = true;
      this._dirty = false;
    } catch (error) {
      console.error('[AnnouncementDaemon] Failed to load announcements:', error);
      this._loaded = true;
    }
  }

  /**
   * Save announcements to disk.
   */
  async save(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.writeFile) {
      console.log('[AnnouncementDaemon] efuns not available, cannot save');
      return;
    }

    try {
      const serialized: SerializedAnnouncements = {
        announcements: Array.from(this._announcements.values()),
        nextId: this._nextId,
      };

      const announcementsPath = '/data/announcements/announcements.json';

      // Ensure directory exists
      const dirPath = '/data/announcements';
      const dirExists = await efuns.fileExists(dirPath);
      if (!dirExists) {
        await efuns.makeDir(dirPath, true);
      }

      await efuns.writeFile(announcementsPath, JSON.stringify(serialized, null, 2));
      console.log(`[AnnouncementDaemon] Saved ${this._announcements.size} announcements to disk`);
      this._dirty = false;
    } catch (error) {
      console.error('[AnnouncementDaemon] Failed to save announcements:', error);
    }
  }

  /**
   * Check if there are unsaved changes.
   */
  get isDirty(): boolean {
    return this._dirty;
  }

  /**
   * Check if announcements have been loaded from disk.
   */
  get isLoaded(): boolean {
    return this._loaded;
  }
}

// Singleton instance
let announcementDaemon: AnnouncementDaemon | null = null;

/**
 * Get the announcement daemon singleton.
 * Automatically loads from disk on first access.
 */
export function getAnnouncementDaemon(): AnnouncementDaemon {
  if (!announcementDaemon) {
    announcementDaemon = new AnnouncementDaemon();
    // Trigger async load (don't await - it will complete in background)
    announcementDaemon.load();
  }
  return announcementDaemon;
}

/**
 * Reset the announcement daemon (for testing).
 */
export function resetAnnouncementDaemon(): void {
  announcementDaemon = null;
}

export default AnnouncementDaemon;
