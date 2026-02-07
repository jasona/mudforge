/**
 * Terrain System - Defines terrain types and their properties.
 *
 * Each room has a terrain type that affects:
 * - Map visualization (block character and color)
 * - Movement costs
 * - Combat effectiveness
 * - Visibility range
 * - Environmental effects
 */

/**
 * All available terrain types.
 */
export type TerrainType =
  | 'town'
  | 'indoor'
  | 'road'
  | 'grassland'
  | 'forest'
  | 'dense_forest'
  | 'mountain'
  | 'hills'
  | 'water_shallow'
  | 'water_deep'
  | 'river'
  | 'swamp'
  | 'desert'
  | 'snow'
  | 'ice'
  | 'cave'
  | 'dungeon'
  | 'void';

/**
 * Environmental damage effect.
 */
export interface EnvironmentalEffect {
  /** Damage amount per tick */
  damage?: number;
  /** Type of damage (drowning, heat, cold, poison, etc.) */
  damageType?: string;
  /** Seconds between damage ticks */
  interval?: number;
  /** Message when taking damage */
  message?: string;
}

/**
 * Full terrain definition.
 */
export interface TerrainDefinition {
  /** Terrain type identifier */
  id: TerrainType;
  /** Human-readable name */
  name: string;
  /** ASCII character for map display */
  block: string;
  /** Hex color for explored terrain */
  color: string;
  /** Dimmed color for revealed but unexplored terrain */
  colorDim: string;

  // Gameplay effects
  /** Movement cost multiplier (1.0 = normal, 2.0 = half speed) */
  movementCost: number;
  /** Combat effectiveness multiplier */
  combatModifier: number;
  /** How far you can see in rooms */
  visibilityRange: number;

  // Requirements
  /** Requires swim ability to enter */
  requiresSwim?: boolean;
  /** Requires climb ability to enter */
  requiresClimb?: boolean;
  /** Requires light source to see */
  requiresLight?: boolean;
  /** Requires a boat to traverse */
  requiresBoat?: boolean;

  // Environment
  /** Whether this terrain is outdoors (affected by day/night cycle) */
  outdoor?: boolean;

  // Environmental effects
  /** Periodic damage or other environmental effect */
  environmental?: EnvironmentalEffect;

  // Ambient messages
  /** Random atmospheric messages shown while in this terrain */
  ambientMessages?: string[];
}

/**
 * All terrain definitions.
 */
