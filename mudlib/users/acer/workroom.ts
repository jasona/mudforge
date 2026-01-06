/**
 * Acer's Workroom - A wizard's sanctum of arcane study.
 *
 * A personal workspace for experimentation and creation.
 */

import { Room } from '../../lib/std.js';

export class Workroom extends Room {
  constructor() {
    super();

    this.shortDesc = "Acer's Workroom";
    this.longDesc = `Arcane energy crackles faintly in the air of this circular chamber, its
stone walls lined with towering bookshelves stuffed with grimoires, scrolls,
and curiosities collected from countless realms. A massive oak desk dominates
the center, its surface cluttered with quills, inkwells, half-finished
enchantments, and a skull that occasionally seems to watch you.

Floating orbs of soft {cyan}blue light{/} drift lazily near the vaulted ceiling,
casting ever-shifting shadows across the room. A {magenta}crystal ball{/} sits on a
brass stand in one corner, swirling with misty visions. The far wall holds
a {yellow}shimmering portal frame{/}, currently dormant, runes etched along its edge
pulsing with dormant power.

A worn leather armchair sits before a crackling fireplace, the flames burning
an unnatural {blue}azure{/} hue. The scent of old parchment, candle wax, and
something vaguely sulfurous fills the air.`;

    this.addId('workroom');
    this.addId("acer's workroom");

    // Exit back to town center for now
    this.addExit('out', '/areas/town/center');
  }
}

export default Workroom;
