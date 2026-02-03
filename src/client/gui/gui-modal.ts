/**
 * GUI Modal - Main modal manager class
 *
 * Handles opening, closing, updating modals and communication with the server.
 */

import { GUIRenderer } from './gui-renderer.js';
import { validateForm, extractInputElements } from './gui-validation.js';
import { applyStyle } from './gui-elements.js';
import { parseAnsi } from '../ansi-parser.js';
import type {
  GUIOpenMessage,
  GUIUpdateMessage,
  GUICloseMessage,
  GUIErrorMessage,
  GUIServerMessage,
  GUIClientMessage,
  GUISubmitMessage,
  GUIButtonMessage,
  GUIClosedMessage,
  ModalConfig,
  ModalButton,
  LayoutContainer,
} from './gui-types.js';

export type GUIMessageHandler = (message: GUIClientMessage) => void;

// Extend Window interface for global GUI action handler
declare global {
  interface Window {
    guiAction?: (customAction: string, data?: Record<string, unknown>) => void;
  }
}

export class GUIModal {
  private overlay: HTMLElement | null = null;
  private modal: HTMLElement | null = null;
  private modalConfig: ModalConfig | null = null;
  private renderer: GUIRenderer;
  private onMessage: GUIMessageHandler;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;
  private enterKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private formData: Record<string, unknown> = {};
  private layout: LayoutContainer | null = null;

  constructor(onMessage: GUIMessageHandler) {
    this.onMessage = onMessage;
    this.renderer = new GUIRenderer();
  }

  /**
   * Set up global GUI action handler for interactive HTML elements.
   */
  private setupGlobalActionHandler(): void {
    window.guiAction = (customAction: string, data?: Record<string, unknown>) => {
      if (!this.modalConfig) return;

      const message: GUIButtonMessage = {
        action: 'button',
        modalId: this.modalConfig.id,
        buttonId: 'interactive-html',
        customAction,
        data: { ...this.formData, ...data },
      };

      this.onMessage(message);
    };
  }

  /**
   * Clean up global GUI action handler.
   */
  private cleanupGlobalActionHandler(): void {
    delete window.guiAction;
  }

  /**
   * Handle an incoming server message.
   */
  handleMessage(message: GUIServerMessage): void {
    switch (message.action) {
      case 'open':
        this.open(message as GUIOpenMessage);
        break;
      case 'update':
        this.update(message as GUIUpdateMessage);
        break;
      case 'close':
        this.close((message as GUICloseMessage).reason);
        break;
      case 'error':
        this.showErrors(message as GUIErrorMessage);
        break;
    }
  }

