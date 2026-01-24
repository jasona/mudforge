/**
 * Old Trail - An ancient hunter's trail.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class OldTrail extends Room {
  constructor() {
    super();
    this.shortDesc = '{green}Old Trail{/}';
    this.longDesc = `An old hunter's trail winds through the forest here, marked by
{yellow}faded blazes{/} carved into the tree trunks long ago. The path is
overgrown but still passable, suggesting it sees occasional use.

{dim}Weathered bones{/} are scattered near the base of a large oak -
the remains of some unfortunate creature. The forest seems quieter
here, as if even the birds avoid this place.

The trail leads {green}west{/} toward a clearing, {green}north{/} to the
forest edge, and {green}south{/} deeper into the shadowy woods.`;

    this.setMapCoordinates({ x: 1, y: 0, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('-');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/forest_edge_e');
    this.addExit('west', '/areas/valdoria/forest/clearing');
    this.addExit('south', '/areas/valdoria/forest/fern_glade');
    this.addExit('east', '/areas/valdoria/forest/hunters_camp');

    // Path to cliff area
    this.addExit('northeast', '/areas/valdoria/forest/cliff_base');
  }

  override async onCreate(): Promise<void> {
    // Wolves sometimes patrol here
    if (Math.random() < 0.4 && typeof efuns !== 'undefined' && efuns.cloneObject) {
      const wolf = await efuns.cloneObject('/areas/valdoria/forest/wolf');
      if (wolf) await wolf.moveTo(this);
    }
  }
}

export default OldTrail;
