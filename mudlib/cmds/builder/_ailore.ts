/**
 * AI Lore command - Generate interconnected world lore using AI.
 *
 * Three subcommands:
 *   ailore bootstrap <world-name> [description]  — Generate foundational lore entries (one per category)
 *   ailore expand <category> [theme/keywords]     — Generate 2-4 entries in a category
 *   ailore fullstory                              — Weave all lore into a long-form narrative
 */

import type { MudObject } from '../../lib/std.js';
import { getLoreDaemon } from '../../daemons/lore.js';
import { getPromptsDaemon } from '../../daemons/prompts.js';
import { parseArgs } from '../../lib/text-utils.js';

interface Player extends MudObject {
  cwd: string;
  name: string;
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void;
  receive(message: string): void;
  connection?: { send: (msg: string) => void };
  _connection?: { send: (msg: string) => void };
}

interface CommandContext {
  player: Player;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface LoreEntryInput {
  category: string;
  title: string;
  content: string;
  tags?: string[];
  relatedLore?: string[];
  priority?: number;
}

export const name = ['ailore'];
export const description = 'Generate AI-powered world lore (bootstrap, expand, fullstory)';
export const usage = 'ailore <bootstrap|expand|fullstory> [args...]';

const VALID_CATEGORIES = [
  'world', 'region', 'faction', 'history', 'character', 'event',
  'item', 'creature', 'location', 'economics', 'mechanics', 'faith',
] as const;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  world: 'The world itself — its name, nature, and defining characteristics',
  region: 'Distinct geographic areas, territories, or domains',
  faction: 'Organizations, guilds, nations, or groups with shared goals',
  history: 'Major historical events, eras, and turning points',
  character: 'Notable figures, heroes, villains, and legends',
  event: 'Current or recent events shaping the world',
  item: 'Legendary artifacts, relics, or notable objects',
  creature: 'Unique creatures, beasts, or monsters of the world',
  location: 'Specific notable places, landmarks, or dungeons',
  economics: 'Trade systems, currencies, and economic forces',
  mechanics: 'Magic systems, technology, or world rules',
  faith: 'Religions, deities, spiritual practices, and cosmology',
};

/** Categories used by bootstrap, in generation order. */
const BOOTSTRAP_CATEGORIES = [
  'world', 'history', 'faction', 'mechanics',
  'region', 'faith', 'character', 'event',
] as const;

/**
 * Convert a title to a URL-friendly slug.
 */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get all existing lore as context string for AI prompts.
 */
function getExistingLoreContext(maxLength = 3000): string {
  const loreDaemon = getLoreDaemon();
  const allLore = loreDaemon.getAllLore();
  if (allLore.length === 0) return '';
  return loreDaemon.buildContext(allLore.map(e => e.id), maxLength);
}

/**
 * Build a context string from in-progress entries (not yet saved to daemon).
 */
function buildPendingContext(entries: LoreEntryInput[]): string {
  if (entries.length === 0) return '';
  return entries.map(e => {
    const slug = titleToSlug(e.title);
    return `[${e.category}:${slug}] ${e.title}: ${e.content}`;
  }).join('\n');
}

/**
 * Validate and normalize a single entry from AI response.
 */
function validateEntry(entry: LoreEntryInput, num: number): { entry?: LoreEntryInput; warning?: string } {
  const loreDaemon = getLoreDaemon();

  if (!entry.category || !entry.title || !entry.content) {
    return { warning: `Entry ${num}: missing required fields (category, title, or content) — skipped` };
  }

  const cat = entry.category.toLowerCase();
  if (cat === 'race') {
    return { warning: `Entry ${num} "${entry.title}": category "race" is reserved — skipped` };
  }
  if (!VALID_CATEGORIES.includes(cat as typeof VALID_CATEGORIES[number])) {
    return { warning: `Entry ${num} "${entry.title}": unknown category "${entry.category}" — skipped` };
  }
  entry.category = cat;

  const slug = titleToSlug(entry.title);
  if (!slug) {
    return { warning: `Entry ${num}: title "${entry.title}" produces empty slug — skipped` };
  }

  const id = `${cat}:${slug}`;
  if (loreDaemon.getLore(id)) {
    // Warning but still valid — will update
  }

  entry.priority = Math.max(1, Math.min(10, entry.priority ?? 5));
  entry.tags = Array.isArray(entry.tags) ? entry.tags : [];
  entry.relatedLore = Array.isArray(entry.relatedLore) ? entry.relatedLore : [];

  return { entry };
}

