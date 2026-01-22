/**
 * EquipmentPanel - Visual equipment display component.
 *
 * Displays equipped items on a body silhouette in the left sidebar.
 * Items show as icons at their corresponding body positions.
 */

import type { StatsMessage, EquipmentSlotData } from './websocket-client.js';

/**
 * Equipment slot names and display properties.
 */
const EQUIPMENT_SLOTS = [
  'head',
  'chest',
  'hands',
  'legs',
  'feet',
  'cloak',
  'main_hand',
  'off_hand',
] as const;

type EquipmentSlotName = (typeof EQUIPMENT_SLOTS)[number];

/**
 * Fallback icons for empty slots.
 */
const SLOT_ICONS: Record<EquipmentSlotName, string> = {
  head: '🎩',
  chest: '👕',
  hands: '🧤',
  legs: '👖',
  feet: '👢',
  cloak: '🧥',
  main_hand: '⚔️',
  off_hand: '🛡️',
};

/**
 * Slot labels for tooltips.
 */
const SLOT_LABELS: Record<EquipmentSlotName, string> = {
  head: 'Head',
  chest: 'Chest',
  hands: 'Hands',
  legs: 'Legs',
  feet: 'Feet',
  cloak: 'Cloak',
  main_hand: 'Main Hand',
  off_hand: 'Off Hand',
};

/**
 * Options for EquipmentPanel.
 */
export interface EquipmentPanelOptions {
  /** Callback when any slot is clicked */
  onSlotClick?: (slot: EquipmentSlotName) => void;
}

// Global tooltip element
let tooltipElement: HTMLElement | null = null;
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Get or create the global tooltip element.
 */
function getTooltipElement(): HTMLElement {
  if (!tooltipElement) {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'equipment-tooltip';
    tooltipElement.style.cssText = `
      position: fixed;
      z-index: 10001;
      background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%);
      border: 1px solid #2a2a40;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      font-size: 13px;
      color: #f5f5f5;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      max-width: 280px;
    `;
    document.body.appendChild(tooltipElement);
  }
  return tooltipElement;
}

/**
 * Build weapon tooltip HTML.
 */
function buildWeaponTooltip(item: EquipmentSlotData): string {
  const damageType = item.damageType || 'physical';
  const handedness = item.handedness === 'two-handed' ? 'Two-Handed' : 'One-Handed';

  let html = `
    <div style="font-weight: 600; font-size: 14px; color: #4ade80; margin-bottom: 8px;">
      ${escapeHtml(item.name)}
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Damage:</span>
        <span style="color: #f87171;">${item.minDamage ?? 0}-${item.maxDamage ?? 0}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Type:</span>
        <span style="color: #fbbf24;">${capitalize(damageType)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Hands:</span>
        <span>${handedness}</span>
      </div>
  `;

  if (item.weight !== undefined) {
    html += `
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Weight:</span>
        <span>${item.weight} lbs</span>
      </div>
    `;
  }

  if (item.value !== undefined) {
    html += `
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Value:</span>
        <span style="color: #fbbf24;">${item.value} gold</span>
      </div>
    `;
  }

  html += '</div>';

  if (item.description) {
    html += `
      <div style="color: #8b8b8e; font-style: italic; border-top: 1px solid #2a2a40; padding-top: 8px; font-size: 12px;">
        ${escapeHtml(item.description)}
      </div>
    `;
  }

  return html;
}

/**
 * Build armor tooltip HTML.
 */
function buildArmorTooltip(item: EquipmentSlotData): string {
  let html = `
    <div style="font-weight: 600; font-size: 14px; color: #60a5fa; margin-bottom: 8px;">
      ${escapeHtml(item.name)}
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Armor:</span>
        <span style="color: #4ade80;">+${item.armor ?? 0}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Slot:</span>
        <span>${capitalize(item.slot || 'unknown')}</span>
      </div>
  `;

  if (item.weight !== undefined) {
    html += `
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Weight:</span>
        <span>${item.weight} lbs</span>
      </div>
    `;
  }

  if (item.value !== undefined) {
    html += `
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b8b8e;">Value:</span>
        <span style="color: #fbbf24;">${item.value} gold</span>
      </div>
    `;
  }

  html += '</div>';

  if (item.description) {
    html += `
      <div style="color: #8b8b8e; font-style: italic; border-top: 1px solid #2a2a40; padding-top: 8px; font-size: 12px;">
        ${escapeHtml(item.description)}
      </div>
    `;
  }

  return html;
}

