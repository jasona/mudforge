/**
 * Crude Skinning Knife
 */

import { Tool } from '../../../../std/profession/tool.js';

export class StarterSkinningKnife extends Tool {
  constructor() {
    super();
    this.initTool('skinning_knife', 1);
    this.shortDesc = 'a crude skinning knife';
    this.longDesc = 'A short, curved knife with a durable edge for field dressing and hide work.';
    this.setIds(['skinning knife', 'knife', 'crude skinning knife', 'starter skinning knife']);
  }
}

export default StarterSkinningKnife;