export const TERRAINS: Record<TerrainType, TerrainDefinition> = {
  town: {
    id: 'town',
    name: 'Town',
    block: '▒',
    color: '#a0a0a0',
    colorDim: '#505050',
    movementCost: 1.0,
    combatModifier: 1.0,
    visibilityRange: 5,
    outdoor: true,
    ambientMessages: [
      'The bustle of town life surrounds you.',
      'Merchants call out their wares in the distance.',
      'A cart rumbles past on the cobblestones.',
    ],
  },

  indoor: {
    id: 'indoor',
    name: 'Indoor',
    block: '░',
    color: '#c4a882',
    colorDim: '#625441',
    movementCost: 1.0,
    combatModifier: 1.0,
    visibilityRange: 3,
    ambientMessages: [
      'The floorboards creak softly.',
      'Dust motes drift in the light.',
    ],
  },

  road: {
    id: 'road',
    name: 'Road',
    block: '═',
    color: '#8b7355',
    colorDim: '#453a2b',
    movementCost: 0.8, // Faster travel on roads
    combatModifier: 1.0,
    visibilityRange: 6,
    outdoor: true,
    ambientMessages: [
      'The packed earth of the road is firm underfoot.',
      'Wagon ruts mark the well-traveled path.',
    ],
  },

  grassland: {
    id: 'grassland',
    name: 'Grassland',
    block: '░',
    color: '#4a7c23',
    colorDim: '#2d4d16',
    movementCost: 1.0,
    combatModifier: 1.0,
    visibilityRange: 5,
    outdoor: true,
    ambientMessages: [
      'A gentle breeze rustles the grass.',
      'Insects buzz lazily in the warm air.',
      'The grass sways gently in the wind.',
      'A bird calls from somewhere in the meadow.',
    ],
  },

  forest: {
    id: 'forest',
    name: 'Forest',
    block: '▓',
    color: '#228b22',
    colorDim: '#145214',
    movementCost: 1.2,
    combatModifier: 0.9,
    visibilityRange: 2,
    outdoor: true,
    ambientMessages: [
      'Birds chirp in the canopy above.',
      'Leaves rustle as something moves nearby.',
      'Dappled sunlight filters through the branches.',
      'The scent of pine and earth fills the air.',
    ],
  },

  dense_forest: {
    id: 'dense_forest',
    name: 'Dense Forest',
    block: '█',
    color: '#006400',
    colorDim: '#003200',
    movementCost: 1.5,
    combatModifier: 0.8,
    visibilityRange: 1,
    outdoor: true,
    ambientMessages: [
      'The undergrowth is thick and tangled.',
      'You can barely see the sky through the canopy.',
      'Strange sounds echo through the dense foliage.',
    ],
  },

  mountain: {
    id: 'mountain',
    name: 'Mountain',
    block: '▲',
    color: '#696969',
    colorDim: '#353535',
    movementCost: 2.0,
    combatModifier: 0.85,
    visibilityRange: 8, // Good visibility from height
    outdoor: true,
    requiresClimb: true,
    ambientMessages: [
      'The wind howls around the rocky peaks.',
      'Loose stones clatter underfoot.',
      'The air is thin and cold.',
    ],
  },

  hills: {
    id: 'hills',
    name: 'Hills',
    block: '∩',
    color: '#9b8b6e',
    colorDim: '#4e4637',
    movementCost: 1.3,
    combatModifier: 0.95,
    visibilityRange: 4,
    outdoor: true,
    ambientMessages: [
      'The rolling hills stretch before you.',
      'A hawk circles lazily overhead.',
    ],
  },

  water_shallow: {
    id: 'water_shallow',
    name: 'Shallow Water',
    block: '≈',
    color: '#87ceeb',
    colorDim: '#446676',
    movementCost: 1.5,
    combatModifier: 0.8,
    visibilityRange: 4,
    outdoor: true,
    ambientMessages: [
      'Water splashes around your feet.',
      'Small fish dart away from your steps.',
    ],
  },

  water_deep: {
    id: 'water_deep',
    name: 'Deep Water',
    block: '≈',
    color: '#1e90ff',
    colorDim: '#0f4880',
    movementCost: 3.0,
    combatModifier: 0.5,
    visibilityRange: 3,
    outdoor: true,
    requiresSwim: true,
    requiresBoat: true,
    environmental: {
      damage: 5,
      damageType: 'drowning',
      interval: 10,
      message: 'You struggle to stay afloat!',
    },
    ambientMessages: [
      'The water stretches endlessly around you.',
      'Waves lap gently against you.',
    ],
  },

  river: {
    id: 'river',
    name: 'River',
    block: '~',
    color: '#4169e1',
    colorDim: '#213471',
    movementCost: 2.0,
    combatModifier: 0.7,
    visibilityRange: 4,
    outdoor: true,
    requiresSwim: true,
    ambientMessages: [
      'The current tugs at your legs.',
      'Water rushes past with a constant roar.',
    ],
  },

  swamp: {
    id: 'swamp',
    name: 'Swamp',
    block: '~',
    color: '#556b2f',
    colorDim: '#2b3618',
    movementCost: 1.8,
    combatModifier: 0.75,
    visibilityRange: 2,
    outdoor: true,
    environmental: {
      damage: 2,
      damageType: 'poison',
      interval: 30,
      message: 'The swamp air burns your lungs.',
    },
    ambientMessages: [
      'Bubbles rise from the murky water.',
      'Something slithers through the reeds.',
      'A foul stench fills the air.',
      'Mosquitoes buzz incessantly.',
    ],
  },

  desert: {
    id: 'desert',
    name: 'Desert',
    block: '∙',
    color: '#edc967',
    colorDim: '#776534',
    movementCost: 1.4,
    combatModifier: 0.9,
    visibilityRange: 7,
    outdoor: true,
    environmental: {
      damage: 3,
      damageType: 'heat',
      interval: 60,
      message: 'The scorching sun saps your strength.',
    },
    ambientMessages: [
      'Heat shimmers off the endless sand.',
      'A hot wind blows across the dunes.',
      'Your mouth feels parched.',
    ],
  },

  snow: {
    id: 'snow',
    name: 'Snow',
    block: '*',
    color: '#fffafa',
    colorDim: '#808080',
    movementCost: 1.6,
    combatModifier: 0.85,
    visibilityRange: 4,
    outdoor: true,
    environmental: {
      damage: 2,
      damageType: 'cold',
      interval: 45,
      message: 'The bitter cold seeps into your bones.',
    },
    ambientMessages: [
      'Snow crunches underfoot.',
      'Your breath forms clouds in the frigid air.',
      'Snowflakes drift silently down.',
    ],
  },

  ice: {
    id: 'ice',
    name: 'Ice',
    block: '#',
    color: '#b0e0e6',
    colorDim: '#586f73',
    movementCost: 1.3,
    combatModifier: 0.7, // Hard to fight on slippery ice
    visibilityRange: 5,
    outdoor: true,
    environmental: {
      damage: 3,
      damageType: 'cold',
      interval: 30,
      message: 'The intense cold bites at exposed skin.',
    },
    ambientMessages: [
      'The ice creaks ominously beneath you.',
      'Your footing is treacherous on the slick surface.',
    ],
  },

  cave: {
    id: 'cave',
    name: 'Cave',
    block: '█',
    color: '#404040',
    colorDim: '#202020',
    movementCost: 1.1,
    combatModifier: 0.95,
    visibilityRange: 1,
    requiresLight: true,
    ambientMessages: [
      'Water drips somewhere in the darkness.',
      'Your footsteps echo off the stone walls.',
      'A cold draft whispers through the cavern.',
      'Strange sounds echo from deep within.',
    ],
  },

  dungeon: {
    id: 'dungeon',
    name: 'Dungeon',
    block: '█',
    color: '#8b0000',
    colorDim: '#460000',
    movementCost: 1.0,
    combatModifier: 1.0,
    visibilityRange: 2,
    requiresLight: true,
    ambientMessages: [
      'The air is thick with the stench of decay.',
      'Ancient stones bear marks of violence.',
      'You sense danger lurking nearby.',
      'Chains rattle somewhere in the darkness.',
    ],
  },

  void: {
    id: 'void',
    name: 'The Void',
    block: ' ',
    color: '#000000',
    colorDim: '#000000',
    movementCost: 1.0,
    combatModifier: 1.0,
    visibilityRange: 0,
    ambientMessages: [
      'The emptiness surrounds you completely.',
      'Time and space seem meaningless here.',
    ],
  },
};

