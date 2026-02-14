import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'kick';
export const description = 'Disconnect an online player';
export const usage = 'kick <player> [reason]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  if (!args) {
    ctx.sendLine(`{yellow}Usage: ${usage}{/}`);
    return;
  }

  const [targetName, ...reasonParts] = args.split(/\s+/);
  const reason = reasonParts.join(' ').trim() || 'Disconnected by staff.';
  if (!targetName) {
    ctx.sendLine(`{yellow}Usage: ${usage}{/}`);
    return;
  }

  const players = (efuns.allPlayers?.() ?? []) as Array<MudObject & { name?: string; permissionLevel?: number; receive?: (msg: string) => void }>;
  const target = players.find((p) => p.name?.toLowerCase() === targetName.toLowerCase());
  if (!target) {
    ctx.sendLine(`{red}Player "${targetName}" is not online.{/}`);
    return;
  }

  if (target.receive) {
    target.receive(`{red}You were kicked: ${reason}{/}\n`);
  }

  if (efuns.executeCommand) {
    await efuns.executeCommand(target, 'quit', target.permissionLevel ?? 0);
  }

  ctx.sendLine(`{green}Kicked ${target.name ?? targetName}.{/}`);
}

export default { name, description, usage, execute };
