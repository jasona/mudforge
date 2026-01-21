/**
 * Healing Potion - A minor restorative elixir.
 *
 * A small vial of red liquid that restores health when consumed.
 */

import { Item } from '../../lib/std.js';
import type { MudObject, Living } from '../../lib/std.js';

export class HealingPotion extends Item {
  private _healAmount: number = 15;

  constructor() {
    super();

    this.setIds(['potion', 'healing potion', 'health potion', 'vial', 'elixir']);

    this.setItem({
      shortDesc: 'a healing potion',
      longDesc:
        'A small glass vial contains a swirling red liquid that seems to glow ' +
        'faintly from within. The cork is sealed with wax stamped with an ' +
        'alchemist\'s mark. Drinking this should restore some health.',
      size: 'small', // A small vial (weight 0.5)
      value: 25,
    });

    // Add the "drink" action
    this.addAction('drink', async (args: string) => {
      return this.drink();
    });

    this.addAction('quaff', async (args: string) => {
      return this.drink();
    });
  }

  /**
   * Drink the potion to restore health.
   */
  async drink(): Promise<boolean> {
    const user = this.environment;

    // Must be in someone's inventory
    if (!user || !('health' in user)) {
      return false;
    }

    const living = user as Living;

    // Check if already at full health
    if (living.health >= living.maxHealth) {
      living.receive("You're already at full health!\n");
      return true;
    }

    // Calculate actual healing (don't overheal)
    const actualHeal = Math.min(this._healAmount, living.maxHealth - living.health);

    // Apply healing
    living.heal(actualHeal);

    // Messages
    living.receive(`{green}You drink the healing potion and feel revitalized! (+${actualHeal} HP){/}\n`);

    // Notify room
    const room = living.environment;
    if (room && 'broadcast' in room) {
      const name = living.name || 'Someone';
      (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
        .broadcast(`{green}${name} drinks a healing potion.{/}\n`, { exclude: [living] });
    }

    // Destroy the potion (consumed)
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      await efuns.destruct(this);
    }

    return true;
  }
}

export default HealingPotion;