/**
 * Get terrain definition by type.
 */
export function getTerrain(type: TerrainType): TerrainDefinition {
  return TERRAINS[type];
}

/**
 * Get default terrain type.
 */
export function getDefaultTerrain(): TerrainType {
  return 'indoor';
}

/**
 * Check if a terrain type is valid.
 */
export function isValidTerrain(type: string): type is TerrainType {
  return type in TERRAINS;
}

/**
 * Get all terrain types as an array.
 */
export function getAllTerrainTypes(): TerrainType[] {
  return Object.keys(TERRAINS) as TerrainType[];
}

/**
 * Check if a terrain type is outdoor (affected by day/night cycle).
 */
export function isOutdoorTerrain(type: TerrainType): boolean {
  return TERRAINS[type]?.outdoor === true;
}

/**
 * Get opposite direction for euclidean exit creation.
 */
export const OPPOSITE_DIRECTIONS: Record<string, string> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  northeast: 'southwest',
  northwest: 'southeast',
  southeast: 'northwest',
  southwest: 'northeast',
  up: 'down',
  down: 'up',
  n: 's',
  s: 'n',
  e: 'w',
  w: 'e',
  ne: 'sw',
  nw: 'se',
  se: 'nw',
  sw: 'ne',
  u: 'd',
  d: 'u',
};

/**
 * Get coordinate delta for a direction (for euclidean validation).
 * Returns [dx, dy, dz] where positive y is south, positive x is east.
 */
export function getDirectionDelta(direction: string): [number, number, number] | null {
  const dir = direction.toLowerCase();
  switch (dir) {
    case 'north':
    case 'n':
      return [0, -1, 0];
    case 'south':
    case 's':
      return [0, 1, 0];
    case 'east':
    case 'e':
      return [1, 0, 0];
    case 'west':
    case 'w':
      return [-1, 0, 0];
    case 'northeast':
    case 'ne':
      return [1, -1, 0];
    case 'northwest':
    case 'nw':
      return [-1, -1, 0];
    case 'southeast':
    case 'se':
      return [1, 1, 0];
    case 'southwest':
    case 'sw':
      return [-1, 1, 0];
    case 'up':
    case 'u':
      return [0, 0, 1];
    case 'down':
    case 'd':
      return [0, 0, -1];
    default:
      return null; // Custom direction, no coordinate implication
  }
}
