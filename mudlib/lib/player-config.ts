/**
 * Player Configuration System
 *
 * Defines available player settings with types, defaults, descriptions,
 * and validation. Settings persist across logins and reboots.
 */

/**
 * Configuration value types.
 */
export type ConfigType = 'boolean' | 'string' | 'number' | 'choice';

/**
 * Configuration option definition.
 */
export interface ConfigOption {
  /** The setting key */
  key: string;
  /** Display name */
  name: string;
  /** Description of the setting */
  description: string;
  /** Type of value */
  type: ConfigType;
  /** Default value */
  default: unknown;
  /** For 'choice' type: available options */
  choices?: string[];
  /** For 'number' type: minimum value */
  min?: number;
  /** For 'number' type: maximum value */
  max?: number;
  /** Category for grouping in UI */
  category: string;
}

/**
 * Available configuration options.
 */
export const CONFIG_OPTIONS: ConfigOption[] = [
  // Display settings
  {
    key: 'brief',
    name: 'Brief Mode',
    description: 'Show short room descriptions when moving (use "look" for full description)',
    type: 'boolean',
    default: false,
    category: 'display',
  },
  {
    key: 'color',
    name: 'Color',
    description: 'Enable colored text output',
    type: 'boolean',
    default: true,
    category: 'display',
  },
  {
    key: 'prompt',
    name: 'Prompt',
    description: 'Custom command prompt (%h/%H health, %m/%M mana, %l location, %n name, %d cwd)',
    type: 'string',
    default: '> ',
    category: 'display',
  },
  {
    key: 'screenWidth',
    name: 'Screen Width',
    description: 'Width for text wrapping (0 = no wrapping)',
    type: 'number',
    default: 80,
    min: 0,
    max: 200,
    category: 'display',
  },

  // Communication settings
  {
    key: 'echo',
    name: 'Command Echo',
    description: 'Echo your commands back to you',
    type: 'boolean',
    default: false,
    category: 'communication',
  },
  {
    key: 'shoutBlock',
    name: 'Block Shouts',
    description: 'Block shout channel messages',
    type: 'boolean',
    default: false,
    category: 'communication',
  },
  {
    key: 'oocBlock',
    name: 'Block OOC',
    description: 'Block out-of-character channel messages',
    type: 'boolean',
    default: false,
    category: 'communication',
  },
  {
    key: 'tellSound',
    name: 'Tell Sound',
    description: 'Play a sound when receiving tells (if client supports)',
    type: 'boolean',
    default: true,
    category: 'communication',
  },

  // Gameplay settings
  {
    key: 'autoLook',
    name: 'Auto Look',
    description: 'Automatically look when entering a room',
    type: 'boolean',
    default: true,
    category: 'gameplay',
  },
  {
    key: 'autoExit',
    name: 'Auto Exits',
    description: 'Automatically show exits when entering a room',
    type: 'boolean',
    default: true,
    category: 'gameplay',
  },
  {
    key: 'combatVerbose',
    name: 'Verbose Combat',
    description: 'Show detailed combat messages',
    type: 'boolean',
    default: true,
    category: 'gameplay',
  },
  {
    key: 'hpWarning',
    name: 'HP Warning Threshold',
    description: 'Warn when health drops below this percentage',
    type: 'number',
    default: 25,
    min: 0,
    max: 100,
    category: 'gameplay',
  },

  // Interface settings
  {
    key: 'pagerLines',
    name: 'Pager Lines',
    description: 'Lines per page when viewing long text (0 = no paging)',
    type: 'number',
    default: 20,
    min: 0,
    max: 100,
    category: 'interface',
  },
  {
    key: 'editorTheme',
    name: 'Editor Theme',
    description: 'Color theme for the IDE editor',
    type: 'choice',
    default: 'one-dark',
    choices: ['one-dark', 'light', 'high-contrast', 'solarized-dark'],
    category: 'interface',
  },
];

/**
 * Get a config option by key.
 */
export function getConfigOption(key: string): ConfigOption | undefined {
  return CONFIG_OPTIONS.find((opt) => opt.key === key);
}

/**
 * Get all config options in a category.
 */
export function getConfigsByCategory(category: string): ConfigOption[] {
  return CONFIG_OPTIONS.filter((opt) => opt.category === category);
}

/**
 * Get all unique categories.
 */
export function getCategories(): string[] {
  return [...new Set(CONFIG_OPTIONS.map((opt) => opt.category))];
}

/**
 * Validate a config value.
 */
export function validateConfigValue(
  key: string,
  value: unknown
): { valid: boolean; error?: string; normalizedValue?: unknown } {
  const option = getConfigOption(key);
  if (!option) {
    return { valid: false, error: `Unknown setting: ${key}` };
  }

  switch (option.type) {
    case 'boolean': {
      if (typeof value === 'boolean') {
        return { valid: true, normalizedValue: value };
      }
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (['true', 'yes', 'on', '1'].includes(lower)) {
          return { valid: true, normalizedValue: true };
        }
        if (['false', 'no', 'off', '0'].includes(lower)) {
          return { valid: true, normalizedValue: false };
        }
      }
      return { valid: false, error: `${option.name} must be true/false (or yes/no, on/off)` };
    }

    case 'number': {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) {
        return { valid: false, error: `${option.name} must be a number` };
      }
      if (option.min !== undefined && num < option.min) {
        return { valid: false, error: `${option.name} must be at least ${option.min}` };
      }
      if (option.max !== undefined && num > option.max) {
        return { valid: false, error: `${option.name} must be at most ${option.max}` };
      }
      return { valid: true, normalizedValue: num };
    }

    case 'string': {
      return { valid: true, normalizedValue: String(value) };
    }

    case 'choice': {
      const str = String(value).toLowerCase();
      const match = option.choices?.find((c) => c.toLowerCase() === str);
      if (match) {
        return { valid: true, normalizedValue: match };
      }
      return {
        valid: false,
        error: `${option.name} must be one of: ${option.choices?.join(', ')}`,
      };
    }

    default:
      return { valid: false, error: 'Unknown option type' };
  }
}

/**
 * Format a value for display.
 */
export function formatConfigValue(key: string, value: unknown): string {
  const option = getConfigOption(key);
  if (!option) return String(value);

  switch (option.type) {
    case 'boolean':
      return value ? '{green}on{/}' : '{red}off{/}';
    case 'number':
      return `{cyan}${value}{/}`;
    case 'string':
      return value ? `{yellow}"${value}"{/}` : '{dim}(empty){/}';
    case 'choice':
      return `{magenta}${value}{/}`;
    default:
      return String(value);
  }
}

/**
 * Get default config values.
 */
export function getDefaultConfig(): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  for (const option of CONFIG_OPTIONS) {
    config[option.key] = option.default;
  }
  return config;
}

export default {
  CONFIG_OPTIONS,
  getConfigOption,
  getConfigsByCategory,
  getCategories,
  validateConfigValue,
  formatConfigValue,
  getDefaultConfig,
};
