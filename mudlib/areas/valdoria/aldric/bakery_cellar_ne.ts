/**
 * Bakery Cellar Northeast
 *
 * Rat-infested cellar beneath Hilda's bakery.
 */

import { Room } from '../../../lib/std.js';

const CELLAR_RAT_PATH = '/areas/valdoria/aldric/cellar_rat';

export class BakeryCellarNortheast extends Room {
  constructor() {
    super();
    this.shortDesc = "Hilda's Bakery Cellar (Northeast)";
    this.longDesc = `The cellar opens into a low-ceilinged storage section where tilted barrels and
split crates form uneven lanes through the dust. Rat tracks stitch through spilled
grain and flour in tangled patterns.

The stone walls sweat with moisture. You can head {green}west{/} toward the ladder
or {green}south{/} deeper into the cellar.`;
    this.setTerrain('indoor');
    this.setMapCoordinates({ x: 5, y: 3, z: -1, area: '/areas/valdoria/aldric' });
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/valdoria/aldric/bakery_cellar');
    this.addExit('south', '/areas/valdoria/aldric/bakery_cellar_se');
    this.setNpcs([CELLAR_RAT_PATH]);
    this.setResetMessage('{dim}You hear frantic scratching as more rats emerge from the dark corners.{/}\n');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
  }
}

export default BakeryCellarNortheast;
