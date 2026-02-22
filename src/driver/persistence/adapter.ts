/**
 * PersistenceAdapter - Abstract interface for pluggable persistence backends.
 *
 * Implementations handle storage of player data, world state, permissions,
 * and generic daemon data. The filesystem adapter is the default; a Supabase
 * adapter is available for cloud deployments.
 */

import type { PlayerSaveData, WorldState } from './serializer.js';

/**
 * Permissions data format (matches what Permissions.export() returns).
 */
export interface PermissionsData {
  levels: Record<string, number>;
  domains: Record<string, string[]>;
  commandPaths?: Record<string, string[]>;
}

/**
 * Persistence adapter interface.
 * All methods are async to support both local and remote backends.
 */
export interface PersistenceAdapter {
  // ========== Lifecycle ==========

  /** Initialize the adapter (create directories, connect to DB, etc.) */
  initialize(): Promise<void>;

  /** Graceful shutdown (flush pending writes, close connections) */
  shutdown(): Promise<void>;

  // ========== Player Persistence ==========

  /** Save player data (already serialized by caller) */
  savePlayer(data: PlayerSaveData): Promise<void>;

  /** Load a player's saved data by name */
  loadPlayer(name: string): Promise<PlayerSaveData | null>;

  /** Check if a player save file exists */
  playerExists(name: string): Promise<boolean>;

  /** List all saved player names */
  listPlayers(): Promise<string[]>;

  /** Delete a player's save data */
  deletePlayer(name: string): Promise<boolean>;

  // ========== World State ==========

  /** Save world state snapshot */
  saveWorldState(state: WorldState): Promise<void>;

  /** Load world state */
  loadWorldState(): Promise<WorldState | null>;

  // ========== Permissions ==========

  /** Save permissions data */
  savePermissions(data: PermissionsData): Promise<void>;

  /** Load permissions data */
  loadPermissions(): Promise<PermissionsData | null>;

  // ========== Generic Data Store (for daemon persistence) ==========

  /** Save arbitrary data under a namespace/key pair */
  saveData(namespace: string, key: string, data: unknown): Promise<void>;

  /** Load data by namespace/key pair */
  loadData<T = unknown>(namespace: string, key: string): Promise<T | null>;

  /** Check if data exists for a namespace/key pair */
  dataExists(namespace: string, key: string): Promise<boolean>;

  /** Delete data for a namespace/key pair */
  deleteData(namespace: string, key: string): Promise<boolean>;

  /** List all keys within a namespace */
  listKeys(namespace: string): Promise<string[]>;
}
