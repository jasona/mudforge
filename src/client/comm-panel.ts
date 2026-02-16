/**
 * CommPanel - Draggable floating communications panel component.
 *
 * Displays say/tell/channel messages in a tabbed interface.
 * Can be dragged to reposition, and position is saved to localStorage.
 */

import { convertEmoticons, isEmojiConversionEnabled } from './emoji-converter.js';

export type CommType = 'say' | 'tell' | 'channel';

export interface CommMessage {
  type: 'comm';
  commType: CommType;
  sender: string;
  message: string;
  channel?: string;
  recipients?: string[];
  timestamp: number;
  isSender?: boolean;    // True if recipient is the one who sent this message
  gifId?: string;        // GIF ID for clickable [View GIF] links
}

type TabType = 'all' | 'says' | 'tells' | 'channels';

const STORAGE_KEY = 'mudforge-comm-layout';
const MAX_MESSAGES = 200;

interface LayoutState {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  activeTab: TabType;
  visible: boolean;
}

interface Position {
  x: number;
  y: number;
}

/**
 * Options for CommPanel constructor.
 */
interface CommPanelOptions {
  /** Callback when a GIF link is clicked */
  onGifClick?: (gifId: string) => void;
  /** Callback when the panel is closed via the X button */
  onClose?: () => void;
}

/**
 * CommPanel class.
 */
