/**
 * MudlibLoader - Loads and instantiates mudlib objects.
 *
 * Handles dynamic importing of mudlib TypeScript files and
 * provides the efuns global that mudlib code expects.
 */

import { resolve } from 'path';
import { pathToFileURL } from 'url';
import type { MudObject, MudObjectConstructor } from './types.js';
import { getRegistry, type ObjectRegistry } from './object-registry.js';
import { getEfunBridge, type EfunBridge } from './efun-bridge.js';

export interface MudlibLoaderConfig {
  mudlibPath: string;
}

/**
 * Loader for mudlib objects.
 */
export class MudlibLoader {
  private config: MudlibLoaderConfig;
  private registry: ObjectRegistry;
  private efunBridge: EfunBridge;
  private loadedModules: Map<string, unknown> = new Map();

  constructor(config: Partial<MudlibLoaderConfig> = {}) {
    this.config = {
      mudlibPath: config.mudlibPath ?? './mudlib',
    };
    this.registry = getRegistry();
    this.efunBridge = getEfunBridge({ mudlibPath: this.config.mudlibPath });

    // Set up global efuns for mudlib code
    this.setupGlobalEfuns();
  }

  /**
   * Set up the global efuns object that mudlib code expects.
   */
  private setupGlobalEfuns(): void {
    const efuns = this.efunBridge.getEfuns();
    (globalThis as Record<string, unknown>)['efuns'] = efuns;
  }

  /**
   * Resolve a mudlib path to a file URL.
   */
  private resolvePath(mudlibPath: string): string {
    // Handle paths like "/master" or "/std/object"
    const relativePath = mudlibPath.startsWith('/')
      ? mudlibPath.slice(1)
      : mudlibPath;

    const fullPath = resolve(this.config.mudlibPath, relativePath + '.ts');
    return pathToFileURL(fullPath).href;
  }

