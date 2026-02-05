/**
 * StatsPanel - Docked stats panel component.
 *
 * Displays player vitals (HP, MP, XP) with graphical bars,
 * plus level and gold information. Docked in the left sidebar.
 */

import type { StatsMessage } from './websocket-client.js';
import { getAvatarSvg } from './avatars.js';

/**
 * Options for StatsPanel.
 */
export interface StatsPanelOptions {
  /** Callback when avatar is clicked */
  onAvatarClick?: () => void;
}

/**
 * StatsPanel class.
 */
export class StatsPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private isVisible: boolean = true;
  private isCollapsed: boolean = false;
  private options: StatsPanelOptions;

  // Bar elements for updates
  private avatarContainer: HTMLElement | null = null;
  private hpBar: HTMLElement | null = null;
  private hpText: HTMLElement | null = null;
  private mpBar: HTMLElement | null = null;
  private mpText: HTMLElement | null = null;
  private xpBar: HTMLElement | null = null;
  private xpText: HTMLElement | null = null;
  private levelText: HTMLElement | null = null;
  private goldText: HTMLElement | null = null;
  private bankText: HTMLElement | null = null;
  private encumbranceBar: HTMLElement | null = null;
  private encumbranceText: HTMLElement | null = null;
  private encumbranceDetail: HTMLElement | null = null;

  // Cached portrait (received via EQUIPMENT protocol, separate from STATS)
  private cachedPortrait: string | null = null;
  private cachedAvatarId: string | null = null;

  constructor(containerId: string, options: StatsPanelOptions = {}) {
    this.options = options;
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
    this.panel.className = 'stats-panel';

    // Build panel content
    this.panel.innerHTML = `
      <div class="stats-panel-header">
        <span class="stats-panel-title">Stats</span>
        <button class="stats-btn stats-btn-toggle" title="Toggle stats">_</button>
      </div>
      <div class="stats-panel-content">
        <div class="stats-avatar" data-avatar></div>
        <div class="stats-level">
          <span class="stats-level-label">Level</span>
          <span class="stats-level-value" data-stat="level">1</span>
        </div>

        <div class="stats-bar-group">
          <div class="stats-bar-header">
            <span class="stats-bar-label">HP</span>
            <span class="stats-bar-value" data-stat="hp">0/0</span>
          </div>
          <div class="stats-bar stats-bar-hp">
            <div class="stats-bar-fill" data-bar="hp" style="width: 100%;"></div>
          </div>
        </div>

        <div class="stats-bar-group">
          <div class="stats-bar-header">
            <span class="stats-bar-label">MP</span>
            <span class="stats-bar-value" data-stat="mp">0/0</span>
          </div>
          <div class="stats-bar stats-bar-mp">
            <div class="stats-bar-fill" data-bar="mp" style="width: 100%;"></div>
          </div>
        </div>

        <div class="stats-bar-group">
          <div class="stats-bar-header">
            <span class="stats-bar-label">XP</span>
            <span class="stats-bar-value" data-stat="xp">0/0</span>
          </div>
          <div class="stats-bar stats-bar-xp">
            <div class="stats-bar-fill" data-bar="xp" style="width: 0%;"></div>
          </div>
        </div>

        <div class="stats-bar-group stats-encumbrance-group">
          <div class="stats-bar-header">
            <span class="stats-bar-label">ENC</span>
            <span class="stats-bar-value" data-stat="enc">0%</span>
          </div>
          <div class="stats-bar stats-bar-enc">
            <div class="stats-bar-fill enc-none" data-bar="enc" style="width: 0%;"></div>
          </div>
          <div class="stats-enc-detail" data-stat="enc-detail">None (0/0 lbs)</div>
        </div>

        <div class="stats-gold-row">
          <span class="stats-gold-header"><span class="stats-gold-icon">💰</span>Gold</span>
          <span class="stats-gold-value" data-stat="gold">0</span>
        </div>
        <div class="stats-gold-row stats-gold-bank">
          <span class="stats-gold-header"><span class="stats-gold-icon">🏦</span>Bank</span>
          <span class="stats-gold-value" data-stat="bank">0</span>
        </div>
      </div>
    `;

    this.container.appendChild(this.panel);

    // Cache element references
    this.avatarContainer = this.panel.querySelector('[data-avatar]');
    this.hpBar = this.panel.querySelector('[data-bar="hp"]');
    this.hpText = this.panel.querySelector('[data-stat="hp"]');
    this.mpBar = this.panel.querySelector('[data-bar="mp"]');
    this.mpText = this.panel.querySelector('[data-stat="mp"]');
    this.xpBar = this.panel.querySelector('[data-bar="xp"]');
    this.xpText = this.panel.querySelector('[data-stat="xp"]');
    this.levelText = this.panel.querySelector('[data-stat="level"]');
    this.goldText = this.panel.querySelector('[data-stat="gold"]');
    this.bankText = this.panel.querySelector('[data-stat="bank"]');
    this.encumbranceBar = this.panel.querySelector('[data-bar="enc"]');
    this.encumbranceText = this.panel.querySelector('[data-stat="enc"]');
    this.encumbranceDetail = this.panel.querySelector('[data-stat="enc-detail"]');

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers.
   */
  private setupEventHandlers(): void {
    const toggleBtn = this.panel.querySelector('.stats-btn-toggle');
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Avatar click handler - opens score modal
    if (this.avatarContainer && this.options.onAvatarClick) {
      this.avatarContainer.style.cursor = 'pointer';
      this.avatarContainer.title = 'Click to view character sheet';
      this.avatarContainer.addEventListener('click', () => {
        this.options.onAvatarClick?.();
      });
    }
  }

  /**
   * Handle incoming stats message.
   */
  handleMessage(message: StatsMessage): void {
    if (message.type !== 'update') return;

    // Cache avatar ID for fallback
    if (message.avatar) {
      this.cachedAvatarId = message.avatar;
    }

    // Update avatar - prefer portrait from message, then cached, then avatar SVG
    // Note: profilePortrait is now sent via EQUIPMENT protocol (not every heartbeat)
    if (this.avatarContainer) {
      const portrait = message.profilePortrait || this.cachedPortrait;
      if (portrait && portrait.startsWith('data:')) {
        // Use AI-generated portrait (from STATS or cached from EQUIPMENT)
        this.avatarContainer.innerHTML = `<img src="${portrait}" alt="Portrait" class="stats-avatar-img" />`;
      } else if (message.avatar) {
        // Fall back to base avatar SVG
        this.avatarContainer.innerHTML = getAvatarSvg(message.avatar);
      }
    }

    // Update level
    if (this.levelText) {
      this.levelText.textContent = String(message.level);
    }

    // Update HP bar
    const hpPercent = message.maxHp > 0 ? (message.hp / message.maxHp) * 100 : 0;
    if (this.hpBar) {
      this.hpBar.style.width = `${hpPercent}%`;
      this.hpBar.className = 'stats-bar-fill ' + this.getHpColorClass(hpPercent);
    }
    if (this.hpText) {
      this.hpText.textContent = `${message.hp}/${message.maxHp}`;
    }

    // Update MP bar
    const mpPercent = message.maxMp > 0 ? (message.mp / message.maxMp) * 100 : 0;
    if (this.mpBar) {
      this.mpBar.style.width = `${mpPercent}%`;
      this.mpBar.className = 'stats-bar-fill ' + this.getMpColorClass(mpPercent);
    }
    if (this.mpText) {
      this.mpText.textContent = `${message.mp}/${message.maxMp}`;
    }

    // Update XP bar
    const xpPercent = message.xpToLevel > 0 ? (message.xp / message.xpToLevel) * 100 : 0;
    if (this.xpBar) {
      this.xpBar.style.width = `${xpPercent}%`;
    }
    if (this.xpText) {
      this.xpText.textContent = `${message.xp}/${message.xpToLevel}`;
    }

    // Update gold
    if (this.goldText) {
      this.goldText.textContent = this.formatGold(message.gold);
    }
    if (this.bankText) {
      this.bankText.textContent = this.formatGold(message.bankedGold);
    }

    // Update encumbrance bar
    const encPercent = message.encumbrancePercent ?? 0;
    const encColorClass = this.getEncumbranceColorClass(encPercent);
    if (this.encumbranceBar) {
      // Cap display at 100% but keep actual value for calculation
      const displayPercent = Math.min(encPercent, 100);
      this.encumbranceBar.style.width = `${displayPercent}%`;
      this.encumbranceBar.className = 'stats-bar-fill ' + encColorClass;
    }
    if (this.encumbranceText) {
      this.encumbranceText.textContent = `${Math.round(encPercent)}%`;
    }
    if (this.encumbranceDetail) {
      const levelLabel = this.getEncumbranceLevelLabel(encPercent);
      const carried = Math.round(message.carriedWeight ?? 0);
      const max = Math.round(message.maxCarryWeight ?? 0);
      this.encumbranceDetail.textContent = `${levelLabel} (${carried}/${max} lbs)`;
    }
  }

  /**
   * Get CSS color class for encumbrance based on percentage.
   * Thresholds: <50% none (green), 50-74% light (yellow), 75-99% medium (orange), 100%+ heavy (red)
   */
  private getEncumbranceColorClass(percent: number): string {
    if (percent >= 100) return 'enc-heavy';
    if (percent >= 75) return 'enc-medium';
    if (percent >= 50) return 'enc-light';
    return 'enc-none';
  }

  /**
   * Get display label for encumbrance level based on percentage.
   */
  private getEncumbranceLevelLabel(percent: number): string {
    if (percent >= 100) return 'Heavy';
    if (percent >= 75) return 'Medium';
    if (percent >= 50) return 'Light';
    return 'None';
  }

  /**
   * Get HP bar color class based on percentage.
   */
  private getHpColorClass(percent: number): string {
    if (percent > 75) return 'hp-high';
    if (percent > 50) return 'hp-medium';
    if (percent > 25) return 'hp-low';
    return 'hp-critical';
  }

  /**
   * Get MP bar color class based on percentage.
   */
  private getMpColorClass(percent: number): string {
    return percent > 50 ? 'mp-high' : 'mp-low';
  }

  /**
   * Format gold with commas.
   */
  private formatGold(amount: number): string {
    return amount.toLocaleString();
  }

  /**
   * Toggle panel visibility.
   */
  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.panel.classList.toggle('collapsed', this.isCollapsed);
  }

  /**
   * Show the panel.
   */
  show(): void {
    this.isVisible = true;
    this.panel.classList.remove('hidden');
  }

  /**
   * Hide the panel.
   */
  hide(): void {
    this.isVisible = false;
    this.panel.classList.add('hidden');
  }

  /**
   * Check if panel is visible.
   */
  get visible(): boolean {
    return this.isVisible && !this.isCollapsed;
  }

  /**
   * Update portrait from EQUIPMENT protocol.
   * This is called when portrait is sent separately from STATS (bandwidth optimization).
   */
  updatePortrait(portrait: string): void {
    // Cache the portrait for future STATS messages
    this.cachedPortrait = portrait;

    // Update the display immediately
    if (this.avatarContainer && portrait.startsWith('data:')) {
      this.avatarContainer.innerHTML = `<img src="${portrait}" alt="Portrait" class="stats-avatar-img" />`;
    }
  }
}

export default StatsPanel;
