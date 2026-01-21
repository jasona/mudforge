/**
 * Race Definitions
 *
 * Contains all playable race definitions with their stats, abilities, and appearance.
 */

import type { RaceDefinition, RaceId } from './types.js';

/**
 * Human - The balanced race with no bonuses or penalties.
 */
const human: RaceDefinition = {
  id: 'human',
  name: 'Human',
  shortDescription: 'Versatile and adaptable, humans excel in any role.',
  longDescription: `Humans are the most widespread and diverse of all races. While they lack
the innate magical abilities of elves or the physical prowess of orcs, their adaptability
and determination have allowed them to thrive in every corner of the world. Humans are
known for their ambition, creativity, and ability to forge alliances with other races.

Their relatively short lifespans drive them to accomplish great deeds, building empires
and leaving lasting legacies. This urgency gives them an energy and drive that other,
longer-lived races sometimes lack.`,
  statBonuses: {},
  latentAbilities: [],
  appearance: {
    skinTones: ['pale', 'fair', 'tan', 'olive', 'brown', 'dark'],
    hairColors: ['black', 'brown', 'blonde', 'red', 'gray', 'white'],
    eyeColors: ['brown', 'blue', 'green', 'hazel', 'gray'],
    distinctiveFeatures: [],
    heightRange: '5\'4" - 6\'2"',
    buildDescription: 'average to athletic build',
    portraitStyleHints: 'human fantasy adventurer, determined expression',
  },
  loreEntryId: 'race:human',
  playable: true,
  displayOrder: 1,
};

/**
 * Elf - Graceful and magical, with bonuses to dexterity and intelligence.
 */
const elf: RaceDefinition = {
  id: 'elf',
  name: 'Elf',
  shortDescription: 'Graceful and long-lived, elves possess natural magical talent.',
  longDescription: `Elves are an ancient race with deep connections to nature and magic.
Living for thousands of years, they have witnessed the rise and fall of many civilizations.
Their graceful forms and pointed ears mark them as distinct from other races.

Elves possess an innate magical resistance and can see perfectly in darkness. They favor
subtlety and finesse over brute force, excelling as archers, mages, and rangers. Their
long lives give them patience and perspective that shorter-lived races often lack.`,
  statBonuses: {
    dexterity: 2,
    intelligence: 1,
    constitution: -1,
  },
  latentAbilities: ['nightVision', 'magicResistance'],
  appearance: {
    skinTones: ['pale', 'fair', 'golden', 'bronze', 'silver-tinged'],
    hairColors: ['silver', 'golden blonde', 'black', 'white', 'auburn'],
    eyeColors: ['silver', 'gold', 'green', 'blue', 'violet'],
    distinctiveFeatures: ['pointed ears', 'angular features', 'almond-shaped eyes'],
    heightRange: '5\'6" - 6\'4"',
    buildDescription: 'slender and graceful build',
    portraitStyleHints: 'ethereal elven beauty, pointed ears clearly visible, elegant features',
  },
  loreEntryId: 'race:elf',
  playable: true,
  displayOrder: 2,
};

/**
 * Dwarf - Sturdy and resilient, masters of stone and steel.
 */
const dwarf: RaceDefinition = {
  id: 'dwarf',
  name: 'Dwarf',
  shortDescription: 'Stout and resilient, dwarves are master craftsmen and warriors.',
  longDescription: `Dwarves are a proud and ancient race, dwelling in great underground
kingdoms carved from living rock. They are renowned throughout the world as master smiths,
miners, and warriors. Their stout frames belie incredible strength and endurance.

Dwarven society values honor, craftsmanship, and loyalty above all else. They can see
in complete darkness using their infravision, and their hardy constitutions make them
resistant to poisons and toxins. Their natural toughness provides additional protection
in combat.`,
  statBonuses: {
    constitution: 2,
    strength: 1,
    charisma: -1,
  },
  latentAbilities: ['infravision', 'poisonResistance', 'naturalArmor'],
  appearance: {
    skinTones: ['pale', 'ruddy', 'tan', 'gray-tinged', 'bronze'],
    hairColors: ['brown', 'black', 'red', 'gray', 'bald'],
    eyeColors: ['brown', 'gray', 'blue', 'amber'],
    distinctiveFeatures: ['thick beard', 'broad nose', 'heavy brow'],
    heightRange: '4\'0" - 4\'8"',
    buildDescription: 'stocky and muscular build, broad shoulders',
    portraitStyleHints: 'sturdy dwarven warrior, impressive beard, weathered features',
  },
  loreEntryId: 'race:dwarf',
  playable: true,
  displayOrder: 3,
};

