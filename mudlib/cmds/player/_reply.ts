/**
 * reply - Reply to the last tell you received.
 *
 * Usage:
 *   reply <message>   - Reply to the last person(s) who told you
 *
 * For group tells, reply will send to all participants in the conversation.
 *
 * Examples:
 *   reply Thanks for letting me know!
 *   reply Sure, I'll be right there.
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & {
    name: string;
    getProperty(key: string): unknown;
    setProperty(key: string, value: unknown): void;
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

export const name = ['reply', 'r'];
export const description = 'Reply to the last tell you received';
export const usage = 'reply <message>';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function execute(ctx: CommandContext): Promise<void> {
  const message = ctx.args.trim();

  if (!message) {
    ctx.sendLine('{yellow}Usage: reply <message>{/}');
    ctx.sendLine('{dim}Replies to the last person (or group) who told you.{/}');
    return;
  }

  // Get the last tell info
  const lastTellFrom = ctx.player.getProperty('_lastTellFrom') as string[] | undefined;

  if (!lastTellFrom || lastTellFrom.length === 0) {
    ctx.sendLine("{yellow}You haven't received any tells to reply to.{/}");
    return;
  }

  if (typeof efuns === 'undefined' || !efuns.allPlayers) {
    ctx.sendLine('{red}Error: Player lookup not available.{/}');
    return;
  }

  // Find all target players
  const allPlayers = efuns.allPlayers() as Player[];
  const foundTargets: Player[] = [];
  const offline: string[] = [];

  for (const targetName of lastTellFrom) {
    const target = allPlayers.find((p) => p.name.toLowerCase() === targetName);

    if (target) {
      foundTargets.push(target);
    } else {
      offline.push(targetName);
    }
  }

  // Report offline players
  for (const name of offline) {
    ctx.sendLine(`{yellow}${capitalize(name)} is no longer online.{/}`);
  }

  if (foundTargets.length === 0) {
    ctx.sendLine('{yellow}None of the conversation participants are online.{/}');
    // Clear the stale reply info
    ctx.player.setProperty('_lastTellFrom', null);
    return;
  }

  const senderName = capitalize(ctx.player.name);
  const isGroup = foundTargets.length > 1;

  // Build the list of all participants for reply tracking
  const allParticipants = [ctx.player.name.toLowerCase(), ...foundTargets.map((t) => t.name.toLowerCase())];

  // Send to each target
  for (const target of foundTargets) {
    // Build "others" list for group tells
    const others = foundTargets
      .filter((t) => t !== target)
      .map((t) => capitalize(t.name));

    let header: string;
    if (isGroup) {
      const othersList = others.join(', ');
      header = `{magenta}${senderName} replies to you (and ${othersList}):{/}`;
    } else {
      header = `{magenta}${senderName} replies:{/}`;
    }

    target.receive(`${header} ${message}\n`);

    // Update reply info on target
    const replyTo = allParticipants.filter((p) => p !== target.name.toLowerCase());
    target.setProperty('_lastTellFrom', replyTo);
  }

  // Confirm to sender
  const targetList = foundTargets.map((t) => capitalize(t.name)).join(', ');
  if (isGroup) {
    ctx.sendLine(`{magenta}You reply to ${targetList}:{/} ${message}`);
  } else {
    ctx.sendLine(`{magenta}You reply to ${targetList}:{/} ${message}`);
  }

  // Update sender's reply list (in case someone went offline)
  ctx.player.setProperty('_lastTellFrom', foundTargets.map((t) => t.name.toLowerCase()));
}

export default { name, description, usage, execute };
