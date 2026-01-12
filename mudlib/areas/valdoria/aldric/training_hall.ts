/**
 * Training Hall - A room with a combat trainer.
 *
 * The training hall is where adventurers come to hone their skills
 * and grow stronger through dedicated practice.
 */

import { Room } from '../../../lib/std.js';
import type { MasterVorn } from './master_vorn.js';

/**
 * The Training Hall room.
 */
export class TrainingHall extends Room {
  constructor() {
    super();

    this.shortDesc = 'Training Hall';
    this.longDesc = `This spacious hall echoes with the sounds of training - the thud
of practice weapons against padded dummies, the scuff of boots on
the worn wooden floor. Racks of training equipment line the walls:
wooden swords, padded shields, and various weighted implements for
building strength. The floor shows the wear of countless sessions,
with smooth patches where feet have pivoted and struck for decades.
High windows let in diffused light, and the air carries the faint
scent of leather and honest sweat.

A chalk board near the entrance displays training schedules and
motivational quotes from famous warriors of old.

The town center lies to the {green}southwest{/}.`;

    // Map coordinates - northeast of center
    this.setMapCoordinates({ x: 1, y: -1, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');
    this.setMapIcon('H');

    // Exits
    this.addExit('southwest', '/areas/valdoria/aldric/center');

    // Add some items for flavor
    this.addId('training hall');
    this.addId('hall');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Check if a trainer already exists (prevents duplicates on hot-reload)
    const hasTrainer = this.inventory.some(obj => obj.id('trainer') || obj.id('vorn'));
    if (hasTrainer) {
      return;
    }

    // Clone and place Master Vorn from separate file to avoid hot-reload loops
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      const vorn = await efuns.cloneObject<MasterVorn>('/areas/valdoria/aldric/master_vorn', 'MasterVorn');
      if (vorn) {
        await vorn.moveTo(this);
      }
    }
  }
}

export default TrainingHall;
