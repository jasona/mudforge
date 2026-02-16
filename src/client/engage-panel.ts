/**
 * EngagePanel - WoW-style NPC dialogue overlay.
 *
 * Shows an NPC portrait with a speech bubble and optional quest action buttons.
 */

import type {
  EngageMessage,
  EngageOpenMessage,
  EngageAlignment,
  EngageOption,
  EngageQuestDetails,
} from './websocket-client.js';
import { getFallbackPortrait, isDataUri, isValidSvg } from './npc-portraits.js';
import { parseAnsi } from './ansi-parser.js';

const LOADING_STATUS_LINES = [
  'Calibrating sarcasm levels...',
  'Reticulating splines... please wait.',
  'Teaching AI to fetch coffee... almost there.',
  "Untangling the internet's extension cords...",
  'Compiling bad decisions into good ones...',
  'Downloading more RAM... just kidding.',
  'Feeding the office hamster...',
  'Aligning pixels with the moon phase...',
  'Polishing virtual buttons...',
  'Negotiating with the cloud...',
  'Rewriting history... responsibly.',
  'Warming up the flux capacitor...',
  'Counting to infinity... twice.',
  'Debugging the debugger...',
  'Asking Stack Overflow nicely...',
  'Summoning tiny loading gnomes...',
  'Installing last-minute confidence...',
  'Herding rogue electrons...',
  'Making zeros and ones get along...',
  'Almost ready... pretending to look busy...',
] as const;

interface EngagePanelOptions {
  onCommand?: (command: string) => void;
  onLoadingStateChange?: (active: boolean) => void;
}

