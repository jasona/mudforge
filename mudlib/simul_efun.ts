/**
 * Simulated Efuns - Mudlib-provided efun extensions.
 *
 * These are convenience functions built on top of the driver efuns.
 * They are available to all mudlib objects.
 */

import { MudObject } from './std/object.js';

// ========== String Functions ==========

/**
 * Capitalize the first letter of each word.
 * @param str The string to capitalize
 */
export function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map((word) => (typeof efuns !== 'undefined' ? efuns.capitalize(word) : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/**
 * Add an article (a/an) to a string based on the first letter.
 * @param str The string to add an article to
 */
export function addArticle(str: string): string {
  if (!str) return str;
  const firstChar = str.charAt(0).toLowerCase();
  const vowels = 'aeiou';
  return vowels.includes(firstChar) ? `an ${str}` : `a ${str}`;
}

/**
 * Pluralize a word (simple English rules).
 * @param word The word to pluralize
 * @param count Optional count (only pluralizes if count != 1)
 */
export function pluralize(word: string, count?: number): string {
  if (count === 1) return word;

  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') ||
      word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  if (word.endsWith('y') && !'aeiou'.includes(word.charAt(word.length - 2))) {
    return word.slice(0, -1) + 'ies';
  }
  return word + 's';
}

/**
 * Format a number with commas.
 * @param num The number to format
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Wrap text to a specific width.
 * @param text The text to wrap
 * @param width Maximum line width
 */
export function wrapText(text: string, width: number = 80): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.join('\n');
}

// ========== Time Functions ==========

/**
 * Format seconds into a human-readable duration.
 * @param seconds The number of seconds
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

  return parts.join(', ');
}

/**
 * Get current date/time as a formatted string.
 * @param format Optional format string (basic support)
 */
export function dateString(format?: string): string {
  const now = new Date();
  return now.toLocaleString();
}

// ========== Object Functions ==========

/**
 * Tell everyone in a room a message.
 * @param room The room object or path
 * @param message The message to send
 * @param exclude Objects to exclude
 */
export function tell_room(room: MudObject | string, message: string, exclude: MudObject[] = []): void {
  let roomObj: MudObject | undefined;

  if (typeof room === 'string') {
    roomObj = typeof efuns !== 'undefined' ? efuns.findObject(room) : undefined;
  } else {
    roomObj = room;
  }

  if (!roomObj) return;

  const excludeSet = new Set(exclude);

  for (const obj of roomObj.inventory) {
    if (excludeSet.has(obj)) continue;

    const receiver = obj as MudObject & { receive?: (msg: string) => void };
    if (typeof receiver.receive === 'function') {
      receiver.receive(message);
    } else if (typeof efuns !== 'undefined') {
      efuns.send(obj, message);
    }
  }
}

/**
 * Send a message to a single object.
 * @param target The target object or path
 * @param message The message to send
 */
export function tell_object(target: MudObject | string, message: string): void {
  let targetObj: MudObject | undefined;

  if (typeof target === 'string') {
    targetObj = typeof efuns !== 'undefined' ? efuns.findObject(target) : undefined;
  } else {
    targetObj = target;
  }

  if (!targetObj) return;

  const receiver = targetObj as MudObject & { receive?: (msg: string) => void };
  if (typeof receiver.receive === 'function') {
    receiver.receive(message);
  } else if (typeof efuns !== 'undefined') {
    efuns.send(targetObj, message);
  }
}

/**
 * Write a message to the current player.
 * @param message The message to write
 */
export function write(message: string): void {
  const player = typeof efuns !== 'undefined' ? efuns.thisPlayer() : null;
  if (player) {
    tell_object(player, message);
  }
}

/**
 * Say something to the room (from current player).
 * @param message The message to say
 */
export function say(message: string): void {
  const player = typeof efuns !== 'undefined' ? efuns.thisPlayer() : null;
  if (!player || !player.environment) return;

  const name = player.shortDesc;
  tell_room(player.environment, `${name} says: ${message}`, [player]);
}

// ========== Array Functions ==========

/**
 * Shuffle an array randomly.
 * @param arr The array to shuffle
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  const random = typeof efuns !== 'undefined' ? efuns.random : (max: number) =>
    Math.floor(Math.random() * max);

  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick a random element from an array.
 * @param arr The array to pick from
 */
export function randomElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const idx = typeof efuns !== 'undefined' ? efuns.random(arr.length) : Math.floor(Math.random() * arr.length);
  return arr[idx];
}

/**
 * Remove duplicates from an array.
 * @param arr The array to deduplicate
 */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ========== Dice Functions ==========

/**
 * Roll dice using standard notation (e.g., "2d6+3").
 * @param notation The dice notation string
 */
export function roll(notation: string): number {
  const match = notation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
  if (!match) return 0;

  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);
  const modifier = parseInt(match[3] || '0', 10);

  const random = typeof efuns !== 'undefined' ? efuns.random : (max: number) =>
    Math.floor(Math.random() * max);

  let total = modifier;
  for (let i = 0; i < count; i++) {
    total += random(sides) + 1;
  }

  return total;
}

/**
 * Roll a single die.
 * @param sides Number of sides
 */
export function die(sides: number): number {
  const random = typeof efuns !== 'undefined' ? efuns.random(sides) : Math.floor(Math.random() * sides);
  return random + 1;
}

// ========== Export all simul_efuns ==========

export default {
  // String
  capitalizeWords,
  addArticle,
  pluralize,
  formatNumber,
  wrapText,

  // Time
  formatDuration,
  dateString,

  // Object
  tell_room,
  tell_object,
  write,
  say,

  // Array
  shuffle,
  randomElement,
  unique,

  // Dice
  roll,
  die,
};