/**
 * Orc - Powerful and fierce, orcs are born warriors.
 */
const orc: RaceDefinition = {
  id: 'orc',
  name: 'Orc',
  shortDescription: 'Powerful and fierce, orcs are born for battle.',
  longDescription: `Orcs are a proud warrior race, known for their incredible strength
and ferocity in battle. While often misunderstood by other races, orcs possess a rich
culture based on honor, strength, and tribal loyalty. Their green-gray skin and
prominent tusks make them instantly recognizable.

Orcs can see heat signatures in darkness and possess an enhanced healing factor that
allows them to recover from wounds faster than other races. Their aggressive nature
and spiritual beliefs conflict with the doctrines of most divine orders, preventing
them from becoming clerics.`,
  statBonuses: {
    strength: 3,
    constitution: 1,
    intelligence: -2,
    charisma: -1,
  },
  latentAbilities: ['infravision', 'fastHealing'],
  forbiddenGuilds: ['cleric'],
  appearance: {
    skinTones: ['green', 'gray-green', 'olive green', 'dark green', 'gray'],
    hairColors: ['black', 'dark brown', 'bald', 'gray'],
    eyeColors: ['red', 'yellow', 'amber', 'brown'],
    distinctiveFeatures: ['tusks', 'broad jaw', 'prominent brow', 'battle scars'],
    heightRange: '6\'0" - 7\'0"',
    buildDescription: 'massive and heavily muscled build',
    portraitStyleHints: 'fierce orcish warrior, tusks visible, intense gaze, tribal markings',
  },
  loreEntryId: 'race:orc',
  playable: true,
  displayOrder: 4,
};

/**
 * Halfling - Small but nimble, with natural luck and stealth.
 */
const halfling: RaceDefinition = {
  id: 'halfling',
  name: 'Halfling',
  shortDescription: 'Small and lucky, halflings are natural rogues and survivors.',
  longDescription: `Halflings are a small but resourceful people, known for their
cheerful disposition and remarkable luck. Despite their diminutive stature, they
have carved out a place for themselves in the world through cleverness, agility,
and an uncanny ability to avoid danger.

Halflings possess natural stealth abilities that make them excellent scouts and
thieves. Their small size and quiet footsteps allow them to move undetected,
while their hardy digestive systems make them resistant to poisons. They are
known for their love of comfort, good food, and simple pleasures.`,
  statBonuses: {
    dexterity: 2,
    luck: 2,
    strength: -2,
  },
  latentAbilities: ['naturalStealth', 'poisonResistance'],
  appearance: {
    skinTones: ['fair', 'tan', 'ruddy', 'olive'],
    hairColors: ['brown', 'curly brown', 'auburn', 'sandy', 'black'],
    eyeColors: ['brown', 'hazel', 'green', 'blue'],
    distinctiveFeatures: ['curly hair', 'round face', 'pointed ears (subtle)', 'bare feet'],
    heightRange: '2\'8" - 3\'4"',
    buildDescription: 'small and nimble build, somewhat plump',
    portraitStyleHints: 'cheerful halfling face, curly hair, bright eyes, friendly expression',
  },
  loreEntryId: 'race:halfling',
  playable: true,
  displayOrder: 5,
};

/**
 * Gnome - Clever inventors with magical aptitude.
 */
const gnome: RaceDefinition = {
  id: 'gnome',
  name: 'Gnome',
  shortDescription: 'Clever and curious, gnomes are natural inventors and illusionists.',
  longDescription: `Gnomes are a small but brilliant race, known for their insatiable
curiosity and mechanical genius. They possess an innate connection to magic,
particularly illusions, and their keen minds make them excellent scholars and inventors.

Living in elaborate underground warrens or hidden forest communities, gnomes have
developed excellent night vision and heightened senses. Their natural resistance
to magic protects them from hostile spells, while their perceptive nature helps
them detect hidden dangers.`,
  statBonuses: {
    intelligence: 2,
    wisdom: 1,
    strength: -2,
  },
  latentAbilities: ['nightVision', 'magicResistance', 'keenSenses'],
  appearance: {
    skinTones: ['pale', 'tan', 'brown', 'gray-tinged'],
    hairColors: ['white', 'gray', 'blonde', 'orange', 'green-tinged'],
    eyeColors: ['blue', 'green', 'amber', 'violet'],
    distinctiveFeatures: ['large nose', 'pointed ears', 'bright eyes', 'wild hair'],
    heightRange: '3\'0" - 3\'6"',
    buildDescription: 'small and wiry build',
    portraitStyleHints: 'quirky gnome inventor, large expressive eyes, curious expression',
  },
  loreEntryId: 'race:gnome',
  playable: true,
  displayOrder: 6,
};

