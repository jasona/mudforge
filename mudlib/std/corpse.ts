/**
 * Corpse - Container created when a living entity dies.
 *
 * Contains the deceased's inventory and any loot drops.
 * Player corpses persist until retrieved; NPC corpses decay.
 */

import { Container } from './container.js';
import type { Living } from './living.js';
import type { MudObject } from './object.js';

/**
 * Default decay time for NPC corpses (5 minutes).
 */
const DEFAULT_DECAY_TIME = 5 * 60 * 1000;

/**
 * Corpse class for dead entities.
 */
export class Corpse extends Container {
  /** Name of the deceased */
  private _ownerName: string = 'someone';

  /** Whether this is a player corpse */
  private _isPlayerCorpse: boolean = false;

  /** Gold on the corpse */
  private _gold: number = 0;

  /** Object ID of the original living (for player resurrection) */
  private _ownerId: string | null = null;

  /** Decay timer ID */
  private _decayTimerId: number = 0;

  /** Time when decay will occur */
  private _decayTime: number = 0;

  constructor() {
    super();
    this.shortDesc = 'a corpse';
    this.longDesc = 'The remains of a fallen creature.';
    this.takeable = false;
    this.maxItems = 100;
    this.maxWeight = 10000;
    // Corpses don't support open/close - they're always accessible
    this.canOpenClose = false;
  }

  // ========== Properties ==========

  /**
   * Get the name of the deceased.
   */
  get ownerName(): string {
    return this._ownerName;
  }

  /**
   * Set the owner name.
   */
  set ownerName(name: string) {
    this._ownerName = name;
    this.shortDesc = `the corpse of ${name}`;
    this.longDesc = `This is the lifeless body of ${name}.`;
    this.setIds(['corpse', `corpse of ${name.toLowerCase()}`, `${name.toLowerCase()} corpse`]);
  }

  /**
   * Check if this is a player corpse.
   */
  get isPlayerCorpse(): boolean {
    return this._isPlayerCorpse;
  }

  /**
   * Set whether this is a player corpse.
   */
  set isPlayerCorpse(value: boolean) {
    this._isPlayerCorpse = value;
  }

  /**
   * Get the gold on the corpse.
   */
  get gold(): number {
    return this._gold;
  }

  /**
   * Set the gold on the corpse.
   */
  set gold(value: number) {
    this._gold = Math.max(0, value);
  }

  /**
   * Get the owner's object ID (for resurrection).
   */
  get ownerId(): string | null {
    return this._ownerId;
  }

  /**
   * Set the owner's object ID.
   */
  set ownerId(id: string | null) {
    this._ownerId = id;
  }

  // ========== Initialization ==========

  /**
   * Initialize the corpse from a dead living.
   * Transfers inventory and sets up description.
   */
  async initFromDead(victim: Living): Promise<void> {
    // Set owner info
    this.ownerName = victim.name;
    this._ownerId = victim.objectId || null;

    // Check if player
    this._isPlayerCorpse = 'connection' in victim;

    // Transfer inventory
    const items = [...victim.inventory];
    for (const item of items) {
      await item.moveTo(this);
    }

    // For NPCs, check for gold property
    if (!this._isPlayerCorpse && 'gold' in victim) {
      const victimGold = (victim as Living & { gold?: number }).gold;
      if (typeof victimGold === 'number') {
        this._gold = victimGold;
      }
    }

    // Set up decay for NPC corpses
    if (!this._isPlayerCorpse) {
      this.setDecayTime(DEFAULT_DECAY_TIME);
    }
  }

  /**
   * Set the decay time for this corpse.
   * Only applies to NPC corpses.
   */
  setDecayTime(ms: number): void {
    // Cancel existing timer
    if (this._decayTimerId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(this._decayTimerId);
    }

    this._decayTime = Date.now() + ms;

    // Schedule decay
    if (typeof efuns !== 'undefined' && efuns.callOut) {
      this._decayTimerId = efuns.callOut(() => {
        this.decay();
      }, ms);
    }
  }

  /**
   * Cancel the decay timer.
   */
  cancelDecay(): void {
    if (this._decayTimerId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(this._decayTimerId);
      this._decayTimerId = 0;
    }
  }

  /**
   * Get remaining time until decay in milliseconds.
   */
  get decayRemaining(): number {
    if (this._decayTime === 0) return -1;
    return Math.max(0, this._decayTime - Date.now());
  }

  // ========== Actions ==========

  /**
   * Decay the corpse - drop items and destroy.
   */
  async decay(): Promise<void> {
    const room = this.environment;

    // Notify room
    if (room && 'broadcast' in room) {
      (room as MudObject & { broadcast: (msg: string) => void })
        .broadcast(`{dim}The corpse of ${this._ownerName} crumbles to dust.{/}\n`);
    }

    // Drop all items into the room
    if (room) {
      const items = [...this.inventory];
      for (const item of items) {
        await item.moveTo(room);
      }

      // Drop gold if any
      if (this._gold > 0) {
        // Create gold pile if gold item system exists
        // For now just notify about lost gold
        if ('broadcast' in room) {
          (room as MudObject & { broadcast: (msg: string) => void })
            .broadcast(`{yellow}${this._gold} gold coins scatter across the ground.{/}\n`);
        }
      }
    }

    // Destroy self
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      await efuns.destruct(this);
    }
  }

  /**
   * Loot gold from the corpse.
   * @param looter The one taking the gold
   * @returns Amount of gold taken
   */
  lootGold(looter: MudObject): number {
    const amount = this._gold;
    if (amount <= 0) return 0;

    this._gold = 0;

    // Add to looter's gold if they have a gold property
    if ('gold' in looter) {
      const currentGold = (looter as MudObject & { gold: number }).gold || 0;
      (looter as MudObject & { gold: number }).gold = currentGold + amount;
    }

    return amount;
  }

  /**
   * Called when trying to pick up the corpse.
   * Players can take their own corpse (for moving it).
   */
  get canTake(): boolean {
    return false; // Corpses generally can't be taken
  }

  // ========== Description ==========

  /**
   * Get description including contents and gold.
   */
  getFullDescription(): string {
    const lines: string[] = [this.longDesc];

    // Show gold
    if (this._gold > 0) {
      lines.push(`{yellow}You see ${this._gold} gold coins.{/}`);
    }

    // Show items
    if (this.inventory.length === 0) {
      lines.push('The corpse has nothing else on it.');
    } else {
      lines.push('The corpse has:');
      for (const item of this.inventory) {
        lines.push(`  ${item.shortDesc}`);
      }
    }

    // Show decay time for non-player corpses
    if (!this._isPlayerCorpse && this._decayTime > 0) {
      const remaining = this.decayRemaining;
      if (remaining > 0) {
        const minutes = Math.ceil(remaining / 60000);
        lines.push(`{dim}The corpse will decay in about ${minutes} minute${minutes !== 1 ? 's' : ''}.{/}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Configure the corpse.
   */
  setCorpse(options: {
    ownerName: string;
    isPlayerCorpse?: boolean;
    gold?: number;
    decayTime?: number;
  }): void {
    this.ownerName = options.ownerName;
    if (options.isPlayerCorpse !== undefined) {
      this._isPlayerCorpse = options.isPlayerCorpse;
    }
    if (options.gold !== undefined) {
      this._gold = options.gold;
    }
    if (options.decayTime !== undefined && !this._isPlayerCorpse) {
      this.setDecayTime(options.decayTime);
    }
  }

  /**
   * Cleanup when corpse is destroyed.
   */
  async cleanup(): Promise<void> {
    this.cancelDecay();
    await super.cleanup?.();
  }
}

export default Corpse;
