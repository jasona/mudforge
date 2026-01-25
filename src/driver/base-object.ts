/**
 * BaseMudObject - Default implementation of MudObject interface.
 *
 * This class provides the core functionality for MUD objects.
 * Mudlib objects extend this class to add game-specific behavior.
 */

import type { MudObject, Action, ActionHandler } from './types.js';
import { getShadowRegistry } from './shadow-registry.js';

/**
 * Base implementation of MudObject.
 * Provides default implementations of all interface methods.
 */
export class BaseMudObject implements MudObject {
  // ========== Identity Properties ==========

  private _objectPath: string = '';
  private _objectId: string = '';
  private _isClone: boolean = false;
  private _blueprint: MudObject | undefined = undefined;

  get objectPath(): string {
    return this._objectPath;
  }

  get objectId(): string {
    return this._objectId;
  }

  get isClone(): boolean {
    return this._isClone;
  }

  get blueprint(): MudObject | undefined {
    return this._blueprint;
  }

  // ========== Hierarchy ==========

  private _environment: MudObject | null = null;
  private _inventory: MudObject[] = [];

  get environment(): MudObject | null {
    // Wrap with shadow proxy if environment has shadows
    if (this._environment) {
      return getShadowRegistry().wrapWithProxy(this._environment);
    }
    return this._environment;
  }

  set environment(value: MudObject | null) {
    // Store the original unwrapped object
    if (value) {
      this._environment = getShadowRegistry().getOriginal(value);
    } else {
      this._environment = value;
    }
  }

  get inventory(): ReadonlyArray<MudObject> {
    // Wrap all inventory items with shadow proxies
    const registry = getShadowRegistry();
    return this._inventory.map((obj) => registry.wrapWithProxy(obj));
  }

  // ========== Description ==========

  shortDesc: string = 'an object';
  longDesc: string = 'You see nothing special.';

  // ========== Actions ==========

  private _actions: Map<string, Action> = new Map();

  // ========== Setup Methods ==========

  /**
   * Setup this object as a blueprint.
   * Called by the registry when registering a new blueprint.
   */
  _setupAsBlueprint(objectPath: string): void {
    this._objectPath = objectPath;
    this._objectId = objectPath;
    this._isClone = false;
    this._blueprint = undefined;
  }

  /**
   * Setup this object as a clone.
   * Called by the registry when cloning.
   */
  _setupAsClone(objectPath: string, objectId: string, blueprint: MudObject): void {
    this._objectPath = objectPath;
    this._objectId = objectId;
    this._isClone = true;
    this._blueprint = blueprint;
  }

  // ========== Lifecycle Hooks ==========

  onCreate(): void | Promise<void> {
    // Default: do nothing
  }

  onDestroy(): void | Promise<void> {
    // Default: do nothing
  }

  onClone(_blueprint: MudObject): void | Promise<void> {
    // Default: do nothing
  }

  onReset(): void | Promise<void> {
    // Default: do nothing
  }

  // ========== Movement ==========

  moveTo(destination: MudObject | null): boolean | Promise<boolean> {
    // Remove from current environment
    if (this._environment) {
      const envBase = this._environment as BaseMudObject;
      const index = envBase._inventory.indexOf(this);
      if (index !== -1) {
        envBase._inventory.splice(index, 1);
      }
    }

    // Set new environment
    this._environment = destination;

    // Add to new environment's inventory
    if (destination) {
      const destBase = destination as BaseMudObject;
      destBase._inventory.push(this);
    }

    return true;
  }

  // ========== Interaction ==========

  id(name: string): boolean {
    // Default: match against shortDesc (case-insensitive, word match)
    const lower = name.toLowerCase();
    const descLower = this.shortDesc.toLowerCase();

    // Check if name appears as a word in the description
    const words = descLower.split(/\s+/);
    return words.includes(lower);
  }

  // ========== Actions ==========

  addAction(verb: string, handler: ActionHandler, priority: number = 0): void {
    this._actions.set(verb.toLowerCase(), {
      verb: verb.toLowerCase(),
      handler,
      priority,
    });
  }

  removeAction(verb: string): void {
    this._actions.delete(verb.toLowerCase());
  }

  getActions(): ReadonlyArray<Action> {
    return Array.from(this._actions.values());
  }

  // ========== Inventory Helpers ==========

  /**
   * Add an object to this object's inventory.
   * Internal method used by moveTo().
   */
  _addToInventory(object: MudObject): void {
    this._inventory.push(object);
  }

  /**
   * Remove an object from this object's inventory.
   * Internal method used by moveTo().
   */
  _removeFromInventory(object: MudObject): void {
    const index = this._inventory.indexOf(object);
    if (index !== -1) {
      this._inventory.splice(index, 1);
    }
  }
}
