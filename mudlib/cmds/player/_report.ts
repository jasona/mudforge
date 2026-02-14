import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & { name?: string };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface ReportEntry {
  reporter: string;
  message: string;
  createdAt: number;
}

interface ReportData {
  reports: ReportEntry[];
}

const REPORTS_FILE = '/data/moderation/reports.json';
const MAX_REPORTS = 500;

async function loadReports(): Promise<ReportData> {
  if (!efuns.fileExists || !efuns.readFile) return { reports: [] };
  try {
    const exists = await efuns.fileExists(REPORTS_FILE);
    if (!exists) return { reports: [] };
    const raw = await efuns.readFile(REPORTS_FILE);
    const parsed = JSON.parse(raw) as ReportData;
    return { reports: parsed.reports ?? [] };
  } catch {
    return { reports: [] };
  }
}

async function saveReports(data: ReportData): Promise<void> {
  if (!efuns.writeFile) return;
  await efuns.writeFile(REPORTS_FILE, JSON.stringify(data, null, 2));
}

export const name = 'report';
export const description = 'Report abuse or harassment to staff';
export const usage = 'report <message>';

export async function execute(ctx: CommandContext): Promise<void> {
  const message = ctx.args.trim();
  if (!message) {
    ctx.sendLine(`{yellow}Usage: ${usage}{/}`);
    return;
  }
  if (message.length < 10) {
    ctx.sendLine('{yellow}Please provide a little more detail (at least 10 characters).{/}');
    return;
  }

  const reporter = ctx.player.name ?? 'unknown';
  const data = await loadReports();
  const updated = {
    reports: [...data.reports, { reporter, message, createdAt: Date.now() }].slice(-MAX_REPORTS),
  };
  await saveReports(updated);

  // Notify online staff.
  const players = (efuns.allPlayers?.() ?? []) as Array<MudObject & { permissionLevel?: number; receive?: (msg: string) => void; name?: string }>;
  for (const player of players) {
    if ((player.permissionLevel ?? 0) >= 2 && player.receive) {
      player.receive(`{yellow}[REPORT] ${reporter}: ${message}{/}\n`);
    }
  }

  ctx.sendLine('{green}Report submitted. Staff has been notified.{/}');
}

export default { name, description, usage, execute };
