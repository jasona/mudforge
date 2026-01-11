/**
 * Fighter Guildmaster - Garrok the Ironheart
 */

import { GuildMaster } from '../../../std/guild/guild-master.js';

export class FighterGuildmaster extends GuildMaster {
  constructor() {
    super();

    this.setNPC({
      name: 'Garrok',
      shortDesc: 'Garrok the Ironheart, Fighter Guildmaster',
      longDesc: `Garrok is a mountain of a man, his body a testament to decades of
combat training. Scars crisscross his arms and face like a map of battles won.
His iron-gray hair is cropped short, and his eyes hold the steady gaze of
a warrior who has stared death in the face countless times.

Despite his intimidating appearance, there's a warmth in his manner when
speaking to those who seek to learn the ways of combat.`,
    });

    this.setGuild('fighter');
    this.setGreeting('Strength through steel, adventurer. Are you ready to forge yourself into a weapon?');

    this.addId('garrok');
    this.addId('ironheart');
    this.addId('guildmaster');
    this.addId('trainer');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    this.addChat('The sword is an extension of your will. Master your will, master the sword.', 'say');
    this.addChat('flexes his scarred arms thoughtfully.', 'emote');
    this.addChat('In battle, hesitation is death. Strike first, strike hard.', 'say');
  }
}

export default FighterGuildmaster;
