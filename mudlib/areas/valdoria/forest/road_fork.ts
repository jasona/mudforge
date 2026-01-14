/**
 * Road Fork - Where the road splits toward the forest.
 *
 * Entry point to the forest from the town.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class RoadFork extends Room {
  constructor() {
    super();
    this.shortDesc = '{green}Road Fork{/}';
    this.longDesc = `The dusty road from town splits here at a weathered wooden signpost.
One path continues {green}north{/} toward the town gates, while another winds
{green}south{/} into the shadowy depths of the {green}Eastern Forest{/}.

The trees begin just ahead, their branches forming a natural archway
over the forest path. Birdsong echoes from within, mixed with the
rustling of leaves in the breeze. A {yellow}warning sign{/} has been nailed
to a tree: "Beware: Wolves in Forest - Travel with Caution."

{dim}Wildflowers grow along the roadside, and you can see rabbit tracks
in the soft earth leading into the woods.{/}`;

    this.setMapCoordinates({ x: 0, y: -2, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('road');
    this.setMapIcon('+');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/aldric/gates');
    this.addExit('south', '/areas/valdoria/forest/forest_path');
  }

  override async onCreate(): Promise<void> {
    // Spawn a rabbit occasionally
    if (Math.random() < 0.5 && typeof efuns !== 'undefined' && efuns.cloneObject) {
      const rabbit = await efuns.cloneObject('/areas/valdoria/forest/rabbit');
      if (rabbit) await rabbit.moveTo(this);
    }
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      if (from?.objectPath?.includes('gates')) {
        receiver.receive('\n{dim}The sounds of the forest grow louder as you approach.{/}\n');
      }
    }
  }
}

export default RoadFork;