/**
 * Build empty slot tooltip HTML.
 */
function buildEmptyTooltip(slotLabel: string): string {
  return `
    <div style="color: #8b8b8e; font-style: italic;">
      ${slotLabel} (Empty)
    </div>
  `;
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Capitalize first letter.
 */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Show tooltip near target element.
 */
function showTooltip(target: HTMLElement, html: string): void {
  const tooltip = getTooltipElement();
  tooltip.innerHTML = html;
  tooltip.style.opacity = '0';
  tooltip.style.display = 'block';

  // Position tooltip
  const rect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Position to the right of the slot by default
  let left = rect.right + 8;
  let top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);

  // If tooltip would go off right edge, position to left
  if (left + tooltipRect.width > window.innerWidth - 8) {
    left = rect.left - tooltipRect.width - 8;
  }

  // Keep on screen vertically
  top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.style.opacity = '1';
}

/**
 * Hide tooltip.
 */
function hideTooltip(): void {
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout);
    tooltipTimeout = null;
  }
  if (tooltipElement) {
    tooltipElement.style.opacity = '0';
  }
}

/**
 * EquipmentPanel class.
 */
export class EquipmentPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private isVisible: boolean = true;
  private isCollapsed: boolean = false;
  private options: EquipmentPanelOptions;
  private slots: Map<EquipmentSlotName, HTMLElement> = new Map();
  private currentEquipment: Map<EquipmentSlotName, EquipmentSlotData | null> = new Map();

  private static STORAGE_KEY = 'mudforge-equipment-collapsed';

  constructor(containerId: string, options: EquipmentPanelOptions = {}) {
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

    // Restore collapsed state from localStorage
    const savedCollapsed = localStorage.getItem(EquipmentPanel.STORAGE_KEY);
    if (savedCollapsed !== null) {
      this.isCollapsed = savedCollapsed === 'true';
    }

    // Create panel structure
    this.panel = document.createElement('div');
    this.panel.className = 'equipment-panel' + (this.isCollapsed ? ' collapsed' : '');

    // Build panel content
    this.panel.innerHTML = `
      <div class="equipment-panel-header">
        <span class="equipment-panel-title">Equipment</span>
        <button class="equipment-btn equipment-btn-toggle" title="Toggle equipment">_</button>
      </div>
      <div class="equipment-panel-content">
        <div class="equipment-body">
          ${this.createBodySilhouette()}
          <div class="equipment-slot equipment-slot-head" data-slot="head">
            <span class="equipment-slot-empty">+</span>
          </div>
          <div class="equipment-slot equipment-slot-cloak" data-slot="cloak">
            <span class="equipment-slot-empty">+</span>
          </div>
          <div class="equipment-slot equipment-slot-main_hand" data-slot="main_hand">
            <span class="equipment-slot-empty">+</span>
          </div>
          <div class="equipment-slot equipment-slot-chest" data-slot="chest">
            <span class="equipment-slot-empty">+</span>
          </div>
          <div class="equipment-slot equipment-slot-off_hand" data-slot="off_hand">
            <span class="equipment-slot-empty">+</span>
          </div>
          <div class="equipment-slot equipment-slot-hands" data-slot="hands">
            <span class="equipment-slot-empty">+</span>
          </div>
          <div class="equipment-slot equipment-slot-legs" data-slot="legs">
            <span class="equipment-slot-empty">+</span>
          </div>
          <div class="equipment-slot equipment-slot-feet" data-slot="feet">
            <span class="equipment-slot-empty">+</span>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.panel);

    // Cache slot elements
    for (const slot of EQUIPMENT_SLOTS) {
      const slotEl = this.panel.querySelector(`[data-slot="${slot}"]`) as HTMLElement;
      if (slotEl) {
        this.slots.set(slot, slotEl);
        this.currentEquipment.set(slot, null);
      }
    }

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Create the body silhouette SVG.
   */
  private createBodySilhouette(): string {
    return `
      <svg class="equipment-body-silhouette" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid meet">
        <!-- Head -->
        <circle cx="50" cy="18" r="14" fill="currentColor"/>
        <!-- Neck -->
        <rect x="45" y="32" width="10" height="8" fill="currentColor"/>
        <!-- Torso -->
        <path d="M30 40 L70 40 L75 80 L25 80 Z" fill="currentColor"/>
        <!-- Left Arm -->
        <path d="M30 40 L20 45 L15 70 L22 72 L28 50 L30 50" fill="currentColor"/>
        <!-- Right Arm -->
        <path d="M70 40 L80 45 L85 70 L78 72 L72 50 L70 50" fill="currentColor"/>
        <!-- Left Leg -->
        <path d="M35 80 L30 120 L40 120 L45 80" fill="currentColor"/>
        <!-- Right Leg -->
        <path d="M55 80 L60 120 L70 120 L65 80" fill="currentColor"/>
        <!-- Left Foot -->
        <ellipse cx="35" cy="128" rx="10" ry="6" fill="currentColor"/>
        <!-- Right Foot -->
        <ellipse cx="65" cy="128" rx="10" ry="6" fill="currentColor"/>
      </svg>
    `;
  }

  /**
   * Set up event handlers.
   */
  private setupEventHandlers(): void {
    // Toggle button
    const toggleBtn = this.panel.querySelector('.equipment-btn-toggle');
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Slot click and hover handlers
    for (const [slot, slotEl] of this.slots) {
      slotEl.addEventListener('click', () => {
        this.options.onSlotClick?.(slot);
      });

      // Tooltip on hover with delay
      slotEl.addEventListener('mouseenter', () => {
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
        }
        tooltipTimeout = setTimeout(() => {
          this.showSlotTooltip(slot);
        }, 200);
      });

      slotEl.addEventListener('mouseleave', () => {
        hideTooltip();
      });
    }
  }

  /**
   * Show tooltip for a slot.
   */
  private showSlotTooltip(slot: EquipmentSlotName): void {
    const slotEl = this.slots.get(slot);
    if (!slotEl) return;

    const equipment = this.currentEquipment.get(slot);
    let html: string;

    if (equipment) {
      if (equipment.itemType === 'weapon') {
        html = buildWeaponTooltip(equipment);
      } else {
        html = buildArmorTooltip(equipment);
      }
    } else {
      html = buildEmptyTooltip(SLOT_LABELS[slot]);
    }

    showTooltip(slotEl, html);
  }

  /**
   * Handle incoming stats message (which includes equipment data).
   */
  handleMessage(message: StatsMessage): void {
    if (message.type !== 'update' || !message.equipment) return;

    for (const slot of EQUIPMENT_SLOTS) {
      const equipment = message.equipment[slot] ?? null;
      this.updateSlot(slot, equipment);
    }
  }

  /**
   * Update a single equipment slot.
   */
  private updateSlot(slot: EquipmentSlotName, equipment: EquipmentSlotData | null): void {
    const slotEl = this.slots.get(slot);
    if (!slotEl) return;

    this.currentEquipment.set(slot, equipment);

    if (equipment) {
      // Slot is equipped
      slotEl.classList.add('equipped');

      if (equipment.image) {
        // Show item image
        slotEl.innerHTML = `<img src="${equipment.image}" alt="${escapeHtml(equipment.name)}" class="equipment-slot-icon" />`;
      } else {
        // Show fallback icon
        slotEl.innerHTML = `<span class="equipment-slot-fallback">${SLOT_ICONS[slot]}</span>`;
      }
    } else {
      // Slot is empty
      slotEl.classList.remove('equipped');
      slotEl.innerHTML = `<span class="equipment-slot-empty">+</span>`;
    }
  }

  /**
   * Toggle panel collapsed state.
   */
  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.panel.classList.toggle('collapsed', this.isCollapsed);

    // Save to localStorage
    localStorage.setItem(EquipmentPanel.STORAGE_KEY, String(this.isCollapsed));
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

export default EquipmentPanel;
