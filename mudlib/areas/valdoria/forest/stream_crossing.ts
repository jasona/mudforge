/**
 * Stream Crossing - A ford across a forest stream.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { ResourceNode } from '../../../std/profession/resource-node.js';

export class StreamCrossing extends Room {
  constructor() {
    super();
    this.shortDesc = '{cyan}Stream Crossing{/}';
    this.longDesc = `A {cyan}crystal-clear stream{/} cuts through the forest here, its
waters bubbling cheerfully over smooth stones. The stream is
shallow enough to wade across, with stepping stones providing
a dry path for the careful.

{green}Willows{/} droop their branches into the water, and {yellow}dragonflies{/}
dart above the surface. The sound of flowing water creates a
peaceful atmosphere, masking other forest sounds.

The path continues to the {green}east{/} along the stream bank.
{dim}Fish dart beneath the surface, catching the light.{/}

{cyan}A calm pool near the bank looks perfect for fishing.{/}`;

    this.setMapCoordinates({ x: -2, y: 0, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('water_shallow');
    this.setMapIcon('~');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('east', '/areas/valdoria/forest/brambles');

    // Add a swimming-gated exit to deeper water
    this.addSkillGatedExit('swim', '/areas/valdoria/forest/deep_pool', {
      profession: 'swimming',
      level: 20,
      failMessage: 'The water gets too deep for your swimming ability.',
      cost: 10,
      failDamage: 5,
      description: 'Deeper waters lie downstream to the north.',
    });
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Peaceful area - deer come to drink
    if (Math.random() < 0.5 && typeof efuns !== 'undefined' && efuns.cloneObject) {
      const deer = await efuns.cloneObject('/areas/valdoria/forest/deer');
      if (deer) {
        this.registerSpawnedNpc(deer);
        await deer.moveTo(this);
      }
    }

    // Add fishing spot
    const fishingSpot = new ResourceNode();
    fishingSpot.initFromDefinition('river_fishing');
    await fishingSpot.moveTo(this);
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{cyan}The sound of running water fills your ears.{/}\n');
    }
  }
}

export default StreamCrossing;
