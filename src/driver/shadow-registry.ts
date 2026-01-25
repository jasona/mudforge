/**
 * ShadowRegistry - Manages object shadows and Proxy wrapping.
 *
 * The shadow system allows objects to "overlay" other objects, intercepting
 * property access and method calls. Shadows are managed at the driver level
 * using JavaScript Proxy objects.
 */

import type { MudObject } from './types.js';
import {
  type Shadow,
  type AddShadowResult,
  UNSHADOWABLE_PROPERTIES,
  SHADOW_PROXY_MARKER,
  SHADOW_ORIGINAL,
} from './shadow-types.js';

/**
 * Properties that can be shadowed and need getter interception.
 * These will have shadow-aware getters installed on the object instance.
 */
const SHADOWABLE_PROPERTIES = [
  'name',
  'title',
  'shortDesc',
  'longDesc',
  'enterMessage',
  'exitMessage',
] as const;

/**
 * Methods that can be shadowed and need method interception.
 * These will have shadow-aware method wrappers installed on the object instance.
 */
const SHADOWABLE_METHODS = [
  'getNaturalAttack',
  'getDisplayName',
] as const;

/**
 * Symbol to store original property descriptors on an object.
 */
const ORIGINAL_DESCRIPTORS = Symbol('originalDescriptors');

/**
 * Get a property descriptor from an object or its prototype chain.
 */
function getPropertyDescriptorFromChain(
  obj: object,
  prop: string
): PropertyDescriptor | undefined {
  let current: object | null = obj;
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, prop);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current);
  }
  return undefined;
}

/**
 * Create a Proxy handler for shadow interception.
 */
function createShadowHandler(
  target: MudObject,
  getShadows: () => Shadow[]
): ProxyHandler<MudObject> {
  return {
    get(obj: MudObject, prop: string | symbol, receiver: unknown): unknown {
      // Check for proxy marker - indicates this is already a proxy
      if (prop === SHADOW_PROXY_MARKER) {
        return true;
      }

      // Allow access to original object
      if (prop === SHADOW_ORIGINAL) {
        return obj;
      }

      // Skip symbol properties and unshadowable properties
      if (typeof prop === 'symbol' || UNSHADOWABLE_PROPERTIES.has(prop)) {
        const value = Reflect.get(obj, prop, receiver);
        // Bind functions to the original object
        if (typeof value === 'function') {
          return value.bind(obj);
        }
        return value;
      }

      // Get current shadows and check each in priority order
      const shadows = getShadows();
      for (const shadow of shadows) {
        if (!shadow.isActive) continue;

        // Check if shadow has this property
        const shadowValue = shadow[prop];
        if (shadowValue !== undefined) {
          // If it's a function, bind to shadow context
          if (typeof shadowValue === 'function') {
            return function (this: unknown, ...args: unknown[]): unknown {
              return shadowValue.call(shadow, ...args);
            };
          }
          return shadowValue;
        }
      }

      // No shadow override - use original value
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(obj);
      }
      return value;
    },

    set(obj: MudObject, prop: string | symbol, value: unknown, receiver: unknown): boolean {
      // Always set on original object, never on shadow
      return Reflect.set(obj, prop, value, receiver);
    },

    // Forward other traps to the original object
    has(obj: MudObject, prop: string | symbol): boolean {
      return Reflect.has(obj, prop);
    },

    ownKeys(obj: MudObject): (string | symbol)[] {
      return Reflect.ownKeys(obj);
    },

    getOwnPropertyDescriptor(obj: MudObject, prop: string | symbol): PropertyDescriptor | undefined {
      return Reflect.getOwnPropertyDescriptor(obj, prop);
    },

    getPrototypeOf(obj: MudObject): object | null {
      return Reflect.getPrototypeOf(obj);
    },
  };
}

/**
 * Central registry for object shadows.
 */
export class ShadowRegistry {
  /** Map objectId -> array of shadows (sorted by priority, highest first) */
  private shadows: Map<string, Shadow[]> = new Map();

  /** Map objectId -> Proxy (cached for performance) */
  private proxyCache: Map<string, MudObject> = new Map();

