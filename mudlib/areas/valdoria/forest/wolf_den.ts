/**
 * Wolf Den - The lair of the forest wolves.
 */

import { Room, MudObject } from '../../../lib/std.js';

export class WolfDen extends Room {
  constructor() {
    super();
    this.shortDesc = '{bold}{red}Wolf Den{/}';
    this.longDesc = `You've found the wolves' lair - a natural cave formed by massive
boulders leaning against each other, hidden beneath the roots of
fallen trees. The entrance is littered with {dim}gnawed bones{/} and
tufts of {dim}grey fur{/}.

The smell of wolves is overwhelming here - musky and primal.
{red}Yellow eyes{/} gleam from the shadows of the den, and low growls
warn intruders away. This is clearly dangerous territory.

The only way out is {green}north{/}, back toward the ancient oak.
Wolves patrol this area constantly, defending their territory.`;

    this.setMapCoordinates({ x: 0, y: 3, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('forest');
    this.setMapIcon('W');

    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/forest/ancient_oak');
  }

  override async onCreate(): Promise<void> {
    // Always wolves here
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      // Spawn 2-3 wolves
      const wolfCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < wolfCount; i++) {
        const wolf = await efuns.cloneObject('/areas/valdoria/forest/wolf');
        if (wolf) await wolf.moveTo(this);
      }
    }
  }

  override async onEnter(obj: MudObject, from?: MudObject): Promise<void> {
    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive('\n{red}You\'ve entered the wolves\' den! Growls echo from all around you!{/}\n');
    }
    this.broadcast(`${obj.shortDesc} has entered the wolves' territory!`, { exclude: [obj] });
  }
}

export default WolfDen;
