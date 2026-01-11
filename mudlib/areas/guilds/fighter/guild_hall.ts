/**
 * Fighter Guild Hall - Training grounds for warriors.
 */

import { Room } from '../../../lib/std.js';
import type { GuildMaster } from '../../../std/guild/guild-master.js';

export class FighterGuildHall extends Room {
  constructor() {
    super();

    this.shortDesc = 'Fighter Guild Hall';
    this.longDesc = `The Fighter Guild hall is a grand arena of combat training. Heavy
weapons hang from racks along the stone walls - massive axes, greatswords,
and war hammers polished to a deadly gleam. The floor is worn smooth by
countless sparring matches, and the air smells of oil, leather, and sweat.

Practice dummies stand battered in one corner, their stuffing spilling from
countless strikes. A central sparring ring is marked with faded chalk lines,
where guild members test their mettle against each other.

The guild's banner, a crimson field with a crossed sword and axe, hangs
proudly above the guildmaster's elevated platform.`;

    this.addExit('out', '/areas/valdoria/aldric/center');
    this.addId('fighter guild');
    this.addId('guild hall');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    const hasGuildmaster = this.inventory.some(obj => obj.id('guildmaster') || obj.id('garrok'));
    if (hasGuildmaster) return;

    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      const gm = await efuns.cloneObject<GuildMaster>('/areas/guilds/fighter/guildmaster', 'FighterGuildmaster');
      if (gm) await gm.moveTo(this);
    }
  }
}

export default FighterGuildHall;
