/**
 * AI Describe command - Generate descriptions for game objects using AI.
 *
 * Uses world lore from the lore daemon to ensure consistency.
 *
 * Usage:
 *   aidescribe <type> <name> [theme/keywords]
 *   aidescribe room "Dusty Library" fantasy
 *   aidescribe npc "Old Blacksmith" "gruff, experienced, former soldier"
 *   aidescribe item "Ancient Sword" "cursed, glowing, elven"
 */

import type { MudObject } from '../../lib/std.js';
import { getLoreDaemon } from '../../daemons/lore.js';
import { parseArgs } from '../../lib/text-utils.js';

interface Player extends MudObject {
  cwd: string;
}

interface CommandContext {
  player: Player;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['aidescribe', 'aid'];
export const description = 'Generate AI descriptions for game objects';
export const usage = 'aidescribe <type> <name> [theme/keywords]';

const VALID_TYPES = ['room', 'item', 'npc', 'weapon', 'armor'] as const;
type ObjectType = (typeof VALID_TYPES)[number];

/**
 * Get relevant lore context based on keywords.
 */
function getLoreContext(keywords: string[]): string {
  const loreDaemon = getLoreDaemon();
  const allLore = loreDaemon.getAllLore();

  if (allLore.length === 0) {
    return '';
  }

  // Find lore entries that match any keywords (in title, content, or tags)
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const relevantLore = allLore.filter(entry => {
    const searchText = `${entry.title} ${entry.content} ${entry.tags?.join(' ') || ''}`.toLowerCase();
    return lowerKeywords.some(kw => searchText.includes(kw));
  });

  // If no keyword matches, include high-priority world lore
  const loreToUse = relevantLore.length > 0
    ? relevantLore.slice(0, 5)
    : allLore.filter(e => e.category === 'world' || e.priority && e.priority >= 7).slice(0, 3);

  if (loreToUse.length === 0) {
    return '';
  }

  return loreDaemon.buildContext(loreToUse.map(e => e.id), 1500);
}

interface DescriptionResult {
  shortDesc: string;
  longDesc: string;
}

export async function execute(ctx: CommandContext): Promise<void> {
  // Check if AI is available
  if (typeof efuns === 'undefined' || !efuns.aiAvailable?.()) {
    ctx.sendLine('{red}AI is not configured or unavailable.{/}');
    ctx.sendLine('{dim}Set CLAUDE_API_KEY in your .env file to enable AI features.{/}');
    return;
  }

  const args = parseArgs(ctx.args.trim());

  if (args.length < 2) {
    ctx.sendLine('Usage: aidescribe <type> <name> [theme/keywords]');
    ctx.sendLine('');
    ctx.sendLine('Types: room, item, npc, weapon, armor');
    ctx.sendLine('');
    ctx.sendLine('Uses world lore to ensure consistency with the game world.');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  aidescribe room "Dusty Library" fantasy');
    ctx.sendLine('  aidescribe npc "Old Blacksmith" "gruff, experienced"');
    ctx.sendLine('  aidescribe weapon "Iron Sword" "rusty, old"');
    ctx.sendLine('  aidescribe item "Leather Bag" "worn, travel"');
    return;
  }

  const type = args[0].toLowerCase();
  const name = args[1];
  const theme = args.slice(2).join(' ') || '';
  const keywords = theme ? theme.split(',').map(s => s.trim()) : [name];

  // Validate type
  if (!VALID_TYPES.includes(type as ObjectType)) {
    ctx.sendLine(`{red}Invalid type: ${type}{/}`);
    ctx.sendLine(`Valid types: ${VALID_TYPES.join(', ')}`);
    return;
  }

  ctx.sendLine(`{cyan}Generating ${type} description for "${name}"...{/}`);
  ctx.sendLine('{dim}This may take a few seconds.{/}');

  // Get lore context
  const loreContext = getLoreContext([...keywords, name, type]);

  const typeDescriptions: Record<ObjectType, string> = {
    room: 'a location/room that players can visit',
    item: 'a general item that players can pick up and use',
    npc: 'a non-player character',
    weapon: 'a weapon that players can wield in combat',
    armor: 'armor or protective gear that players can wear',
  };

  const prompt = `Generate descriptions for ${typeDescriptions[type as ObjectType]} in a fantasy MUD game.

Name: "${name}"
${theme ? `Theme/Keywords: ${theme}` : ''}

${loreContext ? `WORLD LORE (use for consistency):
${loreContext}

` : ''}Respond with a JSON object:
{
  "shortDesc": "A brief 3-8 word description${type === 'npc' ? " starting lowercase (e.g., 'a grizzled old warrior')" : ''}",
  "longDesc": "A 2-4 sentence atmospheric description"
}

Requirements:
- shortDesc should be concise and evocative
- longDesc should be immersive and detailed
- If world lore is provided, incorporate relevant details naturally
- Match the tone and style of the game world

Respond with ONLY the JSON object, no markdown.`;

  try {
    const result = await efuns.aiGenerate(prompt, undefined, { maxTokens: 400 });

    if (!result.success || !result.text) {
      ctx.sendLine(`{red}Error: ${result.error || 'Unknown error'}{/}`);
      return;
    }

    // Parse JSON response
    let desc: DescriptionResult;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      desc = JSON.parse(jsonMatch[0]);
    } catch {
      ctx.sendLine('{red}Error parsing AI response{/}');
      ctx.sendLine(`{dim}${result.text}{/}`);
      return;
    }

    ctx.sendLine('');
    ctx.sendLine('{green}=== Generated Description ==={/}');
    ctx.sendLine('');
    ctx.sendLine(`{bold}Short Description:{/}`);
    ctx.sendLine(`  ${desc.shortDesc}`);
    ctx.sendLine('');
    ctx.sendLine('{bold}Long Description:{/}');
    const lines = desc.longDesc.split('\n');
    for (const line of lines) {
      ctx.sendLine(`  ${line}`);
    }
    ctx.sendLine('');

    if (loreContext) {
      ctx.sendLine('{dim}(Used world lore for consistency){/}');
      ctx.sendLine('');
    }

    ctx.sendLine('{dim}Copy these into your object file:{/}');
    ctx.sendLine(`{dim}  this.shortDesc = "${desc.shortDesc.replace(/"/g, '\\"')}";{/}`);
    ctx.sendLine(`{dim}  this.longDesc = "${desc.longDesc.replace(/"/g, '\\"').replace(/\n/g, '\\n')}";{/}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error generating description: ${errorMsg}{/}`);
  }
}

export default { name, description, usage, execute };
