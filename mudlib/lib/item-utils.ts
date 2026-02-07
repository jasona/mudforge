/**
 * Item utilities for finding items with index support.
 *
 * Supports syntax like:
 *   "sword"       - Find the first sword
 *   "sword 2"     - Find the second sword
 *   "all"         - Match all items
 *   "all sword"   - Match all swords
 */

import type { MudObject } from './std.js';

export interface ParsedItemInput {
  name: string; // Base item name (or 'all' if isAll && !isAllOfType)
  index?: number; // 1-based index (e.g., "sword 2" -> 2)
  isAll: boolean; // True if "all" keyword (all items)
  isAllOfType: boolean; // True if "all <item>" (all of specific type)
}

/**
 * Parse item input string to extract name and optional index.
 *
 * Examples:
 *   "sword"     -> { name: "sword", isAll: false, isAllOfType: false }
 *   "sword 2"   -> { name: "sword", index: 2, isAll: false, isAllOfType: false }
 *   "all"       -> { name: "all", isAll: true, isAllOfType: false }
 *   "all sword" -> { name: "sword", isAll: false, isAllOfType: true }
 */
export function parseItemInput(input: string): ParsedItemInput {
  const trimmed = input.trim().toLowerCase();

  // Check for bare "all"
  if (trimmed === 'all') {
    return { name: 'all', isAll: true, isAllOfType: false };
  }

  // Check for "all <item>" pattern
  const allMatch = trimmed.match(/^all\s+(.+)$/);
  if (allMatch) {
    return { name: allMatch[1].trim(), isAll: false, isAllOfType: true };
  }

  // Match "name <number>" pattern at end of string
  const match = trimmed.match(/^(.+?)\s+(\d+)$/);
  if (match && parseInt(match[2], 10) > 0) {
    return { name: match[1].trim(), index: parseInt(match[2], 10), isAll: false, isAllOfType: false };
  }

  return { name: trimmed, isAll: false, isAllOfType: false };
}

/**
 * Find all items matching a name in a list.
 */
export function findAllMatching(name: string, items: MudObject[]): MudObject[] {
  const lowerName = name.toLowerCase();
  return items.filter((item) => item.id(lowerName));
}

/**
 * Find item by name with optional 1-based index.
 *
 * @param name - The item name to search for
 * @param items - List of items to search
 * @param index - Optional 1-based index (e.g., 2 for second match)
 * @returns The matching item or undefined
 */
export function findItem(
  name: string,
  items: MudObject[],
  index?: number
): MudObject | undefined {
  const matches = findAllMatching(name, items);

  if (matches.length === 0) return undefined;

  if (index !== undefined) {
    if (index < 1 || index > matches.length) return undefined;
    return matches[index - 1]; // Convert to 0-based
  }

  return matches[0]; // Default to first match
}

/**
 * Count how many items match a name.
 */
export function countMatching(name: string, items: MudObject[]): number {
  return findAllMatching(name, items).length;
}

/**
 * Check if a name is a gold-related keyword.
 * These should NOT be treated with index parsing.
 */
export function isGoldKeyword(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === 'gold' || lower === 'coins' || lower === 'coin';
}

/**
 * Unequip an item if it's currently equipped (wielded or worn).
 */
export function unequipIfNeeded(item: MudObject): void {
  // Check if it's a wielded weapon
  if ('unwield' in item) {
    const weapon = item as MudObject & { isWielded: boolean; unwield(): void };
    if (weapon.isWielded) {
      weapon.unwield();
    }
  }
  // Check if it's worn armor
  if ('remove' in item && 'isWorn' in item) {
    const armor = item as MudObject & { isWorn: boolean; remove(): void };
    if (armor.isWorn) {
      armor.remove();
    }
  }
}
