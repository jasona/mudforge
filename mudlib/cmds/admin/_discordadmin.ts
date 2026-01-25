/**
 * Discord Admin Command - Manage Discord channel bridging.
 *
 * Usage:
 *   discordadmin status                           - Show configuration and connection status
 *   discordadmin configure <guildId> <channelId>  - Set Discord server and channel
 *   discordadmin enable                           - Enable and connect
 *   discordadmin disable                          - Disable and disconnect
 *   discordadmin test                             - Send test message to Discord
 */

import type { MudObject } from '../../lib/std.js';
import { getDiscordDaemon } from '../../daemons/discord.js';

interface CommandContext {
  player: MudObject & { name: string };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'discordadmin';
export const description = 'Manage Discord channel bridging';
export const usage = `discordadmin status                           - Show configuration and connection status
discordadmin configure <guildId> <channelId>  - Set Discord server and channel
discordadmin enable                           - Enable and connect
discordadmin disable                          - Disable and disconnect
discordadmin test                             - Send test message to Discord`;

export async function execute(ctx: CommandContext): Promise<void> {
    const { player } = ctx;
    const parts = ctx.args.trim().split(/\s+/);
    const subcommand = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    if (!subcommand) {
      player.receive(
        '{yellow}Usage:{/}\n' +
        '  discordadmin status                           - Show status\n' +
        '  discordadmin configure <guildId> <channelId>  - Configure\n' +
        '  discordadmin enable                           - Enable and connect\n' +
        '  discordadmin disable                          - Disable and disconnect\n' +
        '  discordadmin test                             - Send test message\n'
      );
      return;
    }

    const discordDaemon = getDiscordDaemon();

    switch (subcommand) {
      case 'status': {
        const status = discordDaemon.getStatus();
        const tokenSet = !!process.env['DISCORD_BOT_TOKEN'];

        player.receive(
          '\n{bold}{cyan}Discord Channel Bridge Status{/}\n' +
          '{cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}\n'
        );

        // Connection state
        const stateColor = status.state === 'connected' ? 'green' :
                          status.state === 'connecting' ? 'yellow' : 'red';
        player.receive(`  State:      {${stateColor}}${status.state}{/}\n`);

        // Enabled
        const enabledStr = status.enabled ? '{green}Yes{/}' : '{red}No{/}';
        player.receive(`  Enabled:    ${enabledStr}\n`);

        // Token
        const tokenStr = tokenSet ? '{green}Set{/}' : '{red}Not set (DISCORD_BOT_TOKEN){/}';
        player.receive(`  Bot Token:  ${tokenStr}\n`);

        // Guild ID
        const guildStr = status.guildId || '{dim}Not configured{/}';
        player.receive(`  Guild ID:   ${guildStr}\n`);

        // Channel ID
        const channelStr = status.channelId || '{dim}Not configured{/}';
        player.receive(`  Channel ID: ${channelStr}\n`);

        player.receive('{cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{/}\n\n');

        if (!tokenSet) {
          player.receive(
            '{yellow}Note:{/} Set DISCORD_BOT_TOKEN in your environment variables.\n' +
            'Get a token from https://discord.com/developers/applications\n\n'
          );
        }

        if (!status.guildId || !status.channelId) {
          player.receive(
            '{yellow}Note:{/} Use "discordadmin configure <guildId> <channelId>" to set up.\n\n'
          );
        }

        return;
      }

      case 'configure': {
        const guildId = args[0];
        const channelId = args[1];

        if (!guildId || !channelId) {
          player.receive('{red}Error:{/} Usage: discordadmin configure <guildId> <channelId>\n');
          return;
        }

        // Validate IDs are numeric (Discord snowflakes are numeric)
        if (!/^\d+$/.test(guildId)) {
          player.receive('{red}Error:{/} Guild ID must be a numeric Discord snowflake.\n');
          return;
        }

        if (!/^\d+$/.test(channelId)) {
          player.receive('{red}Error:{/} Channel ID must be a numeric Discord snowflake.\n');
          return;
        }

        const result = await discordDaemon.configure(guildId, channelId);
        if (result.success) {
          player.receive('{green}Discord configuration saved.{/}\n');
          player.receive(`  Guild ID:   ${guildId}\n`);
          player.receive(`  Channel ID: ${channelId}\n`);
          player.receive('\nUse "discordadmin enable" to connect.\n');
        } else {
          player.receive(`{red}Error:{/} ${result.error}\n`);
        }
        return;
      }

      case 'enable': {
        player.receive('{yellow}Connecting to Discord...{/}\n');

        const result = await discordDaemon.enable();
        if (result.success) {
          player.receive('{green}Discord connected and enabled!{/}\n');
          player.receive('Players can now use the "discord" channel to chat with Discord.\n');
        } else {
          player.receive(`{red}Error:{/} ${result.error}\n`);
        }
        return;
      }

      case 'disable': {
        await discordDaemon.disable();
        player.receive('{yellow}Discord disconnected and disabled.{/}\n');
        return;
      }

      case 'test': {
        const status = discordDaemon.getStatus();
        if (!status.connected) {
          player.receive('{red}Error:{/} Discord is not connected. Use "discordadmin enable" first.\n');
          return;
        }

        player.receive('{yellow}Sending test message to Discord...{/}\n');

        const success = await discordDaemon.sendToDiscord(
          'System',
          `Test message from ${player.name} at ${new Date().toLocaleTimeString()}`
        );

        if (success) {
          player.receive('{green}Test message sent successfully!{/}\n');
        } else {
          player.receive('{red}Failed to send test message.{/}\n');
        }
        return;
      }

      default:
        player.receive(`{red}Unknown subcommand:{/} ${subcommand}\n`);
        player.receive('Use "discordadmin" to see available commands.\n');
        return;
    }
}