/**
 * Validate and normalize entries from AI response.
 */
function validateEntries(entries: LoreEntryInput[]): { valid: LoreEntryInput[]; warnings: string[] } {
  const valid: LoreEntryInput[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const result = validateEntry(entries[i], i + 1);
    if (result.warning) warnings.push(result.warning);
    if (result.entry) valid.push(result.entry);
  }

  return { valid, warnings };
}

/**
 * Parse a single JSON object from an AI response.
 */
function parseEntryResponse(text: string): LoreEntryInput | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * Parse a JSON array from an AI response.
 */
function parseArrayResponse(text: string): LoreEntryInput[] | null {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Format entries for display.
 */
function displayEntries(ctx: CommandContext, entries: LoreEntryInput[]): void {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const slug = titleToSlug(entry.title);
    const id = `${entry.category}:${slug}`;
    const preview = entry.content.length > 80
      ? entry.content.substring(0, 77) + '...'
      : entry.content;

    ctx.sendLine(`  {bold}${i + 1}.{/} [{cyan}${entry.category}{/}] ${id} (priority: ${entry.priority ?? 5})`);
    ctx.sendLine(`     "${preview}"`);
    if (entry.tags && entry.tags.length > 0) {
      ctx.sendLine(`     {dim}tags: ${entry.tags.join(', ')}{/}`);
    }
    ctx.sendLine('');
  }
}

/**
 * Save all entries to the lore daemon.
 */
async function saveEntries(entries: LoreEntryInput[], ctx: CommandContext): Promise<void> {
  const loreDaemon = getLoreDaemon();
  let saved = 0;

  for (const entry of entries) {
    const slug = titleToSlug(entry.title);
    const id = `${entry.category}:${slug}`;

    const success = loreDaemon.registerLore({
      id,
      category: entry.category as ReturnType<typeof getLoreDaemon>extends { getCategories(): infer C } ? C extends (infer U)[] ? U : string : string,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      relatedLore: entry.relatedLore,
      priority: entry.priority,
    });

    if (success) saved++;
  }

  await loreDaemon.save();
  ctx.sendLine(`{green}Saved ${saved} lore entries.{/}`);
  ctx.sendLine('Use {cyan}lore list{/} to view them, or {cyan}lore edit <id>{/} to refine.');
}

/**
 * Open entries in IDE for editing before save.
 */
