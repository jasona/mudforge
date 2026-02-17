/**
 * Profession Supply Shop
 *
 * Entry room for starting profession tools.
 */

import { Room } from '../../../lib/std.js';

export class ProfessionSupplies extends Room {
  constructor() {
    super();
    this.shortDesc = "Outfitter's Supply Shop";
    this.longDesc = `Rows of practical gear line this compact stone-front shop. Wooden racks hold
sturdy tools meant for hard work in the wild: picks, rods, axes, knives, and
carefully packed field kits for herb gathering.

The place smells of oiled leather, fresh rope, and worked steel. A seasoned
quartermaster keeps a close eye on the stock behind a scarred oak counter.

The plaza by the castle gate lies {green}west{/}.`;
    this.setMapCoordinates({ x: 3, y: 0, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');
    this.mapIcon = 'S';
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/valdoria/aldric/castle');
    this.setNpcs(['/areas/valdoria/aldric/profession_supplier']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
  }
}

export default ProfessionSupplies;

