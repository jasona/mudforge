/**
 * SoundManager - Handles audio playback for the MudForge client.
 *
 * Manages volume, mute state, per-category toggles, and localStorage persistence.
 */

/**
 * Sound categories.
 */
export type SoundCategory = 'combat' | 'spell' | 'skill' | 'potion' | 'quest' | 'celebration' | 'discussion' | 'alert' | 'ambient' | 'ui';

/**
 * Sound message from server.
 */
export interface SoundMessage {
  type: 'play' | 'loop' | 'stop';
  category: SoundCategory;
  sound: string;
  volume?: number;
  id?: string;
}

/**
 * Sound settings stored in localStorage.
 */
interface SoundSettings {
  enabled: boolean;
  volume: number;
  categoryEnabled: Record<SoundCategory, boolean>;
}

/**
 * Default category enabled states.
 */
const DEFAULT_CATEGORY_ENABLED: Record<SoundCategory, boolean> = {
  combat: true,
  spell: true,
  skill: true,
  potion: true,
  quest: true,
  celebration: true,
  discussion: true,
  alert: true,
  ambient: false,
  ui: false,
};

/**
 * Storage key for settings.
 */
const STORAGE_KEY = 'mudforge-sound-settings';

/**
 * All sound categories.
 */
export const ALL_CATEGORIES: SoundCategory[] = ['combat', 'spell', 'skill', 'potion', 'quest', 'celebration', 'discussion', 'alert', 'ambient', 'ui'];

/**
 * Sound file mapping - maps sound identifiers to file paths.
 * Format: category/sound -> sounds/category-sound.mp3
 */
const SOUND_MAP: Record<string, string> = {
  // Combat sounds
  'combat/hit': 'sounds/combat-hit.mp3',
  'combat/miss': 'sounds/combat-miss.mp3',
  'combat/critical': 'sounds/combat-critical.mp3',
  'combat/block': 'sounds/combat-block.mp3',
  'combat/parry': 'sounds/combat-parry.mp3',
  'combat/combat-music': 'sounds/combat-music.mp3',

  // Spell sounds
  'spell/cast': 'sounds/spell-cast.mp3',
  'spell/fire': 'sounds/spell-fire.mp3',
  'spell/ice': 'sounds/spell-ice.mp3',
  'spell/lightning': 'sounds/spell-lightning.mp3',
  'spell/heal': 'sounds/spell-heal.mp3',
  'spell/buff': 'sounds/spell-buff.mp3',

  // Skill sounds
  'skill/use': 'sounds/skill-use.mp3',
  'skill/success': 'sounds/skill-success.mp3',
  'skill/fail': 'sounds/skill-fail.mp3',

  // Potion sounds
  'potion/drink': 'sounds/potion-drink.mp3',
  'potion/heal': 'sounds/potion-heal.mp3',
  'potion/mana': 'sounds/potion-mana.mp3',

  // Quest sounds
  'quest/accept': 'sounds/quest-accept.mp3',
  'quest/complete': 'sounds/quest-complete.mp3',
  'quest/update': 'sounds/quest-update.mp3',

  // Celebration sounds
  'celebration/level-up': 'sounds/celebration-levelup.mp3',
  'celebration/achievement': 'sounds/celebration-achievement.mp3',

  // Discussion sounds
  'discussion/tell': 'sounds/discussion-tell.mp3',
  'discussion/say': 'sounds/discussion-say.mp3',
  'discussion/channel': 'sounds/discussion-channel.mp3',

  // Alert sounds
  'alert/low-hp': 'sounds/alert-low-hp.mp3',
  'alert/incoming': 'sounds/alert-incoming.mp3',
  'alert/warning': 'sounds/alert-warning.mp3',

  // Ambient sounds
  'ambient/rain': 'sounds/ambient-rain.mp3',
  'ambient/fire': 'sounds/ambient-fire.mp3',
  'ambient/wind': 'sounds/ambient-wind.mp3',
  'ambient/combat-music': 'sounds/ambient-combat-music.mp3',

  // UI sounds
  'ui/click': 'sounds/ui-click.mp3',
  'ui/open': 'sounds/ui-open.mp3',
  'ui/close': 'sounds/ui-close.mp3',
};

/**
 * Metadata for a looping sound (used for pause/resume).
 */
interface LoopMetadata {
  category: SoundCategory;
  sound: string;
  volume?: number;
}

/**
 * Audio playback manager.
 */
