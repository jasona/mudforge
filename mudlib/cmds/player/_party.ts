/**
 * Party command - Manage party/group membership.
 *
 * Usage:
 *   party                  - Show party status
 *   party invite <player>  - Invite player to party
 *   party accept           - Accept pending invite
 *   party decline          - Decline pending invite
 *   party leave            - Leave current party
 *   party kick <player>    - Kick member (leader only)
 *   party leader <player>  - Transfer leadership
 *   party follow           - Toggle following the leader
 *   party stats            - Show full party statistics
 *   party say <message>    - Send message to party chat
 *   party disband          - Disband party (leader only)
 */

import type { MudObject } from '../../lib/std.js';
import { getPartyDaemon } from '../../daemons/party.js';
import type { Living } from '../../std/living.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PartyPlayer extends Living {
  name: string;
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  gainExperience?(xp: number): void;
}

export const name = 'party';
export const description = 'Manage party/group membership';
export const usage = `party - Show party status
party invite <player> - Invite player to party
party accept - Accept pending invite
party decline - Decline pending invite
party leave - Leave current party
party kick <player> - Kick member (leader only)
party leader <player> - Transfer leadership (leader only)
party follow - Toggle following the leader
party assist - Toggle auto-assist (attack when leader attacks)
party split - Toggle auto-split for the party (leader only)
party status - Show full party statistics
party say <message> - Send message to party chat
party disband - Disband party (leader only)`;

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;
  const partyDaemon = getPartyDaemon();
  const partyPlayer = player as PartyPlayer;

  // Parse subcommand and arguments
  const parts = args.trim().split(/\s+/);
  const subcommand = parts[0]?.toLowerCase() || '';
  const subArgs = parts.slice(1).join(' ');

  switch (subcommand) {
    case '':
      // No subcommand - show status
      handleStatus(ctx, partyPlayer, partyDaemon);
      break;

    case 'invite':
      handleInvite(ctx, partyPlayer, partyDaemon, subArgs);
      break;

    case 'accept':
      handleAccept(ctx, partyPlayer, partyDaemon);
      break;

    case 'decline':
      handleDecline(ctx, partyPlayer, partyDaemon);
      break;

    case 'leave':
      handleLeave(ctx, partyPlayer, partyDaemon);
      break;

    case 'kick':
      handleKick(ctx, partyPlayer, partyDaemon, subArgs);
      break;

    case 'leader':
      handleLeader(ctx, partyPlayer, partyDaemon, subArgs);
      break;

    case 'follow':
      handleFollow(ctx, partyPlayer, partyDaemon);
      break;

    case 'assist':
      handleAssist(ctx, partyPlayer, partyDaemon);
      break;

    case 'split':
      handleSplit(ctx, partyPlayer, partyDaemon);
      break;

    case 'status':
      handleStats(ctx, partyPlayer, partyDaemon);
      break;

    case 'say':
      handleSay(ctx, partyPlayer, partyDaemon, subArgs);
      break;

    case 'disband':
      handleDisband(ctx, partyPlayer, partyDaemon);
      break;

    case 'help':
      ctx.sendLine(usage);
      break;

    default:
      // Check if they're trying to use a shorthand like "party <player>" for invite
      if (subcommand && !['invite', 'accept', 'decline', 'leave', 'kick', 'leader', 'follow', 'assist', 'split', 'status', 'say', 'disband', 'help'].includes(subcommand)) {
        ctx.sendLine(`Unknown party command: ${subcommand}`);
        ctx.sendLine('Type "party help" for a list of commands.');
      }
      break;
  }
}

function handleStatus(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const status = daemon.getPartyStatus(player);
  ctx.sendLine(status);

  // Show pending invite if any
  const playerData = daemon.getPlayerPartyData(player);
  if (playerData.pendingInvite) {
    ctx.sendLine('');
    ctx.sendLine(`{cyan}You have a pending party invite from ${playerData.pendingInvite.inviterName}.{/}`);
    ctx.sendLine('{dim}Type "party accept" to join or "party decline" to refuse.{/}');
  }
}

function handleInvite(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>,
  targetName: string
): void {
  if (!targetName) {
    ctx.sendLine('Invite who? Usage: party invite <player>');
    return;
  }

  const result = daemon.invitePlayer(player, targetName);
  if (result.success) {
    ctx.sendLine(`{green}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleAccept(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const result = daemon.acceptInvite(player);
  if (result.success) {
    ctx.sendLine(`{green}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleDecline(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const result = daemon.declineInvite(player);
  if (result.success) {
    ctx.sendLine(`{yellow}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleLeave(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const result = daemon.leaveParty(player);
  if (result.success) {
    ctx.sendLine(`{yellow}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleKick(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>,
  targetName: string
): void {
  if (!targetName) {
    ctx.sendLine('Kick who? Usage: party kick <player>');
    return;
  }

  const result = daemon.kickMember(player, targetName);
  if (result.success) {
    ctx.sendLine(`{yellow}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleLeader(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>,
  targetName: string
): void {
  if (!targetName) {
    ctx.sendLine('Promote who? Usage: party leader <player>');
    return;
  }

  const result = daemon.setLeader(player, targetName);
  if (result.success) {
    ctx.sendLine(`{cyan}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleFollow(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const result = daemon.toggleFollow(player);
  if (result.success) {
    ctx.sendLine(`{cyan}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleAssist(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const result = daemon.toggleAutoAssist(player);
  if (result.success) {
    ctx.sendLine(`{cyan}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleSplit(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const result = daemon.toggleAutoSplit(player);
  if (result.success) {
    ctx.sendLine(`{yellow}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

function handleStats(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const stats = daemon.getPartyStats(player);
  ctx.sendLine(stats);
}

function handleSay(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>,
  message: string
): void {
  if (!message) {
    ctx.sendLine('Say what? Usage: party say <message>');
    return;
  }

  const result = daemon.partySay(player, message);
  if (!result.success) {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
  // Note: Success message is sent by partySay to all party members
}

function handleDisband(
  ctx: CommandContext,
  player: PartyPlayer,
  daemon: ReturnType<typeof getPartyDaemon>
): void {
  const result = daemon.disbandParty(player);
  if (result.success) {
    ctx.sendLine(`{yellow}${result.message}{/}`);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}

export default { name, description, usage, execute };
