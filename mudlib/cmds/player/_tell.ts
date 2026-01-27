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
import { getPlayerColor, formatWithColor } from './_colors.js';
import { canSee } from '../../std/visibility/index.js';
import type { Living } from '../../std/living.js';

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

  // Check if player is muted
  const playerLiving = ctx.player as unknown as Living;
  if (playerLiving.isMute && playerLiving.isMute()) {
    ctx.sendLine("{red}You try to speak but no sound comes out - you are muted!{/}");
    return;
  }

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
      // Check if sender can see the target (invisible targets appear as "not found")
      const senderLiving = ctx.player as Living;
      const targetLiving = target as Living;
      const visResult = canSee(senderLiving, targetLiving);

      if (visResult.canSee) {
        foundTargets.push(target);
      } else {
        // Invisible target - treat as not found
        notFound.push(targetName);
      }
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
  const timestamp = Date.now();
  const recipientNames = foundTargets.map((t) => capitalize(t.name));

  // Build the list of all participants (sender + all targets) for reply tracking
  const allParticipants = [ctx.player.name.toLowerCase(), ...foundTargets.map((t) => t.name.toLowerCase())];

  // Send to each target
  const deafTargets: string[] = [];
  for (const target of foundTargets) {
    // Check if target is deaf
    const targetLiving = target as Living;
    if (targetLiving.isDeaf && targetLiving.isDeaf()) {
      deafTargets.push(capitalize(target.name));
      continue;
    }

    // Build "others" list for group tells (everyone except sender and this target)
    const others = foundTargets
      .filter((t) => t !== target)
      .map((t) => capitalize(t.name));

    // Use recipient's color preference
    const targetColor = getPlayerColor(target, 'tell');
    let header: string;
    if (isGroup) {
      const othersList = others.join(', ');
      header = formatWithColor(targetColor, `${senderName} tells you (and ${othersList}):`);
    } else {
      header = formatWithColor(targetColor, `${senderName} tells you:`);
    }

    target.receive(`${header} ${message}\n`);

    // Send to comm panel for the target
    efuns.sendComm(target, {
      type: 'comm',
      commType: 'tell',
      sender: senderName,
      message,
      recipients: recipientNames,
      timestamp,
      isSender: false,
    });

    // Store reply info on target (who to reply to)
    // For group tells, store all participants except self
    const replyTo = allParticipants.filter((p) => p !== target.name.toLowerCase());
    target.setProperty('_lastTellFrom', replyTo);
  }

  // Confirm to sender (use sender's color preference)
  const senderColor = getPlayerColor(ctx.player, 'tell');
  const targetList = foundTargets.map((t) => capitalize(t.name)).join(', ');
  ctx.sendLine(`${formatWithColor(senderColor, `You tell ${targetList}:`)} ${message}`);

  // Send to comm panel for the sender
  efuns.sendComm(ctx.player, {
    type: 'comm',
    commType: 'tell',
    sender: senderName,
    message,
    recipients: recipientNames,
    timestamp,
    isSender: true,
  });

  // Store reply info on sender too (for continuing the conversation)
  const senderReplyTo = foundTargets.map((t) => t.name.toLowerCase());
  (ctx.player as Player).setProperty('_lastTellFrom', senderReplyTo);

  // Notify sender about deaf targets
  for (const name of deafTargets) {
    ctx.sendLine(`{yellow}${name} can't hear you right now.{/}`);
  }
}

export default { name, description, usage, execute };
