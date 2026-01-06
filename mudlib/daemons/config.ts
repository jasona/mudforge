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

import { MudObject } from '../lib/std.js';

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
    if (typeof efuns === 'undefined' || !efuns.readFile) {
      console.log('[ConfigDaemon] efuns not available, using defaults');
      return;
    }

    try {
      const configPath = '/data/config/settings.json';
      const exists = await efuns.fileExists(configPath);

      if (!exists) {
        console.log('[ConfigDaemon] No saved config, using defaults');
        this._loaded = true;
        return;
      }

      const content = await efuns.readFile(configPath);
      const saved = JSON.parse(content) as SerializedConfig;

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
    if (typeof efuns === 'undefined' || !efuns.writeFile) {
      console.log('[ConfigDaemon] efuns not available, cannot save');
      return;
    }

    try {
      // Build serialized config (just values)
      const serialized: SerializedConfig = {};
      for (const [key, setting] of this._settings) {
        serialized[key] = setting.value;
      }

      const configPath = '/data/config/settings.json';

      // Ensure directory exists
      const dirPath = '/data/config';
      const dirExists = await efuns.fileExists(dirPath);
      if (!dirExists) {
        await efuns.makeDir(dirPath, true);
      }

      await efuns.writeFile(configPath, JSON.stringify(serialized, null, 2));
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
