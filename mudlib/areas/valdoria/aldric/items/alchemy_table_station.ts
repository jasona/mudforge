import { CraftingStation } from '../../../../std/profession/station.js';

export class AlchemyTableStation extends CraftingStation {
  constructor() {
    super();
    this.initStation('alchemy_table', 2);
  }
}

export default AlchemyTableStation;