  /**
   * Install shadow-aware property descriptors on a target object.
   * This allows internal property access (this.property) to check shadows.
   * @param target The object to install descriptors on
   * @param objectId The object's ID for looking up shadows
   */
  private installShadowDescriptors(target: MudObject, objectId: string): void {
    // Check if we've already installed descriptors
    const existing = (target as unknown as Record<symbol, unknown>)[ORIGINAL_DESCRIPTORS];
    if (existing) return;

    const originalDescriptors: Record<string, PropertyDescriptor> = {};

    for (const prop of SHADOWABLE_PROPERTIES) {
      // Get the original descriptor from the prototype chain
      const originalDescriptor = getPropertyDescriptorFromChain(target, prop);
      if (!originalDescriptor) continue;

      // Store original for later restoration
      originalDescriptors[prop] = originalDescriptor;

      // Create shadow-aware getter
      const shadowRegistry = this;
      const originalGetter = originalDescriptor.get;
      const originalSetter = originalDescriptor.set;

      const newDescriptor: PropertyDescriptor = {
        get(): unknown {
          // Check shadows first
          const shadows = shadowRegistry.getShadows(objectId);
          for (const shadow of shadows) {
            if (!shadow.isActive) continue;

            const shadowValue = (shadow as Record<string, unknown>)[prop];
            if (shadowValue !== undefined) {
              // If it's a getter function on the shadow, call it
              if (typeof shadowValue === 'function') {
                return shadowValue.call(shadow);
              }
              return shadowValue;
            }
          }

          // Fall back to original getter
          if (originalGetter) {
            return originalGetter.call(this);
          }
          return undefined;
        },
        configurable: true,
        enumerable: originalDescriptor.enumerable ?? true,
      };

      // Only add setter if original had one
      if (originalSetter) {
        newDescriptor.set = originalSetter;
      }

      Object.defineProperty(target, prop, newDescriptor);
    }

    // Install shadow-aware method wrappers
    for (const methodName of SHADOWABLE_METHODS) {
      // Get the original method from the prototype chain (may not exist)
      const originalMethod = getPropertyDescriptorFromChain(target, methodName);
      const origFn =
        originalMethod && typeof originalMethod.value === 'function'
          ? (originalMethod.value as (...args: unknown[]) => unknown)
          : null;

      // Store original for later restoration (or mark as newly added)
      if (originalMethod) {
        originalDescriptors[methodName] = originalMethod;
      } else {
        // Mark that this method was added by shadow (didn't exist before)
        originalDescriptors[methodName] = { value: undefined, configurable: true };
      }

      // Create shadow-aware method wrapper
      const shadowRegistry = this;

      (target as unknown as Record<string, unknown>)[methodName] = function (
        this: unknown,
        ...args: unknown[]
      ): unknown {
        // Check shadows first
        const shadows = shadowRegistry.getShadows(objectId);
        for (const shadow of shadows) {
          if (!shadow.isActive) continue;

          const shadowMethod = (shadow as Record<string, unknown>)[methodName];
          if (typeof shadowMethod === 'function') {
            return shadowMethod.call(shadow, ...args);
          }
        }

        // Fall back to original method if it exists
        if (origFn) {
          return origFn.call(this, ...args);
        }

        // No shadow method and no original - return undefined
        return undefined;
      };
    }

    // Store original descriptors for restoration
    (target as unknown as Record<symbol, unknown>)[ORIGINAL_DESCRIPTORS] = originalDescriptors;
  }

  /**
   * Restore original property descriptors on a target object.
   * Called when removing the last shadow from an object.
   * @param target The object to restore descriptors on
   */
  private restoreShadowDescriptors(target: MudObject): void {
    const originalDescriptors = (target as unknown as Record<symbol, Record<string, PropertyDescriptor> | undefined>)[
      ORIGINAL_DESCRIPTORS
    ];
    if (!originalDescriptors) return;

    for (const [prop, descriptor] of Object.entries(originalDescriptors)) {
      // Delete the instance property to reveal the prototype's
      delete (target as unknown as Record<string, unknown>)[prop];

      // If the original was an own property (not from prototype), restore it
      if (Object.prototype.hasOwnProperty.call(target, prop) === false) {
        // Property is now inherited from prototype, which is what we want
        continue;
      }
    }

    // Clean up
    delete (target as unknown as Record<symbol, unknown>)[ORIGINAL_DESCRIPTORS];
  }

