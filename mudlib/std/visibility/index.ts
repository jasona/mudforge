/**
 * Visibility System
 *
 * Core functions for the layered visibility system.
 * Handles visibility checks between entities based on:
 * - Visibility levels (normal, sneaking, hidden, invisible, vanished)
 * - Perception abilities (wisdom, effects, light)
 * - Staff hierarchy for vanished staff
 */

import {
  VisibilityLevel,
  PermissionLevel,
  LightLevel,
  type VisibilityState,
  type PerceptionState,
  type VisibilityCheckResult,
  LIGHT_PERCEPTION_BONUS,
  DEFAULT_ROOM_LIGHT,
  VISIBILITY_EFFECT_TYPES,
  VISIBILITY_LEVEL_NAMES,
} from './types.js';
import type { Living } from '../living.js';
import type { Room } from '../room.js';
import type { Item } from '../item.js';
import type { MudObject } from '../object.js';
import type { Effect } from '../combat/types.js';
import { isOutdoorTerrain } from '../../lib/terrain.js';
import { getTimeDaemon } from '../../daemons/time.js';

/**
 * Interface for entities with race perception abilities.
 */
interface RacePerceptionEntity {
  getProperty?(key: string): unknown;
}

// Re-export types for convenience
export * from './types.js';

/**
 * Interface for light-bearing items.
 */
interface LightBearingItem extends Item {
  isLightSource?: boolean;
  lightRadius?: number;
  fuelRemaining?: number;
  activeWhenDropped?: boolean;
}

/**
 * Interface for rooms with light level.
 */
interface LightRoom extends Room {
  lightLevel?: LightLevel;
}

/**
 * Interface for players with staff vanish.
 */
interface VanishablePlayer extends Living {
  isStaffVanished?: boolean;
  permissionLevel?: number;
}

/**
 * Get the visibility state of a target entity.
 * Examines active effects and staff vanish status.
 */
export function getVisibilityState(target: Living): VisibilityState {
  // Check for staff vanish first (players only)
  const player = target as VanishablePlayer;
  if (player.isStaffVanished) {
    return {
      level: VisibilityLevel.STAFF_VANISHED,
      staffVanished: true,
      vanishLevel: (player.permissionLevel ?? 0) as PermissionLevel,
    };
  }

  // Get effects and find visibility-affecting ones
  const effects = target.getEffects?.() ?? [];
  let highestLevel = VisibilityLevel.NORMAL;

  for (const effect of effects) {
    const effectType = (effect as Effect & { effectType?: string }).effectType;

    if (effectType === VISIBILITY_EFFECT_TYPES.INVISIBILITY) {
      // True invisibility - requires see_invisible to counter
      highestLevel = Math.max(highestLevel, VisibilityLevel.INVISIBLE);
    } else if (effectType === VISIBILITY_EFFECT_TYPES.STEALTH) {
      // Stealth level depends on magnitude (hide vs sneak)
      const stealthLevel = effect.magnitude >= 50 ? VisibilityLevel.HIDDEN : VisibilityLevel.SNEAKING;
      highestLevel = Math.max(highestLevel, stealthLevel);
    }
  }

  return {
    level: highestLevel,
    staffVanished: false,
    vanishLevel: PermissionLevel.PLAYER,
  };
}

/**
 * Calculate the carried light from a living's inventory.
 * Returns a value from 0-50.
 */
export function calculateCarriedLight(living: Living): number {
  let totalLight = 0;
  const inventory = living.inventory ?? [];

  for (const obj of inventory) {
    const item = obj as LightBearingItem;
    if (item.isLightSource && item.lightRadius && item.lightRadius > 0) {
      // Check fuel
      if (item.fuelRemaining === -1 || (item.fuelRemaining ?? 0) > 0) {
        totalLight += item.lightRadius;
      }
    }
  }

  return Math.min(50, totalLight); // Cap at 50
}

/**
 * Calculate the light level of a room.
 * Includes base room light plus light sources on the ground.
 * Outdoor rooms are affected by the day/night cycle.
 */
export function calculateRoomLight(room: Room | null): LightLevel {
  if (!room) return DEFAULT_ROOM_LIGHT;

  const lightRoom = room as LightRoom;
  let baseLight = lightRoom.lightLevel ?? DEFAULT_ROOM_LIGHT;

  // Add light from dropped items
  const contents = room.inventory ?? [];
  for (const obj of contents) {
    const item = obj as LightBearingItem;
    if (item.isLightSource && item.activeWhenDropped && item.lightRadius) {
      // Check fuel
      if (item.fuelRemaining === -1 || (item.fuelRemaining ?? 0) > 0) {
        baseLight = Math.min(LightLevel.BLINDING, baseLight + item.lightRadius);
      }
    }
  }

  // Apply day/night cycle modifier for outdoor rooms
  const roomWithTerrain = room as Room & { getTerrain?: () => string };
  if (roomWithTerrain.getTerrain) {
    try {
      const terrainType = roomWithTerrain.getTerrain();
      if (isOutdoorTerrain(terrainType)) {
        const modifier = getTimeDaemon().getLightModifier();
        baseLight = Math.max(LightLevel.PITCH_BLACK, baseLight + modifier) as LightLevel;
      }
    } catch {
      // Time daemon not available (e.g., during startup)
    }
  }

  return baseLight;
}

