/**
 * Mage Guild Hall - Tower of arcane learning.
 */

import { Room } from '../../../lib/std.js';

export class MageGuildHall extends Room {
  constructor() {
    super();

    this.shortDesc = 'Mage Guild Tower';
    this.longDesc = `The interior of the Mage Guild tower thrums with arcane energy.
Crystalline orbs float near the ceiling, casting the room in shifting
colors of blue, purple, and silver. Towering bookshelves line the curved
walls, filled with ancient tomes bound in leather and metal.

Strange apparatus sits on tables - alchemical devices bubble with
glowing liquids, and arcane diagrams are etched into the stone floor.
The air crackles with barely contained magical energy, making your
skin tingle.

A spiral staircase leads to upper floors, but is blocked by a
shimmering barrier. The guild's banner, a silver star on deep blue,
hangs above an ornate lectern.`;

    this.addExit('out', '/areas/valdoria/aldric/center');
    this.addId('mage guild');
    this.addId('guild tower');

    // Set NPCs that belong to this room - they'll respawn on reset if missing
    this.setNpcs(['/areas/guilds/mage/guildmaster']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn NPCs defined via setNpcs()
    await this.spawnMissingNpcs();
  }
}

export default MageGuildHall;
