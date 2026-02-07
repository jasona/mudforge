/**
 * Lore command - Manage world lore entries.
 *
 * Usage:
 *   lore list [category]           - List all lore entries
 *   lore show <id>                 - Show a specific entry
 *   lore add <category> <title>    - Add new lore entry (opens IDE)
 *   lore edit <id>                 - Edit existing lore entry (opens IDE)
 *   lore remove <id>               - Remove a lore entry
 *   lore generate <category> <title> [theme]  - AI-generate lore entry
 *   lore search <query>            - Search lore by title/content
 *   lore tags                      - List all tags in use
 */

import type { MudObject } from '../../lib/std.js';
import {
  getLoreDaemon,
  type LoreCategory,
  type LoreEntry,
} from '../../daemons/lore.js';
import { parseArgs } from '../../lib/text-utils.js';

interface PlayerWithIde extends MudObject {
  cwd: string;
  name: string;
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void;
  receive(message: string): void;
  connection?: { send: (msg: string) => void };
  _connection?: { send: (msg: string) => void };
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['lore'];
export const description = 'Manage world lore entries';
export const usage = 'lore <list|show|add|edit|remove|generate|search|tags> [args]';

/**
 * Convert a title to a URL-safe slug.
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Create a lore entry template for IDE editing.
 */
function createLoreTemplate(entry: Partial<LoreEntry> & { id: string; category: LoreCategory; title: string }): string {
  return JSON.stringify({
    id: entry.id,
    category: entry.category,
    title: entry.title,
    content: entry.content || 'Enter your lore content here...',
    tags: entry.tags || [],
    relatedLore: entry.relatedLore || [],
    priority: entry.priority ?? 5,
  }, null, 2);
}

/**
 * Parse a lore entry from IDE content.
 */
function parseLoreFromIde(content: string): LoreEntry | null {
  try {
    const parsed = JSON.parse(content);

    // Validate required fields
    if (!parsed.id || !parsed.category || !parsed.title || !parsed.content) {
      return null;
    }

    return {
      id: parsed.id,
      category: parsed.category,
      title: parsed.title,
      content: parsed.content,
      tags: Array.isArray(parsed.tags) ? parsed.tags : undefined,
      relatedLore: Array.isArray(parsed.relatedLore) ? parsed.relatedLore : undefined,
      priority: typeof parsed.priority === 'number' ? parsed.priority : 5,
    };
  } catch {
    return null;
  }
}

/**
 * Handle IDE input for lore editing.
 */
async function handleLoreIdeInput(
  player: PlayerWithIde,
  originalId: string | null,
  input: string
): Promise<void> {
  // Check if this is an IDE message
  if (!input.startsWith('\x00[IDE]')) {
    const cmd = input.trim().toLowerCase();
    if (cmd === 'close' || cmd === 'cancel' || cmd === 'q' || cmd === 'quit') {
      player.setInputHandler(null);
      player.receive('{cyan}Lore editor closed.{/}\n');
      return;
    }
    player.receive('{dim}(Lore editor is open in browser. Type "close" to exit.){/}\n');
    return;
  }

  // Parse IDE message
  const jsonStr = input.slice(6);
  let message: { action: string; path?: string; content?: string };

  try {
    message = JSON.parse(jsonStr);
  } catch {
    player.receive('{red}Invalid IDE message{/}\n');
    return;
  }

  if (message.action === 'save') {
    await handleLoreSave(player, originalId, message.content || '');
  } else if (message.action === 'close') {
    player.setInputHandler(null);
    player.receive('{cyan}Lore editor closed.{/}\n');
  }
}

/**
 * Handle save action for lore editing.
 */
async function handleLoreSave(
  player: PlayerWithIde,
  originalId: string | null,
  content: string
): Promise<void> {
  const loreDaemon = getLoreDaemon();
  const entry = parseLoreFromIde(content);

  if (!entry) {
    const connection = player.connection || player._connection;
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        path: 'lore-entry',
        success: false,
        errors: [{ line: 1, column: 1, message: 'Invalid lore entry format. Check JSON syntax and required fields.' }],
        message: 'Invalid lore entry format',
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }
    player.receive('{red}Invalid lore entry format. Required: id, category, title, content{/}\n');
    return;
  }

