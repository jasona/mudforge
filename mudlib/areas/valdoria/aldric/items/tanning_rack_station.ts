import { CraftingStation } from '../../../../std/profession/station.js';

export class TanningRackStation extends CraftingStation {
  constructor() {
    super();
    this.initStation('tanning_rack', 1);
  }
}

export default TanningRackStation;