/**
 * Get the perception state of a viewer entity.
 * Calculates base perception, modifiers, and light bonus.
 */
export function getPerceptionState(viewer: Living, room: Room | null): PerceptionState {
  // Base perception from wisdom * 2
  const wisdom = viewer.wisdom ?? 1;
  const base = wisdom * 2;

  // Get modifiers from effects
  let modifiers = 0;
  let canSeeInvisible = false;

  const effects = viewer.getEffects?.() ?? [];
  for (const effect of effects) {
    const effectType = (effect as Effect & { effectType?: string }).effectType;

    if (effectType === VISIBILITY_EFFECT_TYPES.DETECT_HIDDEN) {
      modifiers += effect.magnitude;
    } else if (effectType === VISIBILITY_EFFECT_TYPES.SEE_INVISIBLE) {
      canSeeInvisible = true;
    }
  }

  // Light bonus
  const roomLight = calculateRoomLight(room);
  const carriedLight = calculateCarriedLight(viewer);

  // Carried light can improve perception in dark rooms
  let effectiveLight = roomLight;
  if (carriedLight > 0 && roomLight < LightLevel.NORMAL) {
    effectiveLight = Math.min(LightLevel.NORMAL, roomLight + carriedLight);
  }

  const lightBonus = LIGHT_PERCEPTION_BONUS[effectiveLight as LightLevel] ?? 0;

  return {
    base,
    modifiers,
    canSeeInvisible,
    lightBonus,
    effective: base + modifiers + lightBonus,
  };
}

/**
 * Check staff visibility hierarchy.
 * Higher rank staff can see lower rank vanished staff.
 * Same or higher rank vanished staff are invisible.
 */
export function checkStaffVisibility(
  viewerLevel: PermissionLevel,
  targetVanishLevel: PermissionLevel
): boolean {
  // Players and builders can't see any vanished staff
  if (viewerLevel <= PermissionLevel.BUILDER) {
    return false;
  }

  // Staff can only see STRICTLY lower rank vanished staff
  // This means an admin cannot see another vanished admin
  return viewerLevel > targetVanishLevel;
}

/**
 * Main visibility check function.
 * Determines if viewer can see target, considering all factors.
 */
export function canSee(
  viewer: Living,
  target: Living,
  room?: Room | null
): VisibilityCheckResult {
  // Can always see yourself
  if (viewer === target) {
    return { canSee: true, isPartiallyVisible: false, reason: 'self' };
  }

  // Check if viewer is blinded
  if (viewer.isBlind && viewer.isBlind()) {
    return { canSee: false, isPartiallyVisible: false, reason: 'viewer is blinded' };
  }

  // Get target's visibility state
  const visState = getVisibilityState(target);

  // Handle staff vanish separately
  if (visState.staffVanished) {
    const viewerPlayer = viewer as VanishablePlayer;
    const viewerLevel = (viewerPlayer.permissionLevel ?? 0) as PermissionLevel;

    if (checkStaffVisibility(viewerLevel, visState.vanishLevel)) {
      // Can see the vanished staff member (partial visibility)
      return {
        canSee: true,
        isPartiallyVisible: true,
        reason: 'staff hierarchy allows visibility',
      };
    }

    // Cannot see vanished staff
    return {
      canSee: false,
      isPartiallyVisible: false,
      reason: 'target is staff vanished',
    };
  }

  // Normal visibility - no effects making target invisible
  if (visState.level === VisibilityLevel.NORMAL) {
    return { canSee: true, isPartiallyVisible: false, reason: 'target is visible' };
  }

  // Get viewer's perception
  const actualRoom = room ?? (viewer.environment as Room | null);
  const perception = getPerceptionState(viewer, actualRoom);

  // Handle invisibility (requires see_invisible flag)
  if (visState.level >= VisibilityLevel.INVISIBLE) {
    if (perception.canSeeInvisible) {
      return {
        canSee: true,
        isPartiallyVisible: true,
        reason: 'see invisible effect active',
      };
    }
    return {
      canSee: false,
      isPartiallyVisible: false,
      reason: 'target is invisible',
    };
  }

  // For stealth (sneaking/hidden), compare perception vs visibility level
  if (perception.effective > visState.level) {
    return {
      canSee: true,
      isPartiallyVisible: true,
      reason: 'perception detects hidden target',
    };
  }

  // Cannot see the stealthy target
  return {
    canSee: false,
    isPartiallyVisible: false,
    reason: 'target is hidden',
  };
}

