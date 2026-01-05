/**
 * IdeEditor - Full-featured code editor using CodeMirror 6.
 *
 * Provides syntax highlighting, search/replace, line numbers, and error display.
 */

import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, Diagnostic, lintGutter } from '@codemirror/lint';
import type { IdeMessage } from './websocket-client.js';

const THEME_STORAGE_KEY = 'ide-theme';

/**
 * Available theme names.
 */
type ThemeName = 'one-dark' | 'light' | 'high-contrast' | 'solarized-dark';

/**
 * Theme configuration.
 */
interface ThemeConfig {
  name: string;
  extension: Extension;
}

/**
 * Light theme definition.
 */
const lightTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#ffffff',
      color: '#24292e',
    },
    '.cm-content': {
      caretColor: '#24292e',
    },
    '.cm-cursor': {
      borderLeftColor: '#24292e',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: '#b3d4fc',
    },
    '.cm-activeLine': {
      backgroundColor: '#f6f8fa',
    },
    '.cm-gutters': {
      backgroundColor: '#f6f8fa',
      color: '#6e7781',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#eaeef2',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      color: '#6e7781',
    },
  },
  { dark: false }
);

const lightHighlightStyle = EditorView.theme({
  '.cm-keyword': { color: '#d73a49' },
  '.cm-string': { color: '#032f62' },
  '.cm-number': { color: '#005cc5' },
  '.cm-comment': { color: '#6a737d' },
  '.cm-variableName': { color: '#24292e' },
  '.cm-typeName': { color: '#6f42c1' },
  '.cm-propertyName': { color: '#005cc5' },
  '.cm-operator': { color: '#d73a49' },
  '.cm-punctuation': { color: '#24292e' },
  '.cm-function': { color: '#6f42c1' },
});

/**
 * High contrast theme definition.
 */
const highContrastTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#000000',
      color: '#ffffff',
    },
    '.cm-content': {
      caretColor: '#ffff00',
    },
    '.cm-cursor': {
      borderLeftColor: '#ffff00',
      borderLeftWidth: '2px',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: '#4444ff',
    },
    '.cm-activeLine': {
      backgroundColor: '#1a1a1a',
    },
    '.cm-gutters': {
      backgroundColor: '#000000',
      color: '#ffffff',
      border: '1px solid #444',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#333333',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      color: '#ffff00',
    },
  },
  { dark: true }
);

const highContrastHighlightStyle = EditorView.theme({
  '.cm-keyword': { color: '#ff6600', fontWeight: 'bold' },
  '.cm-string': { color: '#00ff00' },
  '.cm-number': { color: '#00ffff' },
  '.cm-comment': { color: '#888888' },
  '.cm-variableName': { color: '#ffffff' },
  '.cm-typeName': { color: '#ff00ff' },
  '.cm-propertyName': { color: '#00ffff' },
  '.cm-operator': { color: '#ff6600' },
  '.cm-punctuation': { color: '#ffffff' },
  '.cm-function': { color: '#ffff00' },
});

/**
 * Solarized Dark theme definition.
 */
const solarizedDarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#002b36',
      color: '#839496',
    },
    '.cm-content': {
      caretColor: '#839496',
    },
    '.cm-cursor': {
      borderLeftColor: '#839496',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: '#073642',
    },
    '.cm-activeLine': {
      backgroundColor: '#073642',
    },
    '.cm-gutters': {
      backgroundColor: '#002b36',
      color: '#586e75',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#073642',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      color: '#586e75',
    },
  },
  { dark: true }
);

const solarizedDarkHighlightStyle = EditorView.theme({
  '.cm-keyword': { color: '#859900' },
  '.cm-string': { color: '#2aa198' },
  '.cm-number': { color: '#d33682' },
  '.cm-comment': { color: '#586e75' },
  '.cm-variableName': { color: '#839496' },
  '.cm-typeName': { color: '#b58900' },
  '.cm-propertyName': { color: '#268bd2' },
  '.cm-operator': { color: '#859900' },
  '.cm-punctuation': { color: '#839496' },
  '.cm-function': { color: '#268bd2' },
});

/**
 * Available themes.
 */
const THEMES: Record<ThemeName, ThemeConfig> = {
  'one-dark': {
    name: 'One Dark',
    extension: oneDark,
  },
  light: {
    name: 'Light',
    extension: [lightTheme, lightHighlightStyle],
  },
  'high-contrast': {
    name: 'High Contrast',
    extension: [highContrastTheme, highContrastHighlightStyle],
  },
  'solarized-dark': {
    name: 'Solarized Dark',
    extension: [solarizedDarkTheme, solarizedDarkHighlightStyle],
  },
};

/**
 * Error from compile/save.
 */
interface CompileError {
  line: number;
  column: number;
  message: string;
}

/**
 * Callbacks for IDE events.
 */
interface IdeCallbacks {
  onSave: (path: string, content: string) => void;
  onClose: () => void;
}

/**
 * Full-featured code editor modal.
 */
