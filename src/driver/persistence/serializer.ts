/**
 * Serializer - Object state serialization for persistence.
 *
 * Handles converting MudObject state to JSON and back,
 * including circular reference handling.
 */

import type { MudObject } from '../types.js';

/**
 * Serialized object reference.
 */
export interface ObjectReference {
  __type: 'object_ref';
  path: string;
  isClone: boolean;
}

/**
 * Serialized object state.
 */
export interface SerializedState {
  /** Object path (blueprint or clone ID) */
  objectPath: string;
  /** Whether this is a clone */
  isClone: boolean;
  /** Custom properties to save */
  properties: Record<string, unknown>;
  /** Inventory object references */
  inventory?: ObjectReference[];
  /** Environment object reference */
  environment?: ObjectReference | null;
  /** Timestamp when serialized */
  timestamp: number;
}

/**
 * Player save data format.
 */
export interface PlayerSaveData {
  /** Player name */
  name: string;
  /** Last location */
  location: string;
  /** Player state */
  state: SerializedState;
  /** Last save time */
  savedAt: number;
  /** Additional fields from player.save() */
  [key: string]: unknown;
}

/**
 * World state snapshot.
 */
export interface WorldState {
  /** Version of the save format */
  version: number;
  /** All persistent objects */
  objects: SerializedState[];
  /** When the snapshot was taken */
  timestamp: number;
}

/**
 * Object serializer.
 */
export class Serializer {
  private seenObjects: WeakSet<object> = new WeakSet();

  /**
   * Serialize an object's state to JSON-compatible format.
   * @param object The object to serialize
   * @param includeInventory Whether to include inventory objects
   */
  serialize(object: MudObject, includeInventory: boolean = true): SerializedState {
    this.seenObjects = new WeakSet();

    const state: SerializedState = {
      objectPath: object.objectPath,
      isClone: object.isClone,
      properties: this.extractProperties(object),
      timestamp: Date.now(),
    };

    // Serialize environment reference
    if (object.environment) {
      state.environment = this.serializeReference(object.environment);
    } else {
      state.environment = null;
    }

    // Serialize inventory references (not full states to avoid cycles)
    if (includeInventory && object.inventory.length > 0) {
      state.inventory = object.inventory.map((item) => this.serializeReference(item));
    }

    return state;
  }

  /**
   * Deserialize state into an existing object.
   * @param state The serialized state
   * @param object The object to restore state to
   */
  deserialize(state: SerializedState, object: MudObject): void {
    // Restore custom properties
    for (const [key, value] of Object.entries(state.properties)) {
      const target = object as unknown as Record<string, unknown>;
      target[key] = this.deserializeValue(value);
    }
  }

  /**
   * Serialize a player for saving.
   * @param player The player object
   */
  serializePlayer(player: MudObject): PlayerSaveData {
    const p = player as MudObject & {
      name?: string;
      save?: () => Record<string, unknown>;
    };

    // If the player has a save() method, use it to get additional data
    const playerSaveData = p.save ? p.save() : {};

    return {
      name: p.name ?? 'unknown',
      location: player.environment?.objectPath ?? '/areas/town/center',
      state: this.serialize(player, false), // Don't save inventory in player file
      savedAt: Date.now(),
      ...playerSaveData, // Include data from player's save() method
    };
  }

  /**
   * Create a world state snapshot.
   * @param objects All objects to include in snapshot
   */
  createWorldSnapshot(objects: MudObject[]): WorldState {
    return {
      version: 1,
      objects: objects.map((obj) => this.serialize(obj, true)),
      timestamp: Date.now(),
    };
  }

  /**
   * Extract saveable properties from an object.
   */
  private extractProperties(object: MudObject): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const obj = object as unknown as Record<string, unknown>;

    // List of internal properties to skip
    const skip = new Set([
      'objectPath',
      'objectId',
      'isClone',
      'blueprint',
      'environment',
      'inventory',
      'actions',
      '_heartbeatEnabled',
      '_connection',
    ]);