  // Validate category
  if (!loreDaemon.isValidCategory(entry.category)) {
    const connection = player.connection || player._connection;
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        path: 'lore-entry',
        success: false,
        errors: [{ line: 3, column: 1, message: `Invalid category: ${entry.category}` }],
        message: 'Invalid category',
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }
    player.receive(`{red}Invalid category: ${entry.category}{/}\n`);
    player.receive(`{dim}Valid: ${loreDaemon.getCategories().join(', ')}{/}\n`);
    return;
  }

  // If editing and ID changed, remove old entry
  if (originalId && originalId !== entry.id) {
    loreDaemon.removeLore(originalId);
  }

  // Register the entry
  if (loreDaemon.registerLore(entry)) {
    await loreDaemon.save();

    const connection = player.connection || player._connection;
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        path: 'lore-entry',
        success: true,
        message: 'Lore entry saved successfully',
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }
    player.receive(`{green}Lore saved: ${entry.id}{/}\n`);
  } else {
    const connection = player.connection || player._connection;
    if (connection?.send) {
      const resultMsg = JSON.stringify({
        action: 'save-result',
        path: 'lore-entry',
        success: false,
        message: 'Failed to save lore entry',
      });
      connection.send(`\x00[IDE]${resultMsg}\n`);
    }
    player.receive('{red}Failed to save lore entry{/}\n');
  }
}

/**
 * Show usage information.
 */
function showUsage(ctx: CommandContext): void {
  const loreDaemon = getLoreDaemon();
  const categories = loreDaemon.getCategories().join(', ');

  ctx.sendLine('Usage: lore <subcommand> [args]');
  ctx.sendLine('');
  ctx.sendLine('Subcommands:');
  ctx.sendLine('  list [category]                  - List all lore entries');
  ctx.sendLine('  show <id>                        - Show a specific entry');
  ctx.sendLine('  add <category> <title>           - Add new lore entry (IDE)');
  ctx.sendLine('  edit <id>                        - Edit existing entry (IDE)');
  ctx.sendLine('  remove <id>                      - Remove a lore entry');
  ctx.sendLine('  generate <category> <title> [theme] - AI-generate lore');
  ctx.sendLine('  search <query>                   - Search lore content');
  ctx.sendLine('  tags                             - List all tags in use');
  ctx.sendLine('');
  ctx.sendLine(`Categories: ${categories}`);
  ctx.sendLine('');
  ctx.sendLine('Examples:');
  ctx.sendLine('  lore list');
  ctx.sendLine('  lore list faction');
  ctx.sendLine('  lore show "world:creation-myth"');
  ctx.sendLine('  lore add faith "Moon Goddess"');
  ctx.sendLine('  lore edit "world:creation-myth"');
  ctx.sendLine('  lore generate creature "Fire Elemental" "destructive, summoned"');
}

/**
 * List lore entries.
 */
function cmdList(ctx: CommandContext, args: string[]): void {
  const loreDaemon = getLoreDaemon();
  const category = args[0] as LoreCategory | undefined;

  let entries: LoreEntry[];
  if (category) {
    if (!loreDaemon.isValidCategory(category)) {
      ctx.sendLine(`{red}Invalid category: ${category}{/}`);
      ctx.sendLine(`Valid categories: ${loreDaemon.getCategories().join(', ')}`);
      return;
    }
    entries = loreDaemon.getLoreByCategory(category);
    ctx.sendLine(`{cyan}=== Lore Entries (${category}) ==={/}`);
  } else {
    entries = loreDaemon.getAllLore();
    ctx.sendLine('{cyan}=== All Lore Entries ==={/}');
  }

  if (entries.length === 0) {
    ctx.sendLine('{dim}No lore entries found.{/}');
    return;
  }

  ctx.sendLine('');
  for (const entry of entries) {
    const tags = entry.tags?.length ? ` {dim}[${entry.tags.join(', ')}]{/}` : '';
    const priority = entry.priority ? ` {dim}(p:${entry.priority}){/}` : '';
    ctx.sendLine(`  {yellow}${entry.id}{/} - ${entry.title}${tags}${priority}`);
  }
  ctx.sendLine('');
  ctx.sendLine(`{dim}Total: ${entries.length} entries{/}`);
}

