/**
 * Terminal - Renders styled text output in the browser.
 *
 * Handles ANSI escape sequences for colors and formatting.
 */

/**
 * ANSI escape sequence parser state.
 */
interface AnsiState {
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  blink: boolean;
  reverse: boolean;
  hidden: boolean;
  strikethrough: boolean;
  fgColor: string | null;
  bgColor: string | null;
}

/**
 * Terminal emulator for displaying MUD output.
 */
export class Terminal {
  private element: HTMLElement;
  private maxLines: number;
  private autoScroll: boolean;

  constructor(element: HTMLElement, maxLines: number = 1000) {
    this.element = element;
    this.maxLines = maxLines;
    this.autoScroll = true;

    // Set up scroll detection
    this.element.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.element;
      this.autoScroll = scrollHeight - scrollTop - clientHeight < 50;
    });
  }

  /**
   * Add a line of output.
   */
  addLine(text: string, className?: string): void {
    const line = document.createElement('div');
    line.className = 'line' + (className ? ` ${className}` : '');

    // Parse ANSI escape sequences
    line.innerHTML = this.parseAnsi(text);

    this.element.appendChild(line);
    this.trimLines();
    this.scrollToBottom();
  }

  /**
   * Add an input echo line.
   */
  addInputLine(text: string): void {
    this.addLine(`> ${text}`, 'input');
  }

  /**
   * Add a system message line.
   */
  addSystemLine(text: string): void {
    this.addLine(`[System] ${text}`, 'system');
  }

  /**
   * Add an error line.
   */
  addErrorLine(text: string): void {
    this.addLine(`[Error] ${text}`, 'error');
  }

  /**
   * Clear the terminal.
   */
  clear(): void {
    this.element.innerHTML = '';
  }

  /**
   * Scroll to the bottom of the terminal.
   */
  scrollToBottom(): void {
    if (this.autoScroll) {
      this.element.scrollTop = this.element.scrollHeight;
    }
  }

  /**
   * Trim lines if over the maximum.
   */
  private trimLines(): void {
    while (this.element.children.length > this.maxLines) {
      this.element.removeChild(this.element.firstChild!);
    }
  }

  /**
   * Parse ANSI escape sequences and convert to HTML.
   */
  private parseAnsi(text: string): string {
    // Escape HTML special characters first
    const escaped = this.escapeHtml(text);

    // ANSI escape sequence regex
    const ansiRegex = /\x1b\[([0-9;]*)m/g;

    let result = '';
    let lastIndex = 0;
    let currentState: AnsiState = this.createDefaultState();
    let match: RegExpExecArray | null;

    while ((match = ansiRegex.exec(escaped)) !== null) {
      // Add text before the escape sequence
      if (match.index > lastIndex) {
        const textPart = escaped.slice(lastIndex, match.index);
        result += this.wrapWithStyles(textPart, currentState);
      }

      // Parse the escape sequence
      const codes = match[1].split(';').map(Number);
      currentState = this.applyAnsiCodes(currentState, codes);

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < escaped.length) {
      const textPart = escaped.slice(lastIndex);
      result += this.wrapWithStyles(textPart, currentState);
    }

    return result || escaped;
  }

  /**
   * Create a default ANSI state.
   */
  private createDefaultState(): AnsiState {
    return {
      bold: false,
      dim: false,
      italic: false,
      underline: false,
      blink: false,
      reverse: false,
      hidden: false,
      strikethrough: false,
      fgColor: null,
      bgColor: null,
    };
  }

  /**
   * Apply ANSI codes to state.
   */
  private applyAnsiCodes(state: AnsiState, codes: number[]): AnsiState {
    const newState = { ...state };

    for (const code of codes) {
      if (code === 0) {
        // Reset
        return this.createDefaultState();
      } else if (code === 1) {
        newState.bold = true;
      } else if (code === 2) {
        newState.dim = true;
      } else if (code === 3) {
        newState.italic = true;
      } else if (code === 4) {
        newState.underline = true;
      } else if (code === 5) {
        newState.blink = true;
      } else if (code === 7) {
        newState.reverse = true;
      } else if (code === 8) {
        newState.hidden = true;
      } else if (code === 9) {
        newState.strikethrough = true;
      } else if (code >= 30 && code <= 37) {
        newState.fgColor = this.getColorName(code - 30);
      } else if (code === 39) {
        newState.fgColor = null;
      } else if (code >= 40 && code <= 47) {
        newState.bgColor = this.getColorName(code - 40);
      } else if (code === 49) {
        newState.bgColor = null;
      } else if (code >= 90 && code <= 97) {
        newState.fgColor = this.getBrightColorName(code - 90);
      } else if (code >= 100 && code <= 107) {
        newState.bgColor = this.getBrightColorName(code - 100);
      }
    }

    return newState;
  }

  /**
   * Get color name for standard ANSI colors.
   */
  private getColorName(index: number): string {
    const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    return colors[index] || 'white';
  }

  /**
   * Get color name for bright ANSI colors.
   */
  private getBrightColorName(index: number): string {
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
    return colors[index] || 'bright-white';
  }

  /**
   * Wrap text with style classes.
   */
  private wrapWithStyles(text: string, state: AnsiState): string {
    if (text.length === 0) return '';

    const classes: string[] = [];

    if (state.bold) classes.push('ansi-bold');
    if (state.dim) classes.push('ansi-dim');
    if (state.italic) classes.push('ansi-italic');
    if (state.underline) classes.push('ansi-underline');
    if (state.blink) classes.push('ansi-blink');
    if (state.reverse) classes.push('ansi-reverse');
    if (state.hidden) classes.push('ansi-hidden');
    if (state.strikethrough) classes.push('ansi-strikethrough');
    if (state.fgColor) classes.push(`ansi-fg-${state.fgColor}`);
    if (state.bgColor) classes.push(`ansi-bg-${state.bgColor}`);

    if (classes.length === 0) {
      return text;
    }

    return `<span class="${classes.join(' ')}">${text}</span>`;
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export default Terminal;
