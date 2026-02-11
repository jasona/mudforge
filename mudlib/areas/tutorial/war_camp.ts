/**
 * War Camp
 *
 * Starting room for the newbie tutorial. New players spawn here and meet
 * General Ironheart, who introduces the tutorial scenario.
 *
 * Exits: east → supply_tent
 */

import { Room } from '../../lib/std.js';
import { getTutorialDaemon } from '../../daemons/tutorial.js';

export class WarCamp extends Room {
  constructor() {
    super();
    this.shortDesc = 'Military Camp';
    this.longDesc = `You stand in a muddy clearing surrounded by canvas tents and wooden
barricades. The air is thick with smoke from a dozen campfires, and
the clang of distant hammers echoes from a makeshift forge. Soldiers
hurry past carrying bundles of weapons and supplies — the entire camp
buzzes with the grim energy of a kingdom preparing for war.

A tattered banner bearing King Aldric's crest — a silver crown over
crossed swords — snaps in the wind above the command tent.

{bold}General Ironheart{/} stands at attention nearby, watching new arrivals
with a critical eye.

The supply tent lies to the {green}east{/}.`;
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('east', '/areas/tutorial/supply_tent');
    this.setNpcs(['/areas/tutorial/general_ironheart']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    // On re-entry (disconnect/reconnect), replay current step dialogue
    const player = obj as MudObject & {
      isConnected?: () => boolean;
      getProperty?: (key: string) => unknown;
    };
    if (typeof player.isConnected !== 'function') return;
    if (player.getProperty?.('tutorial_complete')) return;

    const step = player.getProperty?.('tutorial_step');
    if (typeof step === 'number' && step >= 0) {
      try {
        getTutorialDaemon().notify(obj as never, 'arrived_at_camp');
      } catch (e) {
        console.error('[TUTORIAL] war_camp onEnter error:', e);
      }
    }
  }
}

export default WarCamp;
