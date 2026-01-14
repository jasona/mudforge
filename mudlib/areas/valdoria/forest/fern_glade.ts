/**
 * Fern Glade - A beautiful but dangerous area.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class FernGlade extends Room {
  constructor() {
    super();
    this.shortDesc = '{green}Fern Glade{/}';
    this.longDesc = `A carpet of {green}lush ferns{/} covers the forest floor here,
their fronds waving gently in the slight breeze. Shafts of light
pierce the canopy, illuminating motes of dust and pollen that
dance in the air.

Despite the peaceful appearance, {red}wolf tracks{/} crisscross the
soft earth, and tufts of {dim}grey fur{/} cling to nearby branches.
This beauty conceals danger.

Paths lead {green}west{/} into darkness, {green}north{/} along an old
trail, and {green}south{/} toward mossy ground.`;

    this.setMapCoordinates({ x: 1, y: 1, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('f');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/old_trail');
    this.addExit('west', '/areas/valdoria/forest/dark_woods');
    this.addExit('south', '/areas/valdoria/forest/mossy_hollow');
  }

  override async onCreate(): Promise<void> {
    // Good chance for wolves here
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      if (Math.random() < 0.5) {
        const wolf = await efuns.cloneObject('/areas/valdoria/forest/wolf');
        if (wolf) await wolf.moveTo(this);
      }
    }
  }
}

export default FernGlade;
