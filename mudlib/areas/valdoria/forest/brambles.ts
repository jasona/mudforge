/**
 * Brambles - A thorny section of forest.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class Brambles extends Room {
  constructor() {
    super();
    this.shortDesc = '{green}Thorny Brambles{/}';
    this.longDesc = `Thick {green}bramble bushes{/} choke the forest here, their thorny
branches forming an almost impenetrable wall of vegetation.
Narrow gaps between the bushes allow passage, but the thorns
snag at clothing and scratch exposed skin.

{dim}Dark berries{/} hang from the brambles - some look edible, others
suspicious. Small creatures rustle unseen within the thorny
depths, protected from larger predators.

The clearing lies to the {green}east{/}, while a gap in the brambles
leads {green}north{/}. A barely visible trail winds {green}south{/}.`;

    this.setMapCoordinates({ x: -1, y: 0, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('*');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/forest_edge_w');
    this.addExit('east', '/areas/valdoria/forest/clearing');
    this.addExit('south', '/areas/valdoria/forest/overgrown_path');
    this.addExit('west', '/areas/valdoria/forest/stream_crossing');
  }

  override async onCreate(): Promise<void> {
    if (Math.random() < 0.5 && typeof efuns !== 'undefined' && efuns.cloneObject) {
      const rabbit = await efuns.cloneObject('/areas/valdoria/forest/rabbit');
      if (rabbit) await rabbit.moveTo(this);
    }
  }
}

export default Brambles;
