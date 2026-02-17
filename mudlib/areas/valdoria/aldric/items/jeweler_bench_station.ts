import { CraftingStation } from '../../../../std/profession/station.js';

export class JewelerBenchStation extends CraftingStation {
  constructor() {
    super();
    this.initStation('jeweler_bench', 1);
  }
}

export default JewelerBenchStation;