    // Extract public properties from the object itself
    for (const key of Object.keys(obj)) {
      if (skip.has(key)) continue;
      if (typeof obj[key] === 'function') continue;
      if (key.startsWith('_')) continue;

      const value = obj[key];
      properties[key] = this.serializeValue(value);
    }

    // Also extract properties from the _properties Map (via getPropertyKeys/getProperty)
    const objWithProps = object as MudObject & {
      getPropertyKeys?: () => string[];
      getProperty?: (key: string) => unknown;
    };
    if (objWithProps.getPropertyKeys && objWithProps.getProperty) {
      for (const key of objWithProps.getPropertyKeys()) {
        // Skip internal properties (those starting with underscore)
        if (key.startsWith('_')) continue;
        const value = objWithProps.getProperty(key);
        properties[key] = this.serializeValue(value);
      }
    }

    return properties;
  }

  /**
   * Serialize a value, handling special cases.
   */
  private serializeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'function') {
      return undefined; // Skip functions
    }

    if (typeof value !== 'object') {
      return value; // Primitives are fine
    }

    // Handle circular references
    if (this.seenObjects.has(value as object)) {
      return { __type: 'circular' };
    }
    this.seenObjects.add(value as object);

    // Check if it's a MudObject
    if (this.isMudObject(value)) {
      return this.serializeReference(value);
    }

    // Handle Date
    if (value instanceof Date) {
      return { __type: 'date', value: value.toISOString() };
    }

    // Handle Map
    if (value instanceof Map) {
      return {
        __type: 'map',
        entries: Array.from(value.entries()).map(([k, v]) => [
          this.serializeValue(k),
          this.serializeValue(v),
        ]),
      };
    }

    // Handle Set
    if (value instanceof Set) {
      return {
        __type: 'set',
        values: Array.from(value).map((v) => this.serializeValue(v)),
      };
    }

    // Handle Array
    if (Array.isArray(value)) {
      return value.map((item) => this.serializeValue(item));
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = this.serializeValue(v);
    }
    return result;
  }

  /**
   * Deserialize a value.
   */
  private deserializeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    // Handle typed objects
    const typed = value as { __type?: string };
    if (typed.__type) {
      switch (typed.__type) {
        case 'date': {
          const d = typed as { value: string };
          return new Date(d.value);
        }
        case 'map': {
          const m = typed as { entries: [unknown, unknown][] };
          return new Map(
            m.entries.map(([k, v]) => [this.deserializeValue(k), this.deserializeValue(v)])
          );
        }
        case 'set': {
          const s = typed as { values: unknown[] };
          return new Set(s.values.map((v) => this.deserializeValue(v)));
        }
        case 'object_ref':
        case 'circular':
          // These need special handling by the loader
          return value;
      }
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.deserializeValue(item));
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = this.deserializeValue(v);
    }
    return result;
  }

  /**
   * Create an object reference.
   */
  private serializeReference(object: MudObject): ObjectReference {
    return {
      __type: 'object_ref',
      path: object.isClone ? object.objectId : object.objectPath,
      isClone: object.isClone,
    };
  }

  /**
   * Check if a value is a MudObject.
   */
  private isMudObject(value: unknown): value is MudObject {
    if (!value || typeof value !== 'object') return false;
    const obj = value as Record<string, unknown>;
    return typeof obj.objectPath === 'string' && typeof obj.moveTo === 'function';
  }
}

// Singleton instance
let serializerInstance: Serializer | null = null;

/**
 * Get the global Serializer instance.
 */
export function getSerializer(): Serializer {
  if (!serializerInstance) {
    serializerInstance = new Serializer();
  }
  return serializerInstance;
}

/**
 * Reset the global serializer. Used for testing.
 */
export function resetSerializer(): void {
  serializerInstance = null;
}

export default Serializer;
