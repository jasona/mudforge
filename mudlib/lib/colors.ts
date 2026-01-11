/**
 * Color System - ANSI color codes for terminal output (256-color support).
 *
 * Usage in text:
 *   "This is {red}red text{/} and this is {bold}{green}bold green{/}."
 *
 * Basic colors (16-color):
 *   {black}, {red}, {green}, {yellow}, {blue}, {magenta}, {cyan}, {white}
 *
 * Bright colors:
 *   {BLACK}, {RED}, {GREEN}, {YELLOW}, {BLUE}, {MAGENTA}, {CYAN}, {WHITE}
 *
 * 256-color mode:
 *   {fg:123}      - Foreground color 0-255
 *   {bg:123}      - Background color 0-255
 *   {rgb:R,G,B}   - RGB color (0-255 each), mapped to nearest 256 color
 *   {gray:N}      - Grayscale 0-23 (maps to colors 232-255)
 *
 * Extended named colors (256-color palette):
 *   {orange}, {pink}, {purple}, {brown}, {lime}, {teal}, {navy}, {maroon}
 *   {olive}, {silver}, {gold}, {coral}, {salmon}, {violet}, {indigo}, {crimson}
 *   {azure}, {aqua}, {mint}, {lavender}, {rose}, {peach}, {sky}, {forest}
 *
 * Background colors:
 *   {bg:red}, {bg:green}, etc. (basic)
 *   {bg:orange}, {bg:pink}, etc. (extended)
 *
 * Styles:
 *   {bold}, {dim}, {italic}, {underline}, {reverse}, {hidden}
 *
 * Reset:
 *   {/} or {reset} - reset all formatting
 */

/**
 * ANSI escape code prefix.
 */
const ESC = '\x1b[';

/**
 * Generate 256-color foreground code.
 */
function fg256(n: number): string {
  return `${ESC}38;5;${Math.max(0, Math.min(255, Math.floor(n)))}m`;
}

/**
 * Generate 256-color background code.
 */
function bg256(n: number): string {
  return `${ESC}48;5;${Math.max(0, Math.min(255, Math.floor(n)))}m`;
}

/**
 * Convert RGB to nearest 256-color palette index.
 * The 256-color palette is:
 *   0-15: Standard colors
 *   16-231: 6x6x6 color cube
 *   232-255: Grayscale
 */
function rgbTo256(r: number, g: number, b: number): number {
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Check if grayscale (r ≈ g ≈ b)
  if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10) {
    const gray = (r + g + b) / 3;
    if (gray < 8) return 16; // Black
    if (gray > 248) return 231; // White
    // Map to grayscale ramp (232-255)
    return Math.round((gray - 8) / 10) + 232;
  }

  // Map to 6x6x6 color cube (16-231)
  const ri = Math.round(r / 51);
  const gi = Math.round(g / 51);
  const bi = Math.round(b / 51);
  return 16 + 36 * ri + 6 * gi + bi;
}

/**
 * ANSI color codes - basic 16 colors.
 */
