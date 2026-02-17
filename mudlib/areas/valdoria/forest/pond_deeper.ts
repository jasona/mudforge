/**
 * Pond Deeper Water
 *
 * Area: Southern Forest (valdoria:forest)
 */

import { Room } from '../../../lib/std.js';
import { ResourceNode } from '../../../std/profession/resource-node.js';

export class PondDeeper extends Room {
  constructor() {
    super();
    this.shortDesc = 'Pond Deeper Water';
    this.longDesc = `The pond deepens here, and you must tread water between patches
of lilies and reed clusters. Gentle ripples spread across the surface
as you keep yourself afloat.

This quiet pocket of water is perfect for beginners building confidence
in swimming. The shallows lie back to the {green}east{/}.`;
    this.setMapCoordinates({ x: -2, y: 2, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('water_shallow');
    this.mapIcon = '~';
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addSkillGatedExit('east', '/areas/valdoria/forest/pond_shallows', {
      profession: 'swimming',
      level: 1,
      failMessage: 'You need swimming level 1 to return through the pond.',
    });
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    const fishingSpot = new ResourceNode();
    fishingSpot.initFromDefinition('pond_fishing');
    await fishingSpot.moveTo(this);
  }

}

export default PondDeeper;