export class EngagePanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private portraitEl: HTMLElement | null = null;
  private nameEl: HTMLElement | null = null;
  private textEl: HTMLElement | null = null;
  private actionsEl: HTMLElement | null = null;
  private questLogEl: HTMLElement | null = null;
  private questDetailEl: HTMLElement | null = null;
  private offersEl: HTMLElement | null = null;
  private turnInsEl: HTMLElement | null = null;
  private questDetailsById: Map<string, EngageQuestDetails> = new Map();
  private currentNpcName: string = '';
  private selectedQuestId: string | null = null;
  private onCommand?: (command: string) => void;
  private onLoadingStateChange?: (active: boolean) => void;
  private loadingOverlay: HTMLElement | null = null;
  private loadingTitleEl: HTMLElement | null = null;
  private loadingMessageEl: HTMLElement | null = null;
  private loadingTickerId: number | null = null;
  private lastLoadingLine: string | null = null;
  private isVisible: boolean = false;
  private onKeyDownBound: (e: KeyboardEvent) => void;

  constructor(containerId: string, options?: EngagePanelOptions) {
    const existing = document.getElementById(containerId);
    if (existing) {
      this.container = existing;
    } else {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }

    this.onCommand = options?.onCommand;
    this.onLoadingStateChange = options?.onLoadingStateChange;

    this.panel = document.createElement('div');
    this.panel.className = 'engage-panel hidden engage-v-bottom engage-h-right';
    this.panel.dataset.tail = 'left';
    this.panel.innerHTML = `
      <div class="engage-portrait-wrap" data-portrait></div>
      <div class="engage-bubble">
        <button class="engage-close-btn" title="Close">&times;</button>
        <div class="engage-npc-name" data-name></div>
        <div class="engage-text" data-text></div>
        <div class="engage-section" data-actions></div>
        <div class="engage-section" data-quest-log></div>
        <div class="engage-section" data-quest-detail></div>
        <div class="engage-section" data-offers></div>
        <div class="engage-section" data-turnins></div>
      </div>
    `;
    this.container.appendChild(this.panel);

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'engage-loading-overlay hidden';
    this.loadingOverlay.innerHTML = `
      <div class="engage-loading-modal" role="dialog" aria-modal="true" aria-label="Loading dialogue">
        <div class="engage-loading-spinner" aria-hidden="true"></div>
        <div class="engage-loading-title" data-engage-loading-title>Preparing dialogue...</div>
        <div class="engage-loading-text" data-engage-loading-message>
          Summoning tiny loading gnomes...
        </div>
      </div>
    `;
    document.body.appendChild(this.loadingOverlay);
    this.loadingTitleEl = this.loadingOverlay.querySelector('[data-engage-loading-title]');
    this.loadingMessageEl = this.loadingOverlay.querySelector('[data-engage-loading-message]');

    this.portraitEl = this.panel.querySelector('[data-portrait]');
    this.nameEl = this.panel.querySelector('[data-name]');
    this.textEl = this.panel.querySelector('[data-text]');
    this.actionsEl = this.panel.querySelector('[data-actions]');
    this.questLogEl = this.panel.querySelector('[data-quest-log]');
    this.questDetailEl = this.panel.querySelector('[data-quest-detail]');
    this.offersEl = this.panel.querySelector('[data-offers]');
    this.turnInsEl = this.panel.querySelector('[data-turnins]');

    const closeBtn = this.panel.querySelector('.engage-close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    this.onKeyDownBound = this.onKeyDown.bind(this);
    document.addEventListener('keydown', this.onKeyDownBound);
  }

  handleMessage(message: EngageMessage): void {
    if (message.type === 'loading') {
      this.setLoadingState(message.active, message.message);
      return;
    }

    if (message.type === 'close') {
      this.setLoadingState(false);
      this.hide();
      return;
    }

    this.setLoadingState(false);
    this.render(message);
    this.show();
  }

  private setLoadingState(active: boolean, message?: string): void {
    if (!this.loadingOverlay) return;

    if (active) {
      if (this.loadingTitleEl) {
        this.loadingTitleEl.textContent = message || 'Preparing dialogue...';
      }
      this.updateLoadingMessageLine();
      if (this.loadingTickerId === null) {
        this.loadingTickerId = window.setInterval(() => {
          this.updateLoadingMessageLine();
        }, 2000);
      }
    } else {
      if (this.loadingTickerId !== null) {
        window.clearInterval(this.loadingTickerId);
        this.loadingTickerId = null;
      }
      if (this.loadingTitleEl) {
        this.loadingTitleEl.textContent = 'Preparing dialogue...';
      }
      if (this.loadingMessageEl) {
        this.loadingMessageEl.textContent = 'Summoning tiny loading gnomes...';
      }
      this.lastLoadingLine = null;
    }

    this.loadingOverlay.classList.toggle('hidden', !active);
    this.onLoadingStateChange?.(active);
  }

  private updateLoadingMessageLine(): void {
    if (!this.loadingMessageEl) return;
    if (LOADING_STATUS_LINES.length === 0) return;

    let nextLine = LOADING_STATUS_LINES[Math.floor(Math.random() * LOADING_STATUS_LINES.length)];
    if (LOADING_STATUS_LINES.length > 1 && nextLine === this.lastLoadingLine) {
      const fallbackIndex =
        (LOADING_STATUS_LINES.indexOf(nextLine) + 1 + Math.floor(Math.random() * (LOADING_STATUS_LINES.length - 1))) %
        LOADING_STATUS_LINES.length;
      nextLine = LOADING_STATUS_LINES[fallbackIndex];
    }
    this.lastLoadingLine = nextLine;
    this.loadingMessageEl.textContent = nextLine;
  }

  private render(message: EngageOpenMessage): void {
    this.applyAlignment(message.alignment);
    this.currentNpcName = message.npcName || '';
    this.questDetailsById = new Map(
      (message.questDetails || []).map((entry) => [entry.id, entry])
    );

    if (this.nameEl) {
      this.nameEl.textContent = this.titleCase(message.npcName);
    }

    if (this.textEl) {
      this.textEl.innerHTML = parseAnsi(message.text || '');
    }

    this.renderPortrait(message.portrait, message.npcName, message.portraitUrl);
    this.renderOptions(this.actionsEl, 'Actions', '$', 'action', message.actions || []);
    this.renderOptions(this.questLogEl, 'Quests', 'Q', 'questlog', message.questLog || []);
    const questIdToShow =
      this.selectedQuestId && this.questDetailsById.has(this.selectedQuestId)
        ? this.selectedQuestId
        : null;
    this.selectedQuestId = questIdToShow;
    this.renderQuestDetail(questIdToShow);
    this.renderOptions(this.offersEl, 'Available Quests', '!', 'offer', []);
    this.renderOptions(this.turnInsEl, 'Ready To Turn In', '?', 'turnin', []);
  }

  private renderPortrait(portrait: string, npcName: string, portraitUrl?: string): void {
    if (!this.portraitEl) return;
    this.portraitEl.innerHTML = '';

    if (portraitUrl) {
      const img = document.createElement('img');
      img.className = 'engage-portrait-img';
      img.src = portraitUrl;
      img.alt = npcName;
      this.portraitEl.appendChild(img);
      return;
    }

    if (isDataUri(portrait)) {
      const img = document.createElement('img');
      img.className = 'engage-portrait-img';
      img.src = portrait;
      img.alt = npcName;
      this.portraitEl.appendChild(img);
      return;
    }

    if (isValidSvg(portrait)) {
      this.portraitEl.innerHTML = portrait;
      return;
    }

    this.portraitEl.innerHTML = getFallbackPortrait();
  }

  private renderOptions(
    sectionEl: HTMLElement | null,
    title: string,
    badge: string,
    kind: 'action' | 'questlog' | 'offer' | 'turnin',
    options: EngageOption[]
  ): void {
    if (!sectionEl) return;
    sectionEl.innerHTML = '';
    sectionEl.dataset.kind = kind;
    if (options.length === 0) return;

    const header = document.createElement('div');
    header.className = 'engage-section-title';
    header.innerHTML = `
      <span class="engage-section-badge">${badge}</span>
      <span>${title}</span>
    `;
    sectionEl.appendChild(header);

    const buttonOptions =
      kind === 'action' ? options.filter((option) => option.id !== 'tutorial-skip') : options;
    const linkOptions = kind === 'action' ? options.filter((option) => option.id === 'tutorial-skip') : [];

    for (const option of buttonOptions) {
      const btn = document.createElement('button');
      btn.className = 'engage-option-btn';
      btn.dataset.kind = kind;
      btn.dataset.tone = option.tone || 'neutral';

      const title = document.createElement('span');
      title.className = 'engage-option-title';
      title.textContent = option.label;
      btn.appendChild(title);

      if (option.rewardText) {
        const subtitle = document.createElement('span');
        subtitle.className = 'engage-option-reward';
        subtitle.textContent = option.rewardText;
        btn.appendChild(subtitle);
      }

      btn.addEventListener('click', () => {
        this.handleOptionClick(kind, option);
      });
      sectionEl.appendChild(btn);
    }

    for (const option of linkOptions) {
      const linkBtn = document.createElement('button');
      linkBtn.className = 'engage-option-link';
      linkBtn.type = 'button';
      linkBtn.dataset.kind = kind;
      linkBtn.textContent = option.label;
      linkBtn.addEventListener('click', () => {
        this.handleOptionClick(kind, option);
      });
      sectionEl.appendChild(linkBtn);
    }
  }

  private handleOptionClick(
    kind: 'action' | 'questlog' | 'offer' | 'turnin',
    option: EngageOption
  ): void {
    if (kind === 'questlog') {
      const questId = option.id.replace(/^questlog-/, '');
      this.selectedQuestId = questId;
      this.renderQuestDetail(questId);
      return;
    }

    if (option.command === '__engage_close__') {
      this.hide();
      return;
    }

    if (this.onCommand) {
      this.onCommand(option.command);
    }
    this.hide();
  }

  private renderQuestDetail(questId: string | null): void {
    if (!this.questDetailEl) return;
    this.questDetailEl.innerHTML = '';
    this.questDetailEl.className = 'engage-section';
    if (!questId) {
      return;
    }

    const details = this.questDetailsById.get(questId);
    if (!details) {
      return;
    }

    const header = document.createElement('div');
    header.className = 'engage-section-title';
    header.innerHTML = `
      <span class="engage-section-badge">?</span>
      <span>${details.name}</span>
    `;
    this.questDetailEl.appendChild(header);

    const detailBody = document.createElement('div');
    detailBody.className = 'engage-quest-detail-body';

    const mainCol = document.createElement('div');
    mainCol.className = 'engage-quest-detail-main';

    const desc = document.createElement('div');
    desc.className = 'engage-quest-description';
    desc.textContent = details.description;
    mainCol.appendChild(desc);

    const objectiveList = document.createElement('div');
    objectiveList.className = 'engage-quest-objectives';
    for (const objective of details.objectives) {
      const row = document.createElement('div');
      row.className = 'engage-quest-objective';
      row.textContent = `- ${objective}`;
      objectiveList.appendChild(row);
    }
    mainCol.appendChild(objectiveList);

    const sideCol = document.createElement('div');
    sideCol.className = 'engage-quest-detail-side';
    const primaryAction = details.turnInAction || details.acceptAction;
    const statusTextLower = details.statusText.toLowerCase();
    const isInProgress = statusTextLower.includes('in progress');
    const availabilityBtn = document.createElement('button');
    availabilityBtn.className = 'engage-option-btn engage-quest-action-btn engage-quest-status-btn';
    availabilityBtn.dataset.kind = 'quest-detail-action';
    availabilityBtn.dataset.tone = primaryAction ? 'positive' : isInProgress ? 'neutral' : 'negative';
    availabilityBtn.disabled = !primaryAction;

    const buttonTitle = document.createElement('span');
    buttonTitle.className = 'engage-option-title';
    buttonTitle.textContent = details.turnInAction
      ? 'Turn In Quest'
      : details.acceptAction
        ? 'Accept Quest'
        : isInProgress
          ? 'In Progress'
          : 'Not Available';
    availabilityBtn.appendChild(buttonTitle);

    const buttonSubtext = document.createElement('span');
    buttonSubtext.className = 'engage-option-reward';
    buttonSubtext.textContent = details.statusText;
    availabilityBtn.appendChild(buttonSubtext);

    if (primaryAction) {
      availabilityBtn.addEventListener('click', () => {
        if (this.onCommand) {
          this.onCommand(primaryAction.command);
          if (primaryAction.command.startsWith('quest ')) {
            const npcName = this.currentNpcName.trim();
            if (npcName) {
              // Re-open engage shortly after quest action so UI reflects new state.
              window.setTimeout(() => {
                if (this.onCommand) {
                  this.onCommand(`engage --silent ${npcName}`);
                }
              }, 180);
            }
          }
        }
      });
    }

    sideCol.appendChild(availabilityBtn);

    detailBody.appendChild(mainCol);
    detailBody.appendChild(sideCol);
    this.questDetailEl.appendChild(detailBody);
  }

  private applyAlignment(alignment?: EngageAlignment): void {
    this.panel.classList.remove(
      'engage-centered',
      'engage-bubble-left',
      'engage-bubble-right',
      'engage-bubble-top',
      'engage-bubble-bottom',
      'engage-v-top',
      'engage-v-middle',
      'engage-v-bottom',
      'engage-h-left',
      'engage-h-center',
      'engage-h-right'
    );

    if (!alignment) {
      this.panel.classList.add('engage-v-bottom', 'engage-h-right');
      this.panel.classList.add('engage-bubble-left');
      this.panel.dataset.tail = 'right';
      return;
    }

    if (alignment === 'centered') {
      this.panel.classList.add('engage-centered');
      this.panel.dataset.tail = 'bottom';
      return;
    }

    let bubbleSide: 'left' | 'right' | 'top' | 'bottom';
    if (alignment.horizontal === 'right') {
      bubbleSide = 'left';
    } else if (alignment.horizontal === 'left') {
      bubbleSide = 'right';
    } else if (alignment.vertical === 'top') {
      bubbleSide = 'bottom';
    } else if (alignment.vertical === 'bottom') {
      bubbleSide = 'top';
    } else {
      bubbleSide = 'right';
    }

    if (bubbleSide === 'left') {
      this.panel.dataset.tail = 'right';
    } else if (bubbleSide === 'right') {
      this.panel.dataset.tail = 'left';
    } else if (bubbleSide === 'top') {
      this.panel.dataset.tail = 'bottom';
    } else {
      this.panel.dataset.tail = 'top';
    }

    this.panel.classList.add(
      `engage-bubble-${bubbleSide}`,
      `engage-v-${alignment.vertical}`,
      `engage-h-${alignment.horizontal}`
    );
  }

  private show(): void {
    this.isVisible = true;
    this.panel.classList.remove('hidden');
  }

  hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.panel.classList.add('hidden');
  }

  /**
   * Handle keyboard shortcuts.
   * Escape closes the engage overlay.
   */
  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isVisible) {
      e.preventDefault();
      this.hide();
    }
  }

  /**
   * Clean up global listeners.
   */
  destroy(): void {
    document.removeEventListener('keydown', this.onKeyDownBound);
    if (this.loadingTickerId !== null) {
      window.clearInterval(this.loadingTickerId);
      this.loadingTickerId = null;
    }
    this.loadingOverlay?.remove();
  }

  private titleCase(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

export default EngagePanel;
