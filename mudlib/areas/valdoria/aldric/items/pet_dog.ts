/**
 * Pet Dog Template
 *
 * Area: Town of Aldric (valdoria:aldric)
 */

import type { PetTemplate } from '../../../../std/pet.js';

export const petDogTemplate: PetTemplate = {
  type: 'dog',
  shortDesc: 'a loyal dog',
  longDesc: 'A friendly dog with bright eyes and a wagging tail. It looks eager to carry things for its owner.',
  size: 'small',
  maxItems: 5,
  maxWeight: 30,
  health: 50,
  cost: 100,
};

export default petDogTemplate;