/**
 * Show a specific lore entry.
 */
function cmdShow(ctx: CommandContext, args: string[]): void {
  if (!args[0]) {
    ctx.sendLine('{red}Usage: lore show <id>{/}');
    return;
  }

  const loreDaemon = getLoreDaemon();
  const entry = loreDaemon.getLore(args[0]);

  if (!entry) {
    ctx.sendLine(`{red}Lore not found: ${args[0]}{/}`);
    return;
  }

  ctx.sendLine('{cyan}=== Lore Entry ==={/}');
  ctx.sendLine('');
  ctx.sendLine(`{bold}ID:{/} ${entry.id}`);
  ctx.sendLine(`{bold}Title:{/} ${entry.title}`);
  ctx.sendLine(`{bold}Category:{/} ${entry.category}`);
  ctx.sendLine(`{bold}Priority:{/} ${entry.priority ?? 0}`);
  if (entry.tags?.length) {
    ctx.sendLine(`{bold}Tags:{/} ${entry.tags.join(', ')}`);
  }
  if (entry.relatedLore?.length) {
    ctx.sendLine(`{bold}Related:{/} ${entry.relatedLore.join(', ')}`);
  }
  ctx.sendLine('');
  ctx.sendLine('{bold}Content:{/}');
  const lines = entry.content.split('\n');
  for (const line of lines) {
    ctx.sendLine(`  ${line}`);
  }
}

/**
 * Add a new lore entry using IDE.
 */
async function cmdAdd(ctx: CommandContext, args: string[]): Promise<void> {
  if (args.length < 2) {
    ctx.sendLine('{red}Usage: lore add <category> <title>{/}');
    ctx.sendLine('{dim}Opens IDE to enter the lore content.{/}');
    return;
  }

  const loreDaemon = getLoreDaemon();
  const category = args[0] as LoreCategory;
  const title = args.slice(1).join(' ');

  if (!loreDaemon.isValidCategory(category)) {
    ctx.sendLine(`{red}Invalid category: ${category}{/}`);
    ctx.sendLine(`Valid categories: ${loreDaemon.getCategories().join(', ')}`);
    return;
  }

  const slug = titleToSlug(title);
  const id = `${category}:${slug}`;

  // Check if already exists
  if (loreDaemon.getLore(id)) {
    ctx.sendLine(`{red}Lore already exists: ${id}{/}`);
    ctx.sendLine('{dim}Use "lore edit" to modify it, or "lore remove" first.{/}');
    return;
  }

  const player = ctx.player as PlayerWithIde;

  // Create template for new entry
  const template = createLoreTemplate({ id, category, title });

  ctx.sendLine(`{cyan}Opening IDE to create lore: ${id}{/}`);
  ctx.sendLine('{dim}Edit the JSON and save. Press Escape or type "close" to cancel.{/}');

  // Open IDE with template
  efuns.ideOpen({
    action: 'open',
    path: `lore:${id}`,
    content: template,
    readOnly: false,
    language: 'json',
  });

  // Set up input handler
  player.setInputHandler(async (input: string) => {
    await handleLoreIdeInput(player, null, input);
  });
}

/**
 * Edit an existing lore entry using IDE.
 */
async function cmdEdit(ctx: CommandContext, args: string[]): Promise<void> {
  if (!args[0]) {
    ctx.sendLine('{red}Usage: lore edit <id>{/}');
    return;
  }

  const loreDaemon = getLoreDaemon();
  const id = args[0];
  const entry = loreDaemon.getLore(id);

  if (!entry) {
    ctx.sendLine(`{red}Lore not found: ${id}{/}`);
    ctx.sendLine('{dim}Use "lore list" to see available entries.{/}');
    return;
  }

  const player = ctx.player as PlayerWithIde;

  // Create JSON content from existing entry
  const content = createLoreTemplate(entry);

  ctx.sendLine(`{cyan}Opening IDE to edit lore: ${id}{/}`);
  ctx.sendLine('{dim}Edit the JSON and save. Press Escape or type "close" to cancel.{/}');

  // Open IDE with existing content
  efuns.ideOpen({
    action: 'open',
    path: `lore:${id}`,
    content: content,
    readOnly: false,
    language: 'json',
  });

  // Set up input handler
  player.setInputHandler(async (input: string) => {
    await handleLoreIdeInput(player, id, input);
  });
}

