/**
 * Setup command - Open the game setup wizard (admin only).
 *
 * Usage:
 *   setup   - Opens a GUI modal to configure game identity and mechanics
 */

import type { MudObject } from '../../lib/std.js';
import type { GUIClientMessage } from '../../lib/gui-types.js';
import { openSetupModal } from '../../lib/setup-modal.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface SetupPlayer extends MudObject {
  onGUIResponse?: (msg: GUIClientMessage) => void;
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
  save(): Promise<void>;
}

export const name = 'setup';
export const description = 'Open the game setup wizard (GUI modal)';
export const usage = 'setup';

export async function execute(ctx: CommandContext): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    ctx.sendLine('{red}GUI is not available. Use the "config" command instead.{/}');
    return;
  }

  // Get config daemon
  const configDaemon = efuns.findObject('/daemons/config') as ConfigDaemon | undefined;
  if (!configDaemon) {
    ctx.sendLine('{red}Error: Config daemon not loaded.{/}');
    return;
  }

  // Read current game config
  let gameConfig = {
    name: 'MudForge',
    tagline: 'Your Adventure Awaits',
    description: 'A Modern MUD Experience',
    website: '',
    establishedYear: new Date().getFullYear(),
  };

  try {
    const content = await efuns.readFile('/config/game.json');
    const parsed = JSON.parse(content);
    gameConfig = {
      name: parsed.name || gameConfig.name,
      tagline: parsed.tagline || gameConfig.tagline,
      description: parsed.description || gameConfig.description,
      website: parsed.website || gameConfig.website,
      establishedYear: parsed.establishedYear || gameConfig.establishedYear,
    };
  } catch {
    // Use defaults
  }

  const player = ctx.player as SetupPlayer;
  await openSetupModal(player, gameConfig, configDaemon, (msg: string) => ctx.sendLine(msg));
}

export default { name, description, usage, execute };
