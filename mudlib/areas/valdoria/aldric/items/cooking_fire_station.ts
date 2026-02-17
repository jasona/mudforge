import { CraftingStation } from '../../../../std/profession/station.js';

export class CookingFireStation extends CraftingStation {
  constructor() {
    super();
    this.initStation('cooking_fire', 1);
  }
}

export default CookingFireStation;
