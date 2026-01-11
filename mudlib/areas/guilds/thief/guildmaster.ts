/**
 * Thief Guildmaster - Shadow
 */

import { GuildMaster } from '../../../std/guild/guild-master.js';

export class ThiefGuildmaster extends GuildMaster {
  constructor() {
    super();

    this.setNPC({
      name: 'Shadow',
      shortDesc: 'Shadow, Thief Guildmaster',
      longDesc: `Shadow is... difficult to describe. Their features seem to shift in
the dim light, never quite settling into a definite appearance. One
moment they might appear as a young man, the next as an elderly woman.
Only their eyes remain constant - sharp, calculating, and utterly still.

They move with the fluid grace of smoke, and you have the unsettling
feeling that if you look away for even a moment, they might simply
cease to exist.`,
    });

    this.setGuild('thief');
    this.setGreeting('Interesting... You found this place. Perhaps you have potential after all.');

    this.addId('shadow');
    this.addId('guildmaster');
    this.addId('master thief');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    this.addChat('The first rule: never get caught. The second rule: there was never a first rule.', 'say');
    this.addChat('seems to flicker between shadows for a moment.', 'emote');
    this.addChat('A knife in the dark solves problems that armies cannot.', 'say');
  }
}

export default ThiefGuildmaster;