function openInIde(player: Player, entries: LoreEntryInput[], ctx: CommandContext): void {
  const jsonContent = JSON.stringify(entries, null, 2);

  efuns.ideOpen({
    action: 'open',
    path: 'ailore:entries',
    content: jsonContent,
    readOnly: false,
    language: 'json',
  });

  ctx.sendLine('{cyan}Entries opened in IDE. Edit and save when ready.{/}');
  ctx.sendLine('{dim}Type "close" or "cancel" to discard.{/}');

  player.setInputHandler(async (input: string) => {
    if (!input.startsWith('\x00[IDE]')) {
      const cmd = input.trim().toLowerCase();
      if (cmd === 'close' || cmd === 'cancel' || cmd === 'q' || cmd === 'quit') {
        player.setInputHandler(null);
        player.receive('{yellow}Discarded. No entries saved.{/}\n');
        return;
      }
      player.receive('{dim}(Editor is open in browser. Type "close" to cancel.){/}\n');
      return;
    }

    const jsonStr = input.slice(6);
    let message: { action: string; content?: string };
    try {
      message = JSON.parse(jsonStr);
    } catch {
      player.receive('{red}Invalid IDE message.{/}\n');
      return;
    }

    if (message.action === 'save' && message.content) {
      try {
        const edited = JSON.parse(message.content);
        if (!Array.isArray(edited)) {
          player.receive('{red}Content must be a JSON array of lore entries.{/}\n');
          return;
        }
        const { valid, warnings } = validateEntries(edited);
        for (const w of warnings) {
          player.receive(`{yellow}Warning: ${w}{/}\n`);
        }
        if (valid.length === 0) {
          player.receive('{red}No valid entries after editing.{/}\n');
          return;
        }
        await saveEntries(valid, ctx);

        const conn = player.connection || player._connection;
        if (conn?.send) {
          conn.send(`\x00[IDE]${JSON.stringify({
            action: 'save-result',
            path: 'ailore:entries',
            success: true,
            message: `Saved ${valid.length} lore entries`,
          })}\n`);
        }
      } catch (e) {
        player.receive(`{red}Error parsing edited content: ${e instanceof Error ? e.message : String(e)}{/}\n`);
      }
    } else if (message.action === 'close') {
      player.setInputHandler(null);
      player.receive('{cyan}Editor closed.{/}\n');
    }
  });
}

/**
 * Prompt the player to confirm saving entries (yes/no/edit).
 */
function promptConfirmation(player: Player, entries: LoreEntryInput[], ctx: CommandContext): void {
  ctx.sendLine('Save all entries? ({green}yes{/}/{red}no{/}/{cyan}edit{/})');

  player.setInputHandler(async (input: string) => {
    const cmd = input.trim().toLowerCase();

    if (cmd === 'yes' || cmd === 'y') {
      player.setInputHandler(null);
      await saveEntries(entries, ctx);
    } else if (cmd === 'no' || cmd === 'n') {
      player.setInputHandler(null);
      ctx.sendLine('{yellow}Discarded. No entries saved.{/}');
    } else if (cmd === 'edit' || cmd === 'e') {
      player.setInputHandler(null);
      openInIde(player, entries, ctx);
    } else {
      player.receive('Please type {green}yes{/}, {red}no{/}, or {cyan}edit{/}.\n');
    }
  });
}

/**
 * Generate a single lore entry for a category via AI.
 */
async function generateOneEntry(
  category: string,
  worldName: string,
  worldDescription: string,
  pendingContext: string,
  existingLore: string,
): Promise<{ entry?: LoreEntryInput; error?: string }> {
  const prompts = getPromptsDaemon();
  const systemPrompt = prompts.render('generate.system') ?? undefined;

  const prompt = prompts.render('ailore.bootstrap.entry', {
    worldName,
    worldDescription: worldDescription || undefined,
    category,
    categoryDescription: CATEGORY_DESCRIPTIONS[category] || category,
    existingLore: existingLore || undefined,
    pendingLore: pendingContext || undefined,
  });

  if (!prompt) {
    return { error: 'Could not render prompt template' };
  }

  const result = await efuns.aiGenerate(prompt, systemPrompt, {
    maxTokens: 300,
    temperature: 0.8,
  });

  if (!result.success || !result.text) {
    return { error: result.error || 'Unknown error' };
  }

  const parsed = parseEntryResponse(result.text);
  if (!parsed) {
    return { error: 'Could not parse JSON from response' };
  }

  // Force the category to match what we asked for
  parsed.category = category;

  const validation = validateEntry(parsed, 1);
  if (validation.entry) {
    return { entry: validation.entry };
  }
  return { error: validation.warning || 'Invalid entry' };
}

/**
 * ailore bootstrap <world-name> [description]
 * Generates one entry per category sequentially, streaming progress.
 */
