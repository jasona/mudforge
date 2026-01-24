/**
 * WerewolfShadow - Example shadow implementation for werewolf transformation.
 *
 * This shadow demonstrates the shadow system by implementing a werewolf
 * transformation. When attached to a player or NPC, it:
 * - Changes their name to "[Name] the Werewolf"
 * - Changes their short/long descriptions to werewolf-themed ones
 * - Changes their enter/exit messages to werewolf-themed ones
 * - Adds stat modifiers (strength +5, dexterity +3)
 * - Automatically ends after a duration (if specified)
 *
 * Usage:
 * ```typescript
 * import { WerewolfShadow } from '../std/guild/shadows/werewolf-shadow.js';
 *
 * // Transform for 60 seconds
 * const shadow = new WerewolfShadow(60000);
 * await efuns.addShadow(player, shadow);
 *
 * // Now player.name, player.shortDesc, etc. return werewolf values
 * // NO changes needed to look command, combat, or any other code!
 *
 * // To end early:
 * await efuns.removeShadow(player, shadow);
 * ```
 */

import { Shadow } from '../../shadow.js';
import type { MudObject } from '../../object.js';
import type { Living } from '../../living.js';
import type { NaturalAttack } from '../../combat/types.js';

/**
 * Werewolf transformation shadow.
 */
export class WerewolfShadow extends Shadow {
  private _durationMs: number;
  private _expiresAt: number;
  private _calloutId: number | null = null;

  /**
   * Create a werewolf transformation shadow.
   * @param durationMs How long the transformation lasts in milliseconds (0 = indefinite)
   */
  constructor(durationMs: number = 60000) {
    super('werewolf_form');
    this.priority = 100; // High priority to override other shadows
    this._durationMs = durationMs;
    this._expiresAt = durationMs > 0 ? Date.now() + durationMs : 0;
  }

  // ========== Shadowed Properties ==========

  /**
   * Override name to add "the Werewolf" suffix.
   */
  get name(): string {
    const original = this.getOriginal<string>('_name') || 'someone';
    return `${original} the Werewolf`;
  }

  /**
   * Override short description.
   */
  get shortDesc(): string {
    return 'a fearsome werewolf';
  }

  /**
   * Override long description with werewolf-themed text.
   */
  get longDesc(): string {
    const originalName = this.getOriginal<string>('_name') || 'someone';
    return `This creature was once ${originalName}, but now stands transformed into a ` +
      `fearsome werewolf. Thick fur bristles across powerful muscles, and sharp ` +
      `fangs gleam in the light. Its eyes burn with a primal hunger, yet somewhere ` +
      `deep within, a hint of humanity remains.`;
  }

  /**
   * Override exit message with werewolf-themed text.
   */
  get exitMessage(): string {
    return '$N prowls $D, claws clicking on the ground.';
  }

  /**
   * Override enter message with werewolf-themed text.
   */
  get enterMessage(): string {
    return 'A fearsome werewolf prowls in from $D.';
  }

  // ========== Shadowed Methods ==========

  /**
   * Get a werewolf-themed display name.
   * This overrides the Living.getDisplayName() method.
   */
  getDisplayName(): string {
    const originalName = this.getOriginal<string>('_name') || 'someone';
    return `${originalName} the Werewolf`;
  }

  /**
   * Werewolf natural attacks - claws and fangs.
   * This overrides the Living.getNaturalAttack() method for combat messages.
   */
  private _werewolfAttacks: NaturalAttack[] = [
    {
      name: 'razor-sharp claws',
      damageType: 'slashing',
      hitVerb: 'rakes with vicious claws',
      missVerb: 'swipes with deadly claws at',
      damageBonus: 3,
      weight: 2,
    },
    {
      name: 'powerful fangs',
      damageType: 'piercing',
      hitVerb: 'savagely bites',
      missVerb: 'snaps powerful jaws at',
      damageBonus: 4,
      weight: 1,
    },
    {
      name: 'claws',
      damageType: 'slashing',
      hitVerb: 'slashes viciously',
      missVerb: 'lunges with claws at',
      damageBonus: 2,
      weight: 2,
    },
    {
      name: 'jaws',
      damageType: 'piercing',
      hitVerb: 'chomps down on',
      missVerb: 'snarls and snaps at',
      damageBonus: 5,
      weight: 1,
    },
  ];

