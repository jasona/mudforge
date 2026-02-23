/**
 * AI NPC command - Generate complete NPC definitions using AI.
 *
 * Uses world lore from the lore daemon to ensure consistency.
 *
 * Usage:
 *   ainpc <name> <role> [personality]
 *   ainpc "Old Fisherman" "quest giver" "grumpy, knows about sea monsters"
 *   ainpc "Blacksmith" "merchant" "gruff, experienced, former soldier"
 *   ainpc "Town Guard" "guard"
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

export const name = ['ainpc'];
export const description = 'Generate AI NPC with descriptions, personality, and dialogue';
export const usage = 'ainpc <name> <role> [personality]';

/**
 * Get relevant lore context based on keywords.
 */
function getLoreContext(keywords: string[]): { context: string; loreIds: string[] } {
  const loreDaemon = getLoreDaemon();
  const allLore = loreDaemon.getAllLore();

  if (allLore.length === 0) {
    return { context: '', loreIds: [] };
  }

  // Find lore entries that match any keywords (in title, content, or tags)
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const relevantLore = allLore.filter(entry => {
    const searchText = `${entry.title} ${entry.content} ${entry.tags?.join(' ') || ''}`.toLowerCase();
    return lowerKeywords.some(kw => searchText.includes(kw));
  });

  // If no keyword matches, include high-priority world/character/faction lore
  const loreToUse = relevantLore.length > 0
    ? relevantLore.slice(0, 5)
    : allLore.filter(e =>
        e.category === 'world' ||
        e.category === 'faction' ||
        e.category === 'character' ||
        (e.priority && e.priority >= 7)
      ).slice(0, 3);

  if (loreToUse.length === 0) {
    return { context: '', loreIds: [] };
  }

  return {
    context: loreDaemon.buildContext(loreToUse.map(e => e.id), 1500),
    loreIds: loreToUse.map(e => e.id),
  };
}

