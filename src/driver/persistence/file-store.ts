/**
 * FileStore - File-based persistence for player and world data.
 *
 * Saves and loads player data and world state to/from JSON files.
 */

import { readFile, writeFile, access, mkdir, readdir, rename, copyFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';
import {
  getSerializer,
  type PlayerSaveData,
  type WorldState,
  type SerializedState,
} from './serializer.js';
import type { MudObject } from '../types.js';

/**
 * File store configuration.
 */
export interface FileStoreConfig {
  /** Base path for data storage */
  dataPath: string;
  /** Players subdirectory */
  playersDir: string;
  /** World state filename */
  worldStateFile: string;
  /** Permissions data filename */
  permissionsFile: string;
}

/**
 * File-based persistence store.
 */
export class FileStore {
  private config: FileStoreConfig;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<FileStoreConfig> = {}) {
    this.config = {
      dataPath: config.dataPath ?? './mudlib/data',
      playersDir: config.playersDir ?? 'players',
      worldStateFile: config.worldStateFile ?? 'world-state.json',
      permissionsFile: config.permissionsFile ?? 'permissions.json',
    };
  }

  // ========== Player Persistence ==========

  /**
   * Save a player to disk.
   * @param player The player object
   */
  async savePlayer(player: MudObject): Promise<void> {
    const serializer = getSerializer();
    const data = serializer.serializePlayer(player);

    const filePath = this.getPlayerPath(data.name);
    await this.ensureDirectory(dirname(filePath));

    const json = JSON.stringify(data, null, 2);
    await this.writeJsonAtomic(filePath, json, true);
  }

  /**
   * Load a player's saved data.
   * @param name The player's name
   */
  async loadPlayer(name: string): Promise<PlayerSaveData | null> {
    const filePath = this.getPlayerPath(name);

    try {
      await access(filePath, constants.F_OK);
      const json = await readFile(filePath, 'utf-8');
      return JSON.parse(json) as PlayerSaveData;
    } catch {
      return null;
    }
  }

  /**
   * Check if a player save exists.
   * @param name The player's name
   */
  async playerExists(name: string): Promise<boolean> {
    const filePath = this.getPlayerPath(name);
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all saved player names.
   */
  async listPlayers(): Promise<string[]> {
    const dir = join(this.config.dataPath, this.config.playersDir);

    try {
      await access(dir, constants.F_OK);
      const files = await readdir(dir);
      return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  /**
   * Delete a player's save data.
   * @param name The player's name
   */
  async deletePlayer(name: string): Promise<boolean> {
    const filePath = this.getPlayerPath(name);
    const { unlink } = await import('fs/promises');

    try {
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ========== World State Persistence ==========

  /**
   * Save world state snapshot.
   * @param objects All persistent objects to save
   */
  async saveWorldState(objects: MudObject[]): Promise<void> {
    const serializer = getSerializer();
    const state = serializer.createWorldSnapshot(objects);

    const filePath = this.getWorldStatePath();
    await this.ensureDirectory(dirname(filePath));

    const json = JSON.stringify(state, null, 2);
    await this.writeJsonAtomic(filePath, json, true);
  }

  /**
   * Load world state.
   */
  async loadWorldState(): Promise<WorldState | null> {
    const filePath = this.getWorldStatePath();

    try {
      await access(filePath, constants.F_OK);
      const json = await readFile(filePath, 'utf-8');
      return JSON.parse(json) as WorldState;
    } catch {
      return null;
    }
  }

  // ========== Permissions Persistence ==========

  /**
   * Save permissions data.
   * @param data The permissions data to save
   */
  async savePermissions(data: {
    levels: Record<string, number>;
    domains: Record<string, string[]>;
  }): Promise<void> {
    const filePath = this.getPermissionsPath();
    await this.ensureDirectory(dirname(filePath));

    const json = JSON.stringify(data, null, 2);
    await this.writeJsonAtomic(filePath, json, true);
  }

  /**
   * Load permissions data.
   */
  async loadPermissions(): Promise<{
    levels: Record<string, number>;
    domains: Record<string, string[]>;
  } | null> {
    const filePath = this.getPermissionsPath();

    try {
      await access(filePath, constants.F_OK);
      const json = await readFile(filePath, 'utf-8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // ========== Auto-Save ==========

  /**
   * Start auto-save timer.
   * @param intervalMs Save interval in milliseconds
   * @param getObjects Function to get objects to save
   */
  startAutoSave(intervalMs: number, getObjects: () => MudObject[]): void {
    this.stopAutoSave();

    this.autoSaveInterval = setInterval(async () => {
      try {
        const objects = getObjects();
        await this.saveWorldState(objects);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop auto-save timer.
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // ========== Utility ==========

  /**
   * Get the path for a player's save file.
   */
  private getPlayerPath(name: string): string {
    const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return join(this.config.dataPath, this.config.playersDir, `${safeName}.json`);
  }

  /**
   * Get the world state file path.
   */
  private getWorldStatePath(): string {
    return join(this.config.dataPath, this.config.worldStateFile);
  }

  /**
   * Get the permissions file path.
   */
  private getPermissionsPath(): string {
    return join(this.config.dataPath, this.config.permissionsFile);
  }

  /**
   * Ensure a directory exists.
   */
  private async ensureDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  /**
   * Write JSON atomically to avoid partial writes on crashes.
   * Optionally keeps a .bak copy of the previous version.
   */
  private async writeJsonAtomic(filePath: string, json: string, keepBackup: boolean): Promise<void> {
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;

    try {
      await this.ensureDirectory(dirname(filePath));
      if (keepBackup) {
        try {
          await access(filePath, constants.F_OK);
          await copyFile(filePath, `${filePath}.bak`);
        } catch {
          // No existing file yet; nothing to back up.
        }
      }

      await writeFile(tempPath, json, 'utf-8');
      await rename(tempPath, filePath);
    } catch (error) {
      try {
        await unlink(tempPath);
      } catch {
        // Best-effort cleanup for temp file.
      }
      throw error;
    }
  }

  /**
   * Restore an object's state from serialized data.
   * @param object The object to restore
   * @param state The serialized state
   */
  restoreObjectState(object: MudObject, state: SerializedState): void {
    const serializer = getSerializer();
    serializer.deserialize(state, object);
  }
}

// Singleton instance
let fileStoreInstance: FileStore | null = null;

/**
 * Get the global FileStore instance.
 */
export function getFileStore(config?: Partial<FileStoreConfig>): FileStore {
  if (!fileStoreInstance) {
    fileStoreInstance = new FileStore(config);
  }
  return fileStoreInstance;
}

/**
 * Reset the global file store. Used for testing.
 */
export function resetFileStore(): void {
  if (fileStoreInstance) {
    fileStoreInstance.stopAutoSave();
  }
  fileStoreInstance = null;
}

export default FileStore;
