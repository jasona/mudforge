/**
 * Deep Thicket - Dense vegetation in the deep forest.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class DeepThicket extends Room {
  constructor() {
    super();
    this.shortDesc = '{dim}{green}Deep Thicket{/}';
    this.longDesc = `The forest becomes nearly impassable here, choked with {green}dense
undergrowth{/} and tangled {dim}dead branches{/}. Visibility is limited
to just a few feet in any direction, and the canopy above blocks
almost all light.

{dim}Strange sounds{/} echo through the thicket - rustling, snapping twigs,
and occasionally a low growl. The air smells strongly of musk and
decay. Animal bones litter the ground.

Narrow passages lead {green}north{/} and {green}east{/}. Going deeper
would be unwise without good reason.`;

    this.setMapCoordinates({ x: -1, y: 2, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('%');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/overgrown_path');
    this.addExit('east', '/areas/valdoria/forest/ancient_oak');
  }

  override async onCreate(): Promise<void> {
    // Boars and wolves here
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      if (Math.random() < 0.5) {
        const boar = await efuns.cloneObject('/areas/valdoria/forest/boar');
        if (boar) await boar.moveTo(this);
      }
      if (Math.random() < 0.4) {
        const wolf = await efuns.cloneObject('/areas/valdoria/forest/wolf');
        if (wolf) await wolf.moveTo(this);
      }
    }
  }
}

export default DeepThicket;
