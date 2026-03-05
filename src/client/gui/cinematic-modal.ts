import { applyStyle } from './gui-elements.js';
import type { SoundManager } from '../sound-manager.js';
import type {
  CinematicConfig,
  CinematicSection,
  GUIClientMessage,
  GUIClosedMessage,
  GUIOpenMessage,
} from './gui-types.js';

export type CinematicMessageHandler = (message: GUIClientMessage) => void;

type CloseReason = GUIClosedMessage['reason'];

/**
 * Fullscreen cinematic renderer for story intros and lore sequences.
 */
export class CinematicModal {
  private readonly onMessage: CinematicMessageHandler;
  private readonly soundManager?: SoundManager;

  private overlay: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private message: GUIOpenMessage | null = null;
  private observer: IntersectionObserver | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;

  private audio: HTMLAudioElement | null = null;

  constructor(onMessage: CinematicMessageHandler, soundManager?: SoundManager) {
    this.onMessage = onMessage;
    this.soundManager = soundManager;
  }

  open(message: GUIOpenMessage): void {
    this.close();

    const cinematic = this.extractCinematicConfig(message);
    if (!cinematic || cinematic.sections.length === 0) {
      return;
    }

    this.message = message;

    this.overlay = document.createElement('div');
    this.overlay.className = 'cinematic-overlay';

    const container = document.createElement('div');
    container.className = 'cinematic-container';
    container.dataset.theme = cinematic.theme ?? 'parchment';

    if (message.modal.backgroundColor) {
      container.style.backgroundColor = message.modal.backgroundColor;
    }
    if (message.modal.backgroundImage) {
      container.style.backgroundImage = `url(${message.modal.backgroundImage})`;
    }

    const closable = message.modal.closable !== false;
    const escapable = message.modal.escapable !== false;

    const title = document.createElement('h2');
    title.className = 'cinematic-title';
    title.textContent = message.modal.title;
    container.appendChild(title);

    if (closable) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'cinematic-close-btn';
      closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', () => this.handleClose('close-button'));
      container.appendChild(closeBtn);
    }

    this.content = document.createElement('div');
    this.content.className = 'cinematic-content';
    container.appendChild(this.content);

