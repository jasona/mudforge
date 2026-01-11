/**
 * Cleric Guildmaster - High Priestess Seraphina
 */

import { GuildMaster } from '../../../std/guild/guild-master.js';

export class ClericGuildmaster extends GuildMaster {
  constructor() {
    super();

    this.setNPC({
      name: 'Seraphina',
      shortDesc: 'High Priestess Seraphina, Cleric Guildmaster',
      longDesc: `High Priestess Seraphina radiates an aura of peace and compassion.
Her silver hair is worn in elaborate braids interwoven with golden
thread, and her robes of white and gold seem to glow with inner light.
Her eyes are warm and kind, yet hold a fierce determination when she
speaks of protecting the innocent.

When she moves, it's with a grace that suggests she walks not just on
the physical plane, but somewhere between the mortal and divine.`,
    });

    this.setGuild('cleric');
    this.setGreeting('Blessings upon you, child. Do you seek the path of healing and light?');

    this.addId('seraphina');
    this.addId('high priestess');
    this.addId('guildmaster');
    this.addId('priestess');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    this.addChat('To heal is to serve. To serve is to find purpose.', 'say');
    this.addChat('closes her eyes in brief meditation, a soft glow emanating from her hands.', 'emote');
    this.addChat('The light does not judge. It simply reveals truth and offers mercy.', 'say');
  }
}

export default ClericGuildmaster;
