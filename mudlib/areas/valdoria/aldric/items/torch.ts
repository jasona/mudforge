/**
 * Torch - A burning torch that provides light in dark areas.
 *
 * This torch provides a light radius of 30, which can improve perception
 * in dark areas and help detect hidden creatures.
 */

import { Item } from '../../../../std/item.js';

export class Torch extends Item {
  constructor() {
    super();
    this.setItem({
      shortDesc: 'a burning torch',
      longDesc: `A sturdy wooden torch wrapped with oil-soaked rags. It burns
with a bright, steady flame that pushes back the darkness. The
flickering light casts dancing shadows on nearby surfaces.`,
      size: 'small',
      value: 5,
    });

    // Add identifiers
    this.addId('torch');
    this.addId('burning torch');
    this.addId('light');

    // Configure as a light source
    this.setLightSource({
      lightRadius: 30,        // Good light radius
      fuelRemaining: -1,      // Infinite fuel for testing
      activeWhenDropped: true, // Still provides light when on ground
    });
  }

  override onExamine(): string {
    return `${this.longDesc}

{yellow}The torch burns brightly, illuminating the area around it.{/}
{dim}Light radius: 30{/}`;
  }
}

export default Torch;
