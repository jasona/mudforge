/**
 * StatsPanel - Docked stats panel component.
 *
 * Displays player vitals (HP, MP, XP) with graphical bars,
 * plus level and gold information. Docked in the left sidebar.
 */

import type { StatsMessage } from './websocket-client.js';
import { getAvatarSvg } from './avatars.js';

/**
 * StatsPanel class.
 */
export class StatsPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private isVisible: boolean = true;
  private isCollapsed: boolean = false;

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
  }

  /**
   * Handle incoming stats message.
   */
  handleMessage(message: StatsMessage): void {
    if (message.type !== 'update') return;

    // Update avatar
    if (this.avatarContainer && message.avatar) {
      this.avatarContainer.innerHTML = getAvatarSvg(message.avatar);
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
}

export default StatsPanel;
