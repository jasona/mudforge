/**
 * Portrait command - Generate an AI portrait based on character description.
 *
 * Usage:
 *   portrait              - Show portrait status
 *   portrait generate     - Generate AI portrait from description
 *   portrait clear        - Clear AI portrait (revert to base avatar)
 */

import type { MudObject } from '../../lib/std.js';

interface PlayerWithProperties extends MudObject {
  name: string;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  deleteProperty(key: string): void;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['portrait'];
export const description = 'Generate an AI portrait based on your character description';
export const usage = 'portrait [generate|clear]';

/**
 * Show usage information.
 */
function showUsage(ctx: CommandContext): void {
  ctx.sendLine('Usage: portrait [subcommand]');
  ctx.sendLine('');
  ctx.sendLine('Subcommands:');
  ctx.sendLine('  (none)    - Show portrait status');
  ctx.sendLine('  generate  - Generate AI portrait from your character description');
  ctx.sendLine('  clear     - Clear AI portrait (revert to base avatar)');
  ctx.sendLine('');
  ctx.sendLine('You must have a character description written first.');
  ctx.sendLine('Use "describe" to write your character description.');
}

/**
 * Show portrait status.
 */
function cmdStatus(ctx: CommandContext): void {
  const player = ctx.player as PlayerWithProperties;
  const description = player.getProperty('characterDescription');
  const portrait = player.getProperty('profilePortrait');
  const generatedAt = player.getProperty('profilePortraitGeneratedAt');

  ctx.sendLine('{cyan}=== Portrait Status ==={/}');
  ctx.sendLine('');

  if (description && typeof description === 'string') {
    ctx.sendLine('{green}Character description:{/} Set');
  } else {
    ctx.sendLine('{yellow}Character description:{/} Not set');
    ctx.sendLine('{dim}Use "describe" to write your character description first.{/}');
    return;
  }

  if (portrait && typeof portrait === 'string') {
    ctx.sendLine('{green}AI portrait:{/} Generated');
    if (typeof generatedAt === 'number') {
      const date = new Date(generatedAt);
      ctx.sendLine(`{dim}Generated: ${date.toLocaleString()}{/}`);
    }
  } else {
    ctx.sendLine('{yellow}AI portrait:{/} Not generated');
    ctx.sendLine('{dim}Use "portrait generate" to create an AI portrait.{/}');
  }
}

/**
 * Generate AI portrait from character description.
 */
async function cmdGenerate(ctx: CommandContext): Promise<void> {
  const player = ctx.player as PlayerWithProperties;
  const description = player.getProperty('characterDescription');

  // Check if description exists
  if (!description || typeof description !== 'string' || !description.trim()) {
    ctx.sendLine('{red}You must write a character description first.{/}');
    ctx.sendLine('{dim}Use "describe" to write your character description.{/}');
    return;
  }

  // Check if portrait already exists
  const existingPortrait = player.getProperty('profilePortrait');
  if (existingPortrait) {
    ctx.sendLine('{yellow}You already have an AI portrait.{/}');
    ctx.sendLine('{dim}Use "portrait clear" first to regenerate.{/}');
    return;
  }

  // Check if AI image generation is available
  if (typeof efuns === 'undefined' || !efuns.aiImageAvailable?.()) {
    ctx.sendLine('{red}AI image generation is not available.{/}');
    ctx.sendLine('{dim}Contact an administrator to enable this feature.{/}');
    return;
  }

  ctx.sendLine('{cyan}Generating AI portrait from your character description...{/}');
  ctx.sendLine('{dim}This may take a moment.{/}');

  try {
    // Build the prompt
    const prompt = `Create a portrait for a fantasy RPG character based on this description:

${description}

Style requirements:
- Fantasy portrait art style with rich colors
- Portrait/headshot composition showing face and upper body
- Dramatic lighting with atmospheric mood
- Painterly texture suitable for a game character portrait
- Professional quality, detailed and polished`;

    const result = await efuns.aiImageGenerate(prompt, {
      aspectRatio: '1:1',
    });

    if (result && result.success && result.imageBase64 && result.mimeType) {
      // Store as data URI
      const dataUri = `data:${result.mimeType};base64,${result.imageBase64}`;
      player.setProperty('profilePortrait', dataUri);
      player.setProperty('profilePortraitGeneratedAt', Date.now());

      ctx.sendLine('');
      ctx.sendLine('{green}Portrait generated successfully!{/}');
      ctx.sendLine('{dim}Your AI portrait will now be shown in the combat panel.{/}');
    } else {
      const errorMsg = result?.error || 'Unknown error';
      ctx.sendLine(`{red}Failed to generate portrait: ${errorMsg}{/}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    ctx.sendLine(`{red}Error generating portrait: ${errorMsg}{/}`);
  }
}

/**
 * Clear AI portrait.
 */
function cmdClear(ctx: CommandContext): void {
  const player = ctx.player as PlayerWithProperties;
  const portrait = player.getProperty('profilePortrait');

  if (!portrait) {
    ctx.sendLine('{dim}You have no AI portrait to clear.{/}');
    return;
  }

  player.deleteProperty('profilePortrait');
  player.deleteProperty('profilePortraitGeneratedAt');
  ctx.sendLine('{green}AI portrait cleared. Your base avatar will be used instead.{/}');
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim().toLowerCase();

  switch (args) {
    case '':
      cmdStatus(ctx);
      break;

    case 'generate':
    case 'gen':
      await cmdGenerate(ctx);
      break;

    case 'clear':
      cmdClear(ctx);
      break;

    case 'help':
      showUsage(ctx);
      break;

    default:
      ctx.sendLine(`{red}Unknown subcommand: ${args}{/}`);
      showUsage(ctx);
      break;
  }
}

export default { name, description, usage, execute };
