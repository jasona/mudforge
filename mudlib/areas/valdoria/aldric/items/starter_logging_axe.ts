/**
 * Crude Logging Axe
 */

import { Tool } from '../../../../std/profession/tool.js';

export class StarterLoggingAxe extends Tool {
  constructor() {
    super();
    this.initTool('logging_axe', 1);
    this.shortDesc = 'a crude logging axe';
    this.longDesc = 'A heavy chopping axe with a broad head and a straight haft, made for felling young trees.';
    this.setIds(['logging axe', 'axe', 'crude logging axe', 'starter logging axe']);
  }
}

export default StarterLoggingAxe;

