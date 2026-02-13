/**
 * Fighter Guild Hall - Training grounds for warriors.
 */

import { Room } from '../../../lib/std.js';

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

    this.addExit('east', '/areas/valdoria/aldric/room_5_3_0');
    this.addId('fighter guild');
    this.addId('guild hall');

    // Set NPCs that belong to this room - they'll respawn on reset if missing
    this.setNpcs(['/areas/guilds/fighter/guildmaster']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn NPCs defined via setNpcs()
    await this.spawnMissingNpcs();
  }
}

export default FighterGuildHall;
