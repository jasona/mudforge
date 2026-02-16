/**
 * Bakery Cellar Southwest
 *
 * Rat-infested cellar beneath Hilda's bakery.
 */

import { Room } from '../../../lib/std.js';

const CELLAR_RAT_PATH = '/areas/valdoria/aldric/cellar_rat';

export class BakeryCellarSouthwest extends Room {
  constructor() {
    super();
    this.shortDesc = "Hilda's Bakery Cellar (Southwest)";
    this.longDesc = `This southwest corner of the cellar is cluttered with old baking tools,
splintered shelving, and worm-eaten sacks. A rusted hook dangles from a ceiling
beam above a stain-dark patch of stone.

The stale air stings your nose. Passages lead {green}north{/} and {green}east{/}.`;
    this.setTerrain('indoor');
    this.setMapCoordinates({ x: 4, y: 2, z: -1, area: '/areas/valdoria/aldric' });
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/aldric/bakery_cellar');
    this.addExit('east', '/areas/valdoria/aldric/bakery_cellar_se');
    this.setNpcs([CELLAR_RAT_PATH]);
    this.setResetMessage('{dim}You hear frantic scratching as more rats emerge from the dark corners.{/}\n');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
  }
}

export default BakeryCellarSouthwest;
