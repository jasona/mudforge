/**
 * MudObject - Base class for all mudlib objects.
 *
 * This is the foundational class that all game objects inherit from.
 * It provides identity, descriptions, actions, and lifecycle hooks.
 */

// Efuns are injected by the driver at runtime
declare const efuns: {
  thisObject(): MudObject | null;
  thisPlayer(): MudObject | null;
  cloneObject(path: string): Promise<MudObject | undefined>;
  destruct(object: MudObject): Promise<void>;
  findObject(pathOrId: string): MudObject | undefined;
  move(object: MudObject, destination: MudObject | null): Promise<boolean>;
  environment(object: MudObject): MudObject | null;
  allInventory(object: MudObject): MudObject[];
  send(target: MudObject, message: string): void;
  callOut(callback: () => void | Promise<void>, delayMs: number): number;
  removeCallOut(id: number): boolean;
  setHeartbeat(object: MudObject, enable: boolean): void;
  time(): number;
  random(max: number): number;
  capitalize(str: string): string;
  explode(str: string, delimiter: string): string[];
  implode(arr: string[], delimiter: string): string;
};

/**
 * Action handler function type.
 */
export type ActionHandler = (args: string) => boolean | Promise<boolean>;

/**
 * Action definition.
 */
export interface Action {
  verb: string;
  handler: ActionHandler;
  priority: number;
}

/**
 * Base class for all MUD objects.
 */
export class MudObject {
  // Identity
  private _objectPath: string = '';
  private _objectId: string = '';
  private _isClone: boolean = false;
  private _blueprint: MudObject | undefined;

  // Descriptions
  private _shortDesc: string = 'an object';
  private _longDesc: string = 'You see nothing special.';

  // Hierarchy
  private _environment: MudObject | null = null;
  private _inventory: MudObject[] = [];

  // Actions
  private _actions: Map<string, Action> = new Map();

  // Properties (for arbitrary data storage)
  private _properties: Map<string, unknown> = new Map();

  /**
   * Get the object's virtual path.
   */
  get objectPath(): string {
    return this._objectPath;
  }

  /**
   * Get the object's unique ID.
   */
  get objectId(): string {
    return this._objectId;
  }

  /**
   * Check if this is a clone.
   */
  get isClone(): boolean {
    return this._isClone;
  }

  /**
   * Get the blueprint this was cloned from.
   */
  get blueprint(): MudObject | undefined {
    return this._blueprint;
  }

  /**
   * Get the short description.
   */
  get shortDesc(): string {
    return this._shortDesc;
  }

  /**
   * Set the short description.
   */
  set shortDesc(value: string) {
    this._shortDesc = value;
  }

  /**
   * Get the long description.
   */
  get longDesc(): string {
    return this._longDesc;
  }

  /**
   * Set the long description.
   */
  set longDesc(value: string) {
    this._longDesc = value;
  }

  /**
   * Get the object's environment (container).
   */
  get environment(): MudObject | null {
    return this._environment;
  }

  /**
   * Get the object's inventory (contents).
   */
  get inventory(): ReadonlyArray<MudObject> {
    return this._inventory;
  }

  // ========== Lifecycle Hooks ==========

  /**
   * Called when the object is created.
   * Override this to initialize your object.
   */
  onCreate(): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when the object is destroyed.
   * Override this to clean up resources.
   */
  onDestroy(): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when this object is cloned.
   * @param blueprint The blueprint this was cloned from
   */
  onClone(blueprint: MudObject): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called periodically to reset the object state.
   * Typically used to respawn NPCs, restore items, etc.
   */
  onReset(): void | Promise<void> {
    // Default: do nothing
  }

  // ========== Identity ==========

  /**
   * Check if this object matches a name/identifier.
   * Override this for custom matching logic.
   * @param name The name to check
   */
  id(name: string): boolean {
    const lowerName = name.toLowerCase();
    const lowerDesc = this._shortDesc.toLowerCase();

    // Check exact match
    if (lowerDesc === lowerName) {
      return true;
    }

    // Check if name appears as a word in the description
    const words = lowerDesc.split(/\s+/);
    return words.includes(lowerName);
  }