  /**
   * Load a mudlib module and return its exports.
   */
  async loadModule(mudlibPath: string): Promise<Record<string, unknown>> {
    // Check cache
    if (this.loadedModules.has(mudlibPath)) {
      return this.loadedModules.get(mudlibPath) as Record<string, unknown>;
    }

    const fileUrl = this.resolvePath(mudlibPath);

    try {
      // Dynamic import of the TypeScript file (tsx handles transpilation)
      const module = await import(fileUrl);
      this.loadedModules.set(mudlibPath, module);
      return module;
    } catch (error) {
      throw new Error(
        `Failed to load mudlib module ${mudlibPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load and instantiate a mudlib object as a blueprint.
   * @param mudlibPath The path to the object (e.g., "/master", "/std/room")
   * @returns The instantiated object
   */
  async loadObject<T extends MudObject>(mudlibPath: string): Promise<T> {
    // Check if already loaded
    const existing = this.registry.find(mudlibPath);
    if (existing) {
      return existing as T;
    }

    // Load the module
    const module = await this.loadModule(mudlibPath);

    // Find the default export or the main class
    let ObjectClass: MudObjectConstructor | undefined;

    if (module.default && typeof module.default === 'function') {
      ObjectClass = module.default as MudObjectConstructor;
    } else {
      // Look for an exported class
      for (const key of Object.keys(module)) {
        const value = module[key];
        if (typeof value === 'function' && value.prototype) {
          ObjectClass = value as MudObjectConstructor;
          break;
        }
      }
    }

    if (!ObjectClass) {
      throw new Error(`No class found in mudlib module: ${mudlibPath}`);
    }

    // Instantiate the object
    const instance = new ObjectClass() as T;

    // Set up object path
    const instanceWithPath = instance as T & {
      _setupAsBlueprint?: (objectPath: string) => void;
    };
    if (instanceWithPath._setupAsBlueprint) {
      instanceWithPath._setupAsBlueprint(mudlibPath);
    } else {
      // Fallback: set properties directly if no setup method
      (instance as unknown as { _objectPath: string })._objectPath = mudlibPath;
      (instance as unknown as { _objectId: string })._objectId = mudlibPath;
    }

    // Register as blueprint
    this.registry.registerBlueprint(mudlibPath, ObjectClass, instance);

    // Call onCreate lifecycle hook if it exists
    if (typeof instance.onCreate === 'function') {
      await instance.onCreate();
    }

    return instance;
  }

  /**
   * Clone an object from a blueprint path.
   */
  async cloneObject<T extends MudObject>(mudlibPath: string): Promise<T | undefined> {
    // Ensure blueprint is loaded
    if (!this.registry.findBlueprint(mudlibPath)) {
      await this.loadObject(mudlibPath);
    }

    // Clone from registry
    return this.registry.clone(mudlibPath) as Promise<T | undefined>;
  }

  /**
   * Reload an object from disk, updating the blueprint.
   * Existing clones keep their old behavior; new clones use the updated code.
   * This is true runtime hot-reload without server restart.
   *
   * @param mudlibPath The path to the object (e.g., "/std/room")
   * @returns Object with success status and details
   */
  async reloadObject(mudlibPath: string): Promise<{
    success: boolean;
    error?: string;
    existingClones: number;
    migratedObjects: number;
  }> {
    try {
      // Clear the module from our cache
      this.loadedModules.delete(mudlibPath);

      // Bust the Node module cache by using a unique query param
      const fileUrl = this.resolvePath(mudlibPath);
      const cacheBustUrl = `${fileUrl}?update=${Date.now()}`;

      // Dynamic import with cache busting
      const module = await import(cacheBustUrl);

      // Find the class to instantiate
      let ObjectClass: MudObjectConstructor | undefined;

      if (module.default && typeof module.default === 'function') {
        ObjectClass = module.default as MudObjectConstructor;
      } else {
        for (const key of Object.keys(module)) {
          const value = module[key];
          if (typeof value === 'function' && value.prototype) {
            ObjectClass = value as MudObjectConstructor;
            break;
          }
        }
      }

      if (!ObjectClass) {
        return {
          success: false,
          error: `No class found in mudlib module: ${mudlibPath}`,
          existingClones: 0,
          migratedObjects: 0,
        };
      }

      // Create new instance
      const instance = new ObjectClass() as MudObject;

      // Set up object path
      const instanceWithPath = instance as MudObject & {
        _setupAsBlueprint?: (objectPath: string) => void;
      };
      if (instanceWithPath._setupAsBlueprint) {
        instanceWithPath._setupAsBlueprint(mudlibPath);
      } else {
        (instance as unknown as { _objectPath: string })._objectPath = mudlibPath;
        (instance as unknown as { _objectId: string })._objectId = mudlibPath;
      }

      // Update (or register) the blueprint - this also migrates objects from old to new instance
      const updateResult = await this.registry.updateBlueprint(mudlibPath, ObjectClass, instance);

      // Call onCreate lifecycle hook
      if (typeof instance.onCreate === 'function') {
        await instance.onCreate();
      }

      // Store in our cache (so subsequent calls use this version until next reload)
      this.loadedModules.set(mudlibPath, module);

      return {
        success: true,
        existingClones: updateResult.existingClones,
        migratedObjects: updateResult.migratedObjects,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        existingClones: 0,
        migratedObjects: 0,
      };
    }
  }

  /**
   * Preload a list of mudlib objects.
   */
  async preload(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        await this.loadObject(path);
      } catch (error) {
        console.error(`Failed to preload ${path}:`, error);
      }
    }
  }

  /**
   * Clear the module cache (for hot reload).
   */
  clearCache(mudlibPath?: string): void {
    if (mudlibPath) {
      this.loadedModules.delete(mudlibPath);
    } else {
      this.loadedModules.clear();
    }
  }

  /**
   * Get the efun bridge.
   */
  getEfunBridge(): EfunBridge {
    return this.efunBridge;
  }
}

// Singleton instance
let loaderInstance: MudlibLoader | null = null;

/**
 * Get the global MudlibLoader instance.
 */
export function getMudlibLoader(config?: Partial<MudlibLoaderConfig>): MudlibLoader {
  if (!loaderInstance) {
    loaderInstance = new MudlibLoader(config);
  }
  return loaderInstance;
}

/**
 * Reset the global loader. Used for testing.
 */
export function resetMudlibLoader(): void {
  if (loaderInstance) {
    loaderInstance.clearCache();
  }
  loaderInstance = null;
}
