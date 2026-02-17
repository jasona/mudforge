/**
 * Crude Pickaxe
 */

import { Tool } from '../../../../std/profession/tool.js';

export class StarterPickaxe extends Tool {
  constructor() {
    super();
    this.initTool('pickaxe', 1);
    this.shortDesc = 'a crude pickaxe';
    this.longDesc = 'A basic iron pickaxe with a wrapped wooden grip. It is sturdy enough for novice mining work.';
    this.setIds(['pickaxe', 'crude pickaxe', 'starter pickaxe']);
  }
}

export default StarterPickaxe;