export class SoundManager {
  private settings: SoundSettings;
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private loopingSounds: Map<string, HTMLAudioElement> = new Map();
  private loopMetadata: Map<string, LoopMetadata> = new Map(); // Track loop info for resume
  private audioUnlocked: boolean = false;
  private pendingSounds: Array<{ category: SoundCategory; sound: string; volume?: number }> = [];
  private pendingLoops: Array<{ category: SoundCategory; sound: string; id: string; volume?: number }> = [];
  private isPageVisible: boolean = !document.hidden;

  // Audio unlock tracking
  private audioUnlockAttempts: number = 0;
  private static MAX_AUDIO_UNLOCK_ATTEMPTS = 20;

  constructor() {
    this.settings = this.loadSettings();
    this.setupAudioUnlock();
    this.setupVisibilityHandling();
  }

  /**
   * Set up audio unlock listeners for browsers with strict autoplay policies.
   * macOS Chrome and Safari require user interaction before audio can play.
   */
  private setupAudioUnlock(): void {
    // Listen for user interactions that unlock audio
    // Use capture phase to get events before they're handled
    const events = ['click', 'touchstart', 'touchend', 'keydown'];

    const unlockAudio = (event: Event) => {
      if (this.audioUnlocked) return;

      // Only respond to trusted (real user) events
      if (!event.isTrusted) return;

      // Track attempts to prevent indefinite listener persistence
      this.audioUnlockAttempts++;
      if (this.audioUnlockAttempts >= SoundManager.MAX_AUDIO_UNLOCK_ATTEMPTS) {
        // Give up and remove listeners to prevent memory leak
        console.warn('[SoundManager] Max audio unlock attempts reached, giving up');
        events.forEach(evt => {
          document.removeEventListener(evt, unlockAudio, true);
        });
        return;
      }

      // Try to play a silent audio element to unlock HTML5 Audio
      const silentAudio = new Audio();
      // Use a data URI for a tiny silent WAV (better browser support than MP3)
      // This is a valid 44-byte WAV file with 1 sample of silence
      silentAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      silentAudio.volume = 0.01;

      silentAudio.play().then(() => {
        this.onAudioUnlocked();
        // Remove listeners after successful unlock
        events.forEach(evt => {
          document.removeEventListener(evt, unlockAudio, true);
        });
      }).catch(() => {
        // Don't give up - might work on a different event type
      });
    };

    events.forEach(event => {
      document.addEventListener(event, unlockAudio, true);
    });
  }

  /**
   * Called when audio is unlocked after user interaction.
   */
  private onAudioUnlocked(): void {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;

    // Play any pending sounds
    for (const pending of this.pendingSounds) {
      this.play(pending.category, pending.sound, pending.volume);
    }
    this.pendingSounds = [];

    // Start any pending loops
    for (const pending of this.pendingLoops) {
      this.loop(pending.category, pending.sound, pending.id, pending.volume);
    }
    this.pendingLoops = [];
  }

