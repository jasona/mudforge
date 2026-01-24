/**
 * Shadow - Base class for object shadows in the mudlib.
 *
 * Shadows allow objects to "overlay" other objects, intercepting property
 * access and method calls. The shadow can temporarily override behavior
 * without permanently modifying the target object's state.
 *
 * Use Cases:
 * - Werewolf/shapeshifter transformations (name, description, attacks change)
 * - Possession effects (another entity controls the body)
 * - Disguises (appear as someone else)
 * - Cursed states (stat modifications, altered behavior)
 * - Polymorph spells
 *
 * Usage:
 * 1. Create a class extending Shadow
 * 2. Define properties/getters to override target's properties
 * 3. Attach to a target using efuns.addShadow(target, shadow)
 * 4. Remove with efuns.removeShadow(target, shadow)
 *
 * Example:
 * ```typescript
 * class WerewolfShadow extends Shadow {
 *   constructor() {
 *     super('werewolf_form');
 *     this.priority = 100;
 *   }
 *
 *   get name(): string {
 *     const original = this.getOriginal<string>('name') || 'someone';
 *     return `${original} the Werewolf`;
 *   }
 *
 *   get shortDesc(): string {
 *     return 'a fearsome werewolf';
 *   }
 * }
 *
 * // Attach to player
 * const shadow = new WerewolfShadow();
 * await efuns.addShadow(player, shadow);
 *
 * // Now player.name returns "Acer the Werewolf" automatically!
 * ```
 */

import type { MudObject } from './object.js';

/**
 * Base class for shadows.
 * Extend this class to create custom shadows for transformations,
 * disguises, curses, and other overlay effects.
 */
export class Shadow {
  /** Unique identifier for this shadow instance */
  shadowId: string;

  /** Type identifier for lookup (e.g., 'werewolf_form', 'disguise') */
  shadowType: string;

  /**
   * Priority for resolution - higher priority shadows are checked first.
   * When multiple shadows are attached, the highest priority wins.
   * Default is 0. Set higher values for more important shadows.
   */
  priority: number = 0;

  /** Whether this shadow is currently active (can be temporarily disabled) */
  isActive: boolean = true;

  /**
   * Reference to the target object (set automatically when attached).
   * Use this to access the original object's properties via getOriginal().
   */
  target: MudObject | null = null;

  /**
   * Create a new shadow.
   * @param shadowType A type identifier for this shadow (e.g., 'werewolf_form')
   */
  constructor(shadowType: string) {
    this.shadowType = shadowType;
    this.shadowId = `${shadowType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the original value of a property from the target object.
   * This bypasses the shadow to get the actual underlying value.
   *
   * Useful when you want to modify the original value rather than replace it entirely.
   *
   * Example:
   * ```typescript
   * get name(): string {
   *   const originalName = this.getOriginal<string>('name') || 'someone';
   *   return `${originalName} the Cursed`;
   * }
   * ```
   *
   * @param property The property name to get from the original object
   * @returns The original value, or undefined if not found
   */
  protected getOriginal<T>(property: string): T | undefined {
    if (!this.target) return undefined;

    // Get the unwrapped original object
    if (typeof efuns !== 'undefined' && efuns.getOriginalObject) {
      const original = efuns.getOriginalObject(this.target);
      return (original as Record<string, unknown>)[property] as T;
    }

    // Fallback: try to access directly (may get shadowed value)
    return (this.target as Record<string, unknown>)[property] as T;
  }

  /**
   * Called when the shadow is attached to a target.
   * Override this to apply stat modifiers, notify the player, etc.
   *
   * @param target The object this shadow is being attached to
   */
  onAttach(target: MudObject): void | Promise<void> {
    // Override in subclasses
  }

  /**
   * Called when the shadow is detached from the target.
   * Override this to remove stat modifiers, clean up effects, etc.
   *
   * @param target The object this shadow is being detached from
   */
  onDetach(target: MudObject): void | Promise<void> {
    // Override in subclasses
  }

  /**
   * Temporarily disable this shadow without removing it.
   * While disabled, the shadow's overrides are not applied.
   */
  disable(): void {
    this.isActive = false;
  }

  /**
   * Re-enable a disabled shadow.
   */
  enable(): void {
    this.isActive = true;
  }

  /**
   * Remove this shadow from its target.
   * Convenience method - equivalent to efuns.removeShadow(target, this).
   */
  async remove(): Promise<boolean> {
    if (!this.target) return false;
    if (typeof efuns !== 'undefined' && efuns.removeShadow) {
      return efuns.removeShadow(this.target, this);
    }
    return false;
  }
}

export default Shadow;