export const ANSI = {
  // Reset
  reset: `${ESC}0m`,

  // Styles
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,
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
 * Extended 256-color palette - named colors mapped to 256-color indices.
 */
export const COLORS_256: Record<string, number> = {
  // Basic colors (for consistency)
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,

  // Bright basics
  brightblack: 8,
  brightred: 9,
  brightgreen: 10,
  brightyellow: 11,
  brightblue: 12,
  brightmagenta: 13,
  brightcyan: 14,
  brightwhite: 15,

  // Extended colors - reds/pinks
  maroon: 52,
  crimson: 160,
  salmon: 209,
  coral: 203,
  rose: 211,
  pink: 218,
  hotpink: 206,
  deeppink: 199,

  // Oranges/yellows
  orange: 208,
  darkorange: 166,
  gold: 220,
  amber: 214,
  peach: 223,
  tan: 180,
  khaki: 186,

  // Greens
  lime: 118,
  chartreuse: 118,
  forest: 22,
  darkgreen: 28,
  olive: 58,
  mint: 121,
  seafoam: 85,
  emerald: 35,
  jade: 36,

  // Blues
  navy: 17,
  darkblue: 18,
  royalblue: 63,
  sky: 117,
  azure: 39,
  cornflower: 69,
  steel: 67,
  slate: 60,
  powder: 152,

  // Purples
  purple: 129,
  violet: 135,
  indigo: 54,
  lavender: 183,
  plum: 96,
  orchid: 170,
  grape: 93,

  // Cyans/teals
  teal: 30,
  aqua: 51,
  turquoise: 45,
  darkcyan: 36,

  // Browns/neutrals
  brown: 94,
  chocolate: 130,
  sienna: 131,
  rust: 130,
  coffee: 58,
  sand: 186,

  // Grays
  silver: 7,
  gray: 244,
  grey: 244,
  darkgray: 240,
  darkgrey: 240,
  lightgray: 248,
  lightgrey: 248,
  charcoal: 236,
};

/**
 * Token to ANSI code mapping - basic colors.
 */
const TOKEN_MAP: Record<string, string> = {
  // Reset
  '/': ANSI.reset,
  reset: ANSI.reset,

  // Newline
  n: '\n',
  newline: '\n',

  // Styles
  bold: ANSI.bold,
  b: ANSI.bold,
  dim: ANSI.dim,
  italic: ANSI.italic,
  i: ANSI.italic,
  underline: ANSI.underline,
  u: ANSI.underline,
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

  // Background colors (basic)
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

// Add extended 256-color names to TOKEN_MAP
for (const [name, index] of Object.entries(COLORS_256)) {
  // Skip basic colors already in TOKEN_MAP
  if (TOKEN_MAP[name]) continue;

  TOKEN_MAP[name] = fg256(index);
  TOKEN_MAP[`bg:${name}`] = bg256(index);
}

/**
 * Regex to match color tokens.
 * Matches:
 *   {name}           - Basic named colors/styles
 *   {fg:123}         - 256-color foreground by number
 *   {bg:name}        - Background by name
 *   {bg:123}         - 256-color background by number
 *   {rgb:R,G,B}      - RGB color (foreground)
 *   {bgrgb:R,G,B}    - RGB color (background)
 *   {gray:N}         - Grayscale (0-23)
 *   {bggray:N}       - Grayscale background
 */
const TOKEN_REGEX = /\{([a-zA-Z0-9/:,]+)\}/g;

/**
 * Parse and convert a token to ANSI code.
 */
function parseToken(token: string): string | null {
  // Check static token map first
  if (TOKEN_MAP[token]) {
    return TOKEN_MAP[token];
  }

  // Check for fg:N (foreground 256-color number)
  const fgMatch = token.match(/^fg:(\d+)$/);
  if (fgMatch) {
    return fg256(parseInt(fgMatch[1], 10));
  }

  // Check for bg:N (background 256-color number)
  const bgNumMatch = token.match(/^bg:(\d+)$/);
  if (bgNumMatch) {
    return bg256(parseInt(bgNumMatch[1], 10));
  }

  // Check for rgb:R,G,B (foreground RGB)
  const rgbMatch = token.match(/^rgb:(\d+),(\d+),(\d+)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return fg256(rgbTo256(r, g, b));
  }

  // Check for bgrgb:R,G,B (background RGB)
  const bgRgbMatch = token.match(/^bgrgb:(\d+),(\d+),(\d+)$/);
  if (bgRgbMatch) {
    const r = parseInt(bgRgbMatch[1], 10);
    const g = parseInt(bgRgbMatch[2], 10);
    const b = parseInt(bgRgbMatch[3], 10);
    return bg256(rgbTo256(r, g, b));
  }

  // Check for gray:N (grayscale 0-23 -> 232-255)
  const grayMatch = token.match(/^gray:(\d+)$/);
  if (grayMatch) {
    const n = Math.max(0, Math.min(23, parseInt(grayMatch[1], 10)));
    return fg256(232 + n);
  }

  // Check for bggray:N (background grayscale)
  const bgGrayMatch = token.match(/^bggray:(\d+)$/);
  if (bgGrayMatch) {
    const n = Math.max(0, Math.min(23, parseInt(bgGrayMatch[1], 10)));
    return bg256(232 + n);
  }

  return null;
}

/**
 * Process a string and replace color tokens with ANSI codes.
 * @param text The text containing color tokens
 * @returns Text with ANSI escape codes
 */
export function colorize(text: string): string {
  return text.replace(TOKEN_REGEX, (match, token) => {
    const code = parseToken(token);
    return code ?? match;
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

  // 256-color helpers
  fg: (n: number) => (text: string) => `${fg256(n)}${text}${ANSI.reset}`,
  bg: (n: number) => (text: string) => `${bg256(n)}${text}${ANSI.reset}`,
  rgb: (r: number, g: number, b: number) => (text: string) =>
    `${fg256(rgbTo256(r, g, b))}${text}${ANSI.reset}`,
  gray: (n: number) => (text: string) =>
    `${fg256(232 + Math.max(0, Math.min(23, n)))}${text}${ANSI.reset}`,

  // Extended named colors
  orange: (text: string) => `${fg256(COLORS_256.orange)}${text}${ANSI.reset}`,
  pink: (text: string) => `${fg256(COLORS_256.pink)}${text}${ANSI.reset}`,
  purple: (text: string) => `${fg256(COLORS_256.purple)}${text}${ANSI.reset}`,
  brown: (text: string) => `${fg256(COLORS_256.brown)}${text}${ANSI.reset}`,
  lime: (text: string) => `${fg256(COLORS_256.lime)}${text}${ANSI.reset}`,
  teal: (text: string) => `${fg256(COLORS_256.teal)}${text}${ANSI.reset}`,
  navy: (text: string) => `${fg256(COLORS_256.navy)}${text}${ANSI.reset}`,
  gold: (text: string) => `${fg256(COLORS_256.gold)}${text}${ANSI.reset}`,
  coral: (text: string) => `${fg256(COLORS_256.coral)}${text}${ANSI.reset}`,
  violet: (text: string) => `${fg256(COLORS_256.violet)}${text}${ANSI.reset}`,
  indigo: (text: string) => `${fg256(COLORS_256.indigo)}${text}${ANSI.reset}`,
  crimson: (text: string) => `${fg256(COLORS_256.crimson)}${text}${ANSI.reset}`,
  azure: (text: string) => `${fg256(COLORS_256.azure)}${text}${ANSI.reset}`,
  mint: (text: string) => `${fg256(COLORS_256.mint)}${text}${ANSI.reset}`,
  lavender: (text: string) => `${fg256(COLORS_256.lavender)}${text}${ANSI.reset}`,
  rose: (text: string) => `${fg256(COLORS_256.rose)}${text}${ANSI.reset}`,
  peach: (text: string) => `${fg256(COLORS_256.peach)}${text}${ANSI.reset}`,
  sky: (text: string) => `${fg256(COLORS_256.sky)}${text}${ANSI.reset}`,
  forest: (text: string) => `${fg256(COLORS_256.forest)}${text}${ANSI.reset}`,
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

  // Guild-specific (using 256-colors)
  fighter: (text: string) => `${fg256(COLORS_256.crimson)}${text}${ANSI.reset}`,
  mage: (text: string) => `${fg256(COLORS_256.azure)}${text}${ANSI.reset}`,
  thief: (text: string) => `${fg256(COLORS_256.charcoal)}${text}${ANSI.reset}`,
  cleric: (text: string) => `${fg256(COLORS_256.gold)}${text}${ANSI.reset}`,

  // Rarity colors
  common: (text: string) => `${ANSI.white}${text}${ANSI.reset}`,
  uncommon: (text: string) => `${ANSI.green}${text}${ANSI.reset}`,
  rare: (text: string) => `${ANSI.blue}${text}${ANSI.reset}`,
  epic: (text: string) => `${fg256(COLORS_256.purple)}${text}${ANSI.reset}`,
  legendary: (text: string) => `${fg256(COLORS_256.orange)}${text}${ANSI.reset}`,
  mythic: (text: string) => `${fg256(COLORS_256.hotpink)}${text}${ANSI.reset}`,
};

/**
 * Get the 256-color index for a named color.
 */
export function getColorIndex(name: string): number | undefined {
  return COLORS_256[name.toLowerCase()];
}

/**
 * Get ANSI code for a 256-color by index.
 */
export function getFg256(n: number): string {
  return fg256(n);
}

/**
 * Get ANSI background code for a 256-color by index.
 */
export function getBg256(n: number): string {
  return bg256(n);
}

/**
 * Convert RGB to 256-color index.
 */
export function rgbToColor(r: number, g: number, b: number): number {
  return rgbTo256(r, g, b);
}

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

/**
 * Reflow text by joining lines within paragraphs.
 * Single newlines become spaces, double newlines (paragraph breaks) are preserved.
 * @param text The text to reflow
 * @returns Reflowed text with paragraphs intact
 */
export function reflowText(text: string): string {
  // Split on paragraph breaks (blank lines)
  const paragraphs = text.split(/\n\s*\n/);

  // Within each paragraph, join lines with spaces
  const reflowed = paragraphs.map((para) => {
    // Replace single newlines with spaces, collapse multiple spaces
    return para.replace(/\n/g, ' ').replace(/  +/g, ' ').trim();
  });

  // Rejoin paragraphs with double newlines
  return reflowed.join('\n\n');
}

/**
 * Word wrap text to a specified width, preserving ANSI codes.
 * Only wraps lines that exceed the width - does not reflow/join lines.
 * Pre-formatted content (ASCII art, tables) is preserved.
 * @param text The text to wrap
 * @param width Maximum line width (visible characters)
 * @returns Wrapped text with newlines inserted
 */
export function wordWrap(text: string, width: number): string {
  if (width <= 0) return text;

  const lines = text.split('\n');
  const wrappedLines: string[] = [];

  for (const line of lines) {
    if (visibleLength(line) <= width) {
      wrappedLines.push(line);
      continue;
    }

    // Split line into words while preserving ANSI codes
    // First, mark ANSI codes with placeholders, split on spaces, then restore
    const words: string[] = [];
    let currentWord = '';
    let i = 0;

    while (i < line.length) {
      // Check for ANSI escape sequence
      if (line[i] === '\x1b' && i + 1 < line.length && line[i + 1] === '[') {
        const match = line.slice(i).match(/^\x1b\[[0-9;]*m/);
        if (match) {
          currentWord += match[0];
          i += match[0].length;
          continue;
        }
      }

      if (line[i] === ' ') {
        if (currentWord.length > 0) {
          words.push(currentWord);
          currentWord = '';
        }
        i++;
        continue;
      }

      currentWord += line[i];
      i++;
    }
    if (currentWord.length > 0) {
      words.push(currentWord);
    }

    // Now wrap words, tracking active color codes
    let activeCode = '';
    let currentLine = '';
    let currentWidth = 0;

    for (const word of words) {
      const wordVisibleLength = visibleLength(word);

      // Update activeCode based on ANSI codes in the word
      // But save the code at the START of the word for line continuation
      const codeAtWordStart = activeCode;

      // Find all ANSI codes in word and update activeCode
      let match;
      const wordAnsiRegex = /\x1b\[[0-9;]*m/g;
      while ((match = wordAnsiRegex.exec(word)) !== null) {
        if (match[0] === ANSI.reset) {
          activeCode = '';
        } else {
          activeCode += match[0];
        }
      }

      // Check if word fits on current line
      const spaceNeeded = currentWidth > 0 ? 1 : 0;
      if (currentWidth + spaceNeeded + wordVisibleLength > width && currentWidth > 0) {
        // Word doesn't fit - push current line and start new one
        wrappedLines.push(currentLine + ANSI.reset);
        // New line starts with the color that was active at the start of this word
        currentLine = codeAtWordStart + word;
        currentWidth = wordVisibleLength;
      } else {
        // Word fits on current line
        if (currentWidth > 0) {
          currentLine += ' ';
          currentWidth++;
        }
        currentLine += word;
        currentWidth += wordVisibleLength;
      }

      // Handle very long words that exceed width
      if (currentWidth > width && words.length === 1) {
        // Single word that's too long - just push it
        wrappedLines.push(currentLine);
        currentLine = '';
        currentWidth = 0;
      }
    }

    // Push final line
    if (currentLine.length > 0) {
      wrappedLines.push(currentLine);
    }
  }

  return wrappedLines.join('\n');
}

/**
 * Generate a color gradient between two 256-colors.
 * @param startColor Starting color index (0-255)
 * @param endColor Ending color index (0-255)
 * @param steps Number of steps in gradient
 * @returns Array of color indices
 */
export function colorGradient(startColor: number, endColor: number, steps: number): number[] {
  if (steps <= 1) return [startColor];
  if (steps === 2) return [startColor, endColor];

  const gradient: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    gradient.push(Math.round(startColor + (endColor - startColor) * t));
  }
  return gradient;
}

/**
 * Apply a rainbow effect to text.
 * @param text Text to colorize
 * @returns Text with rainbow colors applied
 */
export function rainbow(text: string): string {
  const colors = [196, 208, 226, 118, 51, 21, 93, 201]; // Rainbow palette
  let result = '';
  let colorIndex = 0;

  for (const char of text) {
    if (char === ' ' || char === '\n') {
      result += char;
    } else {
      result += fg256(colors[colorIndex % colors.length]) + char;
      colorIndex++;
    }
  }

  return result + ANSI.reset;
}

export default {
  ANSI,
  COLORS_256,
  colorize,
  stripColors,
  stripAnsi,
  color,
  semantic,
  getColorIndex,
  getFg256,
  getBg256,
  rgbToColor,
  visibleLength,
  padEnd,
  padStart,
  reflowText,
  wordWrap,
  colorGradient,
  rainbow,
};
