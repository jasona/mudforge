/**
 * StatsPanel - Draggable floating stats panel component.
 *
 * Displays player vitals (HP, MP, XP) with graphical bars,
 * plus level and gold information. Can be dragged to reposition,
 * and position is saved to localStorage.
 */

import type { StatsMessage } from './websocket-client.js';

const STORAGE_KEY = 'mudforge-stats-position';

interface Position {
  x: number;
  y: number;
}

/**
 * StatsPanel class.
 */
export class StatsPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private header: HTMLElement | null = null;
  private isVisible: boolean = true;
  private isCollapsed: boolean = false;

  // Drag state
  private isDragging: boolean = false;
  private dragOffset: Position = { x: 0, y: 0 };

  // Bar elements for updates
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
          <span class="stats-gold-icon">💰</span>
          <span class="stats-gold-label">Gold</span>
          <span class="stats-gold-value" data-stat="gold">0</span>
        </div>
        <div class="stats-gold-row stats-gold-bank">
          <span class="stats-gold-icon">🏦</span>
          <span class="stats-gold-label">Bank</span>
          <span class="stats-gold-value" data-stat="bank">0</span>
        </div>
      </div>
    `;

    this.container.appendChild(this.panel);

    // Cache element references
    this.header = this.panel.querySelector('.stats-panel-header');
    this.hpBar = this.panel.querySelector('[data-bar="hp"]');
    this.hpText = this.panel.querySelector('[data-stat="hp"]');
    this.mpBar = this.panel.querySelector('[data-bar="mp"]');
    this.mpText = this.panel.querySelector('[data-stat="mp"]');
    this.xpBar = this.panel.querySelector('[data-bar="xp"]');
    this.xpText = this.panel.querySelector('[data-stat="xp"]');
    this.levelText = this.panel.querySelector('[data-stat="level"]');
    this.goldText = this.panel.querySelector('[data-stat="gold"]');
    this.bankText = this.panel.querySelector('[data-stat="bank"]');

    // Restore saved position
    this.restorePosition();

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

    // Drag handlers on header
    if (this.header) {
      this.header.addEventListener('mousedown', this.onDragStart.bind(this));
      this.header.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    }

    // Global mouse/touch move and up handlers
    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onDragEnd.bind(this));
  }

  /**
   * Handle drag start.
   */
  private onDragStart(e: MouseEvent): void {
    // Ignore if clicking on the toggle button
    if ((e.target as HTMLElement).closest('.stats-btn')) {
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
    if ((e.target as HTMLElement).closest('.stats-btn')) {
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
    if (!this.isDragging) return;

    const parent = this.container.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const panelRect = this.container.getBoundingClientRect();

    let newX = e.clientX - parentRect.left - this.dragOffset.x;
    let newY = e.clientY - parentRect.top - this.dragOffset.y;

    // Clamp to parent bounds
    newX = Math.max(0, Math.min(newX, parentRect.width - panelRect.width));
    newY = Math.max(0, Math.min(newY, parentRect.height - panelRect.height));

    this.setPosition(newX, newY);
  }

  /**
   * Handle touch move.
   */
  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const parent = this.container.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const panelRect = this.container.getBoundingClientRect();

    let newX = touch.clientX - parentRect.left - this.dragOffset.x;
    let newY = touch.clientY - parentRect.top - this.dragOffset.y;

    // Clamp to parent bounds
    newX = Math.max(0, Math.min(newX, parentRect.width - panelRect.width));
    newY = Math.max(0, Math.min(newY, parentRect.height - panelRect.height));

    this.setPosition(newX, newY);
    e.preventDefault();
  }

  /**
   * Handle drag end.
   */
  private onDragEnd(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.panel.classList.remove('dragging');
    this.savePosition();
  }

  /**
   * Set panel position.
   */
  private setPosition(x: number, y: number): void {
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
    this.container.style.right = 'auto';
  }

  /**
   * Save position to localStorage.
   */
  private savePosition(): void {
    try {
      const position: Position = {
        x: parseInt(this.container.style.left) || 0,
        y: parseInt(this.container.style.top) || 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Restore position from localStorage.
   */
  private restorePosition(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const position: Position = JSON.parse(saved);
        // Defer to allow container to be positioned
        requestAnimationFrame(() => {
          const parent = this.container.parentElement;
          if (parent) {
            const parentRect = parent.getBoundingClientRect();
            const panelRect = this.container.getBoundingClientRect();

            // Validate position is still within bounds
            const x = Math.max(0, Math.min(position.x, parentRect.width - panelRect.width));
            const y = Math.max(0, Math.min(position.y, parentRect.height - panelRect.height));

            this.setPosition(x, y);
          }
        });
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Handle incoming stats message.
   */
  handleMessage(message: StatsMessage): void {
    if (message.type !== 'update') return;

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
