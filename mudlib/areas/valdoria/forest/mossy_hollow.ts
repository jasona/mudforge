/**
 * Mossy Hollow - A damp depression in the forest.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class MossyHollow extends Room {
  constructor() {
    super();
    this.shortDesc = '{green}Mossy Hollow{/}';
    this.longDesc = `The ground dips into a natural hollow here, its slopes covered
with thick {green}emerald moss{/}. A {cyan}small pool{/} of clear water
has collected at the bottom, fed by a tiny spring.

The moss muffles all sound, creating an eerie silence broken only
by the gentle drip of water. {yellow}Mushrooms{/} in strange shapes ring
the pool, and {dim}animal prints{/} show many creatures come here to drink.

{red}Wolf tracks{/} are fresh in the mud. Paths climb out of the hollow
to the {green}north{/} and {green}west{/}.`;

    this.setMapCoordinates({ x: 1, y: 2, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('o');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/fern_glade');
    this.addExit('west', '/areas/valdoria/forest/ancient_oak');
  }

  override async onCreate(): Promise<void> {
    // Various animals drink here
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      if (Math.random() < 0.4) {
        const deer = await efuns.cloneObject('/areas/valdoria/forest/deer');
        if (deer) await deer.moveTo(this);
      }
      if (Math.random() < 0.5) {
        const wolf = await efuns.cloneObject('/areas/valdoria/forest/wolf');
        if (wolf) await wolf.moveTo(this);
      }
    }
  }
}

export default MossyHollow;