  /**
   * Open a modal from server message.
   */
  open(message: GUIOpenMessage): void {
    // Check if we're updating an existing modal with the same ID
    if (this.overlay && this.modalConfig?.id === message.modal.id) {
      // Same modal - just update content in place without flash
      this.updateInPlace(message);
      return;
    }

    // Close any existing modal (different modal)
    if (this.overlay) {
      this.close('replaced');
    }

    this.modalConfig = message.modal;
    this.formData = message.data ? { ...message.data } : {};
    this.layout = message.layout;

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'gui-modal-overlay';

    // Handle backdrop click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay && this.modalConfig?.closable !== false) {
        this.handleClose('backdrop');
      }
    });

    // Create modal
    this.modal = this.createModalElement(message.modal);

    // Render body content
    const body = this.modal.querySelector('.gui-modal-body');
    if (body) {
      this.renderer.render(
        message.layout,
        body as HTMLElement,
        this.formData,
        (name, value) => {
          this.formData[name] = value;
        },
        (buttonId, action, customAction) => {
          this.handleLayoutButtonClick(buttonId, action, customAction);
        }
      );
    }

    // Render footer buttons
    if (message.buttons && message.buttons.length > 0) {
      this.renderButtons(message.buttons);
    }

    // Add to DOM
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);

    // Set up escape handler
    if (message.modal.escapable !== false) {
      this.escapeHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.handleClose('escape');
        }
      };
      document.addEventListener('keydown', this.escapeHandler, true);
    }

    // Set up Enter key handler for form submission
    this.setupEnterKeyHandler();

    // Set up global action handler for interactive HTML
    this.setupGlobalActionHandler();

    // Focus first input
    this.focusFirstInput();
  }

  /**
   * Update an existing modal in place without closing/reopening.
   * This prevents the flash effect when updating content.
   */
  private updateInPlace(message: GUIOpenMessage): void {
    if (!this.modal) return;

    this.modalConfig = message.modal;
    this.formData = message.data ? { ...message.data } : {};
    this.layout = message.layout;

    // Update title and subtitle if changed
    const title = this.modal.querySelector('.gui-modal-title');
    if (title) {
      title.textContent = message.modal.title;
    }

    const subtitleEl = this.modal.querySelector('.gui-modal-subtitle');
    if (message.modal.subtitle) {
      if (subtitleEl) {
        subtitleEl.textContent = message.modal.subtitle;
      } else {
        // Create subtitle if it doesn't exist
        const titleWrapper = this.modal.querySelector('.gui-modal-title-wrapper');
        if (titleWrapper) {
          const newSubtitle = document.createElement('p');
          newSubtitle.className = 'gui-modal-subtitle';
          newSubtitle.textContent = message.modal.subtitle;
          titleWrapper.appendChild(newSubtitle);
        }
      }
    } else if (subtitleEl) {
      subtitleEl.remove();
    }

    // Re-render body content
    const body = this.modal.querySelector('.gui-modal-body');
    if (body) {
      // Capture scroll positions of scrollable containers before clearing
      const scrollPositions = new Map<string, number>();
      body.querySelectorAll('[style*="overflow"]').forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.scrollTop > 0) {
          // Use element id or index as key
          const key = htmlEl.id || `scroll-${index}`;
          scrollPositions.set(key, htmlEl.scrollTop);
        }
      });

      // Clear existing content
      body.innerHTML = '';

      // Re-render layout
      this.renderer.render(
        message.layout,
        body as HTMLElement,
        this.formData,
        (name, value) => {
          this.formData[name] = value;
        },
        (buttonId, action, customAction) => {
          this.handleLayoutButtonClick(buttonId, action, customAction);
        }
      );

      // Restore scroll positions after re-render
      if (scrollPositions.size > 0) {
        body.querySelectorAll('[style*="overflow"]').forEach((el, index) => {
          const htmlEl = el as HTMLElement;
          const key = htmlEl.id || `scroll-${index}`;
          const savedPosition = scrollPositions.get(key);
          if (savedPosition !== undefined) {
            htmlEl.scrollTop = savedPosition;
          }
        });
      }
    }

    // Update footer buttons
    if (message.buttons && message.buttons.length > 0) {
      this.renderButtons(message.buttons);
    }
  }

  /**
   * Set up Enter key handler for text inputs to submit form.
   */
  private setupEnterKeyHandler(): void {
    if (!this.modal) return;

    // Store handler reference for cleanup
    this.enterKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        // Only handle Enter on text inputs (not textareas)
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') {
          e.preventDefault();
          // Find and click the primary/submit button
          const submitBtn = this.modal?.querySelector('.gui-btn-primary') as HTMLButtonElement;
          if (submitBtn) {
            submitBtn.click();
          } else {
            // Fall back to finding a button with submit action
            const inlineSubmitBtn = this.modal?.querySelector('[data-action="submit"]') as HTMLButtonElement;
            if (inlineSubmitBtn) {
              inlineSubmitBtn.click();
            }
          }
        }
      }
    };
    this.modal.addEventListener('keydown', this.enterKeyHandler);
  }

  /**
   * Create the modal DOM element.
   */
  private createModalElement(config: ModalConfig): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'gui-modal';

    // Apply size class
    if (config.size) {
      modal.classList.add(`gui-modal-${config.size}`);
    }

    // Apply custom dimensions
    if (config.width) modal.style.width = config.width;
    if (config.height) modal.style.height = config.height;

    // Apply background
    if (config.backgroundColor) {
      modal.style.backgroundColor = config.backgroundColor;
    }
    if (config.backgroundImage) {
      modal.style.backgroundImage = `url(${config.backgroundImage})`;
      modal.style.backgroundSize = 'cover';
      modal.style.backgroundPosition = 'center';
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'gui-modal-header';
    applyStyle(header, config.headerStyle);

    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'gui-modal-title-wrapper';

    const title = document.createElement('h2');
    title.className = 'gui-modal-title';
    title.textContent = config.title;
    titleWrapper.appendChild(title);

    if (config.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'gui-modal-subtitle';
      subtitle.textContent = config.subtitle;
      titleWrapper.appendChild(subtitle);
    }

    header.appendChild(titleWrapper);

    // Add close button if closable
    if (config.closable !== false) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'gui-modal-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => this.handleClose('close-button'));
      header.appendChild(closeBtn);
    }

    modal.appendChild(header);

    // Create body
    const body = document.createElement('div');
    body.className = 'gui-modal-body';
    applyStyle(body, config.bodyStyle);
    modal.appendChild(body);

    // Create footer (will be populated with buttons)
    const footer = document.createElement('div');
    footer.className = 'gui-modal-footer';
    applyStyle(footer, config.footerStyle);
    modal.appendChild(footer);

    return modal;
  }

  /**
   * Render footer buttons.
   */
  private renderButtons(buttons: ModalButton[]): void {
    const footer = this.modal?.querySelector('.gui-modal-footer');
    if (!footer) return;

    // Clear existing buttons
    footer.innerHTML = '';

    for (const buttonDef of buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `gui-btn gui-btn-${buttonDef.variant ?? 'secondary'}`;
      button.textContent = buttonDef.label;
      button.disabled = buttonDef.disabled ?? false;
      button.dataset.buttonId = buttonDef.id;

      button.addEventListener('click', () => {
        this.handleButtonClick(buttonDef);
      });

      footer.appendChild(button);
    }
  }

  /**
   * Handle button click (footer buttons).
   */
  private handleButtonClick(button: ModalButton): void {
    switch (button.action) {
      case 'submit':
        this.handleSubmit(button.id);
        break;
      case 'cancel':
        this.handleClose('cancel');
        break;
      case 'custom':
        this.sendButtonMessage(button.id, button.customAction);
        break;
      case 'navigate':
        // Navigation would be handled by the server
        this.sendButtonMessage(button.id);
        break;
    }
  }

  /**
   * Handle button click (layout/inline buttons).
   */
  private handleLayoutButtonClick(buttonId: string, action: string, customAction?: string): void {
    switch (action) {
      case 'submit':
        this.handleSubmit(buttonId);
        break;
      case 'cancel':
        this.handleClose('cancel');
        break;
      case 'custom':
        this.sendButtonMessage(buttonId, customAction);
        break;
      case 'navigate':
        this.sendButtonMessage(buttonId);
        break;
    }
  }

  /**
   * Handle form submission.
   */
  private handleSubmit(buttonId: string): void {
    // Get current form data
    const data = this.renderer.getFormData();

    // Validate if we have validation rules
    if (this.layout) {
      const inputs = extractInputElements(this.layout);
      const result = validateForm(data, inputs);

      if (!result.valid) {
        this.renderer.showErrors(result.errors);
        return;
      }
    }

    // Clear errors and send
    this.renderer.clearErrors();

    const message: GUISubmitMessage = {
      action: 'submit',
      modalId: this.modalConfig?.id ?? '',
      buttonId,
      data,
    };

    this.onMessage(message);

    // For snoop modal, clear the command input after submission
    if (this.modalConfig?.id === 'snoop-modal') {
      const commandInput = this.modal?.querySelector('#gui-input-command-input') as HTMLInputElement;
      if (commandInput) {
        commandInput.value = '';
        commandInput.focus();
      }
    }
  }

  /**
   * Send a button click message.
   */
  private sendButtonMessage(buttonId: string, customAction?: string): void {
    const message: GUIButtonMessage = {
      action: 'button',
      modalId: this.modalConfig?.id ?? '',
      buttonId,
      customAction,
      data: this.renderer.getFormData(),
    };

    this.onMessage(message);
  }

  /**
   * Handle modal close.
   */
  private handleClose(reason: 'escape' | 'close-button' | 'backdrop' | 'cancel'): void {
    if (!this.modalConfig) return;

    const message: GUIClosedMessage = {
      action: 'closed',
      modalId: this.modalConfig.id,
      reason,
    };

    this.onMessage(message);
    this.close();
  }

  /**
   * Update an open modal.
   */
  update(message: GUIUpdateMessage): void {
    if (!this.modal || this.modalConfig?.id !== message.modalId) {
      return;
    }

    // Update title
    if (message.updates.title !== undefined) {
      const title = this.modal.querySelector('.gui-modal-title');
      if (title) {
        title.textContent = message.updates.title;
      }
    }

    // Update subtitle
    if (message.updates.subtitle !== undefined) {
      const subtitle = this.modal.querySelector('.gui-modal-subtitle');
      if (subtitle) {
        subtitle.textContent = message.updates.subtitle;
      }
    }

    // Update elements
    if (message.updates.elements) {
      this.renderer.updateElements(message.updates.elements);
    }

    // Update form data
    if (message.updates.data) {
      // Handle special _appendMessage for snoop modal
      if (message.updates.data._appendMessage && this.modalConfig?.id === 'snoop-modal') {
        const msgDisplay = this.modal.querySelector('#gui-display-message-display');
        if (msgDisplay) {
          // Parse ANSI codes and append the message
          const rawMessage = message.updates.data._appendMessage as string;
          const parsedHtml = parseAnsi(rawMessage);
          msgDisplay.innerHTML += `<div class="snoop-line">${parsedHtml}</div>`;
          // Auto-scroll to bottom - the message container has overflow
          const container = msgDisplay.closest('#gui-layout-message-container') as HTMLElement;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }
        // Don't merge _appendMessage into formData
        delete message.updates.data._appendMessage;
      }

      Object.assign(this.formData, message.updates.data);
      this.renderer.updateData(this.formData);
    }

    // Update buttons
    if (message.updates.buttons) {
      this.renderButtons(message.updates.buttons);
    }
  }

  /**
   * Show validation errors.
   */
  showErrors(message: GUIErrorMessage): void {
    if (!this.modal || this.modalConfig?.id !== message.modalId) {
      return;
    }

    this.renderer.showErrors(message.errors);

    if (message.globalError) {
      this.showGlobalError(message.globalError);
    }
  }

  /**
   * Show a global error message.
   */
  private showGlobalError(error: string): void {
    if (!this.modal) return;

    // Remove existing global error
    this.modal.querySelector('.gui-global-error')?.remove();

    const errorEl = document.createElement('div');
    errorEl.className = 'gui-global-error';
    errorEl.textContent = error;

    const body = this.modal.querySelector('.gui-modal-body');
    if (body) {
      body.insertBefore(errorEl, body.firstChild);
    }
  }

  /**
   * Close the modal.
   */
  close(_reason?: string): void {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler, true);
      this.escapeHandler = null;
    }

    // Remove enter key handler if set
    if (this.enterKeyHandler && this.modal) {
      this.modal.removeEventListener('keydown', this.enterKeyHandler);
      this.enterKeyHandler = null;
    }

    // Clean up global action handler
    this.cleanupGlobalActionHandler();

    this.overlay?.remove();
    this.overlay = null;
    this.modal = null;
    this.modalConfig = null;
    this.formData = {};
    this.layout = null;
  }

  /**
   * Focus the first input element.
   */
  private focusFirstInput(): void {
    if (!this.modal) return;

    const firstInput = this.modal.querySelector(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
    ) as HTMLElement | null;

    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }
  }

  /**
   * Check if modal is open.
   */
  isOpen(): boolean {
    return this.overlay !== null;
  }

  /**
   * Get current modal ID.
   */
  getModalId(): string | null {
    return this.modalConfig?.id ?? null;
  }
}
