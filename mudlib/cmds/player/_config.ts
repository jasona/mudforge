/**
 * Config command - Manage player settings.
 *
 * View and modify personal configuration options.
 */

import type { MudObject } from '../../lib/std.js';
import {
  CONFIG_OPTIONS,
  getConfigOption,
  getCategories,
  getConfigsByCategory,
  formatConfigValue,
  type ConfigOption,
} from '../../lib/player-config.js';

interface Player extends MudObject {
  getConfig<T = unknown>(key: string): T;
  setConfig(key: string, value: unknown): { success: boolean; error?: string };
  resetConfig(key: string): boolean;
  resetAllConfig(): void;
}

interface CommandContext {
  player: Player;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['config', 'set', 'settings'];
export const description = 'View and manage your personal settings';
export const usage = `config                    - List all settings by category
config <setting>          - Show details for a setting
config <setting> <value>  - Change a setting
config reset <setting>    - Reset a setting to default
config reset all          - Reset all settings to defaults`;

/**
 * Format a category name for display.
 */
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Show all settings grouped by category.
 */
function showAllSettings(ctx: CommandContext): void {
  const { player } = ctx;
  const categories = getCategories();

  ctx.sendLine('{bold}{cyan}=== Player Settings ==={/}');
  ctx.sendLine('');

  for (const category of categories) {
    const options = getConfigsByCategory(category);
    ctx.sendLine(`{bold}{yellow}${formatCategory(category)}{/}`);

    for (const option of options) {
      const value = player.getConfig(option.key);
      const formatted = formatConfigValue(option.key, value);
      ctx.sendLine(`  {white}${option.key.padEnd(15)}{/} ${formatted}`);
    }
    ctx.sendLine('');
  }

  ctx.sendLine('{dim}Use "config <setting>" for details, "config <setting> <value>" to change.{/}');
}

/**
 * Show details for a specific setting.
 */
function showSettingDetails(ctx: CommandContext, option: ConfigOption): void {
  const { player } = ctx;
  const value = player.getConfig(option.key);
  const formatted = formatConfigValue(option.key, value);

  ctx.sendLine(`{bold}{cyan}${option.name}{/} ({dim}${option.key}{/})`);
  ctx.sendLine(`{white}${option.description}{/}`);
  ctx.sendLine('');
  ctx.sendLine(`  Current: ${formatted}`);
  ctx.sendLine(`  Default: ${formatConfigValue(option.key, option.default)}`);
  ctx.sendLine(`  Type: {dim}${option.type}{/}`);

  if (option.type === 'choice' && option.choices) {
    ctx.sendLine(`  Options: {dim}${option.choices.join(', ')}{/}`);
  }
  if (option.type === 'number') {
    if (option.min !== undefined && option.max !== undefined) {
      ctx.sendLine(`  Range: {dim}${option.min} - ${option.max}{/}`);
    } else if (option.min !== undefined) {
      ctx.sendLine(`  Minimum: {dim}${option.min}{/}`);
    } else if (option.max !== undefined) {
      ctx.sendLine(`  Maximum: {dim}${option.max}{/}`);
    }
  }
}

/**
 * Set a configuration value.
 */
function setSettingValue(ctx: CommandContext, key: string, value: string): void {
  const { player } = ctx;
  const option = getConfigOption(key);

  if (!option) {
    ctx.sendLine(`{red}Unknown setting: ${key}{/}`);
    return;
  }

  const result = player.setConfig(key, value);

  if (result.success) {
    const newValue = player.getConfig(key);
    const formatted = formatConfigValue(key, newValue);
    ctx.sendLine(`{green}${option.name} set to ${formatted}{/}`);
  } else {
    ctx.sendLine(`{red}${result.error}{/}`);
  }
}

/**
 * Reset a setting to default.
 */
function resetSetting(ctx: CommandContext, key: string): void {
  const { player } = ctx;
  const option = getConfigOption(key);

  if (!option) {
    ctx.sendLine(`{red}Unknown setting: ${key}{/}`);
    return;
  }

  player.resetConfig(key);
  const formatted = formatConfigValue(key, option.default);
  ctx.sendLine(`{green}${option.name} reset to default: ${formatted}{/}`);
}

/**
 * Find a setting by key or partial match.
 */
function findSetting(query: string): ConfigOption | ConfigOption[] | null {
  const lower = query.toLowerCase();

  // Exact match
  const exact = getConfigOption(lower);
  if (exact) return exact;

  // Partial match
  const matches = CONFIG_OPTIONS.filter(
    (opt) => opt.key.toLowerCase().includes(lower) || opt.name.toLowerCase().includes(lower)
  );

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return matches;
  return null;
}

export function execute(ctx: CommandContext): void {
  const { args } = ctx;
  const parts = args.trim().split(/\s+/);
  const command = parts[0]?.toLowerCase();

  // No args - show all settings
  if (!command) {
    showAllSettings(ctx);
    return;
  }

  // Reset command
  if (command === 'reset') {
    const target = parts[1]?.toLowerCase();
    if (!target) {
      ctx.sendLine('{red}Usage: config reset <setting> or config reset all{/}');
      return;
    }
    if (target === 'all') {
      ctx.player.resetAllConfig();
      ctx.sendLine('{green}All settings reset to defaults.{/}');
      return;
    }
    const found = findSetting(target);
    if (!found) {
      ctx.sendLine(`{red}Unknown setting: ${target}{/}`);
      return;
    }
    if (Array.isArray(found)) {
      ctx.sendLine(`{yellow}Multiple matches: ${found.map((o) => o.key).join(', ')}{/}`);
      return;
    }
    resetSetting(ctx, found.key);
    return;
  }

  // Find the setting
  const found = findSetting(command);

  if (!found) {
    ctx.sendLine(`{red}Unknown setting: ${command}{/}`);
    ctx.sendLine('{dim}Use "config" to see all available settings.{/}');
    return;
  }

  if (Array.isArray(found)) {
    ctx.sendLine(`{yellow}Multiple matches:{/}`);
    for (const opt of found) {
      ctx.sendLine(`  ${opt.key} - ${opt.name}`);
    }
    return;
  }

  // No value - show details
  if (parts.length === 1) {
    showSettingDetails(ctx, found);
    return;
  }

  // Set value
  const value = parts.slice(1).join(' ');
  setSettingValue(ctx, found.key, value);
}

export default { name, description, usage, execute };