/**
 * Format a visible name with indicator for partially visible entities.
 * Adds {bold}{green}[i]{/} prefix for detected invisible entities.
 */
export function formatVisibleName(name: string, isPartiallyVisible: boolean): string {
  if (isPartiallyVisible) {
    return `{bold}{green}[i]{/} ${name}`;
  }
  return name;
}

/**
 * Get the display name for a target considering visibility.
 * Returns "Someone" if viewer cannot see the target.
 * Returns name with "(invis)" if partially visible.
 */
export function getVisibleDisplayName(
  viewer: Living,
  target: Living,
  room?: Room | null
): { name: string; visible: boolean; isPartiallyVisible: boolean } {
  const result = canSee(viewer, target, room);

  if (!result.canSee) {
    return { name: 'Someone', visible: false, isPartiallyVisible: false };
  }

  const targetName = target.name ?? 'someone';
  const capitalizedName = targetName.charAt(0).toUpperCase() + targetName.slice(1);

  if (result.isPartiallyVisible) {
    return {
      name: `${capitalizedName} (invis)`,
      visible: true,
      isPartiallyVisible: true,
    };
  }

  return { name: capitalizedName, visible: true, isPartiallyVisible: false };
}

/**
 * Get all beings visible to a viewer in a location.
 */
export function getVisibleBeings(viewer: Living, location?: MudObject | null): Living[] {
  const env = location ?? viewer.environment;
  if (!env) return [];

  const room = env as Room;
  const visible: Living[] = [];

  for (const obj of room.inventory ?? []) {
    // Check if object is a Living
    const living = obj as Living & { isLiving?: boolean };
    if (!living.isLiving) continue;

    // Skip self
    if (living === viewer) continue;

    // Check visibility
    const result = canSee(viewer, living, room);
    if (result.canSee) {
      visible.push(living);
    }
  }

  return visible;
}

/**
 * Get the current visibility level name for display.
 */
export function getVisibilityLevelName(target: Living): string {
  const state = getVisibilityState(target);
  return VISIBILITY_LEVEL_NAMES[state.level];
}

/**
 * Minimum light level required to see in a room.
 * Below this threshold, the room is too dark to see.
 */
export const MIN_LIGHT_TO_SEE = LightLevel.DIM;

/**
 * Check if a viewer has race-based dark vision (nightVision or infravision).
 */
function hasRaceDarkVision(viewer: Living): boolean {
  const raceViewer = viewer as RacePerceptionEntity;
  if (!raceViewer.getProperty) return false;

  const perceptionAbilities = raceViewer.getProperty('racePerceptionAbilities') as string[] | undefined;
  if (!perceptionAbilities || perceptionAbilities.length === 0) return false;

  return perceptionAbilities.includes('nightVision') || perceptionAbilities.includes('infravision');
}

/**
 * Check if a viewer can see in a room based on light levels.
 * Considers room base light plus carried light sources.
 * Also considers race abilities like nightVision and infravision.
 *
 * @param viewer The entity trying to see
 * @param room The room to check (defaults to viewer's environment)
 * @returns Object with canSee boolean and effectiveLight level
 */
export function canSeeInRoom(
  viewer: Living,
  room?: Room | null
): { canSee: boolean; effectiveLight: number; reason: string } {
  const actualRoom = room ?? (viewer.environment as Room | null);

  if (!actualRoom) {
    return { canSee: true, effectiveLight: LightLevel.NORMAL, reason: 'no room' };
  }

  // Get room base light
  const lightRoom = actualRoom as LightRoom;
  const roomLight = lightRoom.lightLevel ?? DEFAULT_ROOM_LIGHT;

  // Get carried light from viewer
  const carriedLight = calculateCarriedLight(viewer);

  // Add light from dropped sources in the room
  let droppedLight = 0;
  const contents = actualRoom.inventory ?? [];
  for (const obj of contents) {
    const item = obj as LightBearingItem;
    if (item.isLightSource && item.activeWhenDropped && item.lightRadius) {
      if (item.fuelRemaining === -1 || (item.fuelRemaining ?? 0) > 0) {
        droppedLight += item.lightRadius;
      }
    }
  }

  // Calculate effective light
  const effectiveLight = Math.min(LightLevel.BLINDING, roomLight + carriedLight + droppedLight);

  if (effectiveLight >= MIN_LIGHT_TO_SEE) {
    return { canSee: true, effectiveLight, reason: 'sufficient light' };
  }

  // Check for race dark vision abilities (nightVision, infravision)
  if (hasRaceDarkVision(viewer)) {
    return { canSee: true, effectiveLight, reason: 'dark vision' };
  }

  return {
    canSee: false,
    effectiveLight,
    reason: 'too dark',
  };
}

/**
 * Get the darkness message for a room the viewer cannot see in.
 */
export function getDarknessMessage(): string {
  return "You can't see anything in this darkness. Perhaps you need some light?";
}