/**
 * Remove a lore entry.
 */
async function cmdRemove(ctx: CommandContext, args: string[]): Promise<void> {
  if (!args[0]) {
    ctx.sendLine('{red}Usage: lore remove <id>{/}');
    return;
  }

  const loreDaemon = getLoreDaemon();
  const id = args[0];

  if (!loreDaemon.getLore(id)) {
    ctx.sendLine(`{red}Lore not found: ${id}{/}`);
    return;
  }

  if (loreDaemon.removeLore(id)) {
    await loreDaemon.save();
    ctx.sendLine(`{green}Removed lore: ${id}{/}`);
  } else {
    ctx.sendLine(`{red}Failed to remove lore: ${id}{/}`);
  }
}

/**
 * Generate a lore entry using AI.
 */
async function cmdGenerate(ctx: CommandContext, args: string[]): Promise<void> {
  if (args.length < 2) {
    ctx.sendLine('{red}Usage: lore generate <category> <title> [theme/keywords]{/}');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  lore generate faith "Moon Goddess" "silver, night, prophecy"');
    ctx.sendLine('  lore generate creature "Fire Elemental" "destructive, summoned"');
    ctx.sendLine('  lore generate event "The Great Flood" "ancient, devastating"');
    return;
  }

  // Check if AI is available
  if (typeof efuns === 'undefined' || !efuns.aiAvailable?.()) {
    ctx.sendLine('{red}AI is not configured or unavailable.{/}');
    ctx.sendLine('{dim}Set CLAUDE_API_KEY in your .env file to enable AI features.{/}');
    return;
  }

  const loreDaemon = getLoreDaemon();
  const category = args[0] as LoreCategory;
  const title = args[1];
  const theme = args.slice(2).join(' ') || undefined;

  if (!loreDaemon.isValidCategory(category)) {
    ctx.sendLine(`{red}Invalid category: ${category}{/}`);
    ctx.sendLine(`Valid categories: ${loreDaemon.getCategories().join(', ')}`);
    return;
  }

  const slug = titleToSlug(title);
  const id = `${category}:${slug}`;

  ctx.sendLine(`{cyan}Generating lore for "${title}" (${category})...{/}`);
  ctx.sendLine('{dim}This may take a few seconds.{/}');

  // Build the prompt for lore generation
  const categoryDescriptions: Record<LoreCategory, string> = {
    world: 'fundamental facts about the game world, cosmology, or natural laws',
    region: 'a geographic area, kingdom, or territory',
    faction: 'an organization, guild, or group of people',
    history: 'a past era, historical period, or timeline of events',
    character: 'a notable NPC, hero, villain, or historical figure',
    event: 'a major historical event, war, disaster, or significant occurrence',
    item: 'an artifact, magical item, or type of equipment',
    creature: 'a monster type, beast, or supernatural being',
    location: 'a specific notable place like a building, dungeon, or landmark',
    economics: 'trade, currency, commerce, or economic systems',
    mechanics: 'world mechanics like magic systems, divine powers, or natural laws',
    faith: 'a religion, god, deity, or religious practice',
  };

  const prompt = `Generate a lore entry for a fantasy MUD game.

Category: ${category} (${categoryDescriptions[category]})
Title: "${title}"
${theme ? `Theme/Keywords: ${theme}` : ''}

Write a concise but evocative lore entry (2-4 sentences) that:
- Provides useful context for NPCs to reference in conversation
- Feels like authentic fantasy world-building
- Includes specific details that make it memorable
- Can be naturally incorporated into NPC dialogue

Respond with ONLY the lore content text, no titles or labels.`;

  try {
    const result = await efuns.aiGenerate(prompt, undefined, { maxTokens: 300 });

    if (result.success && result.text) {
      const content = result.text.trim();

      // Extract potential tags from the theme
      const tags = theme
        ? theme.split(',').map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0)
        : [];

      const entry: LoreEntry = {
        id,
        category,
        title,
        content,
        tags: tags.length > 0 ? tags : undefined,
        priority: 5,
      };

      if (loreDaemon.registerLore(entry)) {
        await loreDaemon.save();

        ctx.sendLine('');
        ctx.sendLine('{green}=== Generated Lore Entry ==={/}');
        ctx.sendLine('');
        ctx.sendLine(`{bold}ID:{/} ${id}`);
        ctx.sendLine(`{bold}Title:{/} ${title}`);
        ctx.sendLine(`{bold}Category:{/} ${category}`);
        if (tags.length > 0) {
          ctx.sendLine(`{bold}Tags:{/} ${tags.join(', ')}`);
        }
        ctx.sendLine('');
        ctx.sendLine('{bold}Content:{/}');
        const lines = content.split('\n');
        for (const line of lines) {
          ctx.sendLine(`  ${line}`);
        }
        ctx.sendLine('');
        ctx.sendLine('{dim}Lore entry saved. Use "lore edit" to refine it.{/}');
      } else {
        ctx.sendLine('{red}Failed to save lore entry.{/}');
      }
    } else {
      ctx.sendLine(`{red}Error: ${result.error || 'Unknown error'}{/}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error generating lore: ${errorMsg}{/}`);
  }
}

