import { CraftingStation } from '../../../../std/profession/station.js';

export class ForgeStation extends CraftingStation {
  constructor() {
    super();
    this.initStation('forge', 2);
  }
}

export default ForgeStation;
