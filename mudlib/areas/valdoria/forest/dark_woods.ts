/**
 * Dark Woods - The heart of the forest, where light barely penetrates.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class DarkWoods extends Room {
  constructor() {
    super();
    this.shortDesc = '{dim}{green}Dark Woods{/}';
    this.longDesc = `The forest grows dense and dark here. {green}Ancient trees{/} tower
overhead, their thick canopy blocking most of the sunlight.
The air is cool and still, heavy with the scent of decay and
old growth.

{dim}Shadows pool between the massive trunks{/}, and strange sounds
echo through the gloom - the snap of a twig, a distant howl,
the rustle of unseen movement. Your instincts warn of danger.

{red}Wolf tracks{/} are pressed into the soft earth, leading {green}south{/}.
Paths also lead {green}north{/} to the clearing and {green}east{/}/{green}west{/}
through the undergrowth.`;

    this.setMapCoordinates({ x: 0, y: 1, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('#');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/clearing');
    this.addExit('south', '/areas/valdoria/forest/ancient_oak');
    this.addExit('west', '/areas/valdoria/forest/overgrown_path');
    this.addExit('east', '/areas/valdoria/forest/fern_glade');
  }

  override async onCreate(): Promise<void> {
    // Wolves frequent this area
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      if (Math.random() < 0.6) {
        const wolf = await efuns.cloneObject('/areas/valdoria/forest/wolf');
        if (wolf) await wolf.moveTo(this);
      }
      if (Math.random() < 0.3) {
        const boar = await efuns.cloneObject('/areas/valdoria/forest/boar');
        if (boar) await boar.moveTo(this);
      }
    }
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{dim}A chill runs down your spine as darkness closes in around you.{/}\n');
    }
  }
}

export default DarkWoods;