  /**
   * Get a random werewolf natural attack for combat.
   * Returns weighted random selection from werewolf attacks.
   */
  getNaturalAttack(): NaturalAttack {
    // Weighted random selection
    const totalWeight = this._werewolfAttacks.reduce((sum, a) => sum + (a.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const attack of this._werewolfAttacks) {
      random -= attack.weight || 1;
      if (random <= 0) {
        return attack;
      }
    }

    // Fallback to first attack
    return this._werewolfAttacks[0];
  }

  // ========== Lifecycle Hooks ==========

  /**
   * Called when the shadow is attached.
   * Applies stat modifiers and sets up auto-expiration.
   */
  async onAttach(target: MudObject): Promise<void> {
    // Cast to Living for stat access
    const living = target as Living;

    // Apply stat modifiers
    if (typeof living.addStatModifier === 'function') {
      living.addStatModifier('strength', 5);
      living.addStatModifier('dexterity', 3);
    }

    // Notify the target
    if (typeof (living as MudObject & { receive?: (msg: string) => void }).receive === 'function') {
      (living as MudObject & { receive: (msg: string) => void }).receive(
        '\n{red}{bold}The beast within awakens!{/}\n' +
        '{yellow}Your body twists and contorts as thick fur sprouts across your skin.{/}\n' +
        '{yellow}Your senses sharpen and primal instincts surge through you.{/}\n\n'
      );
    }

    // Set up auto-expiration if duration specified
    if (this._durationMs > 0 && typeof efuns !== 'undefined' && efuns.callOut) {
      this._calloutId = efuns.callOut(() => this.endTransformation(), this._durationMs);
    }

    // Notify the room
    const room = target.environment;
    if (room && 'broadcast' in room) {
      const originalName = this.getOriginal<string>('_name') || 'someone';
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{red}${originalName} transforms into a fearsome werewolf!{/}\n`, { exclude: [target] });
    }
  }

  /**
   * Called when the shadow is detached.
   * Removes stat modifiers.
   */
  async onDetach(target: MudObject): Promise<void> {
    // Cancel auto-expiration timer if still pending
    if (this._calloutId !== null && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(this._calloutId);
      this._calloutId = null;
    }

    // Cast to Living for stat access
    const living = target as Living;

    // Remove stat modifiers
    if (typeof living.addStatModifier === 'function') {
      living.addStatModifier('strength', -5);
      living.addStatModifier('dexterity', -3);
    }

    // Notify the target
    if (typeof (living as MudObject & { receive?: (msg: string) => void }).receive === 'function') {
      (living as MudObject & { receive: (msg: string) => void }).receive(
        '\n{yellow}The beast within recedes.{/}\n' +
        '{yellow}Your body shudders as you return to your normal form.{/}\n\n'
      );
    }

    // Notify the room
    const room = target.environment;
    if (room && 'broadcast' in room) {
      const originalName = this.getOriginal<string>('_name') || 'someone';
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{yellow}${originalName} returns to their normal form.{/}\n`, { exclude: [target] });
    }
  }

  // ========== Helper Methods ==========

  /**
   * End the transformation, removing this shadow.
   */
  private async endTransformation(): Promise<void> {
    this._calloutId = null; // Clear the ID since we're being called from the callout
    if (this.target) {
      await this.remove();
    }
  }

  /**
   * Get the remaining duration of the transformation in milliseconds.
   * Returns 0 if indefinite or already expired.
   */
  getRemainingDuration(): number {
    if (this._expiresAt === 0) return 0;
    const remaining = this._expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Check if the transformation is indefinite (no auto-expiration).
   */
  isIndefinite(): boolean {
    return this._durationMs === 0;
  }
}

export default WerewolfShadow;
