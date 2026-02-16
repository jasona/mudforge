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
  private offersEl: HTMLElement | null = null;
  private turnInsEl: HTMLElement | null = null;
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
        <div class="engage-section" data-offers></div>
        <div class="engage-section" data-turnins></div>
      </div>
    `;
    this.container.appendChild(this.panel);

    this.portraitEl = this.panel.querySelector('[data-portrait]');
    this.nameEl = this.panel.querySelector('[data-name]');
    this.textEl = this.panel.querySelector('[data-text]');
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

    if (this.nameEl) {
      this.nameEl.textContent = this.titleCase(message.npcName);
    }

    if (this.textEl) {
      this.textEl.textContent = message.text || '';
    }

    this.renderPortrait(message.portrait, message.npcName, message.portraitUrl);
    this.renderOptions(this.offersEl, 'Available Quests', '!', 'offer', message.questOffers || []);
    this.renderOptions(this.turnInsEl, 'Ready To Turn In', '?', 'turnin', message.questTurnIns || []);
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
    kind: 'offer' | 'turnin',
    options: EngageOption[]
  ): void {
    if (!sectionEl) return;
    sectionEl.innerHTML = '';
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
        if (this.onCommand) {
          this.onCommand(option.command);
        }
        this.hide();
      });
      sectionEl.appendChild(btn);
    }
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
