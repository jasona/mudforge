/**
 * Loader - World initialization and object loading.
 *
 * Handles preloading objects and restoring world state on startup.
 */

import { getFileStore, type FileStore } from './file-store.js';
import { getSerializer, type ObjectReference, type PlayerSaveData } from './serializer.js';
import type { MudObject } from '../types.js';

/**
 * Object loader callback.
 */
export type ObjectLoader = (path: string) => Promise<MudObject | undefined>;

/**
 * Object cloner callback.
 */
export type ObjectCloner = (path: string) => Promise<MudObject | undefined>;

/**
 * Loader configuration.
 */
export interface LoaderConfig {
  /** Function to load a blueprint */
  loadObject: ObjectLoader;
  /** Function to clone an object */
  cloneObject: ObjectCloner;
  /** Function to find an object by path/ID */
  findObject: (pathOrId: string) => MudObject | undefined;
}

/**
 * Preload result.
 */
export interface PreloadResult {
  success: string[];
  failed: string[];
  total: number;
}

/**
 * World loader.
 */
export class Loader {
  private fileStore: FileStore;
  private config: LoaderConfig | null = null;

  constructor() {
    this.fileStore = getFileStore();
  }

  /**
   * Configure the loader with object loading functions.
   */
  configure(config: LoaderConfig): void {
    this.config = config;
  }

  /**
   * Preload a list of object paths.
   * @param paths The object paths to load
   */
  async preload(paths: string[]): Promise<PreloadResult> {
    if (!this.config) {
      throw new Error('Loader not configured');
    }

    const result: PreloadResult = {
      success: [],
      failed: [],
      total: paths.length,
    };

    for (const path of paths) {
      try {
        const obj = await this.config.loadObject(path);
        if (obj) {
          result.success.push(path);
        } else {
          result.failed.push(path);
        }
      } catch (error) {
        console.error(`Failed to preload ${path}:`, error);
        result.failed.push(path);
      }
    }

    return result;
  }

  /**
   * Load world state from file and restore objects.
   */
  async loadWorld(): Promise<{
    loaded: number;
    failed: number;
    skipped: number;
  }> {
    if (!this.config) {
      throw new Error('Loader not configured');
    }

    const state = await this.fileStore.loadWorldState();

    if (!state) {
      return { loaded: 0, failed: 0, skipped: 0 };
    }

    const stats = { loaded: 0, failed: 0, skipped: 0 };
    const serializer = getSerializer();

    // First pass: load/clone all objects
    const objectMap = new Map<string, MudObject>();

    for (const objState of state.objects) {
      try {
        let obj: MudObject | undefined;

        if (objState.isClone) {
          // Extract blueprint path from clone ID (e.g., "/std/sword#47" -> "/std/sword")
          const blueprintPath = objState.objectPath.replace(/#\d+$/, '');
          obj = await this.config.cloneObject(blueprintPath);
        } else {
          obj = await this.config.loadObject(objState.objectPath);
        }

        if (obj) {
          serializer.deserialize(objState, obj);
          objectMap.set(objState.objectPath, obj);
          stats.loaded++;
        } else {
          stats.failed++;
        }
      } catch (error) {
        console.error(`Failed to restore ${objState.objectPath}:`, error);
        stats.failed++;
      }
    }

    // Second pass: restore references (environment, inventory)
    for (const objState of state.objects) {
      const obj = objectMap.get(objState.objectPath);
      if (!obj) continue;

      // Restore environment
      if (objState.environment) {
        const envObj = this.resolveReference(objState.environment, objectMap);
        if (envObj) {
          await obj.moveTo(envObj);
        }
      }

      // Inventory is restored through moveTo on contained objects
    }

    return stats;
  }

  /**
   * Load a player from save data.
   * @param name The player's name
   * @param playerBlueprint The player object blueprint path
   */
  async loadPlayer(
    name: string,
    playerBlueprint: string = '/std/player'
  ): Promise<MudObject | null> {
    if (!this.config) {
      throw new Error('Loader not configured');
    }

    const saveData = await this.fileStore.loadPlayer(name);
    if (!saveData) {
      return null;
    }

    // Clone a new player object
    const player = await this.config.cloneObject(playerBlueprint);
    if (!player) {
      return null;
    }

    // Restore state from serializer
    const serializer = getSerializer();
    serializer.deserialize(saveData.state, player);

    // Call the player's restore() method if it exists (passes full save data)
    const p = player as MudObject & {
      name?: string;
      restore?: (data: PlayerSaveData) => void;
    };
    if (p.restore) {
      p.restore(saveData);
    } else {
      // Fallback: just set the name
      p.name = saveData.name;
    }

    // Try to restore to last location
    if (saveData.location) {
      const location = this.config.findObject(saveData.location);
      if (location) {
        await player.moveTo(location);
      }
    }

    return player;
  }

  /**
   * Create a new player.
   * @param name The player's name
   * @param playerBlueprint The player object blueprint path
   * @param startRoom The starting room path
   */
  async createPlayer(
    name: string,
    playerBlueprint: string = '/std/player',
    startRoom: string = '/areas/void/void'
  ): Promise<MudObject | null> {
    if (!this.config) {
      throw new Error('Loader not configured');
    }

    // Clone a new player object
    const player = await this.config.cloneObject(playerBlueprint);
    if (!player) {
      return null;
    }

    // Set name
    const p = player as MudObject & { name?: string };
    p.name = name;

    // Move to starting room
    const room = this.config.findObject(startRoom) || (await this.config.loadObject(startRoom));
    if (room) {
      await player.moveTo(room);
    }

    return player;
  }

  /**
   * Check if a player save exists.
   * @param name The player's name
   */
  async playerExists(name: string): Promise<boolean> {
    return this.fileStore.playerExists(name);
  }

  /**
   * Resolve an object reference to an actual object.
   */
  private resolveReference(
    ref: ObjectReference,
    objectMap: Map<string, MudObject>
  ): MudObject | undefined {
    // First check our loaded objects
    const obj = objectMap.get(ref.path);
    if (obj) return obj;

    // Try to find in registry
    if (this.config) {
      return this.config.findObject(ref.path);
    }

    return undefined;
  }
}

// Singleton instance
let loaderInstance: Loader | null = null;

/**
 * Get the global Loader instance.
 */
export function getLoader(): Loader {
  if (!loaderInstance) {
    loaderInstance = new Loader();
  }
  return loaderInstance;
}

/**
 * Reset the global loader. Used for testing.
 */
export function resetLoader(): void {
  loaderInstance = null;
}

export default Loader;
