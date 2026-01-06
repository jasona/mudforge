/**
 * Config command - Manage mud-wide configuration settings (admin only).
 *
 * Usage:
 *   config                    - List all settings
 *   config <key>              - View a specific setting
 *   config <key> <value>      - Set a setting value
 *   config reset <key>        - Reset a setting to default
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface ConfigSetting {
  value: unknown;
  description: string;
  type: 'number' | 'string' | 'boolean';
  min?: number;
  max?: number;
}

interface ConfigDaemon extends MudObject {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): { success: boolean; error?: string };
  getAll(): Record<string, ConfigSetting>;
  getKeys(): string[];
  getSettingInfo(key: string): Omit<ConfigSetting, 'value'> | undefined;
  has(key: string): boolean;
  reset(key: string): boolean;
  save(): Promise<void>;
}

export const name = ['config', 'mudconfig'];
export const description = 'Manage mud-wide configuration settings (admin only)';
export const usage = 'config [key] [value] | config reset <key>';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  // Get config daemon from registry
  const configDaemon = typeof efuns !== 'undefined'
    ? efuns.findObject('/daemons/config') as ConfigDaemon | undefined
    : undefined;

  if (!configDaemon) {
    ctx.sendLine('{red}Error: Config daemon not loaded.{/}');
    return;
  }

  // No args - list all settings
  if (!args) {
    listAllSettings(ctx, configDaemon);
    return;
  }

  const parts = args.split(/\s+/);
  const firstArg = parts[0].toLowerCase();

  // Handle reset command
  if (firstArg === 'reset') {
    if (parts.length < 2) {
      ctx.sendLine('{red}Usage: config reset <key>{/}');
      return;
    }
    const key = parts[1];
    resetSetting(ctx, configDaemon, key);
    return;
  }

  // Check if it's a key lookup or a key=value set
  const key = parts[0];

  // If only one arg, show the setting
  if (parts.length === 1) {
    showSetting(ctx, configDaemon, key);
    return;
  }

  // Multiple args - set the value
  const value = parts.slice(1).join(' ');
  setSetting(ctx, configDaemon, key, value);
}

/**
 * List all configuration settings.
 */
function listAllSettings(ctx: CommandContext, configDaemon: ConfigDaemon): void {
  const settings = configDaemon.getAll();
  const keys = Object.keys(settings).sort();

  if (keys.length === 0) {
    ctx.sendLine('{yellow}No configuration settings defined.{/}');
    return;
  }

  ctx.sendLine('{cyan}=== Mud Configuration Settings ==={/}');
  ctx.sendLine('');

  for (const key of keys) {
    const setting = settings[key];
    const value = formatValue(setting.value, setting.type);
    const constraints = formatConstraints(setting);

    ctx.sendLine(`{yellow}${key}{/}`);
    ctx.sendLine(`  Value: ${value}`);
    ctx.sendLine(`  Type: {dim}${setting.type}${constraints}{/}`);
    ctx.sendLine(`  {dim}${setting.description}{/}`);
    ctx.sendLine('');
  }

  ctx.sendLine('{dim}Use "config <key> <value>" to change a setting.{/}');
  ctx.sendLine('{dim}Use "config reset <key>" to reset to default.{/}');
}

/**
 * Show a specific setting.
 */
function showSetting(ctx: CommandContext, configDaemon: ConfigDaemon, key: string): void {
  if (!configDaemon.has(key)) {
    ctx.sendLine(`{red}Unknown setting: ${key}{/}`);
    ctx.sendLine('{dim}Use "config" to list all available settings.{/}');
    return;
  }

  const value = configDaemon.get(key);
  const info = configDaemon.getSettingInfo(key);

  if (!info) {
    ctx.sendLine(`{yellow}${key}{/} = ${formatValue(value, 'string')}`);
    return;
  }

  const constraints = formatConstraints(info);

  ctx.sendLine(`{yellow}${key}{/}`);
  ctx.sendLine(`  Value: ${formatValue(value, info.type)}`);
  ctx.sendLine(`  Type: {dim}${info.type}${constraints}{/}`);
  ctx.sendLine(`  {dim}${info.description}{/}`);
}

/**
 * Set a configuration value.
 */
async function setSetting(
  ctx: CommandContext,
  configDaemon: ConfigDaemon,
  key: string,
  value: string
): Promise<void> {
  if (!configDaemon.has(key)) {
    ctx.sendLine(`{red}Unknown setting: ${key}{/}`);
    ctx.sendLine('{dim}Use "config" to list all available settings.{/}');
    return;
  }

  const oldValue = configDaemon.get(key);
  const result = configDaemon.set(key, value);

  if (!result.success) {
    ctx.sendLine(`{red}Failed to set ${key}: ${result.error}{/}`);
    return;
  }

  const newValue = configDaemon.get(key);
  const info = configDaemon.getSettingInfo(key);
  const type = info?.type || 'string';

  ctx.sendLine(`{green}Setting updated:{/}`);
  ctx.sendLine(`  {yellow}${key}{/}`);
  ctx.sendLine(`  Old: ${formatValue(oldValue, type)}`);
  ctx.sendLine(`  New: ${formatValue(newValue, type)}`);

  // Save to disk
  try {
    await configDaemon.save();
    ctx.sendLine('{dim}Changes saved to disk.{/}');
  } catch (error) {
    ctx.sendLine(`{yellow}Warning: Failed to save to disk: ${error}{/}`);
  }
}

/**
 * Reset a setting to its default value.
 */
async function resetSetting(
  ctx: CommandContext,
  configDaemon: ConfigDaemon,
  key: string
): Promise<void> {
  if (!configDaemon.has(key)) {
    ctx.sendLine(`{red}Unknown setting: ${key}{/}`);
    return;
  }

  const oldValue = configDaemon.get(key);
  const success = configDaemon.reset(key);

  if (!success) {
    ctx.sendLine(`{red}Failed to reset ${key} - no default value defined.{/}`);
    return;
  }

  const newValue = configDaemon.get(key);
  const info = configDaemon.getSettingInfo(key);
  const type = info?.type || 'string';

  ctx.sendLine(`{green}Setting reset to default:{/}`);
  ctx.sendLine(`  {yellow}${key}{/}`);
  ctx.sendLine(`  Was: ${formatValue(oldValue, type)}`);
  ctx.sendLine(`  Now: ${formatValue(newValue, type)}`);

  // Save to disk
  try {
    await configDaemon.save();
    ctx.sendLine('{dim}Changes saved to disk.{/}');
  } catch (error) {
    ctx.sendLine(`{yellow}Warning: Failed to save to disk: ${error}{/}`);
  }
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown, type: string): string {
  if (value === undefined) return '{dim}(not set){/}';
  if (value === null) return '{dim}null{/}';

  switch (type) {
    case 'boolean':
      return value ? '{green}true{/}' : '{red}false{/}';
    case 'number':
      return `{cyan}${value}{/}`;
    case 'string':
      return `{green}"${value}"{/}`;
    default:
      return String(value);
  }
}

/**
 * Format constraints for display.
 */
function formatConstraints(setting: { min?: number; max?: number }): string {
  const parts: string[] = [];
  if (setting.min !== undefined) parts.push(`min: ${setting.min}`);
  if (setting.max !== undefined) parts.push(`max: ${setting.max}`);
  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

export default { name, description, usage, execute };
