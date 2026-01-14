/**
 * QuestPanel - Docked sidebar component for displaying active quests.
 *
 * Shows the last 3 accepted quests with progress bars.
 * Clicking a quest name triggers a callback to open the full quest log.
 */

import type { QuestMessage } from './websocket-client.js';

const STORAGE_KEY = 'mudforge-quest-collapsed';

interface QuestData {
  questId: string;
  name: string;
  progress: number;
  progressText: string;
  status: 'active' | 'completed';
}

/**
 * QuestPanel class.
 */
export class QuestPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private content: HTMLElement | null = null;
  private isCollapsed: boolean = false;
  private quests: QuestData[] = [];
  private onQuestClick: ((questId: string) => void) | null = null;

  constructor(containerId: string, options?: { onQuestClick?: (questId: string) => void }) {
    this.onQuestClick = options?.onQuestClick || null;

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
    this.panel.className = 'quest-panel';

    // Build panel content
    this.panel.innerHTML = `
      <div class="quest-panel-header">
        <span class="quest-panel-title">Active Quests</span>
        <button class="quest-btn quest-btn-toggle" title="Toggle quests">_</button>
      </div>
      <div class="quest-panel-content">
        <div class="quest-empty">No active quests</div>
      </div>
    `;

    this.container.appendChild(this.panel);

    // Cache element references
    this.content = this.panel.querySelector('.quest-panel-content');

    // Restore collapsed state
    this.restoreCollapsedState();

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers.
   */
  private setupEventHandlers(): void {
    const toggleBtn = this.panel.querySelector('.quest-btn-toggle');
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
  }

  /**
   * Restore collapsed state from localStorage.
   */
  private restoreCollapsedState(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'true') {
        this.isCollapsed = true;
        this.panel.classList.add('collapsed');
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Save collapsed state to localStorage.
   */
  private saveCollapsedState(): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.isCollapsed));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Handle incoming quest message.
   */
  handleMessage(message: QuestMessage): void {
    if (message.type !== 'update') return;

    this.quests = message.quests;
    this.render();
  }

  /**
   * Render the quest list.
   */
  private render(): void {
    if (!this.content) return;

    if (this.quests.length === 0) {
      this.content.innerHTML = '<div class="quest-empty">No active quests</div>';
      return;
    }

    const questsHtml = this.quests
      .map(
        (quest) => `
        <div class="quest-item ${quest.status === 'completed' ? 'quest-completed' : ''}" data-quest-id="${quest.questId}">
          <div class="quest-name" title="Click to view details">${this.escapeHtml(quest.name)}</div>
          <div class="quest-progress">
            <div class="quest-progress-bar" style="width: ${quest.progress}%"></div>
          </div>
          <div class="quest-progress-text">${this.escapeHtml(quest.progressText)}</div>
        </div>
      `
      )
      .join('');

    this.content.innerHTML = questsHtml;

    // Add click handlers
    const questItems = this.content.querySelectorAll('.quest-item');
    questItems.forEach((item) => {
      item.addEventListener('click', () => {
        const questId = item.getAttribute('data-quest-id');
        if (questId && this.onQuestClick) {
          this.onQuestClick(questId);
        }
      });
    });
  }

  /**
   * Escape HTML special characters.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Toggle panel collapsed state.
   */
  toggle(): void {
    this.isCollapsed = !this.isCollapsed;
    this.panel.classList.toggle('collapsed', this.isCollapsed);
    this.saveCollapsedState();
  }

  /**
   * Set the quest click callback.
   */
  setQuestClickHandler(handler: (questId: string) => void): void {
    this.onQuestClick = handler;
  }
}

export default QuestPanel;
