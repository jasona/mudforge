/**
 * Pet Horse Template
 *
 * Area: Town of Aldric (valdoria:aldric)
 */

import type { PetTemplate } from '../../../../std/pet.js';

export const petHorseTemplate: PetTemplate = {
  type: 'horse',
  shortDesc: 'a swift horse',
  longDesc: 'A beautiful horse with a glossy coat. It has saddlebags for carrying supplies.',
  size: 'large',
  maxItems: 15,
  maxWeight: 200,
  health: 80,
  cost: 800,
};

export default petHorseTemplate;
