/**
 * Bakery Cellar Southeast
 *
 * Rat-infested cellar beneath Hilda's bakery.
 */

import { Room } from '../../../lib/std.js';

const CELLAR_RAT_PATH = '/areas/valdoria/aldric/cellar_rat';

export class BakeryCellarSoutheast extends Room {
  constructor() {
    super();
    this.shortDesc = "Hilda's Bakery Cellar (Southeast)";
    this.longDesc = `The southeast section is the darkest part of the cellar, packed with warped
barrels and collapsed crates. The floor is rough with old gnaw marks and flour
that has turned to damp paste along the stones.

Shadows twitch in the corners. Exits run {green}north{/} and {green}west{/}.`;
    this.setTerrain('indoor');
    this.setMapCoordinates({ x: 5, y: 2, z: -1, area: '/areas/valdoria/aldric' });
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/aldric/bakery_cellar_ne');
    this.addExit('west', '/areas/valdoria/aldric/bakery_cellar_sw');
    this.setNpcs([CELLAR_RAT_PATH]);
    this.setResetMessage('{dim}You hear frantic scratching as more rats emerge from the dark corners.{/}\n');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
  }
}

export default BakeryCellarSoutheast;
