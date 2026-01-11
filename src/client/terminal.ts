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
  private scrollPending: boolean;

  constructor(element: HTMLElement, maxLines: number = 1000) {
    this.element = element;
    this.maxLines = maxLines;
    this.autoScroll = true;
    this.scrollPending = false;

    // Set up scroll detection - check if user scrolled away from bottom
    this.element.addEventListener('scroll', () => {
      // Don't update autoScroll if we're programmatically scrolling
      if (this.scrollPending) return;

      const { scrollTop, scrollHeight, clientHeight } = this.element;
      // Use a larger threshold to be more forgiving
      this.autoScroll = scrollHeight - scrollTop - clientHeight < 100;
    });
  }

  /**
   * Add a line of output.
   */
  addLine(text: string, className?: string): void {
    // Handle both actual newlines and literal \n strings
    // First replace literal \n with actual newlines, then split
    const normalizedText = text.replace(/\\n/g, '\n');
    const lines = normalizedText.split(/\r?\n/);
    for (const lineText of lines) {
      const line = document.createElement('div');
      line.className = 'line' + (className ? ` ${className}` : '');

      // Parse ANSI escape sequences
      line.innerHTML = this.parseAnsi(lineText);

      this.element.appendChild(line);
    }
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
   * Uses requestAnimationFrame to ensure DOM has updated.
   */
  scrollToBottom(): void {
    if (this.autoScroll) {
      this.scrollPending = true;
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        this.element.scrollTop = this.element.scrollHeight;
        // Use a small delay before allowing scroll detection again
        // This prevents the scroll event from incorrectly detecting user scroll
        setTimeout(() => {
          this.scrollPending = false;
        }, 50);
      });
    }
  }

  /**
   * Force scroll to bottom, ignoring autoScroll setting.
   * Useful when user wants to jump back to live output.
   */
  forceScrollToBottom(): void {
    this.autoScroll = true;
    this.scrollPending = true;
    requestAnimationFrame(() => {
      this.element.scrollTop = this.element.scrollHeight;
      setTimeout(() => {
        this.scrollPending = false;
      }, 50);
    });
  }

  /**
   * Check if terminal is currently auto-scrolling.
   */
  isAutoScrolling(): boolean {
    return this.autoScroll;
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

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];

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
      } else if (code === 7) {
        newState.reverse = true;
      } else if (code === 8) {
        newState.hidden = true;
      } else if (code === 9) {
        newState.strikethrough = true;
      } else if (code >= 30 && code <= 37) {
        newState.fgColor = this.getColorName(code - 30);
      } else if (code === 38) {
        // 256-color or RGB foreground: 38;5;N or 38;2;R;G;B
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          // 256-color mode: 38;5;N
          newState.fgColor = `color-${codes[i + 2]}`;
          i += 2; // Skip the next two codes
        } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          // RGB mode: 38;2;R;G;B
          const r = codes[i + 2];
          const g = codes[i + 3];
          const b = codes[i + 4];
          newState.fgColor = `rgb-${r}-${g}-${b}`;
          i += 4; // Skip the next four codes
        }
      } else if (code === 39) {
        newState.fgColor = null;
      } else if (code >= 40 && code <= 47) {
        newState.bgColor = this.getColorName(code - 40);
      } else if (code === 48) {
        // 256-color or RGB background: 48;5;N or 48;2;R;G;B
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          // 256-color mode: 48;5;N
          newState.bgColor = `color-${codes[i + 2]}`;
          i += 2; // Skip the next two codes
        } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          // RGB mode: 48;2;R;G;B
          const r = codes[i + 2];
          const g = codes[i + 3];
          const b = codes[i + 4];
          newState.bgColor = `rgb-${r}-${g}-${b}`;
          i += 4; // Skip the next four codes
        }
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
        const colorIndex = parseInt(state.fgColor.slice(6), 10);
        styles.push(`color: ${this.get256Color(colorIndex)}`);
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
        const colorIndex = parseInt(state.bgColor.slice(6), 10);
        styles.push(`background-color: ${this.get256Color(colorIndex)}`);
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

    const classAttr = classes.length > 0 ? ` class="${classes.join(' ')}"` : '';
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';

    return `<span${classAttr}${styleAttr}>${text}</span>`;
  }

  /**
   * Get CSS color value for 256-color palette index.
   */
  private get256Color(index: number): string {
    // Standard 16 colors (0-15)
    const standard16 = [
      '#000000', '#cd0000', '#00cd00', '#cdcd00', '#0000ee', '#cd00cd', '#00cdcd', '#e5e5e5',
      '#7f7f7f', '#ff0000', '#00ff00', '#ffff00', '#5c5cff', '#ff00ff', '#00ffff', '#ffffff',
    ];

    if (index < 16) {
      return standard16[index];
    }

    // 6x6x6 color cube (16-231)
    if (index < 232) {
      const i = index - 16;
      const r = Math.floor(i / 36);
      const g = Math.floor((i % 36) / 6);
      const b = i % 6;
      const toHex = (v: number) => (v === 0 ? 0 : 55 + v * 40);
      return `rgb(${toHex(r)}, ${toHex(g)}, ${toHex(b)})`;
    }

    // Grayscale (232-255)
    const gray = 8 + (index - 232) * 10;
    return `rgb(${gray}, ${gray}, ${gray})`;
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
