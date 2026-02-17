/**
 * Cellar Rat
 *
 * Quest target for Hilda's "The Rat Problem" quest.
 */

import { NPC } from '../../../lib/std.js';

export class CellarRat extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'cellar rat',
      shortDesc: 'a giant cellar rat',
      longDesc: `A mangy giant rat with patchy fur and yellowed teeth. Flour dust clings to
its whiskers and paws, and its beady eyes glitter with hungry malice.`,
      gender: 'neutral',
      naturalAttacks: ['bite'],
      respawnTime: 20,
    });

    this.addId('rat');
    this.addId('cellar rat');
    this.addId('giant rat');
    this.addId('giant_rat');

    this.setLevel(1, 'normal');
    this.maxHealth = 22;
    this.health = 22;
    this.chatChance = 12;
    this.addChat('squeaks and gnaws at spilled flour.', 'emote');
    this.addChat('skitters between the barrels.', 'emote');
  }
}

export default CellarRat;
