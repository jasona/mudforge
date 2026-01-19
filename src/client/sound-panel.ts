/**
 * SoundPanel - Compact sound control widget for the MudForge client.
 *
 * Displays a sound indicator and provides volume/category controls.
 */

import { SoundManager, ALL_CATEGORIES, type SoundCategory, type SoundMessage } from './sound-manager.js';

const EXPANDED_STORAGE_KEY = 'mudforge-sound-expanded';

/**
 * Category display information.
 */
const CATEGORY_INFO: Record<SoundCategory, { icon: string; label: string }> = {
  combat: { icon: '\u2694\uFE0F', label: 'Combat' },       // Crossed swords
  spell: { icon: '\u2728', label: 'Spell' },               // Sparkles
  skill: { icon: '\uD83D\uDCAA', label: 'Skill' },         // Flexed bicep
  potion: { icon: '\uD83E\uDDEA', label: 'Potion' },       // Test tube
  quest: { icon: '\uD83D\uDCDC', label: 'Quest' },         // Scroll
  celebration: { icon: '\uD83C\uDF89', label: 'Celebration' }, // Party popper
  discussion: { icon: '\uD83D\uDCAC', label: 'Discuss' },  // Speech balloon
  alert: { icon: '\u26A0\uFE0F', label: 'Alert' },         // Warning
  ambient: { icon: '\uD83C\uDF3F', label: 'Ambient' },     // Herb
  ui: { icon: '\uD83D\uDDB1\uFE0F', label: 'Interface' },  // Mouse
};

/**
 * Sound panel widget.
 */
export class SoundPanel {
  private container: HTMLElement;
  private soundManager: SoundManager;
  private panelElement: HTMLElement | null = null;
  private isExpanded: boolean = false;
  private activityTimer: number | null = null;
  private currentCategory: SoundCategory | null = null;
  private activeLoops: Map<string, SoundCategory> = new Map(); // Track active loop IDs and their categories

