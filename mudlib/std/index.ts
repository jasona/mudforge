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
export { Item } from './item.js';
export { Container } from './container.js';

// Living beings
export { Living } from './living.js';
export { Player } from './player.js';
export { NPC } from './npc.js';

// Equipment
export { Weapon } from './weapon.js';
export type { DamageType, WeaponSlot, SpecialAttackCallback } from './weapon.js';
export { Armor } from './armor.js';
export type { ArmorSlot } from './armor.js';
export * from './equipment.js';

// Combat
export { Corpse } from './corpse.js';
export * from './combat/index.js';
