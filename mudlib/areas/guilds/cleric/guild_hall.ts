/**
 * Cleric Guild Hall - Temple of healing light.
 */

import { Room } from '../../../lib/std.js';

export class ClericGuildHall extends Room {
  constructor() {
    super();

    this.shortDesc = 'Cleric Guild Temple';
    this.longDesc = `The Cleric Guild temple is a place of profound serenity. Soft golden
light filters through stained glass windows depicting scenes of healing
and divine intervention. The air carries the faint scent of incense and
sacred herbs.

Rows of polished wooden pews face an ornate altar where an eternal
flame burns with warm, golden light. Alcoves along the walls contain
shrines to various benevolent deities, each decorated with offerings
from the faithful.

The guild's symbol, a radiant sun with healing hands reaching down,
is inlaid in the marble floor before the altar.`;

    this.addExit('out', '/areas/valdoria/aldric/center');
    this.addId('cleric guild');
    this.addId('temple');

    // Set NPCs that belong to this room - they'll respawn on reset if missing
    this.setNpcs(['/areas/guilds/cleric/guildmaster']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn NPCs defined via setNpcs()
    await this.spawnMissingNpcs();
  }
}

export default ClericGuildHall;