  /**
   * Pause/skip sounds when the page is hidden to avoid backlog on return.
   */
  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;
      if (!this.isPageVisible) {
        // Stop active loops but keep metadata for resume.
        this.stopAll(false);
        // Drop any queued one-shot sounds to avoid a burst on return.
        this.pendingSounds = [];
      } else if (this.settings.enabled) {
        // Resume loops when visible again.
        this.resumeLoops();
      }
    });
  }

  /**
   * Check if audio is unlocked (user has interacted with the page).
   */
  isAudioUnlocked(): boolean {
    return this.audioUnlocked;
  }

  /**
   * Load settings from localStorage.
   */
  private loadSettings(): SoundSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SoundSettings>;
        return {
          enabled: parsed.enabled ?? true,
          volume: parsed.volume ?? 0.7,
          categoryEnabled: {
            ...DEFAULT_CATEGORY_ENABLED,
            ...parsed.categoryEnabled,
          },
        };
      }
    } catch (error) {
      console.error('[SoundManager] Failed to load settings:', error);
    }
    return {
      enabled: true,
      volume: 0.7,
      categoryEnabled: { ...DEFAULT_CATEGORY_ENABLED },
    };
  }

  /**
   * Save settings to localStorage.
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[SoundManager] Failed to save settings:', error);
    }
  }

  /**
   * Resolve a sound to a file path.
   *
   * Resolution order:
   * 1. Check SOUND_MAP for predefined sounds (category/sound -> path)
   * 2. If sound ends with .mp3, use as-is in sounds/ directory
   * 3. If sound contains '/', use as path in sounds/ directory with .mp3
   * 4. Otherwise, construct sounds/{category}-{sound}.mp3
   */
  private resolveSoundPath(category: SoundCategory, sound: string): string {
    const soundKey = `${category}/${sound}`;

    // Check predefined map first
    if (SOUND_MAP[soundKey]) {
      return SOUND_MAP[soundKey];
    }

    // If already has .mp3 extension, use as-is
    if (sound.endsWith('.mp3')) {
      return `sounds/${sound}`;
    }

    // If contains a slash, treat as a path
    if (sound.includes('/')) {
      return `sounds/${sound}.mp3`;
    }

    // Default: category-sound pattern
    return `sounds/${category}-${sound}.mp3`;
  }

  /**
   * Get or create an audio element for a sound.
   */
  private getAudio(category: SoundCategory, sound: string): HTMLAudioElement | null {
    const cacheKey = `${category}/${sound}`;

    // Check cache first
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    // Resolve file path
    const filePath = this.resolveSoundPath(category, sound);

    // Create and cache audio element
    const audio = new Audio(filePath);
    audio.preload = 'auto';
    this.audioCache.set(cacheKey, audio);
    return audio;
  }

  /**
   * Check if sound should play based on settings.
   */
  private shouldPlay(category: SoundCategory): boolean {
    return this.settings.enabled && this.settings.categoryEnabled[category];
  }

  /**
   * Play a sound once.
   *
   * The sound parameter can be:
   * - A predefined sound name (e.g., 'hit', 'cast')
   * - A custom filename (e.g., 'custom-sound.mp3')
   * - A path (e.g., 'custom/mysound')
   *
   * The category determines which indicator is shown and which toggle applies.
   */
  play(category: SoundCategory, sound: string, volume?: number): void {
    if (!this.shouldPlay(category)) {
      return;
    }

    if (!this.isPageVisible) {
      return;
    }

    // Queue sound if audio isn't unlocked yet (macOS Chrome/Safari autoplay policy)
    if (!this.audioUnlocked) {
      this.pendingSounds.push({ category, sound, volume });
      return;
    }

    const audio = this.getAudio(category, sound);
    if (!audio) {
      return;
    }

    // Clone for overlapping playback
    const playback = audio.cloneNode(true) as HTMLAudioElement;
    const effectiveVolume = (volume ?? 1) * this.settings.volume;
    playback.volume = Math.max(0, Math.min(1, effectiveVolume));

    playback.play().catch((error) => {
      // Ignore autoplay errors (common on first interaction)
      if (error.name !== 'NotAllowedError') {
        console.warn(`[SoundManager] Failed to play ${category}/${sound}:`, error);
      }
    });
  }

  /**
   * Loop a sound continuously.
   *
   * The sound parameter can be:
   * - A predefined sound name (e.g., 'rain', 'fire')
   * - A custom filename (e.g., 'custom-loop.mp3')
   * - A path (e.g., 'custom/ambience')
   *
   * The category determines which indicator is shown and which toggle applies.
   */
  loop(category: SoundCategory, sound: string, id: string, volume?: number): void {
    // Always store metadata so we can resume later
    this.loopMetadata.set(id, { category, sound, volume });

    if (!this.shouldPlay(category)) {
      return;
    }

    if (!this.isPageVisible) {
      return;
    }

    // Queue loop if audio isn't unlocked yet (macOS Chrome/Safari autoplay policy)
    if (!this.audioUnlocked) {
      // Remove any existing pending loop with same id
      this.pendingLoops = this.pendingLoops.filter(p => p.id !== id);
      this.pendingLoops.push({ category, sound, id, volume });
      return;
    }

    // Stop existing sound with same id
    this.stopById(id, false); // Don't clear metadata

    const audio = this.getAudio(category, sound);
    if (!audio) {
      return;
    }

    // Clone for independent playback
    const playback = audio.cloneNode(true) as HTMLAudioElement;
    const effectiveVolume = (volume ?? 1) * this.settings.volume;
    playback.volume = Math.max(0, Math.min(1, effectiveVolume));
    playback.loop = true;

    // Track for later stopping
    this.loopingSounds.set(id, playback);

    playback.play().catch((error) => {
      if (error.name !== 'NotAllowedError') {
        console.warn(`[SoundManager] Failed to loop ${category}/${sound}:`, error);
      }
    });
  }

  /**
   * Stop a specific looping sound by id.
   * @param clearMetadata If true, also clears the loop metadata (default: true)
   */
  stopById(id: string, clearMetadata: boolean = true): void {
    const audio = this.loopingSounds.get(id);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      this.loopingSounds.delete(id);
    }
    if (clearMetadata) {
      this.loopMetadata.delete(id);
    }
  }

  /**
   * Stop all looping sounds in a category.
   * @param clearMetadata If true, also clears the loop metadata (default: true)
   */
  stopCategory(category: SoundCategory, clearMetadata: boolean = true): void {
    for (const [id, audio] of this.loopingSounds.entries()) {
      const metadata = this.loopMetadata.get(id);
      if (metadata && metadata.category === category) {
        audio.pause();
        audio.currentTime = 0;
        this.loopingSounds.delete(id);
        if (clearMetadata) {
          this.loopMetadata.delete(id);
        }
      }
    }
  }

  /**
   * Stop a sound by id, or all sounds in category if no id.
   */
  stop(category: SoundCategory, id?: string): void {
    if (id) {
      this.stopById(id);
    } else {
      this.stopCategory(category);
    }
  }

  /**
   * Stop all looping sounds.
   * @param clearMetadata If true, also clears the loop metadata (default: true)
   */
  stopAll(clearMetadata: boolean = true): void {
    for (const audio of this.loopingSounds.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.loopingSounds.clear();
    if (clearMetadata) {
      this.loopMetadata.clear();
    }
  }

  /**
   * Resume all loops that were playing (used when unmuting).
   */
  private resumeLoops(): void {
    for (const [id, metadata] of this.loopMetadata.entries()) {
      // Only resume if the category is enabled
      if (this.settings.categoryEnabled[metadata.category]) {
        this.loop(metadata.category, metadata.sound, id, metadata.volume);
      }
    }
  }

  /**
   * Handle a sound message from the server.
   */
  handleMessage(message: SoundMessage): void {
    switch (message.type) {
      case 'play':
        this.play(message.category, message.sound, message.volume);
        break;
      case 'loop':
        if (message.id) {
          this.loop(message.category, message.sound, message.id, message.volume);
        }
        break;
      case 'stop':
        this.stop(message.category, message.id);
        break;
    }
  }

  // ========== Settings Getters/Setters ==========

  /**
   * Check if sound is globally enabled.
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Set global enabled state.
   */
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    if (!enabled) {
      // Pause all loops but keep metadata so we can resume
      this.stopAll(false);
    } else {
      // Resume any loops that were playing
      this.resumeLoops();
    }
    this.saveSettings();
  }

  /**
   * Toggle global enabled state.
   */
  toggleEnabled(): boolean {
    this.setEnabled(!this.settings.enabled);
    return this.settings.enabled;
  }

  /**
   * Get current volume (0.0-1.0).
   */
  getVolume(): number {
    return this.settings.volume;
  }

  /**
   * Set volume (0.0-1.0).
   */
  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    // Update volume on all looping sounds
    for (const audio of this.loopingSounds.values()) {
      audio.volume = this.settings.volume;
    }
    this.saveSettings();
  }

  /**
   * Check if a category is enabled.
   */
  isCategoryEnabled(category: SoundCategory): boolean {
    return this.settings.categoryEnabled[category];
  }

  /**
   * Set category enabled state.
   */
  setCategoryEnabled(category: SoundCategory, enabled: boolean): void {
    this.settings.categoryEnabled[category] = enabled;
    if (!enabled) {
      // Stop but keep metadata so we can resume
      this.stopCategory(category, false);
    } else if (this.settings.enabled) {
      // Resume any loops in this category
      for (const [id, metadata] of this.loopMetadata.entries()) {
        if (metadata.category === category) {
          this.loop(metadata.category, metadata.sound, id, metadata.volume);
        }
      }
    }
    this.saveSettings();
  }

  /**
   * Toggle category enabled state.
   */
  toggleCategory(category: SoundCategory): boolean {
    const newState = !this.settings.categoryEnabled[category];
    this.setCategoryEnabled(category, newState);
    return newState;
  }

  /**
   * Get all category enabled states.
   */
  getCategoryStates(): Record<SoundCategory, boolean> {
    return { ...this.settings.categoryEnabled };
  }
}

export default SoundManager;
