/**
 * Supply Tent
 *
 * Tutorial room where players pick up their starter gear.
 * Items are spawned on room creation. North exit to training yard
 * is locked until step >= 4 (wielded weapon).
 *
 * Exits: west → war_camp, north → training_yard (conditional)
 */

import { Room } from '../../lib/std.js';
import { STEPS, getTutorialDaemon } from '../../daemons/tutorial.js';

export class SupplyTent extends Room {
  constructor() {
    super();
    this.shortDesc = 'Supply Tent';
    this.longDesc = `You duck inside a large canvas tent reinforced with wooden poles. Racks
of weapons line one wall — mostly spears and swords in varying states
of repair. Opposite them, crates overflow with chainmail shirts, helms,
and leather gear. Everything smells of oil and iron.

A hand-painted sign reads: {yellow}"TAKE WHAT YOU NEED. RETURN WHAT YOU
DON'T. — Quartermaster Briggs"{/}

A sword, chainmail, and helm have been set aside on a table, apparently
meant for the next recruit.

The camp lies to the {green}west{/}. A flap in the north wall leads to the
training yard — but you should gear up first.`;
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/tutorial/war_camp');

    // North exit requires step >= CH1_WIELDED
    this.addConditionalExit(
      'north',
      '/areas/tutorial/training_yard',
      (who: MudObject) => {
        const player = who as MudObject & { getProperty?: (key: string) => unknown };
        if (typeof player.getProperty !== 'function') return false;
        const step = player.getProperty('tutorial_step');
        if (typeof step === 'number' && step >= STEPS.CH1_WIELDED) {
          return true;
        }
        const receiver = who as MudObject & { receive?: (msg: string) => void };
        if (typeof receiver.receive === 'function') {
          receiver.receive(
            '{bold}General Ironheart{/} blocks your path. "Not so fast, recruit. Gear up first."\n'
          );
        }
        return false;
      }
    );

    // Spawn tutorial items in this room
    this.setItems([
      '/areas/tutorial/items/recruits_sword',
      '/areas/tutorial/items/recruits_chainmail',
      '/areas/tutorial/items/recruits_helm',
    ]);

    // General Ironheart continues guiding recruits here.
    this.setNpcs(['/areas/tutorial/general_ironheart']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
    await this.spawnMissingItems();
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const player = obj as MudObject & {
      isConnected?: () => boolean;
      getProperty?: (key: string) => unknown;
    };
    if (typeof player.isConnected !== 'function') return;
    if (player.getProperty?.('tutorial_complete')) return;

    try {
      getTutorialDaemon().notify(obj as never, 'entered_tent');
    } catch (e) {
      console.error('[TUTORIAL] supply_tent onEnter error:', e);
    }
  }

  override async onLeave(obj: MudObject, to?: MudObject): Promise<void> {
    // When player picks up items and leaves, ensure items respawn for next player
    // Room reset handles this via spawnMissingItems
  }

  /**
   * Called periodically to respawn missing items for the next recruit.
   */
  override async onReset(): Promise<void> {
    await super.onReset();
    await this.spawnMissingNpcs();
    await this.spawnMissingItems();
  }
}

export default SupplyTent;
