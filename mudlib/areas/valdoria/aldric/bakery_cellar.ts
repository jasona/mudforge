/**
 * Bakery Cellar
 *
 * Rat-infested cellar beneath Hilda's bakery.
 */

import { Room } from '../../../lib/std.js';

const CELLAR_RAT_PATH = '/areas/valdoria/aldric/cellar_rat';

export class BakeryCellar extends Room {
  constructor() {
    super();
    this.shortDesc = "Hilda's Bakery Cellar (Northwest)";
    this.longDesc = `A cramped stone cellar corner stretches beneath the bakery, lit by a weak shaft
of light from the trapdoor above. Broken flour sacks lie ripped open across the
floor, their contents scattered into dusty trails and gnawed clumps.

The air is damp and sour, filled with skittering noises from the shadows between
old crates and barrels. The darkness stretches deeper to the {green}east{/} and
{green}south{/}, and this is clearly the source of Hilda's rat problem.

A wooden ladder leads {green}up{/} through the trapdoor to the bakery above.`;
    this.setTerrain('indoor');
    this.setMapCoordinates({ x: 4, y: 3, z: -1, area: '/areas/valdoria/aldric' });
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('up', '/areas/valdoria/aldric/bakery');
    this.addExit('east', '/areas/valdoria/aldric/bakery_cellar_ne');
    this.addExit('south', '/areas/valdoria/aldric/bakery_cellar_sw');
    this.setNpcs([CELLAR_RAT_PATH]);
    this.setResetMessage('{dim}You hear frantic scratching as more rats emerge from the dark corners.{/}\n');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
  }
}

export default BakeryCellar;
