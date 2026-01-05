/**
 * Color System - ANSI color codes for terminal output.
 *
 * Usage in text:
 *   "This is {red}red text{/} and this is {bold}{green}bold green{/}."
 *
 * Available colors:
 *   {black}, {red}, {green}, {yellow}, {blue}, {magenta}, {cyan}, {white}
 *
 * Bright colors:
 *   {BLACK}, {RED}, {GREEN}, {YELLOW}, {BLUE}, {MAGENTA}, {CYAN}, {WHITE}
 *
 * Background colors:
 *   {bg:red}, {bg:green}, etc.
 *
 * Styles:
 *   {bold}, {dim}, {italic}, {underline}, {blink}, {reverse}, {hidden}
 *
 * Reset:
 *   {/} or {reset} - reset all formatting
 */

/**
 * ANSI escape code prefix.
 */
const ESC = '\x1b[';

/**
 * ANSI color codes.
 */
export const ANSI = {
  // Reset
  reset: `${ESC}0m`,

  // Styles
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,
  blink: `${ESC}5m`,
  reverse: `${ESC}7m`,
  hidden: `${ESC}8m`,

  // Foreground colors (normal)
  black: `${ESC}30m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  magenta: `${ESC}35m`,
  cyan: `${ESC}36m`,
  white: `${ESC}37m`,

  // Foreground colors (bright)
  BLACK: `${ESC}90m`,
  RED: `${ESC}91m`,
  GREEN: `${ESC}92m`,
  YELLOW: `${ESC}93m`,
  BLUE: `${ESC}94m`,
  MAGENTA: `${ESC}95m`,
  CYAN: `${ESC}96m`,
  WHITE: `${ESC}97m`,

  // Background colors (normal)
  bgBlack: `${ESC}40m`,
  bgRed: `${ESC}41m`,
  bgGreen: `${ESC}42m`,
  bgYellow: `${ESC}43m`,
  bgBlue: `${ESC}44m`,
  bgMagenta: `${ESC}45m`,
  bgCyan: `${ESC}46m`,
  bgWhite: `${ESC}47m`,

  // Background colors (bright)
  bgBLACK: `${ESC}100m`,
  bgRED: `${ESC}101m`,
  bgGREEN: `${ESC}102m`,
  bgYELLOW: `${ESC}103m`,
  bgBLUE: `${ESC}104m`,
  bgMAGENTA: `${ESC}105m`,
  bgCYAN: `${ESC}106m`,
  bgWHITE: `${ESC}107m`,
};

/**
 * Token to ANSI code mapping.
 */
const TOKEN_MAP: Record<string, string> = {
  // Reset
  '/': ANSI.reset,
  reset: ANSI.reset,

  // Styles
  bold: ANSI.bold,
  b: ANSI.bold,
  dim: ANSI.dim,
  italic: ANSI.italic,
  i: ANSI.italic,
  underline: ANSI.underline,
  u: ANSI.underline,
  blink: ANSI.blink,
  reverse: ANSI.reverse,
  hidden: ANSI.hidden,

  // Foreground colors (normal)
  black: ANSI.black,
  red: ANSI.red,
  green: ANSI.green,
  yellow: ANSI.yellow,
  blue: ANSI.blue,
  magenta: ANSI.magenta,
  cyan: ANSI.cyan,
  white: ANSI.white,

  // Foreground colors (bright) - uppercase
  BLACK: ANSI.BLACK,
  RED: ANSI.RED,
  GREEN: ANSI.GREEN,
  YELLOW: ANSI.YELLOW,
  BLUE: ANSI.BLUE,
  MAGENTA: ANSI.MAGENTA,
  CYAN: ANSI.CYAN,
  WHITE: ANSI.WHITE,

  // Background colors
  'bg:black': ANSI.bgBlack,
  'bg:red': ANSI.bgRed,
  'bg:green': ANSI.bgGreen,
  'bg:yellow': ANSI.bgYellow,
  'bg:blue': ANSI.bgBlue,
  'bg:magenta': ANSI.bgMagenta,
  'bg:cyan': ANSI.bgCyan,
  'bg:white': ANSI.bgWhite,

  // Background colors (bright)
  'bg:BLACK': ANSI.bgBLACK,
  'bg:RED': ANSI.bgRED,
  'bg:GREEN': ANSI.bgGREEN,
  'bg:YELLOW': ANSI.bgYELLOW,
  'bg:BLUE': ANSI.bgBLUE,
  'bg:MAGENTA': ANSI.bgMAGENTA,
  'bg:CYAN': ANSI.bgCYAN,
  'bg:WHITE': ANSI.bgWHITE,
};

/**
 * Regex to match color tokens like {red}, {bold}, {/}, etc.
 */
const TOKEN_REGEX = /\{([a-zA-Z/:]+)\}/g;

/**
 * Process a string and replace color tokens with ANSI codes.
 * @param text The text containing color tokens
 * @returns Text with ANSI escape codes
 */
export function colorize(text: string): string {
  return text.replace(TOKEN_REGEX, (match, token) => {
    return TOKEN_MAP[token] ?? match;
  });
}

/**
 * Strip all color tokens from text.
 * @param text The text containing color tokens
 * @returns Plain text without color tokens
 */
export function stripColors(text: string): string {
  return text.replace(TOKEN_REGEX, '');
}

/**
 * Strip ANSI escape codes from text.
 * @param text The text containing ANSI codes
 * @returns Plain text without ANSI codes
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Helper functions to wrap text in color codes.
 */
export const color = {
  // Styles
  bold: (text: string) => `${ANSI.bold}${text}${ANSI.reset}`,
  dim: (text: string) => `${ANSI.dim}${text}${ANSI.reset}`,
  italic: (text: string) => `${ANSI.italic}${text}${ANSI.reset}`,
  underline: (text: string) => `${ANSI.underline}${text}${ANSI.reset}`,

  // Normal colors
  black: (text: string) => `${ANSI.black}${text}${ANSI.reset}`,
  red: (text: string) => `${ANSI.red}${text}${ANSI.reset}`,
  green: (text: string) => `${ANSI.green}${text}${ANSI.reset}`,
  yellow: (text: string) => `${ANSI.yellow}${text}${ANSI.reset}`,
  blue: (text: string) => `${ANSI.blue}${text}${ANSI.reset}`,
  magenta: (text: string) => `${ANSI.magenta}${text}${ANSI.reset}`,
  cyan: (text: string) => `${ANSI.cyan}${text}${ANSI.reset}`,
  white: (text: string) => `${ANSI.white}${text}${ANSI.reset}`,

  // Bright colors
  brightBlack: (text: string) => `${ANSI.BLACK}${text}${ANSI.reset}`,
  brightRed: (text: string) => `${ANSI.RED}${text}${ANSI.reset}`,
  brightGreen: (text: string) => `${ANSI.GREEN}${text}${ANSI.reset}`,
  brightYellow: (text: string) => `${ANSI.YELLOW}${text}${ANSI.reset}`,
  brightBlue: (text: string) => `${ANSI.BLUE}${text}${ANSI.reset}`,
  brightMagenta: (text: string) => `${ANSI.MAGENTA}${text}${ANSI.reset}`,
  brightCyan: (text: string) => `${ANSI.CYAN}${text}${ANSI.reset}`,
  brightWhite: (text: string) => `${ANSI.WHITE}${text}${ANSI.reset}`,
};

/**
 * Semantic color helpers for common use cases.
 */
export const semantic = {
  // Room elements
  roomTitle: (text: string) => `${ANSI.bold}${ANSI.cyan}${text}${ANSI.reset}`,
  roomDesc: (text: string) => text,
  exits: (text: string) => `${ANSI.green}${text}${ANSI.reset}`,

  // Objects
  item: (text: string) => `${ANSI.yellow}${text}${ANSI.reset}`,
  npc: (text: string) => `${ANSI.magenta}${text}${ANSI.reset}`,
  player: (text: string) => `${ANSI.cyan}${text}${ANSI.reset}`,

  // Combat
  damage: (text: string) => `${ANSI.red}${text}${ANSI.reset}`,
  heal: (text: string) => `${ANSI.green}${text}${ANSI.reset}`,
  combat: (text: string) => `${ANSI.RED}${text}${ANSI.reset}`,

  // System messages
  error: (text: string) => `${ANSI.bold}${ANSI.red}${text}${ANSI.reset}`,
  warning: (text: string) => `${ANSI.yellow}${text}${ANSI.reset}`,
  success: (text: string) => `${ANSI.green}${text}${ANSI.reset}`,
  info: (text: string) => `${ANSI.cyan}${text}${ANSI.reset}`,

  // Communication
  say: (text: string) => `${ANSI.white}${text}${ANSI.reset}`,
  shout: (text: string) => `${ANSI.YELLOW}${text}${ANSI.reset}`,
  whisper: (text: string) => `${ANSI.dim}${text}${ANSI.reset}`,
  emote: (text: string) => `${ANSI.magenta}${text}${ANSI.reset}`,
};

/**
 * Get visible length of text (excluding ANSI codes).
 * Useful for padding/alignment.
 */
export function visibleLength(text: string): number {
  return stripAnsi(stripColors(text)).length;
}

/**
 * Pad text to a certain visible length.
 */
export function padEnd(text: string, length: number, char: string = ' '): string {
  const visible = visibleLength(text);
  if (visible >= length) return text;
  return text + char.repeat(length - visible);
}

/**
 * Pad text to a certain visible length (left side).
 */
export function padStart(text: string, length: number, char: string = ' '): string {
  const visible = visibleLength(text);
  if (visible >= length) return text;
  return char.repeat(length - visible) + text;
}

export default {
  ANSI,
  colorize,
  stripColors,
  stripAnsi,
  color,
  semantic,
  visibleLength,
  padEnd,
  padStart,
};
