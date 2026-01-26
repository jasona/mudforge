/**
 * Pet Parrot Template
 *
 * Area: Town of Aldric (valdoria:aldric)
 */

import type { PetTemplate } from '../../../../std/pet.js';

export const petParrotTemplate: PetTemplate = {
  type: 'parrot',
  shortDesc: 'a colorful parrot',
  longDesc: 'A brilliantly colored parrot that perches on your shoulder. It can hold small trinkets in a tiny pouch.',
  size: 'tiny',
  maxItems: 2,
  maxWeight: 5,
  health: 20,
  cost: 150,
};

export default petParrotTemplate;
