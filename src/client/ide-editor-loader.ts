/**
 * Lazy-loading wrapper for the IDE editor.
 *
 * This loader defers loading of CodeMirror (~900KB-1MB) until a builder
 * actually opens a file for editing, reducing initial page load by ~70%.
 */

import type { IdeMessage } from './websocket-client.js';
import type { IdeEditor } from './ide-editor.js';

interface IdeCallbacks {
  onSave: (path: string, content: string) => void;
  onClose: () => void;
}

export class IdeEditorLoader {
  private editorInstance: IdeEditor | null = null;
  private loadPromise: Promise<new () => IdeEditor> | null = null;
  private loadingIndicator: HTMLElement | null = null;

  private async loadEditor() {
    if (!this.loadPromise) {
      this.loadPromise = import('./ide-editor.js').then((m) => m.IdeEditor);
    }
    return this.loadPromise;
  }

  private showLoading() {
    this.loadingIndicator = document.createElement('div');
    this.loadingIndicator.className = 'ide-loading';
    this.loadingIndicator.innerHTML = `
      <div class="ide-loading-content">
        <div class="ide-loading-spinner"></div>
        <div class="ide-loading-text">Loading editor...</div>
      </div>`;
    document.body.appendChild(this.loadingIndicator);
  }

  private hideLoading() {
    this.loadingIndicator?.remove();
    this.loadingIndicator = null;
  }

  async open(message: IdeMessage, callbacks: IdeCallbacks): Promise<void> {
    if (this.editorInstance) {
      this.editorInstance.open(message, callbacks);
      return;
    }
    this.showLoading();
    try {
      const IdeEditor = await this.loadEditor();
      this.editorInstance = new IdeEditor();
      this.hideLoading();
      this.editorInstance.open(message, callbacks);
    } catch (error) {
      this.hideLoading();
      console.error('[IdeEditorLoader] Failed to load:', error);
      callbacks.onClose();
    }
  }

  close() {
    this.editorInstance?.close();
  }

  forceClose() {
    this.editorInstance?.forceClose();
  }

  isOpen() {
    return this.editorInstance?.isOpen() ?? false;
  }

  handleSaveResult(message: IdeMessage) {
    this.editorInstance?.handleSaveResult(message);
  }
}