  /**
   * Add a shadow to a target object.
   * @param target The object to shadow
   * @param shadow The shadow to attach
   * @returns Result indicating success or failure
   */
  async addShadow(target: MudObject, shadow: Shadow): Promise<AddShadowResult> {
    const original = this.getOriginal(target);
    const objectId = original.objectId;

    // Get or create shadows array for this object
    let objectShadows = this.shadows.get(objectId);
    const isFirstShadow = !objectShadows || objectShadows.length === 0;

    if (!objectShadows) {
      objectShadows = [];
      this.shadows.set(objectId, objectShadows);
    }

    // Check for duplicate shadowId
    if (objectShadows.some((s) => s.shadowId === shadow.shadowId)) {
      return { success: false, error: `Shadow with ID ${shadow.shadowId} already exists on this object` };
    }

    // Set the target reference
    shadow.target = original;

    // Add shadow and sort by priority (highest first)
    objectShadows.push(shadow);
    objectShadows.sort((a, b) => b.priority - a.priority);

    // Install shadow-aware property descriptors on first shadow
    if (isFirstShadow) {
      this.installShadowDescriptors(original, objectId);
    }

    // Invalidate proxy cache for this object
    this.proxyCache.delete(objectId);

    // Call onAttach hook
    if (shadow.onAttach) {
      try {
        await shadow.onAttach(shadow.target);
      } catch (error) {
        console.error(`[ShadowRegistry] Error in onAttach for shadow ${shadow.shadowId}:`, error);
      }
    }

    return { success: true };
  }

  /**
   * Remove a shadow from a target object.
   * @param target The object to unshadow
   * @param shadowOrId The shadow instance or shadowId to remove
   * @returns true if shadow was removed
   */
  async removeShadow(target: MudObject, shadowOrId: Shadow | string): Promise<boolean> {
    const original = this.getOriginal(target);
    const objectId = original.objectId;
    const objectShadows = this.shadows.get(objectId);

    if (!objectShadows || objectShadows.length === 0) {
      return false;
    }

    const shadowId = typeof shadowOrId === 'string' ? shadowOrId : shadowOrId.shadowId;
    const index = objectShadows.findIndex((s) => s.shadowId === shadowId);

    if (index === -1) {
      return false;
    }

    const shadow = objectShadows[index]!;

    // Call onDetach hook
    if (shadow.onDetach && shadow.target) {
      try {
        await shadow.onDetach(shadow.target);
      } catch (error) {
        console.error(`[ShadowRegistry] Error in onDetach for shadow ${shadow.shadowId}:`, error);
      }
    }

    // Clear target reference
    shadow.target = null;

    // Remove shadow
    objectShadows.splice(index, 1);

    // Clean up if no more shadows
    if (objectShadows.length === 0) {
      this.shadows.delete(objectId);
      // Restore original property descriptors
      this.restoreShadowDescriptors(original);
    }

    // Invalidate proxy cache
    this.proxyCache.delete(objectId);

    return true;
  }

  /**
   * Get all shadows for an object.
   * @param objectId The object's ID
   * @returns Array of shadows (sorted by priority)
   */
  getShadows(objectId: string): Shadow[] {
    return this.shadows.get(objectId) || [];
  }

  /**
   * Find a specific shadow by type on an object.
   * @param objectId The object's ID
   * @param shadowType The shadow type to find
   * @returns The shadow if found
   */
  findShadow(objectId: string, shadowType: string): Shadow | undefined {
    const objectShadows = this.shadows.get(objectId);
    if (!objectShadows) return undefined;
    return objectShadows.find((s) => s.shadowType === shadowType);
  }

  /**
   * Check if an object has any shadows.
   * @param objectId The object's ID
   */
  hasShadows(objectId: string): boolean {
    const shadows = this.shadows.get(objectId);
    return shadows !== undefined && shadows.length > 0;
  }

  /**
   * Clear all shadows from an object.
   * @param target The object to clear shadows from
   */
  async clearShadows(target: MudObject): Promise<void> {
    const original = this.getOriginal(target);
    const objectId = original.objectId;
    const objectShadows = this.shadows.get(objectId);

    if (!objectShadows || objectShadows.length === 0) {
      return;
    }

    // Call onDetach for all shadows
    for (const shadow of objectShadows) {
      if (shadow.onDetach && shadow.target) {
        try {
          await shadow.onDetach(shadow.target);
        } catch (error) {
          console.error(`[ShadowRegistry] Error in onDetach for shadow ${shadow.shadowId}:`, error);
        }
      }
      shadow.target = null;
    }

    // Remove all shadows
    this.shadows.delete(objectId);
    this.proxyCache.delete(objectId);

    // Restore original property descriptors
    this.restoreShadowDescriptors(original);
  }

