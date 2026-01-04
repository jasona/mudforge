/**
 * CodeEditor - In-game code editor component.
 *
 * A lightweight code editor for builders to edit mudlib source files.
 * Uses a simple textarea-based editor with syntax highlighting via CSS.
 */

/**
 * Editor event types.
 */
type EditorEvent = 'save' | 'close' | 'error';

/**
 * Event handler type.
 */
type EventHandler = (...args: unknown[]) => void;

/**
 * Editor configuration.
 */
export interface EditorConfig {
  /** The container element to render the editor in */
  container: HTMLElement;
  /** Initial file path to edit */
  filePath?: string;
  /** Initial content */
  content?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
}

/**
 * Compile result from the server.
 */
export interface CompileResult {
  success: boolean;
  errors?: Array<{
    line: number;
    column: number;
    message: string;
  }>;
}

/**
 * In-game code editor component.
 */
export class CodeEditor {
  private container: HTMLElement;
  private editorElement: HTMLTextAreaElement | null = null;
  private lineNumbers: HTMLDivElement | null = null;
  private statusBar: HTMLDivElement | null = null;
  private errorPanel: HTMLDivElement | null = null;
  private filePath: string = '';
  private originalContent: string = '';
  private readOnly: boolean = false;
  private isVisible: boolean = false;
  private handlers: Map<EditorEvent, Set<EventHandler>> = new Map();

  constructor(config: EditorConfig) {
    this.container = config.container;
    this.filePath = config.filePath ?? '';
    this.originalContent = config.content ?? '';
    this.readOnly = config.readOnly ?? false;

    this.createEditor();
  }

  /**
   * Create the editor DOM elements.
   */
  private createEditor(): void {
    // Create editor wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'code-editor-wrapper';
    wrapper.style.display = 'none';

    // Create header with file path and buttons
    const header = document.createElement('div');
    header.className = 'code-editor-header';

    const filePathSpan = document.createElement('span');
    filePathSpan.className = 'code-editor-filepath';
    filePathSpan.textContent = this.filePath || 'Untitled';
    header.appendChild(filePathSpan);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'code-editor-buttons';

    if (!this.readOnly) {
      const saveButton = document.createElement('button');
      saveButton.textContent = 'Save (Ctrl+S)';
      saveButton.className = 'code-editor-save';
      saveButton.onclick = () => this.save();
      buttonContainer.appendChild(saveButton);
    }

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close (Esc)';
    closeButton.className = 'code-editor-close';
    closeButton.onclick = () => this.close();
    buttonContainer.appendChild(closeButton);

    header.appendChild(buttonContainer);
    wrapper.appendChild(header);

    // Create editor area with line numbers
    const editorArea = document.createElement('div');
    editorArea.className = 'code-editor-area';

    this.lineNumbers = document.createElement('div');
    this.lineNumbers.className = 'code-editor-lines';
    editorArea.appendChild(this.lineNumbers);

    this.editorElement = document.createElement('textarea');
    this.editorElement.className = 'code-editor-textarea';
    this.editorElement.value = this.originalContent;
    this.editorElement.readOnly = this.readOnly;
    this.editorElement.spellcheck = false;
    this.editorElement.wrap = 'off';

    // Handle input for line numbers
    this.editorElement.oninput = () => this.updateLineNumbers();
    this.editorElement.onscroll = () => this.syncScroll();
    this.editorElement.onkeydown = (e) => this.handleKeyDown(e);

    editorArea.appendChild(this.editorElement);
    wrapper.appendChild(editorArea);

    // Create error panel
    this.errorPanel = document.createElement('div');
    this.errorPanel.className = 'code-editor-errors';
    this.errorPanel.style.display = 'none';
    wrapper.appendChild(this.errorPanel);

    // Create status bar
    this.statusBar = document.createElement('div');
    this.statusBar.className = 'code-editor-status';
    this.statusBar.textContent = this.readOnly ? 'Read Only' : 'Ready';
    wrapper.appendChild(this.statusBar);

    this.container.appendChild(wrapper);
    this.updateLineNumbers();
  }

  /**
   * Handle keyboard shortcuts.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Ctrl+S to save
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (!this.readOnly) {
        this.save();
      }
    }

    // Escape to close
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }

    // Tab handling
    if (event.key === 'Tab') {
      event.preventDefault();
      this.insertTab();
    }
  }

  /**
   * Insert a tab character at cursor position.
   */
  private insertTab(): void {
    if (!this.editorElement) return;

    const start = this.editorElement.selectionStart;
    const end = this.editorElement.selectionEnd;
    const value = this.editorElement.value;

    this.editorElement.value = value.substring(0, start) + '  ' + value.substring(end);
    this.editorElement.selectionStart = this.editorElement.selectionEnd = start + 2;

    this.updateLineNumbers();
  }

  /**
   * Update line numbers.
   */
  private updateLineNumbers(): void {
    if (!this.editorElement || !this.lineNumbers) return;

    const lines = this.editorElement.value.split('\n');
    const lineCount = lines.length;

    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      html += `<div class="code-editor-line-number">${i}</div>`;
    }

