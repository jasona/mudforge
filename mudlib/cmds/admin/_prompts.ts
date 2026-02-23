/**
 * Prompts command - Manage AI prompt templates (admin only).
 *
 * Usage:
 *   prompts                    - List all prompt IDs
 *   prompts <id>               - View a specific prompt template
 *   prompts edit <id>          - Open prompt in IDE editor
 *   prompts reset <id>         - Reset a prompt to its default
 *   prompts reload             - Reload overrides from disk
 */

import type { MudObject } from '../../lib/std.js';

interface PlayerWithInputHandler extends MudObject {
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void;
  receive(message: string): void;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['prompts'];
export const description = 'Manage AI prompt templates (admin only)';
export const usage = 'prompts [id] | prompts edit <id> | prompts reset <id> | prompts reload';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  // No args - list all prompts
  if (!args) {
    listAllPrompts(ctx);
    return;
  }

  const parts = args.split(/\s+/);
  const firstArg = parts[0].toLowerCase();

  // Handle reload command
  if (firstArg === 'reload') {
    await reloadPrompts(ctx);
    return;
  }

  // Handle reset command
  if (firstArg === 'reset') {
    if (parts.length < 2) {
      ctx.sendLine('{red}Usage: prompts reset <id>{/}');
      return;
    }
    await resetPrompt(ctx, parts[1]);
    return;
  }

  // Handle edit command
  if (firstArg === 'edit') {
    if (parts.length < 2) {
      ctx.sendLine('{red}Usage: prompts edit <id>{/}');
      return;
    }
    await editPrompt(ctx, parts[1]);
    return;
  }

  // Handle set command (inline)
  if (firstArg === 'set') {
    if (parts.length < 3) {
      ctx.sendLine('{red}Usage: prompts set <id> <template>{/}');
      ctx.sendLine('{dim}Tip: Use "prompts edit <id>" for multiline templates.{/}');
      return;
    }
    const id = parts[1];
    const template = parts.slice(2).join(' ');
    await setPrompt(ctx, id, template);
    return;
  }

  // Single arg - view that prompt
  showPrompt(ctx, firstArg);
}

/**
 * List all prompt IDs with their override status.
 */
function listAllPrompts(ctx: CommandContext): void {
  if (typeof efuns === 'undefined' || !efuns.getPromptIds) {
    ctx.sendLine('{red}Prompt management not available.{/}');
    return;
  }

  const ids = efuns.getPromptIds();
  if (ids.length === 0) {
    ctx.sendLine('{yellow}No prompt templates registered.{/}');
    return;
  }

  ctx.sendLine('{cyan}=== AI Prompt Templates ==={/}');
  ctx.sendLine('');

  // Group by prefix
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const prefix = id.split('.')[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(id);
  }

  for (const [prefix, groupIds] of groups) {
    ctx.sendLine(`{bold}${prefix}{/}`);
    for (const id of groupIds) {
      const hasOverride = efuns.hasPromptOverride?.(id) ?? false;
      const marker = hasOverride ? '{yellow}*{/}' : ' ';
      const template = efuns.getPromptTemplate(id) ?? '';
      const preview = template.slice(0, 60).replace(/\n/g, ' ');
      ctx.sendLine(`  ${marker} {cyan}${id}{/} {dim}${preview}...{/}`);
    }
    ctx.sendLine('');
  }

  ctx.sendLine('{dim}* = has custom override{/}');
  ctx.sendLine('');
  ctx.sendLine('{dim}Use "prompts <id>" to view full template.{/}');
  ctx.sendLine('{dim}Use "prompts edit <id>" to edit in IDE.{/}');
  ctx.sendLine('{dim}Use "prompts reset <id>" to restore default.{/}');
}

/**
 * Show a specific prompt template.
 */