async function cmdBootstrap(ctx: CommandContext, args: string[]): Promise<void> {
  if (args.length < 1) {
    ctx.sendLine('Usage: ailore bootstrap <world-name> [description]');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  ailore bootstrap "Neon Axiom" "a world where reality can be hacked"');
    ctx.sendLine('  ailore bootstrap "Grimhold" "dark fantasy kingdom under siege"');
    ctx.sendLine('  ailore bootstrap "Starfall"');
    return;
  }

  const worldName = args[0];
  const worldDescription = args.slice(1).join(' ') || '';

  ctx.sendLine(`{cyan}Generating foundational world lore for "${worldName}"...{/}`);
  ctx.sendLine(`{dim}Generating ${BOOTSTRAP_CATEGORIES.length} entries, one per category.{/}`);
  ctx.sendLine('');

  const existingLore = getExistingLoreContext();
  const allEntries: LoreEntryInput[] = [];
  let failures = 0;

  for (const category of BOOTSTRAP_CATEGORIES) {
    ctx.send(`  {dim}[${allEntries.length + 1}/${BOOTSTRAP_CATEGORIES.length}]{/} Generating {cyan}${category}{/}...`);

    try {
      const pendingContext = buildPendingContext(allEntries);
      const { entry, error } = await generateOneEntry(
        category, worldName, worldDescription, pendingContext, existingLore,
      );

      if (entry) {
        allEntries.push(entry);
        const slug = titleToSlug(entry.title);
        ctx.sendLine(` {green}${entry.category}:${slug}{/}`);
      } else {
        failures++;
        ctx.sendLine(` {red}failed: ${error}{/}`);
      }
    } catch (error) {
      failures++;
      const msg = error instanceof Error ? error.message : String(error);
      ctx.sendLine(` {red}failed: ${msg}{/}`);
    }
  }

  ctx.sendLine('');

  if (allEntries.length === 0) {
    ctx.sendLine('{red}All entries failed to generate.{/}');
    return;
  }

  if (failures > 0) {
    ctx.sendLine(`{yellow}${failures} entries failed, ${allEntries.length} succeeded.{/}`);
  }

  ctx.sendLine(`{green}=== Generated ${allEntries.length} Lore Entries ==={/}`);
  ctx.sendLine('');
  displayEntries(ctx, allEntries);
  promptConfirmation(ctx.player, allEntries, ctx);
}

/**
 * Generate a single expand entry for a category via AI.
 */
async function generateExpandEntry(
  category: string,
  theme: string,
  pendingContext: string,
  existingLore: string,
): Promise<{ entry?: LoreEntryInput; error?: string }> {
  const prompts = getPromptsDaemon();
  const systemPrompt = prompts.render('generate.system') ?? undefined;

  const prompt = prompts.render('ailore.expand.entry', {
    category,
    categoryDescription: CATEGORY_DESCRIPTIONS[category] || category,
    theme: theme || undefined,
    existingLore: existingLore || undefined,
    pendingLore: pendingContext || undefined,
  });

  if (!prompt) {
    return { error: 'Could not render prompt template' };
  }

  const result = await efuns.aiGenerate(prompt, systemPrompt, {
    maxTokens: 300,
    temperature: 0.7,
  });

  if (!result.success || !result.text) {
    return { error: result.error || 'Unknown error' };
  }

  const parsed = parseEntryResponse(result.text);
  if (!parsed) {
    return { error: 'Could not parse JSON from response' };
  }

  parsed.category = category;

  const validation = validateEntry(parsed, 1);
  if (validation.entry) {
    return { entry: validation.entry };
  }
  return { error: validation.warning || 'Invalid entry' };
}

/**
 * ailore expand <category> [theme/keywords]
 * Generates 3 entries sequentially in a single category.
 */
