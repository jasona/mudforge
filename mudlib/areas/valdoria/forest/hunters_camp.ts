/**
 * Hunter's Camp - An abandoned camp site.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class HuntersCamp extends Room {
  constructor() {
    super();
    this.shortDesc = '{yellow}Hunter\'s Camp{/}';
    this.longDesc = `The remains of a {yellow}hunter's camp{/} occupy this small clearing.
A {dim}stone fire ring{/} holds cold ashes, and a weathered {yellow}lean-to{/}
sags against a tree. Scattered about are signs of hasty departure -
an overturned pot, torn canvas, broken arrows.

{red}Claw marks{/} score the lean-to's wooden frame, and dark stains
on the ground tell a grim story. Whoever camped here left in a
hurry... or didn't leave at all.

The trail leads back {green}west{/} toward the forest path.
{dim}Perhaps there are useful supplies left behind.{/}`;

    this.setMapCoordinates({ x: 2, y: 0, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('A');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('west', '/areas/valdoria/forest/old_trail');
  }

  override async onCreate(): Promise<void> {
    // Wolves sometimes lurk here
    if (Math.random() < 0.4 && typeof efuns !== 'undefined' && efuns.cloneObject) {
      const wolf = await efuns.cloneObject('/areas/valdoria/forest/wolf');
      if (wolf) await wolf.moveTo(this);
    }
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{dim}An uneasy feeling settles over you as you survey the abandoned camp.{/}\n');
    }
  }
}

export default HuntersCamp;
