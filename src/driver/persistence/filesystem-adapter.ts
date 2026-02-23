/**
 * FilesystemAdapter - File-based persistence adapter.
 *
 * Preserves all original FileStore behavior: atomic writes, .bak backups,
 * directory auto-creation, and player name sanitization. Adds generic
 * data store methods for daemon persistence.
 */

import { readFile, writeFile, access, mkdir, readdir, rename, copyFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';
import type { PersistenceAdapter, PermissionsData } from './adapter.js';
import type { PlayerSaveData, WorldState } from './serializer.js';

/**
 * Filesystem adapter configuration.
 */
export interface FilesystemAdapterConfig {
  /** Base path for data storage (e.g. './mudlib/data') */
  dataPath: string;
  /** Players subdirectory name */
  playersDir: string;
  /** World state filename */
  worldStateFile: string;
  /** Permissions filename */
  permissionsFile: string;
}

/**
 * File-based persistence adapter.
 */
export class FilesystemAdapter implements PersistenceAdapter {
  private config: FilesystemAdapterConfig;

  constructor(config: Partial<FilesystemAdapterConfig> = {}) {
    this.config = {
      dataPath: config.dataPath ?? './mudlib/data',
      playersDir: config.playersDir ?? 'players',
      worldStateFile: config.worldStateFile ?? 'world-state.json',
      permissionsFile: config.permissionsFile ?? 'permissions.json',
    };
  }

  // ========== Lifecycle ==========

  async initialize(): Promise<void> {
    await this.ensureDirectory(this.config.dataPath);
    await this.ensureDirectory(join(this.config.dataPath, this.config.playersDir));
  }

  async shutdown(): Promise<void> {
    // No cleanup needed for filesystem
  }

  // ========== Player Persistence ==========

  async savePlayer(data: PlayerSaveData): Promise<void> {
    const filePath = this.getPlayerPath(data.name);
    await this.ensureDirectory(dirname(filePath));

    const json = JSON.stringify(data, null, 2);
    await this.writeJsonAtomic(filePath, json, true);
  }

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

  async playerExists(name: string): Promise<boolean> {
    const filePath = this.getPlayerPath(name);
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

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

  async deletePlayer(name: string): Promise<boolean> {
    const filePath = this.getPlayerPath(name);

    try {
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ========== World State ==========

  async saveWorldState(state: WorldState): Promise<void> {
    const filePath = this.getWorldStatePath();
    await this.ensureDirectory(dirname(filePath));

    const json = JSON.stringify(state, null, 2);
    await this.writeJsonAtomic(filePath, json, true);
  }

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

  // ========== Permissions ==========

  async savePermissions(data: PermissionsData): Promise<void> {
    const filePath = this.getPermissionsPath();
    await this.ensureDirectory(dirname(filePath));

    const json = JSON.stringify(data, null, 2);
    await this.writeJsonAtomic(filePath, json, true);
  }

  async loadPermissions(): Promise<PermissionsData | null> {
    const filePath = this.getPermissionsPath();

    try {
      await access(filePath, constants.F_OK);
      const json = await readFile(filePath, 'utf-8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // ========== Generic Data Store ==========

  async saveData(namespace: string, key: string, data: unknown): Promise<void> {
    const filePath = this.getDataPath(namespace, key);
    await this.ensureDirectory(dirname(filePath));

    const json = JSON.stringify(data, null, 2);
    await writeFile(filePath, json, 'utf-8');
  }

  async loadData<T = unknown>(namespace: string, key: string): Promise<T | null> {
    const filePath = this.getDataPath(namespace, key);

    try {
      await access(filePath, constants.F_OK);
      const json = await readFile(filePath, 'utf-8');
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  async dataExists(namespace: string, key: string): Promise<boolean> {
    const filePath = this.getDataPath(namespace, key);
    try {
      await access(filePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async deleteData(namespace: string, key: string): Promise<boolean> {
    const filePath = this.getDataPath(namespace, key);
    try {
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listKeys(namespace: string): Promise<string[]> {
    const dir = this.getNamespaceDir(namespace);

    try {
      await access(dir, constants.F_OK);
      const files = await readdir(dir);
      return files.filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  // ========== Path Helpers ==========

  private getPlayerPath(name: string): string {
    const safeName = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return join(this.config.dataPath, this.config.playersDir, `${safeName}.json`);
  }

  private getWorldStatePath(): string {
    return join(this.config.dataPath, this.config.worldStateFile);
  }

  private getPermissionsPath(): string {
    return join(this.config.dataPath, this.config.permissionsFile);
  }

  private getNamespaceDir(namespace: string): string {
    const safeNamespace = this.sanitizeKey(namespace);
    return join(this.config.dataPath, safeNamespace);
  }

  private getDataPath(namespace: string, key: string): string {
    const safeNamespace = this.sanitizeKey(namespace);
    const safeKey = this.sanitizeKey(key);
    return join(this.config.dataPath, safeNamespace, `${safeKey}.json`);
  }

  private sanitizeKey(value: string): string {
    // Prevent path traversal: strip '..' and path separators, keep alphanumeric + dash/underscore
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  // ========== Utility ==========

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
}
