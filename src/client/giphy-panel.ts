/**
 * GiphyPanel - Floating GIF display panel.
 *
 * Shows shared GIFs in a non-blocking floating panel below the combat panel.
 * Auto-closes after a configurable timeout.
 * Positioned to the left of the map widget, below the combat panel.
 */

/**
 * Simple throttle function to limit how often a function can be called.
 */
function throttle<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      // Schedule a trailing call
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T;
}

export interface GiphyMessage {
  type: 'show' | 'hide';
  gifUrl?: string;
  senderName?: string;
  channelName?: string;
  searchQuery?: string;
  autoCloseMs?: number;
}

/**
 * GiphyPanel class.
 */
export class GiphyPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private isVisible: boolean = false;
  private autoCloseTimer: number | null = null;

  // Element references
  private gifImage: HTMLImageElement | null = null;
  private headerElement: HTMLElement | null = null;
  private queryElement: HTMLElement | null = null;

  // Throttled position handler to prevent excessive reflows
  private throttledPositionPanel: () => void;

  constructor(containerId: string) {
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
    this.panel.className = 'giphy-panel hidden';

    // Build panel content
    this.panel.innerHTML = `
      <button class="giphy-close" data-close aria-label="Close">&times;</button>
      <div class="giphy-header" data-header>Someone shares:</div>
      <div class="giphy-image-container">
        <img class="giphy-image" data-gif alt="Shared GIF">
      </div>
      <div class="giphy-query" data-query>"search query"</div>
      <div class="giphy-attribution">Powered by GIPHY</div>
    `;

    this.container.appendChild(this.panel);

    // Cache element references
    this.gifImage = this.panel.querySelector('[data-gif]');
    this.headerElement = this.panel.querySelector('[data-header]');
    this.queryElement = this.panel.querySelector('[data-query]');

    // Add close button handler
    const closeBtn = this.panel.querySelector('[data-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Create throttled position handler (100ms) to prevent excessive reflows
    this.throttledPositionPanel = throttle(() => this.positionPanel(), 100);

    // Position the panel relative to the map
    this.positionPanel();

    // Listen for window resize to reposition (throttled)
    window.addEventListener('resize', this.throttledPositionPanel);

    // Observe map container for position changes (when dragged)
    this.observeMapPosition();
  }

  /**
   * Observe the map container for position/style changes to reposition giphy panel.
   */
  private observeMapPosition(): void {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
      return;
    }

    // Use MutationObserver to watch for style changes (dragging)
    // Uses throttled handler to prevent excessive reflows during drag
    const observer = new MutationObserver(() => {
      if (this.isVisible) {
        this.throttledPositionPanel();
      }
    });

    observer.observe(mapContainer, {
      attributes: true,
      attributeFilter: ['style'],
    });
  }

  /**
   * Position the panel to the left of the map widget, below the combat panel.
   */
  private positionPanel(): void {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
      return;
    }

    // Get the map-panel element inside the container (that's the actual visible box)
    const mapPanel = mapContainer.querySelector('.map-panel');
    if (!mapPanel) {
      return;
    }

    // Get the parent container (terminal-container) for relative positioning
    const terminalContainer = document.getElementById('terminal-container');
    if (!terminalContainer) {
      return;
    }

    // Get positions relative to viewport
    const mapRect = mapPanel.getBoundingClientRect();
    const parentRect = terminalContainer.getBoundingClientRect();

    // Check if combat panel is visible and get its position
    const combatPanel = document.querySelector('.combat-panel:not(.hidden)');
    let topOffset = mapRect.top - parentRect.top;

    if (combatPanel) {
      // Position below the combat panel
      const combatRect = combatPanel.getBoundingClientRect();
      topOffset = combatRect.bottom - parentRect.top + 8; // 8px gap below combat panel
    }

    // Calculate position relative to terminal-container
    const relativeRight = parentRect.right - mapRect.left;

    // Position giphy panel
    const gap = 8; // Gap between panel and map

    this.container.style.position = 'absolute';
    this.container.style.top = `${topOffset}px`;
    this.container.style.right = `${relativeRight + gap}px`;
    this.container.style.zIndex = '100';
  }

  /**
   * Handle incoming giphy message.
   */
  handleMessage(message: GiphyMessage): void {
    if (message.type === 'hide') {
      this.hide();
      return;
    }

    if (message.type === 'show') {
      this.showGif(message);
    }
  }

  /**
   * Show a GIF in the panel.
   */
  private showGif(message: GiphyMessage): void {
    const { gifUrl, senderName, channelName, searchQuery, autoCloseMs } = message;

    // Clear any existing auto-close timer first
    this.clearAutoCloseTimer();

    // Update header
    if (this.headerElement && senderName && channelName) {
      this.headerElement.textContent = `${senderName} shares on ${channelName}:`;
    }

    // Update GIF image
    if (this.gifImage && gifUrl) {
      this.gifImage.src = gifUrl;
      this.gifImage.alt = searchQuery || 'Shared GIF';
    }

    // Update query text
    if (this.queryElement && searchQuery) {
      this.queryElement.textContent = `"${searchQuery}"`;
    }

    // Show the panel (force show even if already visible)
    this.isVisible = true;
    this.panel.classList.remove('hidden');
    this.positionPanel();

    // Set up auto-close timer
    if (typeof autoCloseMs === 'number' && autoCloseMs > 0) {
      this.setAutoClose(autoCloseMs);
    }
  }

  /**
   * Clear the auto-close timer if it exists.
   */
  private clearAutoCloseTimer(): void {
    if (this.autoCloseTimer !== null) {
      window.clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
  }

  /**
   * Set auto-close timer.
   */
  private setAutoClose(ms: number): void {
    // Clear any existing timer
    this.clearAutoCloseTimer();

    // Set new timer
    this.autoCloseTimer = window.setTimeout(() => {
      this.hide();
    }, ms);
  }

  /**
   * Show the panel.
   */
  show(): void {
    this.isVisible = true;
    this.panel.classList.remove('hidden');
    this.positionPanel();
  }

  /**
   * Hide the panel.
   */
  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.panel.classList.add('hidden');
    this.clearAutoCloseTimer();
  }

  /**
   * Check if panel is visible.
   */
  get visible(): boolean {
    return this.isVisible;
  }
}

export default GiphyPanel;
