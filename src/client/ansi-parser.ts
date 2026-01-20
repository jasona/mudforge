/**
 * ANSI Parser - Converts ANSI escape sequences to HTML.
 *
 * Shared utility for rendering colored text in the terminal and modals.
 */

/**
 * ANSI state tracking.
 */
interface AnsiState {
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  reverse: boolean;
  hidden: boolean;
  strikethrough: boolean;
  fgColor: string | null;
  bgColor: string | null;
}

/**
 * Create a default ANSI state.
 */
function createDefaultState(): AnsiState {
  return {
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    reverse: false,
    hidden: false,
    strikethrough: false,
    fgColor: null,
    bgColor: null,
  };
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Get color name for standard ANSI colors.
 */
function getColorName(index: number): string {
  const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
  return colors[index] || 'white';
}

/**
 * Get color name for bright ANSI colors.
 */
function getBrightColorName(index: number): string {
  const colors = [
    'bright-black',
    'bright-red',
    'bright-green',
    'bright-yellow',
    'bright-blue',
    'bright-magenta',
    'bright-cyan',
    'bright-white',
  ];
  return colors[index] || 'white';
}

/**
 * Apply ANSI codes to state.
 */
function applyAnsiCodes(state: AnsiState, codes: number[]): AnsiState {
  const newState = { ...state };

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];

    switch (code) {
      case 0: // Reset
        Object.assign(newState, createDefaultState());
        break;
      case 1:
        newState.bold = true;
        break;
      case 2:
        newState.dim = true;
        break;
      case 3:
        newState.italic = true;
        break;
      case 4:
        newState.underline = true;
        break;
      case 7:
        newState.reverse = true;
        break;
      case 8:
        newState.hidden = true;
        break;
      case 9:
        newState.strikethrough = true;
        break;
      case 22:
        newState.bold = false;
        newState.dim = false;
        break;
      case 23:
        newState.italic = false;
        break;
      case 24:
        newState.underline = false;
        break;
      case 27:
        newState.reverse = false;
        break;
      case 28:
        newState.hidden = false;
        break;
      case 29:
        newState.strikethrough = false;
        break;

      // Foreground colors 30-37
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
        newState.fgColor = getColorName(code - 30);
        break;

      case 38: // Extended foreground color
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          newState.fgColor = `color-${codes[i + 2]}`;
          i += 2;
        } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          newState.fgColor = `rgb-${codes[i + 2]}-${codes[i + 3]}-${codes[i + 4]}`;
          i += 4;
        }
        break;

      case 39: // Default foreground
        newState.fgColor = null;
        break;

      // Background colors 40-47
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
        newState.bgColor = getColorName(code - 40);
        break;

      case 48: // Extended background color
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          newState.bgColor = `color-${codes[i + 2]}`;
          i += 2;
        } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          newState.bgColor = `rgb-${codes[i + 2]}-${codes[i + 3]}-${codes[i + 4]}`;
          i += 4;
        }
        break;

      case 49: // Default background
        newState.bgColor = null;
        break;

      // Bright foreground colors 90-97
      case 90:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
      case 96:
      case 97:
        newState.fgColor = getBrightColorName(code - 90);
        break;

      // Bright background colors 100-107
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
        newState.bgColor = getBrightColorName(code - 100);
        break;
    }
  }

  return newState;
}

/**
 * Wrap text with style classes.
 */
function wrapWithStyles(text: string, state: AnsiState): string {
  if (text.length === 0) return '';

  const classes: string[] = [];
  const styles: string[] = [];

  if (state.bold) classes.push('ansi-bold');
  if (state.dim) classes.push('ansi-dim');
  if (state.italic) classes.push('ansi-italic');
  if (state.underline) classes.push('ansi-underline');
  if (state.reverse) classes.push('ansi-reverse');
  if (state.hidden) classes.push('ansi-hidden');
  if (state.strikethrough) classes.push('ansi-strikethrough');

  // Handle foreground color
  if (state.fgColor) {
    if (state.fgColor.startsWith('color-')) {
      // 256-color mode
      const colorNum = state.fgColor.slice(6);
      styles.push(`color: var(--color-${colorNum}, inherit)`);
    } else if (state.fgColor.startsWith('rgb-')) {
      // RGB mode
      const parts = state.fgColor.slice(4).split('-');
      styles.push(`color: rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`);
    } else {
      classes.push(`ansi-fg-${state.fgColor}`);
    }
  }

  // Handle background color
  if (state.bgColor) {
    if (state.bgColor.startsWith('color-')) {
      // 256-color mode
      const colorNum = state.bgColor.slice(6);
      styles.push(`background-color: var(--color-${colorNum}, inherit)`);
    } else if (state.bgColor.startsWith('rgb-')) {
      // RGB mode
      const parts = state.bgColor.slice(4).split('-');
      styles.push(`background-color: rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`);
    } else {
      classes.push(`ansi-bg-${state.bgColor}`);
    }
  }

  if (classes.length === 0 && styles.length === 0) {
    return text;
  }

  let tag = '<span';
  if (classes.length > 0) {
    tag += ` class="${classes.join(' ')}"`;
  }
  if (styles.length > 0) {
    tag += ` style="${styles.join('; ')}"`;
  }
  tag += '>';

  return `${tag}${text}</span>`;
}

/**
 * Parse ANSI escape sequences and convert to HTML.
 * @param text Raw text with ANSI codes
 * @returns HTML string with styled spans
 */
export function parseAnsi(text: string): string {
  // Escape HTML special characters first
  const escaped = escapeHtml(text);

  // ANSI escape sequence regex
  const ansiRegex = /\x1b\[([0-9;]*)m/g;

  let result = '';
  let lastIndex = 0;
  let currentState: AnsiState = createDefaultState();
  let match: RegExpExecArray | null;

  while ((match = ansiRegex.exec(escaped)) !== null) {
    // Add text before the escape sequence
    if (match.index > lastIndex) {
      const textPart = escaped.slice(lastIndex, match.index);
      result += wrapWithStyles(textPart, currentState);
    }

    // Parse the escape sequence
    const codes = match[1].split(';').map(Number);
    currentState = applyAnsiCodes(currentState, codes);

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < escaped.length) {
    result += wrapWithStyles(escaped.slice(lastIndex), currentState);
  }

  return result || escaped;
}

/**
 * Strip ANSI escape sequences from text.
 * @param text Text with ANSI codes
 * @returns Plain text without ANSI codes
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}