  // ========== Movement ==========

  /**
   * Move this object to a new environment.
   * @param destination The new environment, or null to remove from environment
   * @returns true if move succeeded
   */
  moveTo(destination: MudObject | null): boolean | Promise<boolean> {
    // Remove from current environment
    if (this._environment) {
      const idx = this._environment._inventory.indexOf(this);
      if (idx >= 0) {
        this._environment._inventory.splice(idx, 1);
      }
    }

    // Set new environment
    this._environment = destination;

    // Add to new environment's inventory
    if (destination) {
      destination._inventory.push(this);
    }

    return true;
  }

  // ========== Actions ==========

  /**
   * Add an action (command) to this object.
   * @param verb The command verb
   * @param handler Function to handle the command
   * @param priority Higher priority handlers are checked first
   */
  addAction(verb: string, handler: ActionHandler, priority: number = 0): void {
    this._actions.set(verb.toLowerCase(), {
      verb: verb.toLowerCase(),
      handler,
      priority,
    });
  }

  /**
   * Remove an action from this object.
   * @param verb The command verb to remove
   */
  removeAction(verb: string): void {
    this._actions.delete(verb.toLowerCase());
  }

  /**
   * Get all actions defined on this object.
   */
  getActions(): ReadonlyArray<Action> {
    return Array.from(this._actions.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get a specific action by verb.
   */
  getAction(verb: string): Action | undefined {
    return this._actions.get(verb.toLowerCase());
  }

  // ========== Properties ==========

  /**
   * Set a property on this object.
   * @param key Property name
   * @param value Property value
   */
  setProperty(key: string, value: unknown): void {
    this._properties.set(key, value);
  }

  /**
   * Get a property from this object.
   * @param key Property name
   */
  getProperty<T = unknown>(key: string): T | undefined {
    return this._properties.get(key) as T | undefined;
  }

  /**
   * Check if a property exists.
   * @param key Property name
   */
  hasProperty(key: string): boolean {
    return this._properties.has(key);
  }

  /**
   * Delete a property.
   * @param key Property name
   */
  deleteProperty(key: string): boolean {
    return this._properties.delete(key);
  }

  /**
   * Get all property keys.
   */
  getPropertyKeys(): string[] {
    return Array.from(this._properties.keys());
  }

  // ========== Utility ==========

  /**
   * Destroy this object.
   */
  async destruct(): Promise<void> {
    if (typeof efuns !== 'undefined') {
      await efuns.destruct(this);
    }
  }

  /**
   * Schedule a delayed callback.
   * @param callback Function to call
   * @param delayMs Delay in milliseconds
   * @returns callOut ID
   */
  callOut(callback: () => void | Promise<void>, delayMs: number): number {
    if (typeof efuns !== 'undefined') {
      return efuns.callOut(callback, delayMs);
    }
    return 0;
  }

  /**
   * Cancel a scheduled callback.
   * @param id callOut ID
   */
  removeCallOut(id: number): boolean {
    if (typeof efuns !== 'undefined') {
      return efuns.removeCallOut(id);
    }
    return false;
  }

  /**
   * Enable or disable heartbeat for this object.
   * @param enable Whether to enable heartbeat
   */
  setHeartbeat(enable: boolean): void {
    if (typeof efuns !== 'undefined') {
      efuns.setHeartbeat(this, enable);
    }
  }

  /**
   * Called on each heartbeat tick when heartbeat is enabled.
   * Override this to implement periodic behavior.
   */
  heartbeat(): void | Promise<void> {
    // Default: do nothing
  }

  // ========== Internal ==========

  /**
   * Initialize identity (called by driver).
   * @internal
   */
  _initIdentity(
    objectPath: string,
    objectId: string,
    isClone: boolean,
    blueprint?: MudObject
  ): void {
    this._objectPath = objectPath;
    this._objectId = objectId;
    this._isClone = isClone;
    this._blueprint = blueprint;
  }
}

export default MudObject;
