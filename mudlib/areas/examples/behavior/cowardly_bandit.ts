/**
 * Cowardly Bandit - Example NPC with wimpy behavior
 *
 * This NPC demonstrates the wimpy behavior mode.
 * It will:
 * - Fight normally at first
 * - Flee when health drops below 20%
 * - Uses generic behavior (no guild)
 */

import { NPC } from '../../../std/npc.js';

export class CowardlyBandit extends NPC {
  constructor() {
    super();

    this.setNPC({
      name: 'cowardly bandit',
      shortDesc: 'a nervous-looking bandit',
      longDesc: 'This bandit looks like they\'d rather be anywhere else. They clutch a rusty dagger with trembling hands and glance nervously at the exits.',
      gender: 'male',
      level: 5,
    });

    // Configure wimpy behavior - will flee at 20% HP
    this.setBehavior({
      mode: 'wimpy',
      role: 'generic',
      wimpyThreshold: 25, // Extra cowardly - flee at 25%
    });

    // Equip with a rusty dagger (using iron_dagger as closest match)
    this.setSpawnItems([
      '/areas/valdoria/aldric/items/iron_dagger',
    ]);

    // Enable wandering for retreating
    this.enableWandering();

    // Add some flavor
    this.addChat('glances nervously at the exits.', 'emote', 40);
    this.addChat('This wasn\'t worth the risk...', 'say', 20);
    this.addChat('fingers their rusty dagger.', 'emote', 30);

    // Respond to interactions
    this.addResponse('hello', 'W-what do you want?', 'say');
    this.addResponse('attack', 'Wait! We can talk about this!', 'say');
    this.addResponse('money', 'I-I don\'t have much, honest!', 'say');
  }
}

export default CowardlyBandit;
