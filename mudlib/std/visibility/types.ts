/**
 * Visibility System Types
 *
 * Core interfaces and enums for the layered visibility system.
 */

/**
 * Visibility levels - higher values are harder to see.
 */
export enum VisibilityLevel {
  /** Fully visible to everyone */
  NORMAL = 0,
  /** Partial cover, requires alertness */
  OBSCURED = 10,
  /** Thief sneak (moving) - requires high perception */
  SNEAKING = 30,
  /** Thief hide (stationary) - requires Detect Hidden skill */
  HIDDEN = 50,
  /** Mage invisibility - requires See Invisible buff */
  INVISIBLE = 70,
  /** Staff vanish - only visible to higher rank staff */
  STAFF_VANISHED = 100,
}

/**
 * Permission levels for staff hierarchy.
 */
export enum PermissionLevel {
  PLAYER = 0,
  BUILDER = 1,
  SENIOR = 2,
  ADMIN = 3,
}

/**
 * Light levels for perception bonuses.
 */
export enum LightLevel {
  /** No light - severe perception penalty */
  PITCH_BLACK = 0,
  /** Minimal light */
  VERY_DARK = 20,
  /** Dim light */
  DIM = 40,
  /** Normal lighting */
  NORMAL = 60,
  /** Well lit */
  BRIGHT = 80,
  /** Very bright - slight perception bonus */
  BLINDING = 100,
}

/**
 * Types of perception that can counter visibility.
 */
export enum PerceptionType {
  /** Base perception from wisdom */
  NORMAL = 'normal',
  /** Heightened alertness */
  ALERT = 'alert',
  /** Detect Hidden skill/buff */
  DETECT_HIDDEN = 'detect_hidden',
  /** See Invisible spell/buff */
  SEE_INVISIBLE = 'see_invisible',
  /** Staff sight - sees other staff */
  STAFF_SIGHT = 'staff_sight',
}

/**
 * Visibility state of a target entity.
 */
export interface VisibilityState {
  /** Base visibility level from effects */
  level: VisibilityLevel;
  /** Whether the entity is staff-vanished */
  staffVanished: boolean;
  /** The permission level of vanished staff (for hierarchy check) */
  vanishLevel: PermissionLevel;
}

/**
 * Perception state of a viewer entity.
 */
export interface PerceptionState {
  /** Base perception value (from wisdom * 2) */
  base: number;
  /** Total modifiers from effects */
  modifiers: number;
  /** Can see invisible entities */
  canSeeInvisible: boolean;
  /** Bonus/penalty from light levels */
  lightBonus: number;
  /** Total effective perception */
  effective: number;
}

/**
 * Result of a visibility check.
 */
export interface VisibilityCheckResult {
  /** Whether the viewer can see the target */
  canSee: boolean;
  /** Whether target is partially visible (detected but not fully visible) */
  isPartiallyVisible: boolean;
  /** Reason for the visibility result */
  reason: string;
}

/**
 * Light source configuration for items.
 */
export interface LightSourceConfig {
  /** Light radius (0-50) */
  lightRadius: number;
  /** Fuel remaining in ms (-1 = infinite) */
  fuelRemaining: number;
  /** Whether the light is active when dropped on ground */
  activeWhenDropped: boolean;
}

/**
 * Default light source configuration.
 */
export const DEFAULT_LIGHT_SOURCE: LightSourceConfig = {
  lightRadius: 0,
  fuelRemaining: -1,
  activeWhenDropped: false,
};

/**
 * Default light level for rooms without explicit setting.
 */
export const DEFAULT_ROOM_LIGHT = LightLevel.NORMAL;

/**
 * Perception bonuses from light levels.
 * Negative values are penalties.
 */
export const LIGHT_PERCEPTION_BONUS: Record<LightLevel, number> = {
  [LightLevel.PITCH_BLACK]: -20,
  [LightLevel.VERY_DARK]: -10,
  [LightLevel.DIM]: -5,
  [LightLevel.NORMAL]: 0,
  [LightLevel.BRIGHT]: 5,
  [LightLevel.BLINDING]: 10,
};

/**
 * Effect type identifiers for visibility-related effects.
 */
export const VISIBILITY_EFFECT_TYPES = {
  STEALTH: 'stealth',
  INVISIBILITY: 'invisibility',
  SEE_INVISIBLE: 'see_invisible',
  DETECT_HIDDEN: 'detect_hidden',
} as const;

/**
 * Visibility level names for display.
 */
export const VISIBILITY_LEVEL_NAMES: Record<VisibilityLevel, string> = {
  [VisibilityLevel.NORMAL]: 'Normal',
  [VisibilityLevel.OBSCURED]: 'Obscured',
  [VisibilityLevel.SNEAKING]: 'Sneaking',
  [VisibilityLevel.HIDDEN]: 'Hidden',
  [VisibilityLevel.INVISIBLE]: 'Invisible',
  [VisibilityLevel.STAFF_VANISHED]: 'Vanished',
};
