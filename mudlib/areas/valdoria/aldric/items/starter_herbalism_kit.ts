/**
 * Crude Herbalism Kit
 */

import { Tool } from '../../../../std/profession/tool.js';

export class StarterHerbalismKit extends Tool {
  constructor() {
    super();
    this.initTool('herbalism_kit', 1);
    this.shortDesc = 'a crude herbalism kit';
    this.longDesc = 'A simple leather satchel containing clippers, twine, and pouches for gathered herbs.';
    this.setIds(['herbalism kit', 'kit', 'crude herbalism kit', 'starter herbalism kit']);
  }
}

export default StarterHerbalismKit;