  constructor(containerId: string, soundManager: SoundManager) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container element #${containerId} not found`);
    }
    this.container = container;
    this.soundManager = soundManager;
    this.restoreExpandedState();
    this.render();
  }

  /**
   * Restore expanded state from localStorage.
   */
  private restoreExpandedState(): void {
    try {
      const saved = localStorage.getItem(EXPANDED_STORAGE_KEY);
      if (saved !== null) {
        this.isExpanded = saved === 'true';
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Save expanded state to localStorage.
   */
  private saveExpandedState(): void {
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, String(this.isExpanded));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Render the sound panel.
   */
  private render(): void {
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'sound-panel';
    this.panelElement.innerHTML = this.buildHTML();
    this.container.appendChild(this.panelElement);
    this.attachEventListeners();
    this.updateUI();

    // Apply initial expanded state
    if (this.isExpanded) {
      this.setExpanded(true);
    }
  }

  /**
   * Build the panel HTML.
   */
  private buildHTML(): string {
    return `
      <div class="sound-panel-compact">
        <div class="sound-indicator" title="Click to expand">
          <span class="sound-indicator-icon">\uD83D\uDD0A</span>
          <span class="sound-indicator-label">Ready</span>
        </div>
        <button class="sound-mute-btn" title="Toggle sound">
          <span class="sound-mute-icon">\uD83D\uDD0A</span>
        </button>
      </div>
      <div class="sound-panel-expanded hidden">
        <div class="sound-volume-row">
          <label class="sound-volume-label">Volume</label>
          <input type="range" class="sound-volume-slider" min="0" max="100" value="70">
          <span class="sound-volume-value">70%</span>
        </div>
        <div class="sound-categories">
          ${ALL_CATEGORIES.map(cat => `
            <button class="sound-category-btn" data-category="${cat}" title="${CATEGORY_INFO[cat].label}">
              <span class="sound-category-icon">${CATEGORY_INFO[cat].icon}</span>
              <span class="sound-category-label">${CATEGORY_INFO[cat].label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners.
   */
  private attachEventListeners(): void {
    if (!this.panelElement) return;

    // Indicator click - toggle expanded
    const indicator = this.panelElement.querySelector('.sound-indicator');
    indicator?.addEventListener('click', () => this.toggleExpanded());

    // Mute button
    const muteBtn = this.panelElement.querySelector('.sound-mute-btn');
    muteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.soundManager.toggleEnabled();
      this.updateUI();
    });

    // Volume slider
    const volumeSlider = this.panelElement.querySelector('.sound-volume-slider') as HTMLInputElement;
    volumeSlider?.addEventListener('input', () => {
      const volume = parseInt(volumeSlider.value, 10) / 100;
      this.soundManager.setVolume(volume);
      this.updateVolumeDisplay();
    });

    // Category buttons
    const categoryBtns = this.panelElement.querySelectorAll('.sound-category-btn');
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-category') as SoundCategory;
        this.soundManager.toggleCategory(category);
        this.updateCategoryButtons();
      });
    });
  }

  /**
   * Toggle expanded state.
   */
  private toggleExpanded(): void {
    this.setExpanded(!this.isExpanded);
  }

  /**
   * Set expanded state.
   */
  private setExpanded(expanded: boolean): void {
    this.isExpanded = expanded;
    const expandedPanel = this.panelElement?.querySelector('.sound-panel-expanded');
    if (expandedPanel) {
      expandedPanel.classList.toggle('hidden', !expanded);
    }
    this.panelElement?.classList.toggle('expanded', expanded);
    this.saveExpandedState();
  }

  /**
   * Update the entire UI state.
   */
  private updateUI(): void {
    this.updateMuteButton();
    this.updateVolumeDisplay();
    this.updateCategoryButtons();
    this.updateIndicator();
  }

  /**
   * Update mute button state.
   */
  private updateMuteButton(): void {
    const muteIcon = this.panelElement?.querySelector('.sound-mute-icon');
    if (muteIcon) {
      muteIcon.textContent = this.soundManager.isEnabled() ? '\uD83D\uDD0A' : '\uD83D\uDD07';
    }
  }

  /**
   * Update volume display.
   */
  private updateVolumeDisplay(): void {
    const slider = this.panelElement?.querySelector('.sound-volume-slider') as HTMLInputElement;
    const valueDisplay = this.panelElement?.querySelector('.sound-volume-value');
    const volume = Math.round(this.soundManager.getVolume() * 100);

    if (slider) {
      slider.value = String(volume);
    }
    if (valueDisplay) {
      valueDisplay.textContent = `${volume}%`;
    }
  }

  /**
   * Update category button states.
   */
  private updateCategoryButtons(): void {
    const categoryStates = this.soundManager.getCategoryStates();
    const buttons = this.panelElement?.querySelectorAll('.sound-category-btn');

    buttons?.forEach(btn => {
      const category = btn.getAttribute('data-category') as SoundCategory;
      const isEnabled = categoryStates[category];
      btn.classList.toggle('enabled', isEnabled);
      btn.classList.toggle('disabled', !isEnabled);
    });
  }

  /**
   * Update the indicator display.
   */
  private updateIndicator(): void {
    const iconEl = this.panelElement?.querySelector('.sound-indicator-icon');
    const labelEl = this.panelElement?.querySelector('.sound-indicator-label');

    if (!iconEl || !labelEl) return;

    if (!this.soundManager.isEnabled()) {
      iconEl.textContent = '\uD83D\uDD07'; // Muted
      labelEl.textContent = 'Muted';
      this.panelElement?.classList.add('muted');
    } else if (this.currentCategory) {
      const info = CATEGORY_INFO[this.currentCategory];
      iconEl.textContent = info.icon;
      labelEl.textContent = info.label;
      this.panelElement?.classList.remove('muted');
    } else {
      iconEl.textContent = '\uD83D\uDD0A'; // Speaker
      labelEl.textContent = 'Ready';
      this.panelElement?.classList.remove('muted');
    }
  }

  /**
   * Show activity for a category.
   * @param isLoop If true, the indicator will persist until clearActivity is called
   */
  private showActivity(category: SoundCategory, isLoop: boolean = false): void {
    this.currentCategory = category;
    this.updateIndicator();
    this.panelElement?.classList.add('active');

    // Clear existing timer
    if (this.activityTimer !== null) {
      window.clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }

    // For non-looping sounds, return to ready state after 2 seconds
    // Looping sounds persist until explicitly stopped
    if (!isLoop && this.activeLoops.size === 0) {
      this.activityTimer = window.setTimeout(() => {
        this.currentCategory = null;
        this.panelElement?.classList.remove('active');
        this.updateIndicator();
        this.activityTimer = null;
      }, 2000);
    }
  }

  /**
   * Clear activity indicator (used when looping sounds stop).
   */
  private clearActivity(): void {
    // Only clear if no more active loops
    if (this.activeLoops.size === 0) {
      this.currentCategory = null;
      this.panelElement?.classList.remove('active');
      this.updateIndicator();
    } else {
      // Update to show the category of the remaining loop
      const remainingCategory = this.activeLoops.values().next().value;
      if (remainingCategory) {
        this.currentCategory = remainingCategory;
        this.updateIndicator();
      }
    }
  }

  /**
   * Handle a sound message from the server.
   */
  handleSoundMessage(message: SoundMessage): void {
    // Pass to sound manager for playback
    this.soundManager.handleMessage(message);

    // Handle indicator based on message type
    if (message.type === 'play') {
      this.showActivity(message.category, false);
    } else if (message.type === 'loop' && message.id) {
      // Track this loop and show persistent indicator
      this.activeLoops.set(message.id, message.category);
      this.showActivity(message.category, true);
    } else if (message.type === 'stop') {
      // Remove from active loops if it was a loop
      if (message.id) {
        this.activeLoops.delete(message.id);
      } else {
        // Stopping all in category - remove all loops for that category
        for (const [id, cat] of this.activeLoops.entries()) {
          if (cat === message.category) {
            this.activeLoops.delete(id);
          }
        }
      }
      this.clearActivity();
    }
  }
}

export default SoundPanel;
