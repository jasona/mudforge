/**
 * Crude Fishing Rod
 */

import { Tool } from '../../../../std/profession/tool.js';

export class StarterFishingRod extends Tool {
  constructor() {
    super();
    this.initTool('fishing_rod', 1);
    this.shortDesc = 'a crude fishing rod';
    this.longDesc = 'A basic wooden fishing rod with a rough line and simple hook, suitable for calm waters.';
    this.setIds(['fishing rod', 'rod', 'crude fishing rod', 'starter fishing rod']);
  }
}

export default StarterFishingRod;

