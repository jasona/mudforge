/**
 * Standard Library Barrel File
 *
 * Re-exports all standard mudlib classes for convenient importing.
 *
 * Usage:
 *   import { Room, Item, NPC } from '../../std/index.js';
 *   // or with path alias:
 *   import { Room, Item, NPC } from '@std';
 */

// Base classes
export { MudObject } from './object.js';
export { Room } from './room.js';
export { Item, SIZE_WEIGHTS } from './item.js';
export type { ItemSize } from './item.js';
export { Container } from './container.js';
export { Bag } from './bag.js';

// Living beings
export { Living, ENCUMBRANCE_THRESHOLDS, ENCUMBRANCE_PENALTIES, POSTURE_REGEN_MULTIPLIERS, CAMPFIRE_WARMTH_BONUS } from './living.js';
export type { EncumbranceLevel, PostureState } from './living.js';
export { Player, BASE_HP_REGEN_RATE, BASE_MP_REGEN_RATE, REGEN_SCALE_BASE_STAT } from './player.js';
export { NPC } from './npc.js';
export { Merchant } from './merchant.js';

// Consumables
export { Consumable, Effects } from './consumable.js';
export type { ConsumableType, ConsumableConfig, RegenEffect, StatBuff } from './consumable.js';
export { Campfire, DEFAULT_FUEL_DURATION, LOW_FUEL_WARNING } from './campfire.js';

// Equipment
export { Weapon } from './weapon.js';
export type { DamageType, WeaponSlot, SpecialAttackCallback } from './weapon.js';
export { Armor } from './armor.js';
export type { ArmorSlot } from './armor.js';
export * from './equipment.js';

// Combat
export { Corpse } from './corpse.js';
export * from './combat/index.js';

// Vehicles
export { Vehicle } from './vehicle.js';
export type { VehicleType } from './vehicle.js';
export { Ferry } from './ferry.js';
export type { FerryStop, FerrySchedule, FerryState } from './ferry.js';

// Visibility
export * from './visibility/index.js';

// Note: Trainer is NOT exported from this barrel to avoid circular dependency.
// Import directly: import { Trainer } from '../std/trainer.js';
