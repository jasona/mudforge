/**
 * Clearing - A central clearing in the forest.
 */

import { Room, MudObject } from '../../../lib/std.js';
import { ResourceNode } from '../../../std/profession/resource-node.js';

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

{green}Patches of silverleaf and peacebloom grow around the edges of the clearing.{/}

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
    await super.onCreate();

    // Chance for various animals (manual spawning with tracking)
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      if (Math.random() < 0.3) {
        const rabbit = await efuns.cloneObject('/areas/valdoria/forest/rabbit');
        if (rabbit) {
          this.registerSpawnedNpc(rabbit); // Track for respawn coordination
          await rabbit.moveTo(this);
        }
      }
      if (Math.random() < 0.4) {
        const deer = await efuns.cloneObject('/areas/valdoria/forest/deer');
        if (deer) {
          this.registerSpawnedNpc(deer); // Track for respawn coordination
          await deer.moveTo(this);
        }
      }
    }

    // Add herb patches for gathering
    const silverleaf = new ResourceNode();
    silverleaf.initFromDefinition('silverleaf_patch');
    await silverleaf.moveTo(this);

    const peacebloom = new ResourceNode();
    peacebloom.initFromDefinition('peacebloom_cluster');
    await peacebloom.moveTo(this);
  }
}

export default Clearing;
