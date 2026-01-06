/**
 * tell - Send a private message to one or more players.
 *
 * Usage:
 *   tell <player> <message>              - Send to one player
 *   tell <player1>,<player2> <message>   - Send to multiple players
 *
 * Examples:
 *   tell bob Hey, how's it going?
 *   tell bob,alice,charlie Let's meet at the tavern!
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface Player extends MudObject {
  name: string;
  receive(message: string): void;
  setProperty(key: string, value: unknown): void;
  getProperty(key: string): unknown;
}

export const name = ['tell', 't'];
export const description = 'Send a private message to one or more players';
export const usage = 'tell <player>[,player2,...] <message>';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  if (!args) {
    ctx.sendLine('{yellow}Usage: tell <player> <message>{/}');
    ctx.sendLine('{dim}Example: tell bob Hey there!{/}');
    ctx.sendLine('{dim}Group:   tell bob,alice,charlie Hello everyone!{/}');
    return;
  }

  // Parse: first word is target(s), rest is message
  const spaceIndex = args.indexOf(' ');
  if (spaceIndex === -1) {
    ctx.sendLine('{yellow}What do you want to tell them?{/}');
    return;
  }

  const targetStr = args.substring(0, spaceIndex);
  const message = args.substring(spaceIndex + 1).trim();

  if (!message) {
    ctx.sendLine('{yellow}What do you want to tell them?{/}');
    return;
  }

  // Parse comma-separated targets
  const targetNames = targetStr.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t);

  if (targetNames.length === 0) {
    ctx.sendLine('{yellow}Who do you want to tell?{/}');
    return;
  }

  // Remove duplicates
  const uniqueTargets = [...new Set(targetNames)];

  // Can't tell yourself
  const selfIndex = uniqueTargets.indexOf(ctx.player.name.toLowerCase());
  if (selfIndex !== -1) {
    uniqueTargets.splice(selfIndex, 1);
    if (uniqueTargets.length === 0) {
      ctx.sendLine("{yellow}Talking to yourself? That's concerning.{/}");
      return;
    }
  }

  if (typeof efuns === 'undefined' || !efuns.allPlayers) {
    ctx.sendLine('{red}Error: Player lookup not available.{/}');
    return;
  }

  // Find all target players
  const allPlayers = efuns.allPlayers() as Player[];
  const foundTargets: Player[] = [];
  const notFound: string[] = [];

  for (const targetName of uniqueTargets) {
    const target = allPlayers.find(
      (p) => p.name.toLowerCase() === targetName || p.name.toLowerCase().startsWith(targetName)
    );

    if (target) {
      foundTargets.push(target);
    } else {
      notFound.push(targetName);
    }
  }

  // Report not found targets
  for (const name of notFound) {
    ctx.sendLine(`{yellow}${name} is not online.{/}`);
  }

  if (foundTargets.length === 0) {
    return;
  }

  const senderName = capitalize(ctx.player.name);
  const isGroup = foundTargets.length > 1;

  // Build the list of all participants (sender + all targets) for reply tracking
  const allParticipants = [ctx.player.name.toLowerCase(), ...foundTargets.map((t) => t.name.toLowerCase())];

  // Send to each target
  for (const target of foundTargets) {
    // Build "others" list for group tells (everyone except sender and this target)
    const others = foundTargets
      .filter((t) => t !== target)
      .map((t) => capitalize(t.name));

    let header: string;
    if (isGroup) {
      const othersList = others.join(', ');
      header = `{magenta}${senderName} tells you (and ${othersList}):{/}`;
    } else {
      header = `{magenta}${senderName} tells you:{/}`;
    }

    target.receive(`${header} ${message}\n`);

    // Store reply info on target (who to reply to)
    // For group tells, store all participants except self
    const replyTo = allParticipants.filter((p) => p !== target.name.toLowerCase());
    target.setProperty('_lastTellFrom', replyTo);
  }

  // Confirm to sender
  const targetList = foundTargets.map((t) => capitalize(t.name)).join(', ');
  ctx.sendLine(`{magenta}You tell ${targetList}:{/} ${message}`);

  // Store reply info on sender too (for continuing the conversation)
  const senderReplyTo = foundTargets.map((t) => t.name.toLowerCase());
  (ctx.player as Player).setProperty('_lastTellFrom', senderReplyTo);
}

export default { name, description, usage, execute };
