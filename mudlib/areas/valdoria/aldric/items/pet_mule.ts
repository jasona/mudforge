/**
 * Pet Mule Template
 *
 * Area: Town of Aldric (valdoria:aldric)
 */

import type { PetTemplate } from '../../../../std/pet.js';

export const petMuleTemplate: PetTemplate = {
  type: 'mule',
  shortDesc: 'a sturdy mule',
  longDesc: 'A strong, patient mule built for carrying heavy loads. Its saddlebags look well-worn from many journeys.',
  size: 'large',
  maxItems: 30,
  maxWeight: 500,
  health: 100,
  cost: 500,
};

export default petMuleTemplate;
