/**
 * Overgrown Path - A nearly forgotten trail.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class OvergrownPath extends Room {
  constructor() {
    super();
    this.shortDesc = '{green}Overgrown Path{/}';
    this.longDesc = `What was once a path is now almost completely reclaimed by nature.
{green}Vines{/} hang across the trail, {yellow}ferns{/} sprout from the ground,
and {dim}fallen logs{/} block easy passage. Pushing through requires effort.

The air is thick and humid here, filled with the buzz of insects
and the chirp of hidden birds. Patches of {yellow}mushrooms{/} grow in
clusters on rotting wood.

The way leads {green}north{/} to the brambles, {green}east{/} to darker
woods, and {green}south{/} toward what looks like a thicket.`;

    this.setMapCoordinates({ x: -1, y: 1, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('~');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/brambles');
    this.addExit('east', '/areas/valdoria/forest/dark_woods');
    this.addExit('south', '/areas/valdoria/forest/deep_thicket');
  }

  override async onCreate(): Promise<void> {
    if (Math.random() < 0.4 && typeof efuns !== 'undefined' && efuns.cloneObject) {
      const boar = await efuns.cloneObject('/areas/valdoria/forest/boar');
      if (boar) await boar.moveTo(this);
    }
  }
}

export default OvergrownPath;
