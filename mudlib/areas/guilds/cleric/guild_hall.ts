/**
 * Cleric Guild Hall - Temple of healing light.
 */

import { Room } from '../../../lib/std.js';
import type { GuildMaster } from '../../../std/guild/guild-master.js';

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
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    const hasGuildmaster = this.inventory.some(obj => obj.id('guildmaster') || obj.id('seraphina'));
    if (hasGuildmaster) return;

    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      const gm = await efuns.cloneObject<GuildMaster>('/areas/guilds/cleric/guildmaster', 'ClericGuildmaster');
      if (gm) await gm.moveTo(this);
    }
  }
}

export default ClericGuildHall;
