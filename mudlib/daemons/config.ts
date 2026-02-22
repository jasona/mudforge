/**
 * Config Daemon - Mud-wide configuration system.
 *
 * Provides a centralized, persistent configuration system that can be used
 * by any system across the mud. Settings are persisted to disk and survive
 * reboots.
 *
 * Usage:
 *   const config = getConfigDaemon();
 *   const timeout = config.get<number>('disconnect.timeoutMinutes');
 *   config.set('disconnect.timeoutMinutes', 30);
 */

import { MudObject } from '../std/object.js';

/**
 * Configuration setting definition.
 */
export interface ConfigSetting {
  value: unknown;
  description: string;
  type: 'number' | 'string' | 'boolean';
  min?: number; // For numbers
  max?: number; // For numbers
}

/**
 * Serialized config for persistence.
 */
interface SerializedConfig {
  [key: string]: unknown;
}

/**
 * Default settings for the mud.
 * These are the initial values used when no saved config exists.
 */
const DEFAULT_SETTINGS: Record<string, ConfigSetting> = {
  'disconnect.timeoutMinutes': {
    value: 15,
    description: 'Minutes before a disconnected player is automatically saved and quit',
    type: 'number',
    min: 1,
    max: 60,
  },
  'combat.playerKilling': {
    value: false,
    description: 'Allow players to attack and kill other players (PK/PvP)',
    type: 'boolean',
  },
  'corpse.playerDecayMinutes': {
    value: 60,
    description: 'Minutes before player corpses decay (0 = never)',
    type: 'number',
    min: 0,
    max: 480,
  },
  'corpse.npcDecayMinutes': {
    value: 5,
    description: 'Minutes before NPC corpses decay',
    type: 'number',
    min: 1,
    max: 60,
  },
  'reset.intervalMinutes': {
    value: 15,
    description: 'Minutes between room resets',
    type: 'number',
    min: 5,
    max: 120,
  },
  'reset.cleanupDroppedItems': {
    value: true,
    description: 'Clean up non-player-owned items during room reset',
    type: 'boolean',
  },
  'giphy.enabled': {
    value: true,
    description: 'Enable Giphy GIF sharing on channels',
    type: 'boolean',
  },
  'giphy.autoCloseSeconds': {
    value: 5,
    description: 'Seconds before GIF panel auto-closes (0 to disable, max 300 = 5 min)',
    type: 'number',
    min: 0,
    max: 300,
  },
  'giphy.rating': {
    value: 'pg',
    description: 'Content rating filter (g, pg, pg-13, r)',
    type: 'string',
  },
  'giphy.playerRateLimitPerMinute': {
    value: 3,
    description: 'Max GIF shares per player per minute',
    type: 'number',
    min: 1,
    max: 20,
  },
  'discord.enabled': {
    value: false,
    description: 'Enable Discord channel bridge',
    type: 'boolean',
  },
  'discord.guildId': {
    value: '',
    description: 'Discord server (guild) ID',
    type: 'string',
  },
  'discord.channelId': {
    value: '',
    description: 'Discord channel ID to bridge',
    type: 'string',
  },
  'bots.enabled': {
    value: false,
    description: 'Enable the bot system (simulated players)',
    type: 'boolean',
  },
  'bots.maxBots': {
    value: 5,
    description: 'Maximum number of bots that can be online at once',
    type: 'number',
    min: 1,
    max: 50,
  },
  'bots.minOnlineMinutes': {
    value: 15,
    description: 'Minimum minutes a bot stays online per session',
    type: 'number',
    min: 5,
    max: 240,
  },
  'bots.maxOnlineMinutes': {
    value: 120,
    description: 'Maximum minutes a bot stays online per session',
    type: 'number',
    min: 15,
    max: 480,
  },
  'bots.minOfflineMinutes': {
    value: 30,
    description: 'Minimum minutes a bot stays offline between sessions',
    type: 'number',
    min: 5,
    max: 480,
  },
  'bots.maxOfflineMinutes': {
    value: 240,
    description: 'Maximum minutes a bot stays offline between sessions',
    type: 'number',
    min: 30,
    max: 1440,
  },
  'bots.chatFrequencyMinutes': {
    value: 10,
    description: 'Average minutes between bot channel messages',
    type: 'number',
    min: 1,
    max: 60,
  },
  'time.cycleDurationMinutes': {
    value: 60,
    description: 'Real minutes per game day (60 = 1 real hour per 24 game hours)',
    type: 'number',
    min: 1,
    max: 1440,
  },
  'time.enabled': {
    value: true,
    description: 'Enable the day/night cycle (affects outdoor room lighting)',
    type: 'boolean',
  },
  'game.theme': {
    value: 'fantasy',
    description: 'Game theme/genre used in AI-generated content (e.g., fantasy, sci-fi, cyberpunk, horror, steampunk)',
    type: 'string',
  },
};

/**
 * Config Daemon class.
 */
export class ConfigDaemon extends MudObject {
  private _settings: Map<string, ConfigSetting> = new Map();
  private _dirty: boolean = false;
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Config Daemon';
    this.longDesc = 'The configuration daemon manages mud-wide settings.';

