/**
 * Clearing - A central clearing in the forest.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class Clearing extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{green}Forest Clearing{/}';
    this.longDesc = `You stand in a peaceful clearing where sunlight streams down
unimpeded by the forest canopy. Tall grass and {yellow}wildflowers{/} sway
gently in the breeze, and butterflies dance from bloom to bloom.

A large {dim}flat rock{/} in the center makes a natural resting spot.
The grass around it is trampled, suggesting animals frequently
gather here. {red}Claw marks{/} on nearby trees hint at larger predators.

Paths lead in all directions: {green}south{/} into darker woods,
{green}north{/} toward the forest entrance, and {green}east{/}/{green}west{/}
along game trails.`;

    this.setMapCoordinates({ x: 0, y: 0, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('O');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/forest_path');
    this.addExit('south', '/areas/valdoria/forest/dark_woods');
    this.addExit('west', '/areas/valdoria/forest/brambles');
    this.addExit('east', '/areas/valdoria/forest/old_trail');
  }

  override async onCreate(): Promise<void> {
    // Chance for various animals
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      if (Math.random() < 0.3) {
        const rabbit = await efuns.cloneObject('/areas/valdoria/forest/rabbit');
        if (rabbit) await rabbit.moveTo(this);
      }
      if (Math.random() < 0.4) {
        const deer = await efuns.cloneObject('/areas/valdoria/forest/deer');
        if (deer) await deer.moveTo(this);
      }
    }
  }
}

export default Clearing;