async function cmdExpand(ctx: CommandContext, args: string[]): Promise<void> {
  if (args.length < 1) {
    ctx.sendLine('Usage: ailore expand <category> [theme/keywords]');
    ctx.sendLine('');
    ctx.sendLine('Categories: ' + VALID_CATEGORIES.join(', '));
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  ailore expand faction "secret cults"');
    ctx.sendLine('  ailore expand history "the age of dragons"');
    ctx.sendLine('  ailore expand region');
    return;
  }

  const category = args[0].toLowerCase();
  if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    ctx.sendLine(`{red}Invalid category: ${args[0]}{/}`);
    ctx.sendLine(`Valid categories: ${VALID_CATEGORIES.join(', ')}`);
    return;
  }

  const theme = args.slice(1).join(' ') || '';
  const existingLore = getExistingLoreContext();

  if (!existingLore) {
    ctx.sendLine('{yellow}No existing lore found. Consider running {cyan}ailore bootstrap{/}{yellow} first.{/}');
  }

  const entryCount = 3;
  ctx.sendLine(`{cyan}Expanding "${category}" lore${theme ? ` with theme: "${theme}"` : ''}...{/}`);
  ctx.sendLine(`{dim}Generating ${entryCount} entries.{/}`);
  ctx.sendLine('');

  const allEntries: LoreEntryInput[] = [];
  let failures = 0;

  for (let i = 0; i < entryCount; i++) {
    ctx.send(`  {dim}[${i + 1}/${entryCount}]{/} Generating {cyan}${category}{/}...`);

    try {
      const pendingContext = buildPendingContext(allEntries);
      const { entry, error } = await generateExpandEntry(
        category, theme, pendingContext, existingLore,
      );

      if (entry) {
        allEntries.push(entry);
        const slug = titleToSlug(entry.title);
        ctx.sendLine(` {green}${entry.category}:${slug}{/}`);
      } else {
        failures++;
        ctx.sendLine(` {red}failed: ${error}{/}`);
      }
    } catch (error) {
      failures++;
      const msg = error instanceof Error ? error.message : String(error);
      ctx.sendLine(` {red}failed: ${msg}{/}`);
    }
  }

  ctx.sendLine('');

  if (allEntries.length === 0) {
    ctx.sendLine('{red}All entries failed to generate.{/}');
    return;
  }

  if (failures > 0) {
    ctx.sendLine(`{yellow}${failures} entries failed, ${allEntries.length} succeeded.{/}`);
  }

  ctx.sendLine(`{green}=== Generated ${allEntries.length} Lore Entries ==={/}`);
  ctx.sendLine('');
  displayEntries(ctx, allEntries);
  promptConfirmation(ctx.player, allEntries, ctx);
}

/**
 * ailore fullstory — Compose all lore into a long-form narrative.
 */
