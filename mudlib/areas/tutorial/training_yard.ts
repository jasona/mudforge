/**
 * Training Yard
 *
 * Tutorial room where players fight the training dummy.
 * East exit to camp_exit is locked until step >= 6 (killed dummy).
 *
 * Exits: south → supply_tent, east → camp_exit (conditional)
 */

import { Room } from '../../lib/std.js';
import { STEPS, getTutorialDaemon } from '../../daemons/tutorial.js';

export class TrainingYard extends Room {
  constructor() {
    super();
    this.shortDesc = 'Training Yard';
    this.longDesc = `A packed-earth yard surrounded by a low wooden fence. Weapon racks
line the perimeter, and sand-filled dummies stand at intervals like
silent soldiers awaiting orders. The ground is scuffed and churned
from countless boots.

A battered {bold}training dummy{/} stands in the center of the yard,
its straw guts leaking from previous beatings. It almost looks like
it's daring you to take a swing.

The supply tent lies to the {green}south{/}. A gate to the {green}east{/}
leads out of the camp.`;
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('south', '/areas/tutorial/supply_tent');

    // East exit requires step >= CH1_KILLED_DUMMY
    this.addConditionalExit(
      'east',
      '/areas/tutorial/camp_exit',
      (who: MudObject) => {
        const player = who as MudObject & { getProperty?: (key: string) => unknown };
        if (typeof player.getProperty !== 'function') return false;
        const step = player.getProperty('tutorial_step');
        if (typeof step === 'number' && step >= STEPS.CH1_KILLED_DUMMY) {
          return true;
        }
        const receiver = who as MudObject & { receive?: (msg: string) => void };
        if (typeof receiver.receive === 'function') {
          receiver.receive(
            '{bold}General Ironheart{/} blocks the gate. "You\'re not leaving until you show me you can fight."\n'
          );
        }
        return false;
      }
    );

    // Spawn training dummy
    this.setNpcs(['/areas/tutorial/training_dummy']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
  }

  override async onReset(): Promise<void> {
    await super.onReset();
    await this.spawnMissingNpcs();
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const player = obj as MudObject & {
      isConnected?: () => boolean;
      getProperty?: (key: string) => unknown;
    };
    if (typeof player.isConnected !== 'function') return;
    if (player.getProperty?.('tutorial_complete')) return;

    try {
      getTutorialDaemon().notify(obj as never, 'entered_yard');
    } catch (e) {
      console.error('[TUTORIAL] training_yard onEnter error:', e);
    }
  }
}

export default TrainingYard;