    this.lineNumbers.innerHTML = html;
  }

  /**
   * Sync line numbers scroll with editor scroll.
   */
  private syncScroll(): void {
    if (!this.editorElement || !this.lineNumbers) return;
    this.lineNumbers.scrollTop = this.editorElement.scrollTop;
  }

  /**
   * Show the editor.
   */
  show(): void {
    const wrapper = this.container.querySelector('.code-editor-wrapper') as HTMLElement;
    if (wrapper) {
      wrapper.style.display = 'flex';
      this.isVisible = true;
      this.editorElement?.focus();
    }
  }

  /**
   * Hide the editor.
   */
  hide(): void {
    const wrapper = this.container.querySelector('.code-editor-wrapper') as HTMLElement;
    if (wrapper) {
      wrapper.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Check if editor is visible.
   */
  get visible(): boolean {
    return this.isVisible;
  }

  /**
   * Open a file for editing.
   */
  open(filePath: string, content: string, readOnly: boolean = false): void {
    this.filePath = filePath;
    this.originalContent = content;
    this.readOnly = readOnly;

    if (this.editorElement) {
      this.editorElement.value = content;
      this.editorElement.readOnly = readOnly;
    }

    const filePathSpan = this.container.querySelector('.code-editor-filepath');
    if (filePathSpan) {
      filePathSpan.textContent = filePath;
    }

    const saveButton = this.container.querySelector('.code-editor-save') as HTMLButtonElement;
    if (saveButton) {
      saveButton.style.display = readOnly ? 'none' : 'block';
    }

    if (this.statusBar) {
      this.statusBar.textContent = readOnly ? 'Read Only' : 'Ready';
    }

    this.clearErrors();
    this.updateLineNumbers();
    this.show();
  }

  /**
   * Get the current content.
   */
  getContent(): string {
    return this.editorElement?.value ?? '';
  }

  /**
   * Check if content has been modified.
   */
  isModified(): boolean {
    return this.getContent() !== this.originalContent;
  }

  /**
   * Save the current file.
   */
  save(): void {
    if (this.readOnly) return;

    const content = this.getContent();
    this.setStatus('Saving...');
    this.emit('save', this.filePath, content);
  }

  /**
   * Close the editor.
   */
  close(): void {
    if (this.isModified()) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }

    this.hide();
    this.emit('close');
  }

  /**
   * Set status bar message.
   */
  setStatus(message: string): void {
    if (this.statusBar) {
      this.statusBar.textContent = message;
    }
  }

  /**
   * Show compile errors.
   */
  showErrors(errors: Array<{ line: number; column: number; message: string }>): void {
    if (!this.errorPanel) return;

    if (errors.length === 0) {
      this.clearErrors();
      return;
    }

    let html = '<div class="code-editor-error-title">Compile Errors:</div>';
    for (const error of errors) {
      html += `<div class="code-editor-error-item" data-line="${error.line}">`;
      html += `  <span class="code-editor-error-location">Line ${error.line}, Col ${error.column}:</span>`;
      html += `  <span class="code-editor-error-message">${this.escapeHtml(error.message)}</span>`;
      html += '</div>';
    }

    this.errorPanel.innerHTML = html;
    this.errorPanel.style.display = 'block';

    // Click to go to error line
    const items = this.errorPanel.querySelectorAll('.code-editor-error-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const line = parseInt((item as HTMLElement).dataset.line ?? '1');
        this.goToLine(line);
      });
    });

    this.setStatus(`${errors.length} error(s)`);
  }

  /**
   * Clear errors.
   */
  clearErrors(): void {
    if (this.errorPanel) {
      this.errorPanel.innerHTML = '';
      this.errorPanel.style.display = 'none';
    }
  }

  /**
   * Go to a specific line.
   */
  goToLine(line: number): void {
    if (!this.editorElement) return;

    const lines = this.editorElement.value.split('\n');
    let position = 0;

    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      position += lines[i].length + 1;
    }

    this.editorElement.focus();
    this.editorElement.setSelectionRange(position, position);

    // Scroll to line
    const lineHeight = 20; // Approximate
    this.editorElement.scrollTop = (line - 5) * lineHeight;
  }

  /**
   * Handle compile result from server.
   */
  handleCompileResult(result: CompileResult): void {
    if (result.success) {
      this.originalContent = this.getContent();
      this.clearErrors();
      this.setStatus('Saved successfully');
    } else {
      this.showErrors(result.errors ?? []);
    }
  }

  /**
   * Escape HTML entities.
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Add an event listener.
   */
  on(event: EditorEvent, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Remove an event listener.
   */
  off(event: EditorEvent, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event.
   */
  private emit(event: EditorEvent, ...args: unknown[]): void {
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
   * Destroy the editor.
   */
  destroy(): void {
    const wrapper = this.container.querySelector('.code-editor-wrapper');
    if (wrapper) {
      wrapper.remove();
    }
    this.handlers.clear();
  }
}

export default CodeEditor;
