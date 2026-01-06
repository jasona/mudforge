/**
 * Equipment slot system types and utilities.
 *
 * This module defines the types for equipment slots, weapon handedness,
 * and provides utilities for equipment management.
 */

/**
 * Weapon handedness - determines which slots a weapon can occupy.
 */
export type WeaponHandedness =
  | 'one_handed' // Can go in main_hand, can dual-wield with light weapon in off_hand
  | 'light' // Can go in main_hand OR off_hand, ideal for dual-wielding
  | 'two_handed'; // Requires both hands, blocks dual-wield and shield

/**
 * All possible equipment slot names.
 * Extensible for future additions (rings, amulets, etc.)
 */
export type EquipmentSlot =
  | 'main_hand' // Primary weapon hand
  | 'off_hand' // Secondary hand (dual-wield weapon, shield, or torch)
  | 'head' // Helmet, hat, crown
  | 'chest' // Body armor, robes
  | 'hands' // Gloves, gauntlets
  | 'legs' // Leg armor, pants
  | 'feet' // Boots, shoes
  | 'cloak'; // Capes, cloaks
// Future slots:
// | 'ring_left'
// | 'ring_right'
// | 'amulet'
// | 'belt'

/**
 * Weapon slot types (subset of EquipmentSlot).
 */
export type WeaponSlot = 'main_hand' | 'off_hand';

/**
 * Armor slot types (subset of EquipmentSlot, plus shield which uses off_hand).
 */
export type ArmorSlot = 'head' | 'chest' | 'hands' | 'legs' | 'feet' | 'cloak' | 'shield';

/**
 * Display names for equipment slots.
 */
export const SLOT_DISPLAY_NAMES: Record<EquipmentSlot, string> = {
  main_hand: 'Main Hand',
  off_hand: 'Off Hand',
  head: 'Head',
  chest: 'Chest',
  hands: 'Hands',
  legs: 'Legs',
  feet: 'Feet',
  cloak: 'Cloak',
};

/**
 * Display order for equipment slots.
 */
export const SLOT_DISPLAY_ORDER: EquipmentSlot[] = [
  'head',
  'chest',
  'cloak',
  'hands',
  'legs',
  'feet',
  'main_hand',
  'off_hand',
];

/**
 * Result of attempting to equip an item.
 */
export interface EquipResult {
  success: boolean;
  message: string;
}

/**
 * Result of checking if an item can be equipped.
 */
export interface CanEquipResult {
  canEquip: boolean;
  reason?: string;
  slot?: EquipmentSlot;
}

export default {
  SLOT_DISPLAY_NAMES,
  SLOT_DISPLAY_ORDER,
};
