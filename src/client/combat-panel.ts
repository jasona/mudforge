/**
 * CombatPanel - Floating combat target display.
 *
 * Shows the current combat target's portrait, name, and health bar.
 * Appears when combat starts, updates during combat, and disappears when combat ends.
 * Positioned to the left of the map widget.
 */

import type { CombatMessage, CombatTargetUpdateMessage, CombatHealthUpdateMessage } from './websocket-client.js';
import { getAvatarSvg } from './avatars.js';
import { isAvatarId, getFallbackPortrait, isValidSvg, isDataUri } from './npc-portraits.js';

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

/**
 * CombatPanel class.
 */
export class CombatPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private isVisible: boolean = false;

  // Element references
  private portraitContainer: HTMLElement | null = null;
  private nameElement: HTMLElement | null = null;
  private levelElement: HTMLElement | null = null;
  private healthBar: HTMLElement | null = null;
  private healthText: HTMLElement | null = null;

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
    this.panel.className = 'combat-panel hidden';

    // Build panel content
    this.panel.innerHTML = `
      <div class="combat-portrait" data-portrait></div>
      <div class="combat-info">
        <div class="combat-name" data-name>Target</div>
        <div class="combat-level" data-level>Level 1</div>
        <div class="combat-health">
          <div class="combat-health-bar">
            <div class="combat-health-fill" data-health-bar style="width: 100%;"></div>
          </div>
          <div class="combat-health-text" data-health-text>100/100</div>
        </div>
      </div>
    `;

    this.container.appendChild(this.panel);

    // Cache element references
    this.portraitContainer = this.panel.querySelector('[data-portrait]');
    this.nameElement = this.panel.querySelector('[data-name]');
    this.levelElement = this.panel.querySelector('[data-level]');
    this.healthBar = this.panel.querySelector('[data-health-bar]');
    this.healthText = this.panel.querySelector('[data-health-text]');

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
   * Observe the map container for position/style changes to reposition combat panel.
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
   * Position the panel to the left of the map widget.
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

    // Calculate position relative to terminal-container (since it has position: relative)
    const relativeTop = mapRect.top - parentRect.top;
    const relativeRight = parentRect.right - mapRect.left;

    // Position combat panel to the left of the map, aligned at the top
    const gap = 8; // Gap between panel and map

    this.container.style.position = 'absolute';
    this.container.style.top = `${relativeTop}px`;
    this.container.style.right = `${relativeRight + gap}px`;
  }

  /**
   * Handle incoming combat message.
   */
  handleMessage(message: CombatMessage): void {
    if (message.type === 'target_clear') {
      this.hide();
      return;
    }

    if (message.type === 'target_update') {
      this.updateTarget(message);
      this.show();
      return;
    }

    if (message.type === 'health_update') {
      this.updateHealth(message);
      // Panel should already be visible, but ensure it is
      this.show();
    }
  }

  /**
   * Update the panel with target information.
   */
  private updateTarget(message: CombatTargetUpdateMessage): void {
    const { target } = message;

    // Update portrait
    if (this.portraitContainer) {
      // Clear existing content
      this.portraitContainer.innerHTML = '';

      if (target.portraitUrl) {
        const img = document.createElement('img');
        img.src = target.portraitUrl;
        img.alt = target.name;
        img.className = 'combat-portrait-img';
        this.portraitContainer.appendChild(img);
      } else if (isAvatarId(target.portrait)) {
        // Player portrait - use avatar system (SVG)
        this.portraitContainer.innerHTML = getAvatarSvg(target.portrait);
      } else if (isDataUri(target.portrait)) {
        // NPC portrait from Nano Banana - use img element
        const img = document.createElement('img');
        img.src = target.portrait;
        img.alt = target.name;
        img.className = 'combat-portrait-img';
        this.portraitContainer.appendChild(img);
      } else if (isValidSvg(target.portrait)) {
        // NPC portrait - use provided SVG
        this.portraitContainer.innerHTML = target.portrait;
      } else {
        // Fallback portrait (SVG)
        this.portraitContainer.innerHTML = getFallbackPortrait();
      }
    }

    // Update name (capitalize first letter)
    if (this.nameElement) {
      const capitalizedName = target.name.charAt(0).toUpperCase() + target.name.slice(1);
      this.nameElement.textContent = capitalizedName;
    }

    // Update level
    if (this.levelElement) {
      this.levelElement.textContent = `Level ${target.level}`;
    }

    // Update health bar
    const healthPercent = target.healthPercent;

    if (this.healthBar) {
      this.healthBar.style.width = `${healthPercent}%`;
      this.healthBar.className = 'combat-health-fill ' + this.getHealthColorClass(healthPercent);
    }

    if (this.healthText) {
      this.healthText.textContent = `${target.health}/${target.maxHealth}`;
    }

    // Reposition in case map moved
    this.positionPanel();
  }

  /**
   * Update just the health bar (lightweight update without portrait).
   */
  private updateHealth(message: CombatHealthUpdateMessage): void {
    const healthPercent = message.healthPercent;

    if (this.healthBar) {
      this.healthBar.style.width = `${healthPercent}%`;
      this.healthBar.className = 'combat-health-fill ' + this.getHealthColorClass(healthPercent);
    }

    if (this.healthText) {
      this.healthText.textContent = `${message.health}/${message.maxHealth}`;
    }
  }

  /**
   * Get health bar color class based on percentage.
   */
  private getHealthColorClass(percent: number): string {
    if (percent > 75) return 'health-high';
    if (percent > 50) return 'health-medium';
    if (percent > 25) return 'health-low';
    return 'health-critical';
  }

  /**
   * Show the panel.
   */
  show(): void {
    if (this.isVisible) return;
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
  }

  /**
   * Check if panel is visible.
   */
  get visible(): boolean {
    return this.isVisible;
  }
}

export default CombatPanel;