export class CommPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private header: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private tabButtons: Map<TabType, HTMLElement> = new Map();
  private isVisible: boolean = true;
  private isCollapsed: boolean = false;
  private activeTab: TabType = 'all';
  private messages: CommMessage[] = [];

  // Drag state
  private isDragging: boolean = false;
  private dragOffset: Position = { x: 0, y: 0 };

  // Resize state
  private isResizing: boolean = false;
  private resizeStart: Position = { x: 0, y: 0 };
  private resizeInitialSize: { width: number; height: number } = { width: 0, height: 0 };

  // Auto-scroll
  private autoScroll: boolean = true;

  // Saved height for collapse/expand
  private savedHeight: string = '';

  // GIF click callback
  private onGifClick?: (gifId: string) => void;

  // Close callback (notifies parent when panel is closed via X button)
  public onClose?: () => void;

  // Bound event handlers (stored for cleanup)
  private boundDragMove: (e: MouseEvent) => void;
  private boundDragEnd: () => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: () => void;

  constructor(containerId: string, options?: CommPanelOptions) {
    // Get or create container
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }

    // Create panel structure
    this.panel = document.createElement('div');
    this.panel.className = 'comm-panel';

    // Build panel content
    this.panel.innerHTML = `
      <div class="comm-panel-header">
        <span class="comm-panel-title">Communications</span>
        <div class="comm-header-buttons">
          <button class="comm-btn comm-btn-toggle" title="Collapse panel">&#9660;</button>
          <button class="comm-btn comm-btn-close" title="Close panel">&times;</button>
        </div>
      </div>
      <div class="comm-panel-tabs">
        <button class="comm-tab active" data-tab="all">All</button>
        <button class="comm-tab" data-tab="says">Says</button>
        <button class="comm-tab" data-tab="tells">Tells</button>
        <button class="comm-tab" data-tab="channels">Channels</button>
      </div>
      <div class="comm-panel-content"></div>
      <div class="comm-panel-resize-handle"></div>
    `;

    this.container.appendChild(this.panel);

    // Cache element references
    this.header = this.panel.querySelector('.comm-panel-header');
    this.content = this.panel.querySelector('.comm-panel-content');

    // Cache tab buttons
    const tabs = ['all', 'says', 'tells', 'channels'] as TabType[];
    for (const tab of tabs) {
      const btn = this.panel.querySelector(`[data-tab="${tab}"]`) as HTMLElement;
      if (btn) {
        this.tabButtons.set(tab, btn);
      }
    }

    // Store options
    this.onGifClick = options?.onGifClick;
    this.onClose = options?.onClose;

    // Pre-bind event handlers for proper cleanup
    this.boundDragMove = this.onDragMove.bind(this);
    this.boundDragEnd = this.onDragEnd.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onDragEnd.bind(this);

    // Restore saved layout
    this.restoreLayout();

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers.
   */
  private setupEventHandlers(): void {
    // Toggle button
    const toggleBtn = this.panel.querySelector('.comm-btn-toggle');
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
      // Update the caret icon direction
      if (toggleBtn) {
        toggleBtn.innerHTML = this.isCollapsed ? '&#9650;' : '&#9660;';
      }
    });

    // Close button
    const closeBtn = this.panel.querySelector('.comm-btn-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
      this.onClose?.();
    });

    // Tab buttons
    for (const [tab, btn] of this.tabButtons) {
      btn.addEventListener('click', () => this.switchTab(tab));
    }

    // Drag handlers on header
    if (this.header) {
      this.header.addEventListener('mousedown', this.onDragStart.bind(this));
      this.header.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    }

    // Resize handler
    const resizeHandle = this.panel.querySelector('.comm-panel-resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', this.onResizeStart.bind(this));
    }

    // Scroll detection for auto-scroll
    if (this.content) {
      this.content.addEventListener('scroll', () => {
        const el = this.content!;
        // Auto-scroll is enabled if we're near the bottom
        this.autoScroll = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
      });
    }

    // Global mouse/touch move and up handlers (use pre-bound handlers for cleanup)
    document.addEventListener('mousemove', this.boundDragMove);
    document.addEventListener('mouseup', this.boundDragEnd);
    document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    document.addEventListener('touchend', this.boundTouchEnd);

    // GIF link click handler
    if (this.content) {
      this.content.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('gif-link')) {
          const gifId = target.dataset.gifId;
          if (gifId && this.onGifClick) {
            this.onGifClick(gifId);
          }
          e.preventDefault();
        }
      });
    }
  }

  /**
   * Handle drag start.
   */
  private onDragStart(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.comm-btn')) {
      return;
    }

    this.isDragging = true;
    this.panel.classList.add('dragging');

    const rect = this.container.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    e.preventDefault();
  }

  /**
   * Handle touch start.
   */
  private onTouchStart(e: TouchEvent): void {
    if ((e.target as HTMLElement).closest('.comm-btn')) {
      return;
    }

    if (e.touches.length === 1) {
      this.isDragging = true;
      this.panel.classList.add('dragging');

      const touch = e.touches[0];
      const rect = this.container.getBoundingClientRect();
      this.dragOffset = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };

      e.preventDefault();
    }
  }

  /**
   * Handle drag move.
   */
  private onDragMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.handleDragMove(e.clientX, e.clientY);
    } else if (this.isResizing) {
      this.handleResizeMove(e.clientX, e.clientY);
    }
  }

  /**
   * Handle touch move.
   */
  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    if (this.isDragging) {
      this.handleDragMove(touch.clientX, touch.clientY);
      e.preventDefault();
    } else if (this.isResizing) {
      this.handleResizeMove(touch.clientX, touch.clientY);
      e.preventDefault();
    }
  }

  /**
   * Handle drag movement.
   */
  private handleDragMove(clientX: number, clientY: number): void {
    const terminal = document.getElementById('terminal-container');
    if (!terminal) return;

    const termRect = terminal.getBoundingClientRect();
    const panelWidth = this.panel.offsetWidth;
    const panelHeight = this.panel.offsetHeight;

    let newX = clientX - termRect.left - this.dragOffset.x;
    let newY = clientY - termRect.top - this.dragOffset.y;

    // Clamp to terminal container bounds
    newX = Math.max(0, Math.min(newX, termRect.width - panelWidth));
    newY = Math.max(0, Math.min(newY, termRect.height - panelHeight));

    this.setPosition(newX, newY);
  }

  /**
   * Handle drag end.
   */
  private onDragEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.panel.classList.remove('dragging');
      this.saveLayout();
    }
    if (this.isResizing) {
      this.isResizing = false;
      this.panel.classList.remove('resizing');
      this.saveLayout();
    }
  }

  /**
   * Handle resize start.
   */
  private onResizeStart(e: MouseEvent): void {
    this.isResizing = true;
    this.panel.classList.add('resizing');

    this.resizeStart = { x: e.clientX, y: e.clientY };
    this.resizeInitialSize = {
      width: this.panel.offsetWidth,
      height: this.panel.offsetHeight,
    };

    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Handle resize movement.
   */
  private handleResizeMove(clientX: number, clientY: number): void {
    const deltaX = clientX - this.resizeStart.x;
    const deltaY = clientY - this.resizeStart.y;

    const newWidth = Math.max(250, this.resizeInitialSize.width + deltaX);
    const newHeight = Math.max(150, this.resizeInitialSize.height + deltaY);

    this.panel.style.width = `${newWidth}px`;
    this.panel.style.height = `${newHeight}px`;
  }

  /**
   * Set panel position.
   */
  private setPosition(x: number, y: number): void {
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.right = 'auto';
    this.container.style.bottom = 'auto';
  }

  /**
   * Save layout to localStorage.
   */
  private saveLayout(): void {
    try {
      const layout: LayoutState = {
        x: parseInt(this.container.style.left) || 0,
        y: parseInt(this.container.style.top) || 0,
        width: this.panel.offsetWidth,
        height: this.panel.offsetHeight,
        collapsed: this.isCollapsed,
        activeTab: this.activeTab,
        visible: this.isVisible,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Restore layout from localStorage.
   */
  private restoreLayout(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const layout: LayoutState = JSON.parse(saved);

        // Restore size
        if (layout.width) {
          this.panel.style.width = `${layout.width}px`;
        }
        if (layout.height) {
          this.panel.style.height = `${layout.height}px`;
        }

        // Restore collapsed state
        this.isCollapsed = layout.collapsed ?? false;
        if (this.isCollapsed) {
          // Save the restored height so we can re-apply it on expand,
          // then clear the inline height so the CSS collapsed rule works
          this.savedHeight = this.panel.style.height;
          this.panel.style.height = '';
        }
        this.panel.classList.toggle('collapsed', this.isCollapsed);

        // Restore visible state
        this.isVisible = layout.visible ?? true;
        this.panel.classList.toggle('hidden', !this.isVisible);

        // Restore active tab
        this.activeTab = layout.activeTab ?? 'all';
        this.updateTabUI();

        // Defer position restore to allow container to be positioned
        requestAnimationFrame(() => {
          const terminal = document.getElementById('terminal-container');
          if (terminal) {
            const termRect = terminal.getBoundingClientRect();
            const panelWidth = this.panel.offsetWidth;
            const panelHeight = this.panel.offsetHeight;

            // Validate position is still within terminal bounds
            const x = Math.max(0, Math.min(layout.x, termRect.width - panelWidth));
            const y = Math.max(0, Math.min(layout.y, termRect.height - panelHeight));

            this.setPosition(x, y);
          }
        });
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Switch to a different tab.
   */
  private switchTab(tab: TabType): void {
    this.activeTab = tab;
    this.updateTabUI();
    this.renderMessages();
    this.saveLayout();
  }

  /**
   * Update tab button UI.
   */
  private updateTabUI(): void {
    for (const [tab, btn] of this.tabButtons) {
      btn.classList.toggle('active', tab === this.activeTab);
    }
  }

  /**
   * Handle incoming comm message.
   */
  handleMessage(message: CommMessage): void {
    // Add to message list
    this.messages.push(message);

    // Trim old messages
    while (this.messages.length > MAX_MESSAGES) {
      this.messages.shift();
    }

    // Only append if matches current tab
    if (this.matchesTab(message)) {
      this.appendMessage(message);
    }
  }

  /**
   * Check if message matches current tab filter.
   */
  private matchesTab(message: CommMessage): boolean {
    switch (this.activeTab) {
      case 'says':
        return message.commType === 'say';
      case 'tells':
        return message.commType === 'tell';
      case 'channels':
        return message.commType === 'channel';
      default:
        return true;
    }
  }

  /**
   * Render all visible messages.
   */
  private renderMessages(): void {
    if (!this.content) return;

    this.content.innerHTML = '';

    const filtered = this.messages.filter((m) => this.matchesTab(m));
    for (const message of filtered) {
      this.appendMessage(message, false);
    }

    // Scroll to bottom
    this.scrollToBottom();
  }

  /**
   * Append a single message to the content.
   */
  private appendMessage(message: CommMessage, scroll: boolean = true): void {
    if (!this.content) return;

    const el = document.createElement('div');
    el.className = `comm-message comm-message-${message.commType}`;

    // Format timestamp
    const time = new Date(message.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Format message based on type and perspective
    let content = '';
    switch (message.commType) {
      case 'say':
        if (message.isSender) {
          content = `<span class="comm-sender">You</span> say: ${this.formatContent(message.message)}`;
        } else {
          content = `<span class="comm-sender">${this.escapeHtml(message.sender)}</span> says: ${this.formatContent(message.message)}`;
        }
        break;
      case 'tell':
        if (message.isSender) {
          // You sent this tell
          const recipientList = message.recipients?.join(', ') || 'someone';
          content = `<span class="comm-sender">You</span> tell ${this.escapeHtml(recipientList)}: ${this.formatContent(message.message)}`;
        } else {
          // You received this tell
          if (message.recipients && message.recipients.length > 1) {
            const others = message.recipients.filter(r => r !== message.sender).join(', ');
            content = `<span class="comm-sender">${this.escapeHtml(message.sender)}</span> tells you (and ${this.escapeHtml(others)}): ${this.formatContent(message.message)}`;
          } else {
            content = `<span class="comm-sender">${this.escapeHtml(message.sender)}</span> tells you: ${this.formatContent(message.message)}`;
          }
        }
        break;
      case 'channel':
        // Check if this message has a GIF link
        if (message.gifId) {
          content = `<span class="comm-channel">[${this.escapeHtml(message.channel || 'Unknown')}]</span> <span class="comm-sender">${this.escapeHtml(message.sender)}</span>: ${this.formatContent(message.message)} <a href="#" class="gif-link" data-gif-id="${this.escapeHtml(message.gifId)}">[View GIF]</a>`;
        } else {
          content = `<span class="comm-channel">[${this.escapeHtml(message.channel || 'Unknown')}]</span> <span class="comm-sender">${this.escapeHtml(message.sender)}</span>: ${this.formatContent(message.message)}`;
        }
        break;
    }

    el.innerHTML = `<span class="comm-timestamp">${timeStr}</span> ${content}`;
    this.content.appendChild(el);

    // Auto-scroll if enabled
    if (scroll && this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Scroll content to bottom.
   */
  private scrollToBottom(): void {
    if (this.content) {
      this.content.scrollTop = this.content.scrollHeight;
    }
  }

  /**
   * Escape HTML characters.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format message content with HTML escaping and emoji conversion.
   */
  private formatContent(text: string): string {
    let result = this.escapeHtml(text);
    if (isEmojiConversionEnabled()) {
      result = convertEmoticons(result);
    }
    return result;
  }

  /**
   * Toggle panel visibility.
   */
  toggle(): void {
    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      // Save current inline height before collapsing so we can restore it later
      this.savedHeight = this.panel.style.height;
      this.panel.style.height = '';
    } else {
      // Restore the saved height when expanding
      if (this.savedHeight) {
        this.panel.style.height = this.savedHeight;
      }
    }

    this.panel.classList.toggle('collapsed', this.isCollapsed);
    this.saveLayout();
  }

  /**
   * Show the panel.
   */
  show(): void {
    this.isVisible = true;
    this.panel.classList.remove('hidden');
    this.saveLayout();
  }

  /**
   * Hide the panel.
   */
  hide(): void {
    this.isVisible = false;
    this.panel.classList.add('hidden');
    this.saveLayout();
  }

  /**
   * Check if panel is visible.
   */
  get visible(): boolean {
    return this.isVisible;
  }

  /**
   * Clean up event listeners and resources.
   * Call this when the panel is permanently removed.
   */
  destroy(): void {
    // Remove global event listeners
    document.removeEventListener('mousemove', this.boundDragMove);
    document.removeEventListener('mouseup', this.boundDragEnd);
    document.removeEventListener('touchmove', this.boundTouchMove);
    document.removeEventListener('touchend', this.boundTouchEnd);

    // Remove panel from DOM
    this.panel.remove();
  }
}

export default CommPanel;