    // Initialize with defaults
    this._initDefaults();
  }

  /**
   * Initialize settings with default values.
   */
  private _initDefaults(): void {
    for (const [key, setting] of Object.entries(DEFAULT_SETTINGS)) {
      this._settings.set(key, { ...setting });
    }
  }

  /**
   * Get a configuration value.
   * @param key The setting key (e.g., 'disconnect.timeoutMinutes')
   * @returns The value, or undefined if not found
   */
  get<T = unknown>(key: string): T | undefined {
    const setting = this._settings.get(key);
    return setting?.value as T | undefined;
  }

  /**
   * Set a configuration value.
   * Validates the value against the setting's type and constraints.
   * @param key The setting key
   * @param value The new value
   * @returns Object with success status and optional error message
   */
  set(key: string, value: unknown): { success: boolean; error?: string } {
    const setting = this._settings.get(key);

    if (!setting) {
      return { success: false, error: `Unknown setting: ${key}` };
    }

    // Validate type
    if (setting.type === 'number') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (typeof numValue !== 'number' || isNaN(numValue)) {
        return { success: false, error: `${key} must be a number` };
      }
      if (setting.min !== undefined && numValue < setting.min) {
        return { success: false, error: `${key} must be at least ${setting.min}` };
      }
      if (setting.max !== undefined && numValue > setting.max) {
        return { success: false, error: `${key} must be at most ${setting.max}` };
      }
      setting.value = numValue;
    } else if (setting.type === 'boolean') {
      if (typeof value === 'string') {
        setting.value = value.toLowerCase() === 'true' || value === '1';
      } else if (typeof value === 'boolean') {
        setting.value = value;
      } else {
        return { success: false, error: `${key} must be a boolean` };
      }
    } else if (setting.type === 'string') {
      setting.value = String(value);
    }

    this._dirty = true;
    return { success: true };
  }

  /**
   * Get all settings.
   * Returns a copy to prevent modification.
   */
  getAll(): Record<string, ConfigSetting> {
    const result: Record<string, ConfigSetting> = {};
    for (const [key, setting] of this._settings) {
      result[key] = { ...setting };
    }
    return result;
  }

  /**
   * Get all setting keys.
   */
  getKeys(): string[] {
    return Array.from(this._settings.keys());
  }

  /**
   * Get setting metadata (description, type, constraints).
   */
  getSettingInfo(key: string): Omit<ConfigSetting, 'value'> | undefined {
    const setting = this._settings.get(key);
    if (!setting) return undefined;
    const { value: _, ...info } = setting;
    return info;
  }

  /**
   * Check if a setting exists.
   */
  has(key: string): boolean {
    return this._settings.has(key);
  }

  /**
   * Reset a setting to its default value.
   */
  reset(key: string): boolean {
    const defaultSetting = DEFAULT_SETTINGS[key];
    if (!defaultSetting) return false;

    const setting = this._settings.get(key);
    if (setting) {
      setting.value = defaultSetting.value;
      this._dirty = true;
    }
    return true;
  }

  /**
   * Reset all settings to defaults.
   */
  resetAll(): void {
    this._initDefaults();
    this._dirty = true;
  }

  /**
   * Load settings from disk.
   */
  async load(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.loadData) {
      console.log('[ConfigDaemon] efuns not available, using defaults');
      return;
    }

    try {
      const saved = await efuns.loadData<SerializedConfig>('config', 'settings');

      if (!saved) {
        console.log('[ConfigDaemon] No saved config, using defaults');
        this._loaded = true;
        return;
      }

      // Merge saved values into settings (only for known keys)
      for (const [key, value] of Object.entries(saved)) {
        if (this._settings.has(key)) {
          const setting = this._settings.get(key)!;
          setting.value = value;
        }
      }

      console.log('[ConfigDaemon] Loaded config from disk');
      this._loaded = true;
      this._dirty = false;
    } catch (error) {
      console.error('[ConfigDaemon] Failed to load config:', error);
    }
  }

  /**
   * Save settings to disk.
   */
  async save(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.saveData) {
      console.log('[ConfigDaemon] efuns not available, cannot save');
      return;
    }

    try {
      // Build serialized config (just values)
      const serialized: SerializedConfig = {};
      for (const [key, setting] of this._settings) {
        serialized[key] = setting.value;
      }

      await efuns.saveData('config', 'settings', serialized);
      console.log('[ConfigDaemon] Saved config to disk');
      this._dirty = false;
    } catch (error) {
      console.error('[ConfigDaemon] Failed to save config:', error);
    }
  }

  /**
   * Check if there are unsaved changes.
   */
  get isDirty(): boolean {
    return this._dirty;
  }

  /**
   * Check if config has been loaded from disk.
   */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /**
   * Register a new setting dynamically.
   * This allows other systems to register their own settings.
   */
  registerSetting(key: string, setting: ConfigSetting): void {
    if (!this._settings.has(key)) {
      this._settings.set(key, { ...setting });
    }
  }
}

// Singleton instance
let configDaemon: ConfigDaemon | null = null;

/**
 * Get the config daemon singleton.
 */
export function getConfigDaemon(): ConfigDaemon {
  if (!configDaemon) {
    configDaemon = new ConfigDaemon();
  }
  return configDaemon;
}

/**
 * Reset the config daemon (for testing).
 */
export function resetConfigDaemon(): void {
  configDaemon = null;
}

export default ConfigDaemon;
