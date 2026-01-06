/**
 * Chat Colors - Shared utilities for managing chat message colors.
 *
 * Used by say, tell, remote emotes, and other communication commands.
 */

import type { MudObject } from '../std/object.js';

// Default colors for each chat type
export const DEFAULT_CHAT_COLORS: Record<string, string> = {
  say: 'white',
  tell: 'magenta',
  remote: 'cyan',
};

/**
 * Get a player's color setting for a message type.
 */
export function getPlayerColor(player: MudObject, type: string): string {
  const playerWithProps = player as MudObject & { getProperty?(key: string): unknown };
  if (typeof playerWithProps.getProperty !== 'function') {
    return DEFAULT_CHAT_COLORS[type] || 'white';
  }

  const colors = playerWithProps.getProperty('chatColors') as Record<string, string> | undefined;
  return colors?.[type] || DEFAULT_CHAT_COLORS[type] || 'white';
}

/**
 * Format a message with a color.
 */
export function formatWithColor(color: string, text: string): string {
  // Handle bold variants
  if (color.startsWith('bold')) {
    const baseColor = color.slice(4); // Remove 'bold' prefix
    return `{bold}{${baseColor}}${text}{/}`;
  }
  if (color === 'gray' || color === 'grey') {
    return `{dim}${text}{/}`;
  }
  return `{${color}}${text}{/}`;
}

export default { getPlayerColor, formatWithColor, DEFAULT_CHAT_COLORS };
