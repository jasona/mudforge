/**
 * Pet Cat Template
 *
 * Area: Town of Aldric (valdoria:aldric)
 */

import type { PetTemplate } from '../../../../std/pet.js';

export const petCatTemplate: PetTemplate = {
  type: 'cat',
  shortDesc: 'a sleek cat',
  longDesc: 'A graceful cat with keen eyes and soft fur. It carries a small satchel around its neck.',
  size: 'tiny',
  maxItems: 3,
  maxWeight: 10,
  health: 30,
  cost: 75,
};

export default petCatTemplate;