function showPrompt(ctx: CommandContext, id: string): void {
  if (typeof efuns === 'undefined' || !efuns.getPromptTemplate) {
    ctx.sendLine('{red}Prompt management not available.{/}');
    return;
  }

  const template = efuns.getPromptTemplate(id);
  if (template === undefined) {
    ctx.sendLine(`{red}Unknown prompt ID: ${id}{/}`);
    ctx.sendLine('{dim}Use "prompts" to list all available IDs.{/}');
    return;
  }

  const hasOverride = efuns.hasPromptOverride?.(id) ?? false;

  ctx.sendLine(`{cyan}=== Prompt: ${id} ==={/}`);
  if (hasOverride) {
    ctx.sendLine('{yellow}(Custom override active){/}');
  }
  ctx.sendLine('');

  // Show the template with line numbers
  const lines = template.split('\n');
  for (let i = 0; i < lines.length; i++) {
    ctx.sendLine(`{dim}${String(i + 1).padStart(3)}|{/} ${lines[i]}`);
  }
  ctx.sendLine('');

  // Show variables used
  const vars = new Set<string>();
  const varRegex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = varRegex.exec(template)) !== null) {
    if (match[1] !== 'if') vars.add(match[1]);
  }
  const condRegex = /\{\{#if\s+(\w+)\}\}/g;
  while ((match = condRegex.exec(template)) !== null) {
    vars.add(match[1]);
  }
  if (vars.size > 0) {
    ctx.sendLine(`{dim}Variables: ${[...vars].sort().join(', ')}{/}`);
  }

  if (hasOverride) {
    ctx.sendLine('');
    ctx.sendLine('{dim}Use "prompts reset ' + id + '" to restore default.{/}');
  }
}

/**
 * Edit a prompt in the IDE editor.
 */
async function editPrompt(ctx: CommandContext, id: string): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.getPromptTemplate || !efuns.ideOpen) {
    ctx.sendLine('{red}Prompt editing not available.{/}');
    return;
  }

  const template = efuns.getPromptTemplate(id);
  if (template === undefined) {
    ctx.sendLine(`{red}Unknown prompt ID: ${id}{/}`);
    ctx.sendLine('{dim}Use "prompts" to list all available IDs.{/}');
    return;
  }

  const tempPath = `/data/config/.prompt-edit-${id.replace(/\./g, '-')}.txt`;
  const player = ctx.player as PlayerWithInputHandler;

  ctx.sendLine(`{cyan}Opening prompt "${id}" in IDE editor...{/}`);
  ctx.sendLine('{dim}Save in the editor to update the prompt. Close when done.{/}');

  // Open in IDE
  efuns.ideOpen({
    action: 'open',
    path: tempPath,
    content: template,
    language: 'markdown',
  });

  // Set up input handler for IDE responses
  player.setInputHandler(async (input: string) => {
    if (!input.startsWith('\x00[IDE]')) {
      const cmd = input.trim().toLowerCase();
      if (cmd === 'close' || cmd === 'cancel' || cmd === 'q' || cmd === 'quit') {
        player.setInputHandler(null);
        player.receive('{cyan}Prompt editor closed.{/}\n');
        // Clean up temp file
        try {
          if (efuns.fileExists && await efuns.fileExists(tempPath)) {
            await efuns.deleteFile(tempPath);
          }
        } catch {
          // Ignore cleanup errors
        }
        return;
      }
      player.receive('{dim}(IDE is open in browser. Type "close" to exit.){/}\n');
      return;
    }

    // Parse IDE message
    const jsonStr = input.slice(6); // Remove \x00[IDE] prefix
    let message: { action: string; path?: string; content?: string };
    try {
      message = JSON.parse(jsonStr);
    } catch {
      player.receive('{red}Invalid IDE message.{/}\n');
      return;
    }

    if (message.action === 'save' && message.content !== undefined) {
      const result = await efuns.setPromptOverride(id, message.content);
      if (result.success) {
        player.receive(`{green}Prompt "${id}" updated and saved.{/}\n`);

        // Send save-result back to IDE
        efuns.ideOpen({
          action: 'save-result',
          path: tempPath,
          success: true,
        } as Record<string, unknown>);
      } else {
        player.receive(`{red}Failed to save prompt: ${result.error}{/}\n`);
      }
    } else if (message.action === 'close') {
      player.setInputHandler(null);
      player.receive('{cyan}Prompt editor closed.{/}\n');
      // Clean up temp file
      try {
        if (efuns.fileExists && await efuns.fileExists(tempPath)) {
          await efuns.deleteFile(tempPath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  });
}

/**
 * Set a prompt override directly.
 */
async function setPrompt(ctx: CommandContext, id: string, template: string): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.setPromptOverride) {
    ctx.sendLine('{red}Prompt management not available.{/}');
    return;
  }

  const existing = efuns.getPromptTemplate?.(id);
  if (existing === undefined) {
    ctx.sendLine(`{red}Unknown prompt ID: ${id}{/}`);
    return;
  }

  const result = await efuns.setPromptOverride(id, template);
  if (result.success) {
    ctx.sendLine(`{green}Prompt "${id}" updated.{/}`);
    ctx.sendLine('{dim}Changes saved to disk.{/}');
  } else {
    ctx.sendLine(`{red}Failed: ${result.error}{/}`);
  }
}

/**
 * Reset a prompt to its default.
 */
async function resetPrompt(ctx: CommandContext, id: string): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.resetPromptOverride) {
    ctx.sendLine('{red}Prompt management not available.{/}');
    return;
  }

  const existing = efuns.getPromptTemplate?.(id);
  if (existing === undefined) {
    ctx.sendLine(`{red}Unknown prompt ID: ${id}{/}`);
    return;
  }

  const hadOverride = efuns.hasPromptOverride?.(id) ?? false;
  if (!hadOverride) {
    ctx.sendLine(`{yellow}Prompt "${id}" is already at its default.{/}`);
    return;
  }

  const result = await efuns.resetPromptOverride(id);
  if (result.success) {
    ctx.sendLine(`{green}Prompt "${id}" reset to default.{/}`);
    ctx.sendLine('{dim}Changes saved to disk.{/}');
  } else {
    ctx.sendLine(`{red}Failed: ${result.error}{/}`);
  }
}

/**
 * Reload prompt overrides from disk.
 */
async function reloadPrompts(ctx: CommandContext): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.reloadPrompts) {
    ctx.sendLine('{red}Prompt management not available.{/}');
    return;
  }

  await efuns.reloadPrompts();
  ctx.sendLine('{green}Prompt overrides reloaded from disk.{/}');
}

export default { name, description, usage, execute };
