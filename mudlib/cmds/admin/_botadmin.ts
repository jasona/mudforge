/**
 * Bot Admin Command - Manage the bot system.
 *
 * Usage:
 *   botadmin status                    - Show bot system status
 *   botadmin configure <maxBots>       - Set maximum number of bots
 *   botadmin enable                    - Enable bot system
 *   botadmin disable                   - Disable bot system
 *   botadmin list                      - List all bots and their status
 *   botadmin create                    - Manually create a new bot
 *   botadmin delete <botId>            - Delete a bot permanently
 *   botadmin login <botId>             - Force a bot to log in
 *   botadmin logout <botId>            - Force a bot to log out
 *   botadmin info <botId>              - Show detailed bot info
 *   botadmin regenerate <botId>        - Regenerate bot's personality
 */

import type { MudObject } from '../../lib/std.js';
import { getBotDaemon } from '../../daemons/bots.js';

interface CommandContext {
  player: MudObject & { name: string };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'botadmin';
export const description = 'Manage the bot system (simulated players)';
export const usage = `botadmin status                    - Show bot system status
botadmin configure <maxBots>       - Set maximum number of bots
botadmin enable                    - Enable bot system
botadmin disable                   - Disable bot system
botadmin list                      - List all bots and their status
botadmin create                    - Manually create a new bot
botadmin delete <botId>            - Delete a bot permanently
botadmin login <botId>             - Force a bot to log in
botadmin logout <botId>            - Force a bot to log out
botadmin info <botId>              - Show detailed bot info
botadmin regenerate <botId>        - Regenerate bot's personality`;

export async function execute(ctx: CommandContext): Promise<void> {
  const { player } = ctx;
  const parts = ctx.args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  if (!subcommand) {
    player.receive(
      '{yellow}Usage:{/}\n' +
      '  botadmin status                    - Show status\n' +
      '  botadmin configure <maxBots>       - Set max bots\n' +
      '  botadmin enable                    - Enable system\n' +
      '  botadmin disable                   - Disable system\n' +
      '  botadmin list                      - List all bots\n' +
      '  botadmin create                    - Create new bot\n' +
      '  botadmin delete <botId>            - Delete a bot\n' +
      '  botadmin login <botId>             - Force login\n' +
      '  botadmin logout <botId>            - Force logout\n' +
      '  botadmin info <botId>              - Bot details\n' +
      '  botadmin regenerate <botId>        - Regenerate personality\n'
    );
    return;
  }

  const botDaemon = getBotDaemon();

  switch (subcommand) {
    case 'status': {
      const status = botDaemon.getStatus();

      player.receive(
        '\n{bold}{cyan}Bot System Status{/}\n' +
        '{cyan}' + '='.repeat(40) + '{/}\n'
      );

      // System state
      const stateColor = status.enabled ? 'green' : 'red';
      const stateText = status.enabled ? 'Enabled' : 'Disabled';
      player.receive(`  State:          {${stateColor}}${stateText}{/}\n`);

      // Bot counts
      player.receive(`  Online Bots:    {bold}${status.onlineCount}{/} / ${status.maxBots}\n`);
      player.receive(`  Total Bots:     ${status.totalBots}\n`);

      // Settings
      player.receive('\n{dim}Settings:{/}\n');
      player.receive(`  Max Bots:           ${status.maxBots}\n`);
      player.receive(`  Online Time:        ${status.settings.minOnlineMinutes}-${status.settings.maxOnlineMinutes} min\n`);
      player.receive(`  Offline Time:       ${status.settings.minOfflineMinutes}-${status.settings.maxOfflineMinutes} min\n`);
      player.receive(`  Chat Frequency:     ~${status.settings.chatFrequencyMinutes} min\n`);

      player.receive('{cyan}' + '='.repeat(40) + '{/}\n\n');

      if (!status.enabled) {
        player.receive('{yellow}Note:{/} Use "botadmin enable" to start the bot system.\n\n');
      }

      if (status.totalBots === 0) {
        player.receive('{yellow}Note:{/} Use "botadmin create" to create bots.\n\n');
      }

      return;
    }

    case 'configure': {
      const maxBots = parseInt(args[0] || '', 10);

      if (isNaN(maxBots)) {
        player.receive('{red}Error:{/} Usage: botadmin configure <maxBots>\n');
        player.receive('Example: botadmin configure 10\n');
        return;
      }

      const result = await botDaemon.configure({ maxBots });
      if (result.success) {
        player.receive(`{green}Configuration updated:{/} maxBots = ${maxBots}\n`);
      } else {
        player.receive(`{red}Error:{/} ${result.error}\n`);
      }
      return;
    }

    case 'enable': {
      player.receive('{yellow}Enabling bot system...{/}\n');

      const result = await botDaemon.enable();
      if (result.success) {
        player.receive('{green}Bot system enabled!{/}\n');
        player.receive('Bots will begin logging in over the next few minutes.\n');
      } else {
        player.receive(`{red}Error:{/} ${result.error}\n`);
      }
      return;
    }

    case 'disable': {
      player.receive('{yellow}Disabling bot system...{/}\n');
      await botDaemon.disable();
      player.receive('{green}Bot system disabled.{/}\n');
      player.receive('All bots have been logged out.\n');
      return;
    }

    case 'list': {
      const bots = botDaemon.listBots();

      if (bots.length === 0) {
        player.receive('No bots created yet. Use "botadmin create" to add bots.\n');
        return;
      }

      player.receive('\n{bold}{cyan}Bot List{/}\n');
      player.receive('{dim}' + '-'.repeat(70) + '{/}\n');
      player.receive(
        '  ' +
        'Status'.padEnd(8) +
        'Name'.padEnd(15) +
        'Level'.padEnd(8) +
        'Race'.padEnd(12) +
        'Guild'.padEnd(10) +
        'Location\n'
      );
      player.receive('{dim}' + '-'.repeat(70) + '{/}\n');

      for (const bot of bots) {
        const status = bot.online ? '{green}Online{/}' : '{dim}Offline{/}';
        const location = bot.location || '-';
        player.receive(
          '  ' +
          (bot.online ? '{green}Online{/}' : '{dim}Offline{/}').padEnd(8 + (bot.online ? 15 : 14)) +
          bot.name.padEnd(15) +
          String(bot.level).padEnd(8) +
          bot.race.padEnd(12) +
          bot.guild.padEnd(10) +
          location + '\n'
        );
      }

      player.receive('{dim}' + '-'.repeat(70) + '{/}\n');
      player.receive(`{dim}Use "botadmin info <name>" for details.{/}\n\n`);
      return;
    }

    case 'create': {
      player.receive('{yellow}Creating new bot...{/}\n');

      const result = await botDaemon.createBot();
      if (result.success && result.bot) {
        player.receive('{green}Bot created successfully!{/}\n\n');
        player.receive(`  Name:        {bold}${result.bot.name}{/}\n`);
        player.receive(`  Race:        ${result.bot.race}\n`);
        player.receive(`  Guild:       ${result.bot.guild}\n`);
        player.receive(`  Level:       ${result.bot.level}\n`);
        player.receive(`  Type:        ${result.bot.playerType}\n`);
        player.receive(`  ID:          ${result.bot.id}\n`);
        player.receive('\nThe bot will log in automatically if the system is enabled.\n');
      } else {
        player.receive(`{red}Error:{/} ${result.error}\n`);
      }
      return;
    }

    case 'delete': {
      const botId = args[0];
      if (!botId) {
        player.receive('{red}Error:{/} Usage: botadmin delete <botId or name>\n');
        return;
      }

      // Find bot by ID or name
      const bots = botDaemon.listBots();
      const bot = bots.find(b => b.id === botId || b.name.toLowerCase() === botId.toLowerCase());

      if (!bot) {
        player.receive(`{red}Error:{/} Bot not found: ${botId}\n`);
        return;
      }

      const result = await botDaemon.deleteBot(bot.id);
      if (result.success) {
        player.receive(`{green}Deleted bot:{/} ${bot.name} (${bot.id})\n`);
      } else {
        player.receive(`{red}Error:{/} ${result.error}\n`);
      }
      return;
    }

    case 'login': {
      const botId = args[0];
      if (!botId) {
        player.receive('{red}Error:{/} Usage: botadmin login <botId or name>\n');
        return;
      }

      // Find bot by ID or name
      const bots = botDaemon.listBots();
      const bot = bots.find(b => b.id === botId || b.name.toLowerCase() === botId.toLowerCase());

      if (!bot) {
        player.receive(`{red}Error:{/} Bot not found: ${botId}\n`);
        return;
      }

      player.receive(`{yellow}Logging in ${bot.name}...{/}\n`);
      const result = await botDaemon.loginBot(bot.id);
      if (result.success) {
        player.receive(`{green}${bot.name} is now online.{/}\n`);
      } else {
        player.receive(`{red}Error:{/} ${result.error}\n`);
      }
      return;
    }

    case 'logout': {
      const botId = args[0];
      if (!botId) {
        player.receive('{red}Error:{/} Usage: botadmin logout <botId or name>\n');
        return;
      }

      // Find bot by ID or name
      const bots = botDaemon.listBots();
      const bot = bots.find(b => b.id === botId || b.name.toLowerCase() === botId.toLowerCase());

      if (!bot) {
        player.receive(`{red}Error:{/} Bot not found: ${botId}\n`);
        return;
      }

      player.receive(`{yellow}Logging out ${bot.name}...{/}\n`);
      const result = await botDaemon.logoutBot(bot.id);
      if (result.success) {
        player.receive(`{green}${bot.name} has been logged out.{/}\n`);
      } else {
        player.receive(`{red}Error:{/} ${result.error}\n`);
      }
      return;
    }

    case 'info': {
      const botId = args[0];
      if (!botId) {
        player.receive('{red}Error:{/} Usage: botadmin info <botId or name>\n');
        return;
      }

      // Find bot by ID or name
      const bots = botDaemon.listBots();
      const botStatus = bots.find(b => b.id === botId || b.name.toLowerCase() === botId.toLowerCase());

      if (!botStatus) {
        player.receive(`{red}Error:{/} Bot not found: ${botId}\n`);
        return;
      }

      const personality = botDaemon.getBotInfo(botStatus.id);
      if (!personality) {
        player.receive(`{red}Error:{/} Could not load bot personality.\n`);
        return;
      }

      player.receive('\n{bold}{cyan}Bot Information{/}\n');
      player.receive('{cyan}' + '='.repeat(50) + '{/}\n');
      player.receive(`  ID:            ${personality.id}\n`);
      player.receive(`  Name:          {bold}${personality.name}{/}\n`);
      player.receive(`  Status:        ${botStatus.online ? '{green}Online{/}' : '{dim}Offline{/}'}\n`);
      if (botStatus.location) {
        player.receive(`  Location:      ${botStatus.location}\n`);
      }

      player.receive('\n{dim}Character:{/}\n');
      player.receive(`  Race:          ${personality.race}\n`);
      player.receive(`  Guild:         ${personality.guild}\n`);
      player.receive(`  Level:         ${personality.level}\n`);
      player.receive(`  Stats:         STR ${personality.stats.str}, DEX ${personality.stats.dex}, CON ${personality.stats.con}\n`);
      player.receive(`                 INT ${personality.stats.int}, WIS ${personality.stats.wis}, CHA ${personality.stats.cha}\n`);

      player.receive('\n{dim}Personality:{/}\n');
      player.receive(`  Type:          ${personality.playerType}\n`);
      player.receive(`  Demeanor:      ${personality.personality}\n`);
      player.receive(`  Chat Style:    ${personality.chatStyle}\n`);
      player.receive(`  Interests:     ${personality.interests.join(', ')}\n`);

      player.receive('\n{dim}Description:{/}\n');
      player.receive(`  ${personality.longDesc}\n`);

      player.receive('\n{dim}Created:{/}\n');
      player.receive(`  ${new Date(personality.createdAt).toLocaleString()}\n`);

      player.receive('{cyan}' + '='.repeat(50) + '{/}\n\n');
      return;
    }

    case 'regenerate': {
      const botId = args[0];
      if (!botId) {
        player.receive('{red}Error:{/} Usage: botadmin regenerate <botId or name>\n');
        return;
      }

      // Find bot by ID or name
      const bots = botDaemon.listBots();
      const bot = bots.find(b => b.id === botId || b.name.toLowerCase() === botId.toLowerCase());

      if (!bot) {
        player.receive(`{red}Error:{/} Bot not found: ${botId}\n`);
        return;
      }

      player.receive(`{yellow}Regenerating personality for ${bot.name}...{/}\n`);
      player.receive('{dim}(This will log out the bot if online and create a new identity){/}\n');

      const result = await botDaemon.regeneratePersonality(bot.id);
      if (result.success && result.bot) {
        player.receive('{green}Personality regenerated!{/}\n\n');
        player.receive(`  Old Name:    ${bot.name}\n`);
        player.receive(`  New Name:    {bold}${result.bot.name}{/}\n`);
        player.receive(`  New ID:      ${result.bot.id}\n`);
      } else {
        player.receive(`{red}Error:{/} ${result.error}\n`);
      }
      return;
    }

    default:
      player.receive(`{red}Unknown subcommand:{/} ${subcommand}\n`);
      player.receive('Use "botadmin" to see available commands.\n');
      return;
  }
}