export class IdeEditor {
  private container: HTMLElement | null = null;
  private editorView: EditorView | null = null;
  private languageCompartment = new Compartment();
  private readOnlyCompartment = new Compartment();
  private lintCompartment = new Compartment();
  private themeCompartment = new Compartment();

  private currentPath: string = '';
  private originalContent: string = '';
  private isReadOnly: boolean = false;
  private errors: CompileError[] = [];
  private callbacks: IdeCallbacks | null = null;
  private currentTheme: ThemeName = 'one-dark';

  private headerElement: HTMLElement | null = null;
  private errorPanelElement: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    // Load saved theme preference
    this.currentTheme = this.loadThemePreference();
  }

  /**
   * Load theme preference from localStorage.
   */
  private loadThemePreference(): ThemeName {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && saved in THEMES) {
        return saved as ThemeName;
      }
    } catch {
      // localStorage not available
    }
    return 'one-dark';
  }

  /**
   * Save theme preference to localStorage.
   */
  private saveThemePreference(theme: ThemeName): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage not available
    }
  }

  /**
   * Open the IDE editor with a file.
   */
  open(message: IdeMessage, callbacks: IdeCallbacks): void {
    this.currentPath = message.path || '';
    this.originalContent = message.content || '';
    this.isReadOnly = message.readOnly || false;
    this.callbacks = callbacks;
    this.errors = [];

    this.createModal();
    this.createEditor(message.content || '', message.language || 'typescript');
    this.updateStatus();
  }

  /**
   * Close the IDE editor.
   */
  close(): void {
    if (this.hasUnsavedChanges()) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }

    // Call callback before destroy to ensure message is sent
    this.callbacks?.onClose();
    this.destroy();
  }

  /**
   * Force close without prompting.
   */
  forceClose(): void {
    this.destroy();
  }

  /**
   * Check if editor is open.
   */
  isOpen(): boolean {
    return this.container !== null;
  }

  /**
   * Handle save result from server.
   */
  handleSaveResult(message: IdeMessage): void {
    if (message.success) {
      this.originalContent = this.getContent();
      this.errors = [];
      this.updateErrorPanel();
      this.updateStatus('Saved successfully');
      this.updateLinter([]);
    } else {
      this.errors = message.errors || [];
      if (this.errors.length === 0 && message.message) {
        this.errors = [{ line: 1, column: 1, message: message.message }];
      }
      this.updateErrorPanel();
      this.updateStatus(`Save failed: ${this.errors.length} error(s)`);
      this.updateLinter(this.errors);
    }
  }

  /**
   * Change the editor theme.
   */
  setTheme(theme: ThemeName): void {
    if (!this.editorView || !(theme in THEMES)) return;

    this.currentTheme = theme;
    this.saveThemePreference(theme);

    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(THEMES[theme].extension),
    });

    // Update the dropdown to reflect the change
    const themeSelect = this.container?.querySelector('.ide-theme-select') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.value = theme;
    }
  }

  /**
   * Check for unsaved changes.
   */
  private hasUnsavedChanges(): boolean {
    if (this.isReadOnly) return false;
    return this.getContent() !== this.originalContent;
  }

  /**
   * Get editor content.
   */
  private getContent(): string {
    return this.editorView?.state.doc.toString() || '';
  }

  /**
   * Create the modal structure.
   */
  private createModal(): void {
    this.container = document.createElement('div');
    this.container.className = 'ide-modal';

    // Build theme options
    const themeOptions = Object.entries(THEMES)
      .map(
        ([key, config]) =>
          `<option value="${key}" ${key === this.currentTheme ? 'selected' : ''}>${config.name}</option>`
      )
      .join('');

    this.container.innerHTML = `
      <div class="ide-header">
        <div class="ide-filepath">${this.escapeHtml(this.currentPath)}${this.isReadOnly ? ' (read-only)' : ''}</div>
        <div class="ide-buttons">
          <select class="ide-theme-select" title="Color Theme">
            ${themeOptions}
          </select>
          ${!this.isReadOnly ? '<button class="ide-btn ide-btn-save">Save (Ctrl+S)</button>' : ''}
          <button class="ide-btn ide-btn-close">Close (Esc)</button>
        </div>
      </div>
      <div class="ide-editor-container"></div>
      <div class="ide-error-panel" style="display: none;"></div>
      <div class="ide-status"></div>
    `;

    document.body.appendChild(this.container);

    // Store references
    this.headerElement = this.container.querySelector('.ide-header');
    this.errorPanelElement = this.container.querySelector('.ide-error-panel');
    this.statusElement = this.container.querySelector('.ide-status');

    // Set up event handlers
    const saveBtn = this.container.querySelector('.ide-btn-save');
    const closeBtn = this.container.querySelector('.ide-btn-close');
    const themeSelect = this.container.querySelector('.ide-theme-select') as HTMLSelectElement;

    saveBtn?.addEventListener('click', () => this.save());
    closeBtn?.addEventListener('click', () => this.close());
    themeSelect?.addEventListener('change', () => {
      this.setTheme(themeSelect.value as ThemeName);
    });

    // Handle escape key at document level with capturing to catch it before CodeMirror
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen()) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler, true);
  }

  /**
   * Create the CodeMirror editor.
   */
  private createEditor(content: string, language: string): void {
    const editorContainer = this.container?.querySelector('.ide-editor-container');
    if (!editorContainer) return;

    const languageExtension = this.getLanguageExtension(language);

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        this.themeCompartment.of(THEMES[this.currentTheme].extension),
        this.languageCompartment.of(languageExtension),
        this.readOnlyCompartment.of(EditorState.readOnly.of(this.isReadOnly)),
        this.lintCompartment.of([]),
        lintGutter(),
        keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              this.save();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.updateStatus();
          }
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13px',
          },
          '.cm-scroller': {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          },
          '.cm-content': {
            padding: '8px 0',
          },
        }),
      ],
    });

    this.editorView = new EditorView({
      state,
      parent: editorContainer as HTMLElement,
    });

    // Focus the editor
    this.editorView.focus();
  }

  /**
   * Get language extension for CodeMirror.
   */
  private getLanguageExtension(language: string) {
    switch (language) {
      case 'typescript':
        return javascript({ typescript: true });
      case 'javascript':
        return javascript();
      case 'json':
        return json();
      case 'markdown':
        return markdown();
      case 'css':
        return css();
      case 'html':
        return html();
      default:
        return javascript({ typescript: true });
    }
  }

  /**
   * Update the linter with errors.
   */
  private updateLinter(errors: CompileError[]): void {
    if (!this.editorView) return;

    const diagnostics: Diagnostic[] = errors.map((error) => {
      const line = Math.max(1, error.line);
      const lineInfo = this.editorView!.state.doc.line(
        Math.min(line, this.editorView!.state.doc.lines)
      );
      const col = Math.max(0, (error.column || 1) - 1);
      const from = lineInfo.from + Math.min(col, lineInfo.length);
      const to = Math.min(from + 1, lineInfo.to);

      return {
        from,
        to,
        severity: 'error',
        message: error.message,
      };
    });

    const linterExtension = linter(() => diagnostics);
    this.editorView.dispatch({
      effects: this.lintCompartment.reconfigure(linterExtension),
    });
  }

  /**
   * Save the file.
   */
  private save(): void {
    if (this.isReadOnly) {
      this.updateStatus('File is read-only');
      return;
    }

    const content = this.getContent();
    this.updateStatus('Saving...');
    this.callbacks?.onSave(this.currentPath, content);
  }

  /**
   * Update error panel.
   */
  private updateErrorPanel(): void {
    if (!this.errorPanelElement) return;

    if (this.errors.length === 0) {
      this.errorPanelElement.style.display = 'none';
      return;
    }

    this.errorPanelElement.style.display = 'block';
    this.errorPanelElement.innerHTML = `
      <div class="ide-error-title">Compile Errors (${this.errors.length})</div>
      <div class="ide-error-list">
        ${this.errors
          .map(
            (error, index) => `
          <div class="ide-error-item" data-index="${index}">
            <span class="ide-error-location">Line ${error.line}:${error.column}</span>
            <span class="ide-error-message">${this.escapeHtml(error.message)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;

    // Add click handlers to jump to error lines
    const errorItems = this.errorPanelElement.querySelectorAll('.ide-error-item');
    errorItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        this.goToLine(this.errors[index].line, this.errors[index].column);
      });
    });
  }

  /**
   * Go to a specific line and column.
   */
  private goToLine(line: number, column: number): void {
    if (!this.editorView) return;

    const lineInfo = this.editorView.state.doc.line(
      Math.min(Math.max(1, line), this.editorView.state.doc.lines)
    );
    const col = Math.max(0, (column || 1) - 1);
    const pos = lineInfo.from + Math.min(col, lineInfo.length);

    this.editorView.dispatch({
      selection: { anchor: pos },
      scrollIntoView: true,
    });
    this.editorView.focus();
  }

  /**
   * Update status bar.
   */
  private updateStatus(message?: string): void {
    if (!this.statusElement) return;

    if (message) {
      this.statusElement.textContent = message;
      return;
    }

    const modified = this.hasUnsavedChanges() ? ' (modified)' : '';
    const lines = this.editorView?.state.doc.lines || 0;
    this.statusElement.textContent = `${lines} lines${modified}`;
  }

  /**
   * Escape HTML entities.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the editor and modal.
   */
  private destroy(): void {
    // Remove escape key listener
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler, true);
      this.escapeHandler = null;
    }
    this.editorView?.destroy();
    this.editorView = null;
    this.container?.remove();
    this.container = null;
    this.headerElement = null;
    this.errorPanelElement = null;
    this.statusElement = null;
    this.errors = [];
    this.callbacks = null;
  }
}

export default IdeEditor;
