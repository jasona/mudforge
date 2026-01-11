/**
 * Mage Guildmaster - Elyndra the Starweaver
 */

import { GuildMaster } from '../../../std/guild/guild-master.js';

export class MageGuildmaster extends GuildMaster {
  constructor() {
    super();

    this.setNPC({
      name: 'Elyndra',
      shortDesc: 'Elyndra the Starweaver, Mage Guildmaster',
      longDesc: `Elyndra is an elegant elven woman whose eyes seem to hold the depth
of the night sky. Her silver hair flows past her shoulders, occasionally
sparkling with motes of magical light. She wears robes of deep blue
embroidered with silver constellations that seem to shift and move.

When she speaks, her voice carries the weight of centuries of arcane
knowledge, yet there's a patient kindness in her manner that puts
newcomers at ease.`,
    });

    this.setGuild('mage');
    this.setGreeting('Knowledge is the truest power, young seeker. What mysteries do you wish to unravel?');

    this.addId('elyndra');
    this.addId('starweaver');
    this.addId('guildmaster');
    this.addId('archmage');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    this.addChat('The arcane arts require patience. Rush, and you risk being consumed by the very forces you seek to command.', 'say');
    this.addChat('traces a glowing rune in the air that fades after a moment.', 'emote');
    this.addChat('Magic is not power over nature, but harmony with it.', 'say');
  }
}

export default MageGuildmaster;
