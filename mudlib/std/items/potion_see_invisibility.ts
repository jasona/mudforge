/**
 * Potion of See Invisibility
 *
 * A consumable potion that grants the See Invisibility buff for 5 minutes.
 * When consumed, the player can see invisible creatures.
 */

import { Item } from '../item.js';
import { Effects } from '../combat/effects.js';
import type { Living } from '../living.js';
import type { MudObject } from '../object.js';

/**
 * Potion of See Invisibility - grants the ability to see invisible creatures.
 */
export class PotionSeeInvisibility extends Item {
  constructor() {
    super();
    this.setItem({
      shortDesc: 'a shimmering potion',
      longDesc: `A small glass vial filled with an iridescent liquid that shifts
between blue and violet. When held up to light, faint shapes seem to
swim within the fluid. The cork is sealed with silver wax.`,
      size: 'tiny',
      value: 150,
    });

    // Add identifiers for finding the potion
    this.addId('potion');
    this.addId('vial');
    this.addId('see invisibility potion');
    this.addId('shimmering potion');
    this.addId('see invisible potion');

    // Add drink action
    this.addAction('drink', (args?: string) => this.handleDrink());
    this.addAction('quaff', (args?: string) => this.handleDrink());
  }

  /**
   * Handle the drink/quaff action.
   */
  private async handleDrink(): Promise<boolean> {
    // Find who is carrying this potion
    const holder = this.environment;
    if (!holder) {
      return false;
    }

    // Check if the holder is a Living (can have effects)
    const living = holder as Living & { addEffect?: (effect: unknown) => void; receive?: (msg: string) => void };
    if (typeof living.addEffect !== 'function') {
      return false;
    }

    // Apply the See Invisible effect (5 minutes = 300000ms)
    const effect = Effects.seeInvisible(300000);
    living.addEffect(effect);

    // Notify the drinker
    if (typeof living.receive === 'function') {
      living.receive('{cyan}Your vision sharpens and the world seems clearer. Hidden things reveal themselves.{/}\n');
    }

    // Announce to the room
    const room = living.environment;
    if (room && 'broadcast' in room) {
      const roomObj = room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void };
      const drinkerName = living.name ?? 'Someone';
      roomObj.broadcast(
        `{dim}${drinkerName} drinks a shimmering potion.{/}\n`,
        { exclude: [living as MudObject] }
      );
    }

    // Destroy the potion after drinking
    this.destruct();

    return true;
  }

  /**
   * Override onExamine to provide additional details.
   */
  override onExamine(_examiner: MudObject): string {
    return `${this.longDesc}

{dim}This potion grants the ability to see invisible creatures when consumed.
The effect lasts for approximately five minutes.{/}`;
  }
}

export default PotionSeeInvisibility;
