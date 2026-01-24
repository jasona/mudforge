/**
 * Shadow System Type Definitions
 *
 * Shadows allow objects to temporarily override properties and methods of
 * another object without permanently modifying its state. This is useful for
 * transformation effects, possession, disguises, curses, and polymorphs.
 */

import type { MudObject } from './types.js';

/**
 * Shadow interface - objects that can overlay a MudObject.
 * Shadows can override properties and methods by defining them.
 */
export interface Shadow {
  /** Unique identifier for this shadow instance */
  shadowId: string;

  /** Type identifier for lookup (e.g., 'werewolf_form', 'disguise') */
  shadowType: string;

  /** Priority for resolution - higher priority shadows are checked first */
  priority: number;

  /** Whether this shadow is currently active (can be temporarily disabled) */
  isActive: boolean;

  /** Reference to the target object (set by registry when attached) */
  target: MudObject | null;

  /**
   * Called when the shadow is attached to a target.
   * Use for applying stat modifiers, notifying the target, etc.
   */
  onAttach?(target: MudObject): void | Promise<void>;

  /**
   * Called when the shadow is detached from the target.
   * Use for cleanup, removing stat modifiers, etc.
   */
  onDetach?(target: MudObject): void | Promise<void>;

  /**
   * Allow arbitrary properties/methods that can override the target.
   * Any property defined on the shadow can potentially shadow the target's property.
   */
  [key: string]: unknown;
}

/**
 * Properties that are NEVER shadowed - these are identity, lifecycle, and internal properties
 * that must always come from the original object.
 */
export const UNSHADOWABLE_PROPERTIES: Set<string | symbol> = new Set([
  // Identity properties - must always reflect the real object
  'objectPath',
  'objectId',
  'isClone',
  'blueprint',

  // Hierarchy/structure - shadows shouldn't change where objects are
  'environment',
  'inventory',
  'moveTo',

  // Lifecycle hooks - these must run on the real object
  'onCreate',
  'onDestroy',
  'onClone',
  'onReset',
  'heartbeat',

  // Internal mechanisms
  'id', // Used for object matching
  'addAction',
  'removeAction',
  'getActions',
  'getAction',

  // Property storage - shadows use their own storage
  'setProperty',
  'getProperty',
  'hasProperty',
  'deleteProperty',
  'getPropertyKeys',

  // Identity management
  'addId',
  'removeId',
  'setIds',
  'getIds',

  // Internal setup methods
  '_initIdentity',
  '_setupAsBlueprint',
  '_setupAsClone',
  '_environment',
  '_inventory',
  '_objectPath',
  '_objectId',
  '_isClone',
  '_blueprint',
  '_ids',
  '_actions',
  '_properties',

  // Shadow-specific properties that shouldn't recurse
  'shadowId',
  'shadowType',
  'priority',
  'isActive',
  'target',
  'onAttach',
  'onDetach',

  // Utility methods that should use the real object
  'destruct',
  'callOut',
  'removeCallOut',
  'setHeartbeat',

  // Symbol properties
  Symbol.toStringTag,
  Symbol.iterator,
]);

/**
 * Symbol used to mark an object as a shadow proxy.
 * Allows checking if an object is already wrapped.
 */
export const SHADOW_PROXY_MARKER = Symbol('shadowProxy');

/**
 * Symbol to access the original unwrapped object from a proxy.
 */
export const SHADOW_ORIGINAL = Symbol('shadowOriginal');

/**
 * Result of adding a shadow.
 */
export interface AddShadowResult {
  success: boolean;
  error?: string;
}