interface NPCGeneration {
  shortDesc: string;
  longDesc: string;
  personality: string;
  background: string;
  chatMessages: Array<{ message: string; type: 'say' | 'emote' }>;
  responses: Array<{ trigger: string; response: string }>;
  speakingStyle: {
    formality: 'casual' | 'formal' | 'archaic';
    verbosity: 'terse' | 'normal' | 'verbose';
    accent?: string;
  };
  topics: string[];
  forbidden: string[];
  localKnowledge: string[];
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
    ctx.sendLine('Usage: ainpc <name> <role> [personality]');
    ctx.sendLine('');
    ctx.sendLine('Generates a complete NPC with descriptions, AI context, and dialogue.');
    ctx.sendLine('');
    ctx.sendLine('Arguments:');
    ctx.sendLine('  name        - The NPC\'s name');
    ctx.sendLine('  role        - Their role/occupation (merchant, guard, quest giver, etc.)');
    ctx.sendLine('  personality - Keywords describing personality (optional)');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  ainpc "Old Fisherman" "quest giver" "grumpy, knows about sea monsters"');
    ctx.sendLine('  ainpc "Blacksmith" "merchant" "gruff, experienced"');
    ctx.sendLine('  ainpc "Town Guard" "guard" "vigilant, by-the-book"');
    ctx.sendLine('  ainpc "Mysterious Stranger" "information broker"');
    return;
  }

  const npcName = args[0];
  const role = args[1];
  const personalityHints = args.slice(2).join(' ') || undefined;

  ctx.sendLine(`{cyan}Generating NPC: "${npcName}" (${role})...{/}`);
  if (personalityHints) {
    ctx.sendLine(`{dim}Personality: ${personalityHints}{/}`);
  }
  ctx.sendLine('{dim}This may take a few seconds.{/}');

  // Get lore context based on role and personality keywords
  const keywords = [npcName, role, ...(personalityHints?.split(/[,\s]+/) || [])].filter(w => w.length > 3);
  const { context: loreContext, loreIds } = getLoreContext(keywords);

  const prompts = getPromptsDaemon();
  const prompt = prompts.render('npc.generation.user', {
    npcName,
    role,
    personalityHints: personalityHints || undefined,
    loreContext: loreContext || undefined,
  }) ?? `Generate an NPC for a fantasy MUD game.\n\nName: "${npcName}"\nRole: ${role}\n\nRespond with ONLY the JSON object, no markdown or explanation.`;

  try {
    const result = await efuns.aiGenerate(prompt, undefined, { maxTokens: 800 });

    if (!result.success || !result.text) {
      ctx.sendLine(`{red}Error: ${result.error || 'Unknown error'}{/}`);
      return;
    }

    // Parse the JSON response
    let npc: NPCGeneration;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      npc = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      ctx.sendLine('{red}Error parsing AI response. Raw output:{/}');
      ctx.sendLine(`{dim}${result.text}{/}`);
      return;
    }

    // Validate speaking style
    if (!['casual', 'formal', 'archaic'].includes(npc.speakingStyle?.formality)) {
      npc.speakingStyle = npc.speakingStyle || { formality: 'casual', verbosity: 'normal' };
      npc.speakingStyle.formality = 'casual';
    }
    if (!['terse', 'normal', 'verbose'].includes(npc.speakingStyle?.verbosity)) {
      npc.speakingStyle.verbosity = 'normal';
    }

    // Display results
    ctx.sendLine('');
    ctx.sendLine('{green}=== Generated NPC ==={/}');
    ctx.sendLine('');
    ctx.sendLine(`{bold}Name:{/} ${npcName}`);
    ctx.sendLine(`{bold}Role:{/} ${role}`);
    ctx.sendLine('');
    ctx.sendLine(`{bold}Short Description:{/}`);
    ctx.sendLine(`  ${npc.shortDesc}`);
    ctx.sendLine('');
    ctx.sendLine(`{bold}Long Description:{/}`);
    const longLines = npc.longDesc.split('\n');
    for (const line of longLines) {
      ctx.sendLine(`  ${line}`);
    }
    ctx.sendLine('');
    ctx.sendLine(`{bold}Personality:{/}`);
    ctx.sendLine(`  ${npc.personality}`);
    ctx.sendLine('');
    ctx.sendLine(`{bold}Background:{/}`);
    ctx.sendLine(`  ${npc.background}`);
    ctx.sendLine('');

    ctx.sendLine(`{bold}Speaking Style:{/}`);
    ctx.sendLine(`  Formality: ${npc.speakingStyle.formality}`);
    ctx.sendLine(`  Verbosity: ${npc.speakingStyle.verbosity}`);
    if (npc.speakingStyle.accent) {
      ctx.sendLine(`  Accent: ${npc.speakingStyle.accent}`);
    }
    ctx.sendLine('');

    if (npc.chatMessages?.length > 0) {
      ctx.sendLine(`{bold}Idle Chat Messages:{/}`);
      for (const chat of npc.chatMessages) {
        const prefix = chat.type === 'say' ? 'says:' : 'emotes:';
        ctx.sendLine(`  [${prefix}] "${chat.message}"`);
      }
      ctx.sendLine('');
    }

    if (npc.responses?.length > 0) {
      ctx.sendLine(`{bold}Static Responses:{/}`);
      for (const resp of npc.responses) {
        ctx.sendLine(`  [${resp.trigger}] -> "${resp.response}"`);
      }
      ctx.sendLine('');
    }

    ctx.sendLine(`{bold}Knowledge Topics:{/} ${npc.topics?.join(', ') || 'general'}`);
    ctx.sendLine(`{bold}Forbidden Topics:{/} ${npc.forbidden?.join(', ') || 'none'}`);
    ctx.sendLine(`{bold}Local Knowledge:{/} ${npc.localKnowledge?.join(', ') || 'none'}`);
    ctx.sendLine('');

    if (loreContext) {
      ctx.sendLine('{dim}(Used world lore for consistency){/}');
      if (loreIds.length > 0) {
        ctx.sendLine(`{dim}Lore IDs: ${loreIds.join(', ')}{/}`);
      }
      ctx.sendLine('');
    }

    // Generate code snippet
    ctx.sendLine('{dim}=== Code Snippet ==={/}');
    ctx.sendLine('');

    const className = npcName.replace(/[^a-zA-Z0-9]/g, '');
    const escapedShort = npc.shortDesc.replace(/"/g, '\\"');
    const escapedLong = npc.longDesc.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const escapedPersonality = npc.personality.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const escapedBackground = npc.background.replace(/"/g, '\\"').replace(/\n/g, '\\n');

    ctx.sendLine('{dim}import { NPC } from \'../../std/npc.js\';{/}');
    ctx.sendLine('');
    ctx.sendLine(`{dim}export class ${className} extends NPC {{/}`);
    ctx.sendLine('{dim}  constructor() {{/}');
    ctx.sendLine('{dim}    super();{/}');
    ctx.sendLine(`{dim}    this.shortDesc = "${escapedShort}";{/}`);
    ctx.sendLine(`{dim}    this.longDesc = "${escapedLong}";{/}`);
    ctx.sendLine('');
    ctx.sendLine('{dim}    // Chat messages (when AI unavailable){/}');
    for (const chat of npc.chatMessages || []) {
      const escapedMsg = chat.message.replace(/"/g, '\\"');
      ctx.sendLine(`{dim}    this.addChat("${escapedMsg}", "${chat.type}");{/}`);
    }
    ctx.sendLine('{dim}    this.setChatChance(15);{/}');
    ctx.sendLine('');
    ctx.sendLine('{dim}    // Static responses (fallback){/}');
    for (const resp of npc.responses || []) {
      const escapedResp = resp.response.replace(/"/g, '\\"');
      ctx.sendLine(`{dim}    this.addResponse(/${resp.trigger}/i, "${escapedResp}");{/}`);
    }
    ctx.sendLine('');
    ctx.sendLine('{dim}    // AI Context for dynamic dialogue{/}');
    ctx.sendLine('{dim}    this.setAIContext({{/}');
    ctx.sendLine(`{dim}      name: "${npcName}",{/}`);
    ctx.sendLine(`{dim}      personality: "${escapedPersonality}",{/}`);
    ctx.sendLine(`{dim}      background: "${escapedBackground}",{/}`);
    ctx.sendLine('{dim}      knowledgeScope: {{/}');
    ctx.sendLine(`{dim}        topics: [${npc.topics?.map(t => `"${t}"`).join(', ') || ''}],{/}`);
    ctx.sendLine(`{dim}        forbidden: [${npc.forbidden?.map(t => `"${t}"`).join(', ') || ''}],{/}`);
    ctx.sendLine(`{dim}        localKnowledge: [${npc.localKnowledge?.map(t => `"${t.replace(/"/g, '\\"')}"`).join(', ') || ''}],{/}`);
    if (loreIds.length > 0) {
      ctx.sendLine(`{dim}        worldLore: [${loreIds.map(id => `"${id}"`).join(', ')}],{/}`);
    } else {
      ctx.sendLine('{dim}        // worldLore: ["lore:id-here"], // Add relevant lore IDs{/}');
    }
    ctx.sendLine('{dim}      },{/}');
    ctx.sendLine('{dim}      speakingStyle: {{/}');
    ctx.sendLine(`{dim}        formality: "${npc.speakingStyle.formality}",{/}`);
    ctx.sendLine(`{dim}        verbosity: "${npc.speakingStyle.verbosity}",{/}`);
    if (npc.speakingStyle.accent) {
      ctx.sendLine(`{dim}        accent: "${npc.speakingStyle.accent.replace(/"/g, '\\"')}",{/}`);
    }
    ctx.sendLine('{dim}      },{/}');
    ctx.sendLine('{dim}    });{/}');
    ctx.sendLine('{dim}  }{/}');
    ctx.sendLine('{dim}}{/}');
    ctx.sendLine('');
    ctx.sendLine(`{dim}export default ${className};{/}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error generating NPC: ${errorMsg}{/}`);
  }
}

export default { name, description, usage, execute };