  /**
   * Wrap an object with a shadow proxy if it has shadows.
   * If no shadows exist, returns the original object.
   * @param object The object to potentially wrap
   * @returns The wrapped proxy or original object
   */
  wrapWithProxy(object: MudObject): MudObject {
    if (!object) return object;

    const objectId = this.getObjectId(object);

    // Check if this is already a proxy
    if ((object as unknown as Record<symbol, boolean>)[SHADOW_PROXY_MARKER]) {
      return object;
    }

    // Check if object has shadows
    if (!this.hasShadows(objectId)) {
      return object;
    }

    // Check cache
    const cached = this.proxyCache.get(objectId);
    if (cached) {
      return cached;
    }

    // Create new proxy
    const handler = createShadowHandler(object, () => this.getShadows(objectId));
    const proxy = new Proxy(object, handler) as MudObject;

    // Cache it
    this.proxyCache.set(objectId, proxy);

    return proxy;
  }

  /**
   * Get the original unwrapped object from a proxy.
   * If the object is not a proxy, returns it unchanged.
   * @param objectOrProxy The object or proxy
   * @returns The original unwrapped object
   */
  getOriginal(objectOrProxy: MudObject): MudObject {
    if (!objectOrProxy) return objectOrProxy;

    // Check if this is a proxy
    if ((objectOrProxy as unknown as Record<symbol, unknown>)[SHADOW_PROXY_MARKER]) {
      const original = (objectOrProxy as unknown as Record<symbol, MudObject | undefined>)[SHADOW_ORIGINAL];
      if (original) return original;
    }

    return objectOrProxy;
  }

  /**
   * Clean up all shadows when an object is destroyed.
   * Called by ObjectRegistry when an object is being destroyed.
   * @param objectId The object's ID being destroyed
   */
  async cleanupForObject(objectId: string): Promise<void> {
    const objectShadows = this.shadows.get(objectId);

    if (!objectShadows || objectShadows.length === 0) {
      this.shadows.delete(objectId);
      this.proxyCache.delete(objectId);
      return;
    }

    // Get the target for descriptor restoration before we clear shadows
    const target = objectShadows[0]?.target;

    // Call onDetach for all shadows (without target since it's being destroyed)
    for (const shadow of objectShadows) {
      if (shadow.onDetach && shadow.target) {
        try {
          await shadow.onDetach(shadow.target);
        } catch (error) {
          // Ignore errors during destruction cleanup
        }
      }
      shadow.target = null;
    }

    this.shadows.delete(objectId);
    this.proxyCache.delete(objectId);

    // Restore original property descriptors if we have the target
    if (target) {
      this.restoreShadowDescriptors(target);
    }
  }

  /**
   * Get the object ID from an object, handling proxies.
   */
  private getObjectId(object: MudObject): string {
    const original = this.getOriginal(object);
    return original.objectId;
  }

  /**
   * Get statistics about shadow usage.
   */
  getStats(): {
    totalShadowedObjects: number;
    totalShadows: number;
    cachedProxies: number;
    shadowsByType: Record<string, number>;
  } {
    const shadowsByType: Record<string, number> = {};
    let totalShadows = 0;

    for (const shadows of this.shadows.values()) {
      for (const shadow of shadows) {
        totalShadows++;
        shadowsByType[shadow.shadowType] = (shadowsByType[shadow.shadowType] || 0) + 1;
      }
    }

    return {
      totalShadowedObjects: this.shadows.size,
      totalShadows,
      cachedProxies: this.proxyCache.size,
      shadowsByType,
    };
  }

  /**
   * Clear all data. Used for testing.
   */
  clear(): void {
    this.shadows.clear();
    this.proxyCache.clear();
  }
}

// Singleton instance
let registryInstance: ShadowRegistry | null = null;

/**
 * Get the global ShadowRegistry instance.
 */
export function getShadowRegistry(): ShadowRegistry {
  if (!registryInstance) {
    registryInstance = new ShadowRegistry();
  }
  return registryInstance;
}

/**
 * Reset the global shadow registry. Used for testing.
 */
export function resetShadowRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
  }
  registryInstance = null;
}
