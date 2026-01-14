/**
 * Fileperm command - Manage file-level permissions by role (admin only).
 *
 * Usage:
 *   fileperm                          - Show all path permissions
 *   fileperm builder                  - Show builder paths
 *   fileperm senior                   - Show senior builder paths
 *   fileperm protected                - Show protected paths (admin-only)
 *   fileperm forbidden                - Show forbidden files
 *
 *   fileperm add builder <path>       - Add a builder path
 *   fileperm remove builder <path>    - Remove a builder path
 *   fileperm add senior <path>        - Add a senior builder path
 *   fileperm remove senior <path>     - Remove a senior builder path
 *   fileperm add protected <path>     - Add a protected path
 *   fileperm remove protected <path>  - Remove a protected path
 *   fileperm add forbidden <file>     - Add a forbidden file
 *   fileperm remove forbidden <file>  - Remove a forbidden file
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = 'fileperm';
export const description = 'Manage file-level permissions by role (admin only)';
export const usage = 'fileperm [show|add|remove] [builder|senior|protected|forbidden] [path]';

type PathCategory = 'builder' | 'senior' | 'protected' | 'forbidden';

const CATEGORY_LABELS: Record<PathCategory, string> = {
  builder: 'Builder Paths',
  senior: 'Senior Builder Paths',
  protected: 'Protected Paths (Admin Only)',
  forbidden: 'Forbidden Files',
};

const CATEGORY_DESCRIPTIONS: Record<PathCategory, string> = {
  builder: 'Builders can write to these paths',
  senior: 'Senior builders can write to these paths (+ builder paths)',
  protected: 'Only administrators can write to these paths',
  forbidden: 'No one can modify these files from in-game',
};

function getPaths(category: PathCategory): string[] {
  switch (category) {
    case 'builder':
      return efuns.getBuilderPaths();
    case 'senior':
      return efuns.getSeniorPaths();
    case 'protected':
      return efuns.getProtectedPaths();
    case 'forbidden':
      return efuns.getForbiddenFiles();
  }
}

function addPath(category: PathCategory, path: string): { success: boolean; error?: string } {
  switch (category) {
    case 'builder':
      return efuns.addBuilderPath(path);
    case 'senior':
      return efuns.addSeniorPath(path);
    case 'protected':
      return efuns.addProtectedPath(path);
    case 'forbidden':
      return efuns.addForbiddenFile(path);
  }
}

function removePath(category: PathCategory, path: string): { success: boolean; error?: string } {
  switch (category) {
    case 'builder':
      return efuns.removeBuilderPath(path);
    case 'senior':
      return efuns.removeSeniorPath(path);
    case 'protected':
      return efuns.removeProtectedPath(path);
    case 'forbidden':
      return efuns.removeForbiddenFile(path);
  }
}

function showCategory(ctx: CommandContext, category: PathCategory): void {
  const paths = getPaths(category);
  ctx.sendLine(`{cyan}${CATEGORY_LABELS[category]}{/}`);
  ctx.sendLine(`{dim}${CATEGORY_DESCRIPTIONS[category]}{/}`);
  ctx.sendLine('');
  if (paths.length === 0) {
    ctx.sendLine('  {dim}(none){/}');
  } else {
    for (const path of paths) {
      ctx.sendLine(`  {yellow}${path}{/}`);
    }
  }
}

function showAll(ctx: CommandContext): void {
  ctx.sendLine('{green}=== File Permission Configuration ==={/}');
  ctx.sendLine('');

  const categories: PathCategory[] = ['builder', 'senior', 'protected', 'forbidden'];
  for (const category of categories) {
    showCategory(ctx, category);
    ctx.sendLine('');
  }

  ctx.sendLine('{dim}Use "fileperm add <type> <path>" or "fileperm remove <type> <path>" to modify.{/}');
}

function showUsage(ctx: CommandContext): void {
  ctx.sendLine('{yellow}Usage: fileperm [command] [type] [path]{/}');
  ctx.sendLine('');
  ctx.sendLine('Commands:');
  ctx.sendLine('  {cyan}fileperm{/}                      - Show all path permissions');
  ctx.sendLine('  {cyan}fileperm builder{/}              - Show builder paths');
  ctx.sendLine('  {cyan}fileperm senior{/}               - Show senior builder paths');
  ctx.sendLine('  {cyan}fileperm protected{/}            - Show protected paths');
  ctx.sendLine('  {cyan}fileperm forbidden{/}            - Show forbidden files');
  ctx.sendLine('');
  ctx.sendLine('  {cyan}fileperm add <type> <path>{/}    - Add a path');
  ctx.sendLine('  {cyan}fileperm remove <type> <path>{/} - Remove a path');
  ctx.sendLine('');
  ctx.sendLine('Types: {yellow}builder{/}, {yellow}senior{/}, {yellow}protected{/}, {yellow}forbidden{/}');
  ctx.sendLine('');
  ctx.sendLine('Examples:');
  ctx.sendLine('  {dim}fileperm add builder /zones/{/}');
  ctx.sendLine('  {dim}fileperm remove senior /lib/{/}');
  ctx.sendLine('  {dim}fileperm add forbidden /.secrets{/}');
}

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  // No args - show all
  if (!args) {
    showAll(ctx);
    return;
  }

  const parts = args.split(/\s+/);
  const command = parts[0].toLowerCase();

  // Show specific category
  if (['builder', 'senior', 'protected', 'forbidden'].includes(command)) {
    showCategory(ctx, command as PathCategory);
    return;
  }

  // Help
  if (command === 'help') {
    showUsage(ctx);
    return;
  }

  // Add/Remove commands
  if (command === 'add' || command === 'remove') {
    if (parts.length < 3) {
      ctx.sendLine(`{red}Usage: fileperm ${command} <type> <path>{/}`);
      ctx.sendLine('{dim}Types: builder, senior, protected, forbidden{/}');
      return;
    }

    const category = parts[1].toLowerCase();
    const path = parts.slice(2).join(' ');

    if (!['builder', 'senior', 'protected', 'forbidden'].includes(category)) {
      ctx.sendLine(`{red}Invalid type "${category}".{/}`);
      ctx.sendLine('{dim}Valid types: builder, senior, protected, forbidden{/}');
      return;
    }

    // Validate path format
    if (!path.startsWith('/')) {
      ctx.sendLine('{red}Path must start with "/".{/}');
      return;
    }

    const cat = category as PathCategory;
    let result: { success: boolean; error?: string };

    if (command === 'add') {
      // Check if already exists
      const existing = getPaths(cat);
      if (existing.includes(path)) {
        ctx.sendLine(`{yellow}Path "${path}" already exists in ${CATEGORY_LABELS[cat].toLowerCase()}.{/}`);
        return;
      }

      result = addPath(cat, path);
      if (result.success) {
        ctx.sendLine(`{green}Added "{yellow}${path}{/}{green}" to ${CATEGORY_LABELS[cat].toLowerCase()}.{/}`);
      } else {
        ctx.sendLine(`{red}Failed to add: ${result.error}{/}`);
        return;
      }
    } else {
      result = removePath(cat, path);
      if (result.success) {
        ctx.sendLine(`{green}Removed "{yellow}${path}{/}{green}" from ${CATEGORY_LABELS[cat].toLowerCase()}.{/}`);
      } else {
        ctx.sendLine(`{red}Failed to remove: ${result.error}{/}`);
        return;
      }
    }

    // Save permissions
    const saveResult = await efuns.savePermissions();
    if (!saveResult.success) {
      ctx.sendLine(`{yellow}Warning: Failed to save permissions: ${saveResult.error}{/}`);
    }
    return;
  }

  // Unknown command
  ctx.sendLine(`{red}Unknown command "${command}".{/}`);
  showUsage(ctx);
}

export default { name, description, usage, execute };
