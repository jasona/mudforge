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

interface EngagePanelOptions {
  onCommand?: (command: string) => void;
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
    if (message.type === 'close') {
      this.hide();
      return;
    }

    this.render(message);
    this.show();
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
      this.textEl.textContent = message.text || '';
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

    for (const option of options) {
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
        if (kind === 'questlog') {
          const questId = option.id.replace(/^questlog-/, '');
          this.selectedQuestId = questId;
          this.renderQuestDetail(questId);
          return;
        }

        if (this.onCommand) {
          this.onCommand(option.command);
        }
        this.hide();
      });
      sectionEl.appendChild(btn);
    }
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
  }

  private titleCase(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

export default EngagePanel;