    const shouldFade = cinematic.fadeInSections !== false;
    if (shouldFade) {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add('visible');
            }
          }
        },
        { root: this.content, threshold: 0.18 }
      );
    }

    this.renderSections(cinematic.sections, shouldFade);
    this.setupNarration(cinematic);

    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay && closable) {
        this.handleClose('backdrop');
      }
    });

    if (escapable && closable) {
      this.keyHandler = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.handleClose('escape');
        }
      };
      document.addEventListener('keydown', this.keyHandler, true);
    }

    this.overlay.appendChild(container);
    document.body.appendChild(this.overlay);
  }

  close(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    this.overlay?.remove();
    this.overlay = null;
    this.content = null;
    this.message = null;
  }

  isOpen(): boolean {
    return this.overlay !== null;
  }

  private handleClose(reason: CloseReason): void {
    if (!this.message) return;

    this.onMessage({
      action: 'closed',
      modalId: this.message.modal.id,
      reason,
    });

    this.close();
  }

  private extractCinematicConfig(message: GUIOpenMessage): CinematicConfig | null {
    const raw = message.data?._cinematic;
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    return raw as CinematicConfig;
  }

  private renderSections(sections: CinematicSection[], shouldFade: boolean): void {
    if (!this.content) return;

    for (const sectionDef of sections) {
      const section = document.createElement('section');
      section.className = 'cinematic-section';
      section.dataset.sectionId = sectionDef.id;

      if (sectionDef.backgroundColor) {
        section.style.backgroundColor = sectionDef.backgroundColor;
      }
      if (sectionDef.backgroundImage) {
        section.style.backgroundImage = `url(${sectionDef.backgroundImage})`;
      }
      if (sectionDef.style) {
        applyStyle(section, sectionDef.style);
      }

      for (const block of sectionDef.blocks) {
        switch (block.type) {
          case 'heading': {
            const level = block.level ?? 2;
            const heading = document.createElement(`h${level}`);
            heading.className = 'cinematic-heading';
            heading.textContent = block.text;
            if (block.style) applyStyle(heading, block.style);
            section.appendChild(heading);
            break;
          }
          case 'paragraph': {
            const paragraph = document.createElement('p');
            paragraph.className = 'cinematic-paragraph';
            paragraph.textContent = block.text;
            if (block.style) applyStyle(paragraph, block.style);
            section.appendChild(paragraph);
            break;
          }
          case 'image': {
            const figure = document.createElement('figure');
            figure.className = 'cinematic-image-wrap';

            const image = document.createElement('img');
            image.className = 'cinematic-image';
            image.src = block.src;
            image.alt = block.alt ?? '';
            if (block.style) applyStyle(image, block.style);
            figure.appendChild(image);

            if (block.caption) {
              const caption = document.createElement('figcaption');
              caption.className = 'cinematic-image-caption';
              caption.textContent = block.caption;
              figure.appendChild(caption);
            }

            section.appendChild(figure);
            break;
          }
          case 'divider': {
            const divider = document.createElement('hr');
            divider.className = 'cinematic-divider';
            if (block.style) applyStyle(divider, block.style);
            section.appendChild(divider);
            break;
          }
          case 'spacer': {
            const spacer = document.createElement('div');
            spacer.className = 'cinematic-spacer';
            spacer.style.height = block.height ?? '24px';
            section.appendChild(spacer);
            break;
          }
        }
      }

      this.content.appendChild(section);

      if (shouldFade) {
        this.observer?.observe(section);
      } else {
        section.classList.add('visible');
      }
    }
  }

  private setupNarration(config: CinematicConfig): void {
    if (!this.overlay || !config.narration?.src) {
      return;
    }

    const audio = new Audio(this.resolveNarrationSource(config.narration.src));
    audio.preload = 'metadata';
    audio.volume = this.getEffectiveNarrationVolume(config.narration.volume);

    const bar = document.createElement('div');
    bar.className = 'cinematic-audio-bar';

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'cinematic-audio-btn';
    playButton.textContent = 'Play';

    const scrubber = document.createElement('input');
    scrubber.type = 'range';
    scrubber.className = 'cinematic-audio-scrubber';
    scrubber.min = '0';
    scrubber.max = '100';
    scrubber.value = '0';

    const time = document.createElement('span');
    time.className = 'cinematic-audio-time';
    time.textContent = '0:00 / 0:00';

    bar.append(playButton, scrubber, time);
    const audioBarTarget = this.overlay.querySelector('.cinematic-container') ?? this.overlay;
    audioBarTarget.appendChild(bar);

    const syncUI = (): void => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const progress = duration > 0 ? (current / duration) * 100 : 0;
      scrubber.value = String(Math.max(0, Math.min(100, progress)));
      time.textContent = `${this.formatTime(current)} / ${this.formatTime(duration)}`;
      playButton.textContent = audio.paused ? 'Play' : 'Pause';
    };

    const togglePlayback = (): void => {
      if (audio.paused) {
        void audio.play().then(syncUI).catch(() => {
          playButton.textContent = 'Play';
        });
      } else {
        audio.pause();
        syncUI();
      }
    };

    playButton.addEventListener('click', togglePlayback);

    scrubber.addEventListener('input', () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration <= 0) return;
      const nextTime = (Number(scrubber.value) / 100) * duration;
      audio.currentTime = Math.max(0, Math.min(duration, nextTime));
      syncUI();
    });

    audio.addEventListener('loadedmetadata', syncUI);
    audio.addEventListener('timeupdate', syncUI);
    audio.addEventListener('play', syncUI);
    audio.addEventListener('pause', syncUI);
    audio.addEventListener('ended', syncUI);

    this.audio = audio;
    const shouldAutoplay =
      config.narration.autoPlay === true &&
      (this.soundManager?.isEnabled() ?? true) &&
      (this.soundManager ? this.soundManager.isAudioUnlocked() : true);

    if (shouldAutoplay) {
      void audio.play().then(syncUI).catch(() => {
        playButton.textContent = 'Play';
      });
    } else {
      syncUI();
    }
  }

  private getEffectiveNarrationVolume(narrationVolume?: number): number {
    const cinematicVolume = Math.max(0, Math.min(1, narrationVolume ?? 1));
    const masterVolume = this.soundManager?.getVolume() ?? 1;
    return Math.max(0, Math.min(1, cinematicVolume * masterVolume));
  }

  private resolveNarrationSource(src: string): string {
    if (/^(https?:)?\/\//.test(src) || src.startsWith('/') || src.startsWith('data:')) {
      return src;
    }

    if (src.startsWith('sounds/')) {
      return src;
    }

    return `sounds/${src}`;
  }

  private formatTime(seconds: number): string {
    const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export default CinematicModal;
