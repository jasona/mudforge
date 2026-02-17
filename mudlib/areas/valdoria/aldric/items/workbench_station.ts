import { CraftingStation } from '../../../../std/profession/station.js';

export class WorkbenchStation extends CraftingStation {
  constructor() {
    super();
    this.initStation('workbench', 1);
  }
}

export default WorkbenchStation;