/**
 * Tiefling - Those with infernal heritage, marked by otherworldly features.
 */
const tiefling: RaceDefinition = {
  id: 'tiefling',
  name: 'Tiefling',
  shortDescription: 'Touched by infernal blood, tieflings bear the mark of the lower planes.',
  longDescription: `Tieflings are the descendants of humans who made pacts with demons or
devils, their bloodlines forever marked by infernal power. They possess distinctive
features such as horns, tails, and unusual skin colors that set them apart from other
races.

Despite the stigma they often face, tieflings possess formidable natural abilities.
Their infernal heritage grants them resistance to fire and the ability to see in
darkness. However, their connection to the lower planes makes them unwelcome in
most religious orders, barring them from the path of the cleric.`,
  statBonuses: {
    charisma: 2,
    intelligence: 1,
    wisdom: -1,
  },
  latentAbilities: ['fireResistance', 'infravision'],
  forbiddenGuilds: ['cleric'],
  appearance: {
    skinTones: ['red', 'purple', 'blue', 'ashen gray', 'dark crimson'],
    hairColors: ['black', 'dark red', 'purple', 'white'],
    eyeColors: ['red', 'gold', 'silver', 'black (no whites)', 'glowing'],
    distinctiveFeatures: ['horns', 'tail', 'pointed teeth', 'cloven hooves (optional)'],
    heightRange: '5\'6" - 6\'2"',
    buildDescription: 'lithe and athletic build',
    portraitStyleHints: 'mysterious tiefling, visible horns, exotic skin color, intense gaze',
  },
  loreEntryId: 'race:tiefling',
  playable: true,
  displayOrder: 7,
};

/**
 * Dragonborn - Proud dragon-descended warriors.
 */
const dragonborn: RaceDefinition = {
  id: 'dragonborn',
  name: 'Dragonborn',
  shortDescription: 'Proud dragon-descendants with scales and elemental resistance.',
  longDescription: `Dragonborn are a proud race descended from dragons, bearing scales,
claws, and draconic features. They stand tall and proud, their very presence
commanding respect. Their culture values honor, clan loyalty, and personal excellence.

Dragonborn inherit elemental resistances from their draconic ancestors - most commonly
fire or cold resistance depending on their lineage. Their tough, scaled hide provides
natural armor, and they possess an innate dignity that makes them natural leaders.
They excel as warriors, paladins, and sorcerers.`,
  statBonuses: {
    strength: 2,
    charisma: 1,
    dexterity: -1,
  },
  latentAbilities: ['fireResistance', 'naturalArmor'],
  appearance: {
    skinTones: ['red scales', 'gold scales', 'bronze scales', 'silver scales', 'blue scales', 'black scales', 'white scales', 'green scales'],
    hairColors: ['none (scaled)', 'frills', 'horns'],
    eyeColors: ['gold', 'red', 'blue', 'green', 'silver'],
    distinctiveFeatures: ['scales', 'draconic snout', 'small horns', 'tail', 'claws'],
    heightRange: '6\'2" - 7\'0"',
    buildDescription: 'tall and powerfully built, reptilian',
    portraitStyleHints: 'proud dragonborn warrior, scaled features, draconic snout, noble bearing',
  },
  loreEntryId: 'race:dragonborn',
  playable: true,
  displayOrder: 8,
};

/**
 * Map of all race definitions by ID.
 */
export const RACE_DEFINITIONS: Record<RaceId, RaceDefinition> = {
  human,
  elf,
  dwarf,
  orc,
  halfling,
  gnome,
  tiefling,
  dragonborn,
};

/**
 * Get all race definitions as an array.
 */
export function getAllRaceDefinitions(): RaceDefinition[] {
  return Object.values(RACE_DEFINITIONS);
}

/**
 * Get all playable race definitions sorted by display order.
 */
export function getPlayableRaces(): RaceDefinition[] {
  return getAllRaceDefinitions()
    .filter((r) => r.playable)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Get a race definition by ID.
 */
export function getRaceDefinition(id: RaceId): RaceDefinition | undefined {
  return RACE_DEFINITIONS[id];
}

/**
 * Check if a race ID is valid.
 */
export function isValidRaceId(id: string): id is RaceId {
  return id in RACE_DEFINITIONS;
}
