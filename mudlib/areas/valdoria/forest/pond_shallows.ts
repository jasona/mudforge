/**
 * Pond Shallows
 *
 * Area: Southern Forest (valdoria:forest)
 */

import { Room } from '../../../lib/std.js';

export class PondShallows extends Room {
  constructor() {
    super();
    this.shortDesc = 'Pond Shallows';
    this.longDesc = `A small forest pond opens here, ringed by reeds and smooth stones.
The water is cool and clear, only waist-deep near the edge, making it
an ideal place for novice swimmers to practice their strokes.

Dragonflies skim the surface while tiny fish dart between waving reeds.
The stream crossing lies back to the {green}east{/}, while deeper water
spreads toward the {green}west{/}.`;
    this.setMapCoordinates({ x: -1, y: 2, z: 0, area: '/areas/valdoria/forest' });
    this.setTerrain('water_shallow');
    this.mapIcon = '~';
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addSkillGatedExit('east', '/areas/valdoria/forest/stream_crossing', {
      profession: 'swimming',
      level: 1,
      failMessage: 'You need swimming level 1 to cross the pond safely.',
    });
    this.addSkillGatedExit('west', '/areas/valdoria/forest/pond_deeper', {
      profession: 'swimming',
      level: 1,
      failMessage: 'You need swimming level 1 to move into deeper pond water.',
    });
  }

}

export default PondShallows;
