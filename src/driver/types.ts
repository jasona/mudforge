/**
 * Core type definitions for the MUD driver.
 */

/**
 * Action handler function signature.
 * Returns true if the action was handled, false otherwise.
 */
export type ActionHandler = (args: string, actor: MudObject) => boolean | Promise<boolean>;

/**
 * Registered action with pattern matching.
 */
export interface Action {
  /** The verb/pattern that triggers this action */
  verb: string;
  /** The handler function */
  handler: ActionHandler;
  /** Priority for action resolution (higher = checked first) */
  priority: number;
}

/**
 * MudObject interface - the core object type in the MUD.
 * All objects in the game world implement this interface.
 */
export interface MudObject {
  // ========== Identity Properties ==========

  /** Full path to the object definition (e.g., "/std/sword" or "/areas/town/shop") */
  readonly objectPath: string;

  /**
   * Unique object ID within the driver.
   * For blueprints: same as objectPath
   * For clones: objectPath + "#" + cloneNumber (e.g., "/std/sword#47")
   */
  readonly objectId: string;

  /** Whether this object is a clone (vs a blueprint) */
  readonly isClone: boolean;

  /**
   * Reference to the blueprint object (for clones).
   * For blueprints, this is undefined.
   */
  readonly blueprint: MudObject | undefined;

  // ========== Lifecycle Hooks ==========

  /**
   * Called when the object is first created/loaded.
   * Use for one-time initialization.
   */
  onCreate(): void | Promise<void>;

  /**
   * Called when the object is being destroyed.
   * Use for cleanup, saving state, notifying others.
   */
  onDestroy(): void | Promise<void>;

  /**
   * Called on a newly created clone, after onCreate().
   * The blueprint is passed as a parameter.
   */
  onClone(blueprint: MudObject): void | Promise<void>;

  /**
   * Called periodically to reset the object to its initial state.
   * Used for respawning monsters, restocking shops, etc.
   */
  onReset(): void | Promise<void>;

  // ========== Hierarchy ==========

  /**
   * The object this object is inside of (room, container, etc.).
   * null if the object is not inside anything.
   */
  environment: MudObject | null;

  /**
   * Objects contained within this object.
   * For rooms: players, NPCs, items on the ground.
   * For containers: items inside.
   * For players: inventory items.
   */
  readonly inventory: ReadonlyArray<MudObject>;

  /**
   * Move this object to a new environment.
   * Handles removal from old environment and addition to new.
   * @param destination The new environment, or null to remove from world
   * @returns true if move succeeded, false if blocked
   */
  moveTo(destination: MudObject | null): boolean | Promise<boolean>;

  // ========== Interaction ==========

  /**
   * Check if this object matches a given name/id string.
   * Used for parsing player commands like "get sword" or "look at guard".
   * @param name The name to match against
   * @returns true if this object matches the name
   */
  id(name: string): boolean;

  /** Short description (e.g., "a rusty sword", "the town guard") */
  shortDesc: string;

  /** Long description shown when examining the object */
  longDesc: string;

  // ========== Actions ==========

  /**
   * Register a command action on this object.
   * Actions are checked when a living object in the same environment issues a command.
   * @param verb The command verb (e.g., "open", "push")
   * @param handler The function to call when the action is triggered
   * @param priority Priority for resolution (higher = checked first, default 0)
   */
  addAction(verb: string, handler: ActionHandler, priority?: number): void;

  /**
   * Remove a previously registered action.
   * @param verb The command verb to remove
   */
  removeAction(verb: string): void;

  /**
   * Get all actions registered on this object.
   */
  getActions(): ReadonlyArray<Action>;
}

/**
 * Base implementation class that mudlib objects extend.
 * This is the runtime representation of a MudObject.
 */
export interface MudObjectConstructor {
  new (): MudObject;
}

/**
 * Blueprint registration info stored in the registry.
 */
export interface BlueprintInfo {
  /** The path to the object definition */
  path: string;
  /** The compiled constructor */
  constructor: MudObjectConstructor;
  /** The blueprint instance */
  instance: MudObject;
  /** Counter for generating clone IDs */
  cloneCounter: number;
  /** All clones created from this blueprint */
  clones: Set<string>;
}
