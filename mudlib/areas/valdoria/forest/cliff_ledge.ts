/**
 * Cliff Ledge - A ledge partway up the cliff with a view and mining resources.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { ResourceNode } from '../../../std/profession/resource-node.js';

export class CliffLedge extends Room {
  constructor() {
    super();
    this.shortDesc = '{yellow}Cliff Ledge{/}';
    this.longDesc = `You stand on a narrow ledge carved into the cliff face, perhaps
{yellow}fifty feet{/} above the forest floor. The view is spectacular -
the {green}forest canopy{/} stretches out below like a sea of green,
and you can see the {cyan}glint of water{/} from the distant stream.

The rock here is rich with {blue}silver ore{/}, exposed by centuries
of weathering. Mining here would be challenging but rewarding.

The ledge continues upward to the {green}north{/} for skilled climbers.
You can carefully descend {green}down{/} to the cliff base.`;

    this.setMapCoordinates({ x: 3, y: 1, z: 1, area: '/areas/valdoria/forest' });
    this.setTerrain('mountain');
    this.setMapIcon('^');

    this.setupRoom();
  }

  private setupRoom(): void {
    // Climbing down is easier than up, but still requires some skill
    this.addSkillGatedExit('down', '/areas/valdoria/forest/cliff_base', {
      profession: 'climbing',
      level: 10,
      failMessage: 'You slip while climbing down!',
      cost: 5,
      failDamage: 15,
      description: 'The forest floor lies far below.',
    });

    // Higher climb to cliff peak
    this.addSkillGatedExit('climb', '/areas/valdoria/forest/cliff_peak', {
      profession: 'climbing',
      level: 50,
      failMessage: 'The sheer rock face defeats your climbing attempt.',
      cost: 15,
      failDamage: 20,
      description: 'The cliff continues upward to a distant peak.',
    });
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Add silver vein for mining
    const silverVein = new ResourceNode();
    silverVein.initFromDefinition('silver_vein');
    await silverVein.moveTo(this);
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{yellow}You pull yourself onto the ledge, breathing heavily from the climb.{/}\n');
    }

    // Award climbing XP for arriving
    try {
      const { getProfessionDaemon } = await import('../../../daemons/profession.js');
      const daemon = getProfessionDaemon();
      daemon.awardXP(obj as any, 'climbing', 10);
    } catch {
      // Profession daemon not available
    }
  }
}

export default CliffLedge;
