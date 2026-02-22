import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & { name?: string; permissionLevel?: number };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface BanEntry {
  name: string;
  reason?: string;
  bannedBy: string;
  bannedAt: number;
  expiresAt?: number;
}

interface BanData {
  bans: BanEntry[];
}

export const name = ['ban', 'unban'];
export const description = 'Ban or unban players';
export const usage = 'ban <name> [durationMinutes] [reason] | ban list | unban <name>';

async function loadBans(): Promise<BanData> {
  if (!efuns.loadData) return { bans: [] };
  try {
    const parsed = await efuns.loadData<BanData>('moderation', 'bans');
    if (!parsed) return { bans: [] };
    return { bans: parsed.bans ?? [] };
  } catch {
    return { bans: [] };
  }
}

async function saveBans(data: BanData): Promise<void> {
  if (!efuns.saveData) return;
  await efuns.saveData('moderation', 'bans', data);
}

function pruneExpired(data: BanData): BanData {
  const now = Date.now();
  return {
    bans: data.bans.filter((entry) => !entry.expiresAt || entry.expiresAt > now),
  };
}

function findOnlinePlayer(name: string): MudObject | undefined {
  if (!efuns.allPlayers) return undefined;
  const players = efuns.allPlayers() as Array<MudObject & { name?: string }>;
  return players.find((p) => p.name?.toLowerCase() === name.toLowerCase());
}

export async function execute(ctx: CommandContext): Promise<void> {
  const alias = (ctx as unknown as { verb?: string }).verb?.toLowerCase() ?? 'ban';
  const args = ctx.args.trim();
  if (!args) {
    ctx.sendLine(`{yellow}Usage: ${usage}{/}`);
    return;
  }

  const parts = args.split(/\s+/);
  const actor = ctx.player.name ?? 'admin';
  const data = pruneExpired(await loadBans());

  if (parts[0]?.toLowerCase() === 'list') {
    if (data.bans.length === 0) {
      ctx.sendLine('{yellow}No active bans.{/}');
      return;
    }
    ctx.sendLine('{cyan}Active bans:{/}');
    for (const entry of data.bans) {
      const expires = entry.expiresAt ? new Date(entry.expiresAt).toISOString() : 'never';
      ctx.sendLine(`  ${entry.name} - by ${entry.bannedBy} - expires ${expires}${entry.reason ? ` - ${entry.reason}` : ''}`);
    }
    return;
  }

  const isUnban = alias === 'unban' || parts[0]?.toLowerCase() === 'remove';
  const targetName = (isUnban ? parts[1] : parts[0])?.toLowerCase();
  if (!targetName || !/^[a-z]+$/.test(targetName)) {
    ctx.sendLine('{red}Invalid player name.{/}');
    return;
  }

  if (isUnban) {
    const filtered = data.bans.filter((entry) => entry.name.toLowerCase() !== targetName);
    if (filtered.length === data.bans.length) {
      ctx.sendLine('{yellow}No matching ban found.{/}');
      return;
    }
    await saveBans({ bans: filtered });
    ctx.sendLine(`{green}Removed ban for ${efuns.capitalize(targetName)}.{/}`);
    return;
  }

  const durationMinutes = Number.parseInt(parts[1] ?? '', 10);
  const hasDuration = !Number.isNaN(durationMinutes) && durationMinutes > 0;
  const reasonStart = hasDuration ? 2 : 1;
  const reason = parts.slice(reasonStart).join(' ').trim();
  const expiresAt = hasDuration ? Date.now() + durationMinutes * 60_000 : undefined;

  const updated = data.bans.filter((entry) => entry.name.toLowerCase() !== targetName);
  updated.push({
    name: targetName,
    bannedBy: actor,
    bannedAt: Date.now(),
    expiresAt,
    reason: reason || undefined,
  });
  await saveBans({ bans: updated });

  ctx.sendLine(`{green}Banned ${efuns.capitalize(targetName)}.{/}`);
  if (hasDuration) {
    ctx.sendLine(`{dim}Duration: ${durationMinutes} minute(s).{/}`);
  }
  if (reason) {
    ctx.sendLine(`{dim}Reason: ${reason}{/}`);
  }

  const online = findOnlinePlayer(targetName) as (MudObject & { permissionLevel?: number }) | undefined;
  if (online && efuns.executeCommand) {
    await efuns.executeCommand(online, 'quit', online.permissionLevel ?? 0);
  }
}

export default { name, description, usage, execute };
