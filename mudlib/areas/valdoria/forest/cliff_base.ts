/**
 * Cliff Base - Base of a rocky cliff requiring climbing skill to ascend.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { ResourceNode } from '../../../std/profession/resource-node.js';

export class CliffBase extends Room {
  constructor() {
    super();
    this.shortDesc = '{dim}Cliff Base{/}';
    this.longDesc = `You stand at the base of a {yellow}rocky cliff{/} that rises steeply
above the forest floor. The cliff face is weathered and cracked, with
{green}vines{/} and {dim}lichens{/} clinging to its surface.

Patches of {cyan}ore{/} glint in the rock where the stone has fractured,
hinting at mineral deposits within. A narrow {dim}ledge{/} zigzags up the
cliff face, offering a possible route for skilled climbers.

The forest trail continues to the {green}west{/}.`;

    this.setMapCoordinates({ x: 3, y: 1, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('mountain');
    this.setMapIcon('^');

    this.setupRoom();
  }

  private setupRoom(): void {
    // Regular exit back to forest
    this.addExit('west', '/areas/valdoria/forest/old_trail');

    // Climbing exit to cliff ledge
    this.addSkillGatedExit('climb', '/areas/valdoria/forest/cliff_ledge', {
      profession: 'climbing',
      level: 30,
      failMessage: 'You attempt to climb but lose your grip and slide back down.',
      cost: 10,
      failDamage: 8,
      description: 'A narrow ledge is visible partway up the cliff.',
    });
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Add iron ore deposit at the cliff base
    const ironDeposit = new ResourceNode();
    ironDeposit.initFromDefinition('iron_deposit');
    await ironDeposit.moveTo(this);
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{dim}The cliff looms above you, its face spotted with handholds.{/}\n');
    }
  }
}

export default CliffBase;
