/**
 * Thief Guild Hall - Hidden den of shadows.
 */

import { Room } from '../../../lib/std.js';

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

    // Set NPCs that belong to this room - they'll respawn on reset if missing
    this.setNpcs(['/areas/guilds/thief/guildmaster']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn NPCs defined via setNpcs()
    await this.spawnMissingNpcs();
  }
}

export default ThiefGuildHall;
