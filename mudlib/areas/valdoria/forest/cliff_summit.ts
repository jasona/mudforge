/**
 * Cliff Summit
 *
 * Area: Southern Forest (valdoria:forest)
 */

import { Room } from '../../../lib/std.js';
import { ResourceNode } from '../../../std/profession/resource-node.js';

export class CliffSummit extends Room {
  constructor() {
    super();
    this.shortDesc = 'Cliff Summit';
    this.longDesc = `You stand at a wind-scoured summit where the cliff finally levels
out into a narrow shelf of broken stone. The forest canopy spreads far
below, and the air is cool and thin at this height.

Veins of {yellow}gold-flecked stone{/} run through the exposed rock here,
promising rich ore for miners willing to make the climb.

The only safe path is back {green}south{/} along the ledge.`;
    this.setMapCoordinates({ x: 5, y: 2, z: 2, area: '/areas/valdoria/forest' });
    this.setTerrain('mountain');
    this.mapIcon = '^';
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addSkillGatedExit('south', '/areas/valdoria/forest/cliff_ledge', {
      profession: 'climbing',
      level: 1,
      failMessage: 'The edge is too dangerous. You need climbing level 1.',
    });
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    const goldVein = new ResourceNode();
    goldVein.initFromDefinition('gold_vein');
    await goldVein.moveTo(this);
  }
}

export default CliffSummit;
