/**
 * Wooden Chest
 *
 * A basic container that can hold items.
 */

import { Container } from '../../std/container.js';

export class WoodenChest extends Container {
  constructor() {
    super();

    this.setContainer(
      'a wooden chest',
      `A sturdy wooden chest reinforced with iron bands. The lid is hinged
and can be opened to store items inside. It looks like it could hold
a reasonable amount of equipment.`,
      {
        maxItems: 20,
        maxWeight: 200,
        open: false, // Starts closed
      }
    );

    this.addId('chest');
    this.addId('wooden chest');
    this.addId('box');

    // This chest can be picked up (override default)
    this.takeable = true;
    this.weight = 10;
    this.value = 25;
  }
}

export default WoodenChest;
