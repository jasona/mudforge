/**
 * AI Room command - Generate complete room definitions using AI.
 *
 * Uses world lore from the lore daemon to ensure consistency.
 *
 * Usage:
 *   airoom <theme> [exits]
 *   airoom "abandoned mine" "north,south,down"
 *   airoom "cozy tavern" "north,east,west"
 *   airoom "forest clearing"
 */

import type { MudObject } from '../../lib/std.js';
import { getLoreDaemon } from '../../daemons/lore.js';
import { getPromptsDaemon } from '../../daemons/prompts.js';
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

export const name = ['airoom'];
export const description = 'Generate AI room with descriptions, terrain, and suggestions';
export const usage = 'airoom <theme> [exits]';

const TERRAIN_TYPES = [
  'town', 'indoor', 'road', 'grassland', 'forest', 'dense_forest',
  'mountain', 'hills', 'water_shallow', 'water_deep', 'river',
  'swamp', 'desert', 'snow', 'ice', 'cave', 'dungeon', 'void'
] as const;

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

  // If no keyword matches, include high-priority world/region lore
  const loreToUse = relevantLore.length > 0
    ? relevantLore.slice(0, 5)
    : allLore.filter(e => e.category === 'world' || e.category === 'region' || (e.priority && e.priority >= 7)).slice(0, 3);

  if (loreToUse.length === 0) {
    return '';
  }

  return loreDaemon.buildContext(loreToUse.map(e => e.id), 1500);
}

interface RoomGeneration {
  shortDesc: string;
  longDesc: string;
  terrain: string;
  suggestedItems: string[];
  suggestedNpcs: string[];
  ambiance: string;
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
    ctx.sendLine('Usage: airoom <theme> [exits]');
    ctx.sendLine('');
    ctx.sendLine('Generates a complete room with descriptions, terrain, and suggestions.');
    ctx.sendLine('');
    ctx.sendLine('Arguments:');
    ctx.sendLine('  theme  - Description of the room theme/setting');
    ctx.sendLine('  exits  - Comma-separated list of exits (optional)');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  airoom "abandoned mine"');
    ctx.sendLine('  airoom "cozy tavern" "north,east,west"');
    ctx.sendLine('  airoom "forest clearing" "north,south,east,west"');
    ctx.sendLine('  airoom "dark dungeon cell" "north"');
    ctx.sendLine('');
    ctx.sendLine('Terrain types: ' + TERRAIN_TYPES.slice(0, 9).join(', '));
    ctx.sendLine('              ' + TERRAIN_TYPES.slice(9).join(', '));
    return;
  }

  const theme = args[0];
  const exits = args[1]?.split(',').map(e => e.trim().toLowerCase()) || [];

  ctx.sendLine(`{cyan}Generating room: "${theme}"...{/}`);
  if (exits.length > 0) {
    ctx.sendLine(`{dim}Exits: ${exits.join(', ')}{/}`);
  }
  ctx.sendLine('{dim}This may take a few seconds.{/}');

  // Get lore context based on theme keywords
  const themeKeywords = theme.split(/\s+/).filter(w => w.length > 3);
  const loreContext = getLoreContext(themeKeywords);

  const prompts = getPromptsDaemon();
  const prompt = prompts.render('room.generation.user', {
    theme,
    exits: exits.length > 0 ? exits.join(', ') : undefined,
    noExits: exits.length === 0 ? 'true' : undefined,
    terrainTypes: TERRAIN_TYPES.join(', '),
    loreContext: loreContext || undefined,
  }) ?? `Generate a room for a fantasy MUD game.\n\nTheme: "${theme}"\n\nRespond with ONLY the JSON object, no markdown or explanation.`;

  try {
    const result = await efuns.aiGenerate(prompt, undefined, { maxTokens: 500 });

    if (!result.success || !result.text) {
      ctx.sendLine(`{red}Error: ${result.error || 'Unknown error'}{/}`);
      return;
    }

    // Parse the JSON response
    let room: RoomGeneration;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      room = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      ctx.sendLine('{red}Error parsing AI response. Raw output:{/}');
      ctx.sendLine(`{dim}${result.text}{/}`);
      return;
    }

    // Validate terrain
    if (!TERRAIN_TYPES.includes(room.terrain as typeof TERRAIN_TYPES[number])) {
      room.terrain = 'indoor'; // Default fallback
    }

    // Display results
    ctx.sendLine('');
    ctx.sendLine('{green}=== Generated Room ==={/}');
    ctx.sendLine('');
    ctx.sendLine(`{bold}Short Description:{/}`);
    ctx.sendLine(`  ${room.shortDesc}`);
    ctx.sendLine('');
    ctx.sendLine(`{bold}Long Description:{/}`);
    const longLines = room.longDesc.split('\n');
    for (const line of longLines) {
      ctx.sendLine(`  ${line}`);
    }
    ctx.sendLine('');
    ctx.sendLine(`{bold}Terrain:{/} ${room.terrain}`);
    ctx.sendLine('');

    if (room.suggestedItems?.length > 0) {
      ctx.sendLine(`{bold}Suggested Items:{/}`);
      for (const item of room.suggestedItems) {
        ctx.sendLine(`  - ${item}`);
      }
      ctx.sendLine('');
    }

    if (room.suggestedNpcs?.length > 0) {
      ctx.sendLine(`{bold}Suggested NPCs:{/}`);
      for (const npc of room.suggestedNpcs) {
        ctx.sendLine(`  - ${npc}`);
      }
      ctx.sendLine('');
    }

    if (room.ambiance) {
      ctx.sendLine(`{bold}Ambiance Message:{/}`);
      ctx.sendLine(`  "${room.ambiance}"`);
      ctx.sendLine('');
    }

    if (loreContext) {
      ctx.sendLine('{dim}(Used world lore for consistency){/}');
      ctx.sendLine('');
    }

    // Generate code snippet
    ctx.sendLine('{dim}=== Code Snippet ==={/}');
    ctx.sendLine('');
    ctx.sendLine('{dim}import { Room } from \'../../std/room.js\';{/}');
    ctx.sendLine('');
    ctx.sendLine('{dim}export class GeneratedRoom extends Room {{/}');
    ctx.sendLine('{dim}  constructor() {{/}');
    ctx.sendLine('{dim}    super();{/}');
    ctx.sendLine(`{dim}    this.shortDesc = "${room.shortDesc.replace(/"/g, '\\"')}";{/}`);
    ctx.sendLine(`{dim}    this.longDesc = "${room.longDesc.replace(/"/g, '\\"').replace(/\n/g, '\\n')}";{/}`);
    ctx.sendLine(`{dim}    this.setTerrain('${room.terrain}');{/}`);

    if (exits.length > 0) {
      ctx.sendLine('{dim}    // Add exits:{/}');
      for (const exit of exits) {
        ctx.sendLine(`{dim}    this.addExit('${exit}', '/path/to/room');{/}`);
      }
    }

    ctx.sendLine('{dim}  }{/}');
    ctx.sendLine('{dim}}{/}');

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error generating room: ${errorMsg}{/}`);
  }
}

export default { name, description, usage, execute };
