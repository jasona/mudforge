/**
 * Thief Guild Hall - Hidden den of shadows.
 */

import { Room } from '../../../lib/std.js';
import type { GuildMaster } from '../../../std/guild/guild-master.js';

export class ThiefGuildHall extends Room {
  constructor() {
    super();

    this.shortDesc = 'Thief Guild Den';
    this.longDesc = `The Thief Guild hideout is a dimly lit underground chamber that
seems to swallow sound. Shadows pool in every corner, and the few
candles that burn cast more darkness than light. The walls are hung
with dark cloth to muffle sound and hide the stone behind them.

Various tools of the trade are displayed in locked cases - lockpicks,
climbing gear, disguise kits, and other implements best not examined
too closely. A map of the city's rooftops and sewers covers one wall,
marked with symbols only guild members understand.

The guild's symbol, a dagger emerging from shadow, is subtly carved
into the floor near the entrance.`;

    this.addExit('out', '/areas/valdoria/aldric/center');
    this.addId('thief guild');
    this.addId('guild den');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    const hasGuildmaster = this.inventory.some(obj => obj.id('guildmaster') || obj.id('shadow'));
    if (hasGuildmaster) return;

    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      const gm = await efuns.cloneObject<GuildMaster>('/areas/guilds/thief/guildmaster', 'ThiefGuildmaster');
      if (gm) await gm.moveTo(this);
    }
  }
}

export default ThiefGuildHall;
