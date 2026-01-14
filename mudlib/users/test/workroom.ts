/**
 * Test's Workroom
 *
 * This is your personal workspace for building and testing.
 * Feel free to customize this room and add your own creations!
 */

import { Room } from '../../lib/std.js';

export class Workroom extends Room {
  constructor() {
    super();
    this.shortDesc = "Test's Workroom";
    this.longDesc = `A cozy workspace filled with drafting tables, magical implements, and
half-finished creations. Scrolls and blueprints are scattered about, evidence of
ongoing creative work. A comfortable chair sits in one corner, perfect for
contemplation.

This is Test's personal building space.`;

    // Add an exit back to the void (or change this to your preferred location)
    this.addExit('out', '/areas/void/void');
  }
}

export default Workroom;
