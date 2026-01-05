/**
 * ObjectRegistry - Central registry for all MUD objects.
 *
 * Manages object storage, lookup, cloning, and lifecycle.
 */

import type { MudObject, BlueprintInfo, MudObjectConstructor } from './types.js';

/**
 * Central registry for all MUD objects in the driver.
 */
export class ObjectRegistry {
  /** Map of object path/id to object instance */
  private objects: Map<string, MudObject> = new Map();

  /** Map of blueprint path to blueprint info */
  private blueprints: Map<string, BlueprintInfo> = new Map();

  /**
   * Register a blueprint (non-clone) object.
   * @param path The object path (e.g., "/std/sword")
   * @param constructor The compiled constructor for this object type
   * @param instance The blueprint instance
   */
  registerBlueprint(
    path: string,
    constructor: MudObjectConstructor,
    instance: MudObject
  ): void {
    if (this.blueprints.has(path)) {
      throw new Error(`Blueprint already registered: ${path}`);
    }

    const info: BlueprintInfo = {
      path,
      constructor,
      instance,
      cloneCounter: 0,
      clones: new Set(),
    };

    this.blueprints.set(path, info);
    this.objects.set(path, instance);
  }

  /**
   * Register an object instance in the registry.
   * For clones, this is called after creation.
   * @param object The object to register
   */
  register(object: MudObject): void {
    if (this.objects.has(object.objectId)) {
      throw new Error(`Object already registered: ${object.objectId}`);
    }
    this.objects.set(object.objectId, object);

    // Track clone in blueprint info
    if (object.isClone && object.blueprint) {
      const blueprintInfo = this.blueprints.get(object.blueprint.objectPath);
      if (blueprintInfo) {
        blueprintInfo.clones.add(object.objectId);
      }
    }
  }

  /**
   * Find an object by path or ID.
   * @param pathOrId The object path (for blueprints) or objectId (for clones)
   * @returns The object if found, undefined otherwise
   */
  find(pathOrId: string): MudObject | undefined {
    return this.objects.get(pathOrId);
  }

  /**
   * Find a blueprint by path.
   * @param path The blueprint path
   * @returns The blueprint info if found, undefined otherwise
   */
  findBlueprint(path: string): BlueprintInfo | undefined {
    return this.blueprints.get(path);
  }

  /**
   * Check if an object exists in the registry.
   * @param pathOrId The object path or ID
   */
  has(pathOrId: string): boolean {
    return this.objects.has(pathOrId);
  }

  /**
   * Create a clone of a blueprint object.
   * @param blueprintPath The path to the blueprint to clone
   * @returns The new clone, or undefined if blueprint not found
   */
  async clone(blueprintPath: string): Promise<MudObject | undefined> {
    const blueprintInfo = this.blueprints.get(blueprintPath);
    if (!blueprintInfo) {
      return undefined;
    }

    // Increment clone counter and generate unique ID
    blueprintInfo.cloneCounter++;
    const cloneId = `${blueprintPath}#${blueprintInfo.cloneCounter}`;

    // Create new instance using the constructor
    const clone = new blueprintInfo.constructor();

    // Set clone-specific properties via a setup method
    // (The actual MudObject base class will implement this)
    const cloneWithSetup = clone as MudObject & {
      _setupAsClone?: (
        objectPath: string,
        objectId: string,
        blueprint: MudObject
      ) => void;
    };

    if (cloneWithSetup._setupAsClone) {
      cloneWithSetup._setupAsClone(blueprintPath, cloneId, blueprintInfo.instance);
    }

    // Register the clone
    this.register(clone);

    // Call lifecycle hooks
    await clone.onCreate();
    await clone.onClone(blueprintInfo.instance);

    return clone;
  }

  /**
   * Destroy an object, removing it from the registry and the world.
   * @param object The object to destroy
   */
  async destroy(object: MudObject): Promise<void> {
    // Call onDestroy hook
    await object.onDestroy();

    // Remove from environment
    if (object.environment) {
      await object.moveTo(null);
    }

    // Move all inventory items out (to prevent orphans)
    for (const item of [...object.inventory]) {
      await item.moveTo(null);
    }

    // Remove from registry
    this.objects.delete(object.objectId);

    // Remove from blueprint's clone tracking
    if (object.isClone && object.blueprint) {
      const blueprintInfo = this.blueprints.get(object.blueprint.objectPath);
      if (blueprintInfo) {
        blueprintInfo.clones.delete(object.objectId);
      }
    }
  }

  /**
   * Unregister a blueprint and all its clones.
   * Used during hot-reload.
   * @param path The blueprint path
   */
  async unregisterBlueprint(path: string): Promise<void> {
    const blueprintInfo = this.blueprints.get(path);
    if (!blueprintInfo) {
      return;
    }

    // Destroy all clones
    for (const cloneId of blueprintInfo.clones) {
      const clone = this.objects.get(cloneId);
      if (clone) {
        await this.destroy(clone);
      }
    }

    // Destroy the blueprint instance
    await this.destroy(blueprintInfo.instance);

    // Remove blueprint info
    this.blueprints.delete(path);
  }

  /**
   * Update a blueprint's constructor and instance without destroying clones.
   * Existing clones keep their old behavior; new clones use the new constructor.
   * This is the traditional LPMud-style hot-reload.
   * @param path The blueprint path
   * @param constructor The new constructor
   * @param instance The new blueprint instance
   * @returns Number of existing clones (still using old code)
   */
  updateBlueprint(
    path: string,
    constructor: MudObjectConstructor,
    instance: MudObject
  ): number {
    const existing = this.blueprints.get(path);

    if (existing) {
      // Remove old blueprint instance from objects map
      this.objects.delete(path);

      // Update the blueprint info with new constructor and instance
      // but preserve the clone tracking
      existing.constructor = constructor;
      existing.instance = instance;

      // Register new instance
      this.objects.set(path, instance);

      return existing.clones.size;
    } else {
      // No existing blueprint - just register normally
      this.registerBlueprint(path, constructor, instance);
      return 0;
    }
  }

  /**
   * Get all registered objects.
   */
  getAllObjects(): IterableIterator<MudObject> {
    return this.objects.values();
  }

  /**
   * Get all registered blueprints.
   */
  getAllBlueprints(): IterableIterator<BlueprintInfo> {
    return this.blueprints.values();
  }

  /**
   * Get count of registered objects.
   */
  get objectCount(): number {
    return this.objects.size;
  }

  /**
   * Get count of registered blueprints.
   */
  get blueprintCount(): number {
    return this.blueprints.size;
  }

  /**
   * Clear the registry. Used for testing.
   */
  clear(): void {
    this.objects.clear();
    this.blueprints.clear();
  }
}

// Singleton instance
let registryInstance: ObjectRegistry | null = null;

/**
 * Get the global ObjectRegistry instance.
 */
export function getRegistry(): ObjectRegistry {
  if (!registryInstance) {
    registryInstance = new ObjectRegistry();
  }
  return registryInstance;
}

/**
 * Reset the global registry. Used for testing.
 */
export function resetRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
  }
  registryInstance = null;
}