async function cmdFullstory(ctx: CommandContext): Promise<void> {
  const loreDaemon = getLoreDaemon();
  const allLore = loreDaemon.getAllLore();

  if (allLore.length === 0) {
    ctx.sendLine('{yellow}No lore entries found.{/}');
    ctx.sendLine('Run {cyan}ailore bootstrap <world-name>{/} to generate foundational lore first.');
    return;
  }

  ctx.sendLine(`{cyan}Composing the story of your world from ${allLore.length} lore entries...{/}`);
  ctx.sendLine('{dim}This may take 30-60 seconds.{/}');

  // Build full lore content organized by category
  const byCategory: Record<string, typeof allLore> = {};
  for (const entry of allLore) {
    if (!byCategory[entry.category]) byCategory[entry.category] = [];
    byCategory[entry.category].push(entry);
  }

  let loreContent = '';
  for (const [cat, entries] of Object.entries(byCategory)) {
    loreContent += `\n=== ${cat.toUpperCase()} ===\n`;
    for (const entry of entries) {
      loreContent += `[${entry.title}] ${entry.content}\n`;
    }
  }

  const prompts = getPromptsDaemon();
  const prompt = prompts.render('ailore.fullstory.user', {
    loreContent,
  });

  if (!prompt) {
    ctx.sendLine('{red}Error: Could not render fullstory prompt template.{/}');
    return;
  }

  try {
    const systemPrompt = prompts.render('generate.system') ?? undefined;
    const result = await efuns.aiGenerate(prompt, systemPrompt, {
      maxTokens: 4000,
      temperature: 0.8,
      timeout: 90000,
      useContinuation: true,
      maxContinuations: 3,
    });

    if (!result.success || !result.text) {
      ctx.sendLine(`{red}Error: ${result.error || 'Unknown error'}{/}`);
      return;
    }

    const story = result.text.trim();
    const wordCount = story.split(/\s+/).length;

    // Save as a lore entry
    const saved = loreDaemon.registerLore({
      id: 'world:fullstory',
      category: 'world' as ReturnType<typeof getLoreDaemon>extends { getCategories(): infer C } ? C extends (infer U)[] ? U : string : string,
      title: 'The Story of This World',
      content: story,
      tags: ['fullstory', 'narrative', 'world-history'],
      priority: 10,
    });

    if (saved) {
      await loreDaemon.save();
      ctx.sendLine('');
      ctx.sendLine(`{green}Story generated (${wordCount.toLocaleString()} words). Saved as lore "world:fullstory".{/}`);
      ctx.sendLine('Use {cyan}lore edit world:fullstory{/} to view or edit.');
    } else {
      ctx.sendLine('');
      ctx.sendLine(`{green}Story generated (${wordCount.toLocaleString()} words).{/}`);
      ctx.sendLine('{red}Warning: Failed to save to lore daemon.{/}');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error generating story: ${errorMsg}{/}`);
  }
}

/**
 * Show help text.
 */
function showHelp(ctx: CommandContext): void {
  ctx.sendLine('Usage: ailore <subcommand> [args...]');
  ctx.sendLine('');
  ctx.sendLine('Subcommands:');
  ctx.sendLine('  {bold}bootstrap{/} <world-name> [description]');
  ctx.sendLine('    Generate foundational lore entries (one per category).');
  ctx.sendLine('    This is the recommended starting point for a new world.');
  ctx.sendLine('');
  ctx.sendLine('  {bold}expand{/} <category> [theme/keywords]');
  ctx.sendLine('    Generate 3 entries in a specific category, using existing');
  ctx.sendLine('    lore as context for consistency.');
  ctx.sendLine('');
  ctx.sendLine('  {bold}fullstory{/}');
  ctx.sendLine('    Weave all existing lore into a long-form narrative and');
  ctx.sendLine('    open it in the IDE as a readable document.');
  ctx.sendLine('');
  ctx.sendLine('Categories: ' + VALID_CATEGORIES.join(', '));
  ctx.sendLine('');
  ctx.sendLine('Examples:');
  ctx.sendLine('  ailore bootstrap "Neon Axiom" "a world where reality can be hacked"');
  ctx.sendLine('  ailore expand faction "secret cults"');
  ctx.sendLine('  ailore fullstory');
}

export async function execute(ctx: CommandContext): Promise<void> {
  // Check if AI is available
  if (typeof efuns === 'undefined' || !efuns.aiAvailable?.()) {
    ctx.sendLine('{red}AI is not configured or unavailable.{/}');
    ctx.sendLine('{dim}Set CLAUDE_API_KEY in your .env file to enable AI features.{/}');
    return;
  }

  const args = parseArgs(ctx.args.trim());

  if (args.length < 1) {
    showHelp(ctx);
    return;
  }

  const subcommand = args[0].toLowerCase();

  switch (subcommand) {
    case 'bootstrap':
      await cmdBootstrap(ctx, args.slice(1));
      break;
    case 'expand':
      await cmdExpand(ctx, args.slice(1));
      break;
    case 'fullstory':
      await cmdFullstory(ctx);
      break;
    default:
      showHelp(ctx);
      break;
  }
}

export default { name, description, usage, execute };
