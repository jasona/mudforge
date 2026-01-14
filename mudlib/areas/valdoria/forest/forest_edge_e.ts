/**
 * Forest Edge (East) - Eastern edge of the forest.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class ForestEdgeEast extends Room {
  constructor() {
    super();
    this.shortDesc = '{green}Forest Edge{/}';
    this.longDesc = `The forest grows denser to the {green}west{/}, while the trees thin out
toward the {green}east{/} where rocky outcroppings break through the soil.
Moss-covered boulders are scattered among the trees here.

A {cyan}small stream{/} trickles past, its water clear and cold. Animal
prints in the muddy banks suggest many creatures come here to drink.

The main path lies to the {green}west{/}, and a narrow trail winds
{green}south{/} between the rocks.`;

    this.setMapCoordinates({ x: 1, y: -1, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('.');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/valdoria/forest/forest_path');
    this.addExit('south', '/areas/valdoria/forest/old_trail');
  }

  override async onCreate(): Promise<void> {
    if (Math.random() < 0.5 && typeof efuns !== 'undefined' && efuns.cloneObject) {
      const deer = await efuns.cloneObject('/areas/valdoria/forest/deer');
      if (deer) await deer.moveTo(this);
    }
  }
}

export default ForestEdgeEast;
