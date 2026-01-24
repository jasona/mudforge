/**
 * Deep Pool - A deep swimming area requiring swimming skill.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { ResourceNode } from '../../../std/profession/resource-node.js';

export class DeepPool extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{cyan}Deep Pool{/}';
    this.longDesc = `You tread water in a deep, clear pool fed by the forest stream.
The water here is crystal clear but easily {cyan}ten feet deep{/}, requiring
strong swimming to navigate. Sunlight filters through the canopy above,
creating dancing patterns on the sandy bottom.

{yellow}Large fish{/} swim lazily in the depths, occasionally surfacing to snatch
insects from the air. The pool is surrounded by {green}moss-covered rocks{/}
and trailing willows, creating a secluded paradise.

You can swim {green}south{/} back to shallower water.`;

    this.setMapCoordinates({ x: -2, y: -1, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('water_deep');
    this.setMapIcon('~');

    this.setupRoom();
  }

  private setupRoom(): void {
    // Regular exit back to stream crossing
    this.addExit('south', '/areas/valdoria/forest/stream_crossing');

    // Hidden deeper pool for expert swimmers
    this.addSkillGatedExit('dive', '/areas/valdoria/forest/underwater_cave', {
      profession: 'swimming',
      level: 50,
      failMessage: 'You try to dive deep but the pressure forces you back up.',
      cost: 20,
      failDamage: 10,
      description: 'A dark opening is visible far below.',
    });
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Add excellent fishing spot for higher level fishing
    const fishingSpot = new ResourceNode();
    fishingSpot.initFromDefinition('deep_pool_fishing');
    await fishingSpot.moveTo(this);
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{cyan}You swim into the deep pool, the cool water refreshing.{/}\n');
    }

    // Award swimming XP for entering
    try {
      const { getProfessionDaemon } = await import('../../../daemons/profession.js');
      const daemon = getProfessionDaemon();
      daemon.awardXP(obj as any, 'swimming', 5);
    } catch {
      // Profession daemon not available
    }
  }
}

export default DeepPool;
