/**
 * InputHandler - Manages command input with history support.
 *
 * Provides command history navigation with up/down arrow keys.
 * History is persisted to localStorage (max 20 commands, LIFO).
 */

/**
 * Event types for the input handler.
 */
type InputHandlerEvent = 'submit';

/**
 * Event handler type.
 */
type EventHandler = (command: string) => void;

/**
 * localStorage key for command history.
 */
const HISTORY_STORAGE_KEY = 'mud-command-history';

/**
 * Handles user input with command history.
 */
export class InputHandler {
  private inputElement: HTMLInputElement;
  private sendButton: HTMLElement;
  private history: string[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 20;
  private currentInput: string = '';
  private handlers: Map<InputHandlerEvent, Set<EventHandler>> = new Map();

  constructor(inputElement: HTMLInputElement, sendButton: HTMLElement) {
    this.inputElement = inputElement;
    this.sendButton = sendButton;

    this.loadHistory();
    this.setupEventHandlers();
  }

  /**
   * Load command history from localStorage.
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Take only the last maxHistory items
          this.history = parsed.slice(-this.maxHistory);
        }
      }
    } catch {
      // Ignore errors, start with empty history
      this.history = [];
    }
  }

  /**
   * Save command history to localStorage.
   */
  private saveHistory(): void {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history));
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }

  /**
   * Set up event handlers.
   */
  private setupEventHandlers(): void {
    // Handle Enter key
    this.inputElement.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    // Handle send button click
    this.sendButton.addEventListener('click', () => {
      this.submit();
    });

    // Focus input on page load
    this.inputElement.focus();

    // Refocus input when clicking terminal area
    document.getElementById('terminal-container')?.addEventListener('click', () => {
      this.inputElement.focus();
    });
  }

  /**
   * Handle keydown events.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.submit();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.navigateHistory(1);
        break;

      case 'ArrowDown':
        event.preventDefault();
        this.navigateHistory(-1);
        break;

      case 'Escape':
        event.preventDefault();
        this.clear();
        break;
    }
  }

  /**
   * Navigate through command history.
   */
  private navigateHistory(direction: number): void {
    if (this.history.length === 0) {
      return;
    }

    // Save current input if we're starting history navigation
    if (this.historyIndex === -1) {
      this.currentInput = this.inputElement.value;
    }

    // Calculate new index
    const newIndex = this.historyIndex + direction;

    if (newIndex < -1) {
      return; // Can't go further back
    }

    if (newIndex >= this.history.length) {
      return; // Can't go further forward
    }

    this.historyIndex = newIndex;

    if (this.historyIndex === -1) {
      // Restore current input
      this.inputElement.value = this.currentInput;
    } else {
      // Show history item
      this.inputElement.value = this.history[this.history.length - 1 - this.historyIndex];
    }

    // Move cursor to end
    this.inputElement.setSelectionRange(
      this.inputElement.value.length,
      this.inputElement.value.length
    );
  }

  /**
   * Submit the current input.
   * Allows empty submissions to support pagers and other input handlers.
   */
  private submit(): void {
    const command = this.inputElement.value;
    const trimmedCommand = command.trim();

    // Add to history only if non-empty (avoid duplicates of last command)
    if (trimmedCommand.length > 0) {
      if (this.history.length === 0 || this.history[this.history.length - 1] !== trimmedCommand) {
        this.history.push(trimmedCommand);

        // Trim history if too long (LIFO - remove oldest)
        while (this.history.length > this.maxHistory) {
          this.history.shift();
        }

        // Persist to localStorage
        this.saveHistory();
      }
    }

    // Reset history navigation
    this.historyIndex = -1;
    this.currentInput = '';

    // Clear input
    this.inputElement.value = '';

    // Emit event (send trimmed command, empty string for Enter-only)
    this.emit('submit', trimmedCommand);
  }

  /**
   * Clear the input.
   */
  private clear(): void {
    this.inputElement.value = '';
    this.historyIndex = -1;
    this.currentInput = '';
  }

  /**
   * Add an event listener.
   */
  on(event: InputHandlerEvent, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Remove an event listener.
   */
  off(event: InputHandlerEvent, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event.
   */
  private emit(event: InputHandlerEvent, ...args: [string]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      }
    }
  }

  /**
   * Get command history.
   */
  getHistory(): string[] {
    return [...this.history];
  }

  /**
   * Clear command history.
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
    this.saveHistory();
  }

  /**
   * Set focus to the input.
   */
  focus(): void {
    this.inputElement.focus();
  }

  /**
   * Get the current input value.
   */
  getValue(): string {
    return this.inputElement.value;
  }

  /**
   * Set the input value.
   */
  setValue(value: string): void {
    this.inputElement.value = value;
  }
}

export default InputHandler;