/**
 * Search lore entries.
 */
function cmdSearch(ctx: CommandContext, args: string[]): void {
  if (!args[0]) {
    ctx.sendLine('{red}Usage: lore search <query>{/}');
    return;
  }

  const loreDaemon = getLoreDaemon();
  const query = args.join(' ');
  const results = loreDaemon.search(query);

  ctx.sendLine(`{cyan}=== Search Results for "${query}" ==={/}`);
  ctx.sendLine('');

  if (results.length === 0) {
    ctx.sendLine('{dim}No matching lore entries found.{/}');
    return;
  }

  for (const entry of results) {
    ctx.sendLine(`  {yellow}${entry.id}{/} - ${entry.title}`);
    // Show a snippet of the content
    const snippet = entry.content.length > 80
      ? entry.content.slice(0, 80) + '...'
      : entry.content;
    ctx.sendLine(`    {dim}${snippet}{/}`);
  }
  ctx.sendLine('');
  ctx.sendLine(`{dim}Found ${results.length} entries{/}`);
}

/**
 * List all tags in use.
 */
function cmdTags(ctx: CommandContext): void {
  const loreDaemon = getLoreDaemon();
  const entries = loreDaemon.getAllLore();
  const tagCounts = new Map<string, number>();

  for (const entry of entries) {
    for (const tag of entry.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  ctx.sendLine('{cyan}=== Lore Tags ==={/}');
  ctx.sendLine('');

  if (tagCounts.size === 0) {
    ctx.sendLine('{dim}No tags found.{/}');
    return;
  }

  // Sort by count descending
  const sorted = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [tag, count] of sorted) {
    ctx.sendLine(`  {yellow}${tag}{/} (${count})`);
  }
  ctx.sendLine('');
  ctx.sendLine(`{dim}Total: ${tagCounts.size} unique tags{/}`);
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = parseArgs(ctx.args.trim());
  const subcommand = args[0]?.toLowerCase() || '';
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'list':
    case 'ls':
      cmdList(ctx, subArgs);
      break;

    case 'show':
    case 'view':
      cmdShow(ctx, subArgs);
      break;

    case 'add':
    case 'create':
    case 'new':
      await cmdAdd(ctx, subArgs);
      break;

    case 'edit':
    case 'modify':
      await cmdEdit(ctx, subArgs);
      break;

    case 'remove':
    case 'rm':
    case 'delete':
      await cmdRemove(ctx, subArgs);
      break;

    case 'generate':
    case 'gen':
      await cmdGenerate(ctx, subArgs);
      break;

    case 'search':
    case 'find':
      cmdSearch(ctx, subArgs);
      break;

    case 'tags':
      cmdTags(ctx);
      break;

    default:
      showUsage(ctx);
      break;
  }
}

export default { name, description, usage, execute };
