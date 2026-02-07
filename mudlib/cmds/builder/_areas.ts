/**
 * Areas command - Manage draft areas for builders.
 *
 * Usage:
 *   areas                         - List your areas
 *   areas gui                     - Open area builder GUI
 *   areas new <region> <subregion> <name> - Create a new draft area
 *   areas import <path> [options] - Import existing area into builder
 *   areas info <id>               - Show area details
 *   areas validate <id>           - Validate an area
 *   areas delete <id>             - Delete a draft area
 *   areas publish <id>            - Publish area to game files
 *   areas addcollab <id> <player> - Add a collaborator
 *   areas rmcollab <id> <player>  - Remove a collaborator
 */

import type { MudObject } from '../../lib/std.js';
import { getAreaDaemon } from '../../daemons/area.js';
import { openAreaSelector, type GUIPlayer } from '../../lib/area-builder-gui.js';
import type { AreaDefinition, AreaStatus } from '../../lib/area-types.js';
import { parseArgs } from '../../lib/text-utils.js';

interface Player extends MudObject {
  name: string;
  cwd: string;
}

interface CommandContext {
  player: Player;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['areas', 'area'];
export const description = 'Manage draft areas for building';
export const usage = 'areas [command] [args...]';

/**
 * Format a status with color.
 */
function formatStatus(status: AreaStatus): string {
  switch (status) {
    case 'draft':
      return '{yellow}draft{/}';
    case 'review':
      return '{cyan}review{/}';
    case 'published':
      return '{green}published{/}';
    default:
      return status;
  }
}

/**
 * Format a timestamp to a readable date.
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * List areas command.
 */
function listAreas(ctx: CommandContext): void {
  const daemon = getAreaDaemon();
  const playerName = ctx.player.name.toLowerCase();
  const areas = daemon.getAreasForBuilder(playerName);

  if (areas.length === 0) {
    ctx.sendLine('{dim}You have no areas.{/}');
    ctx.sendLine('');
    ctx.sendLine('Use {cyan}areas new <region> <subregion> <name>{/} to create one.');
    return;
  }

  ctx.sendLine('{cyan}Your Areas:{/}');
  ctx.sendLine('');

  // Table header
  ctx.sendLine('{dim}ID                          Name                    Rooms  Status     Updated{/}');
  ctx.sendLine('{dim}' + '-'.repeat(85) + '{/}');

  for (const area of areas) {
    const isOwner = area.owner === playerName;
    const ownerIndicator = isOwner ? '' : ' {dim}(collab){/}';
    const id = area.id.padEnd(26);
    const name = (area.name.length > 20 ? area.name.slice(0, 17) + '...' : area.name).padEnd(22);
    const rooms = String(area.rooms.length).padStart(5);
    const status = formatStatus(area.status).padEnd(18); // Extra padding for color codes
    const updated = formatDate(area.updatedAt);

    ctx.sendLine(`${id}  ${name}  ${rooms}  ${status}  ${updated}${ownerIndicator}`);
  }

  ctx.sendLine('');
  ctx.sendLine(`{dim}Total: ${areas.length} area(s){/}`);
  ctx.sendLine('');
  ctx.sendLine('{dim}Tip: Use {/}{cyan}areas gui{/}{dim} to open the visual area builder.{/}');
}

/**
 * Create new area command.
 */
function createArea(ctx: CommandContext, args: string[]): void {
  if (args.length < 3) {
    ctx.sendLine('{yellow}Usage: areas new <region> <subregion> <name>{/}');
    ctx.sendLine('');
    ctx.sendLine('Example: {cyan}areas new valdoria dark_caves "The Dark Caves"{/}');
    return;
  }

  const [region, subregion, ...nameParts] = args;
  const name = nameParts.join(' ');

  // Validate region/subregion format
  if (!/^[a-z0-9_]+$/.test(region)) {
    ctx.sendLine('{red}Region must be lowercase letters, numbers, and underscores only.{/}');
    return;
  }
  if (!/^[a-z0-9_]+$/.test(subregion)) {
    ctx.sendLine('{red}Subregion must be lowercase letters, numbers, and underscores only.{/}');
    return;
  }

  const daemon = getAreaDaemon();
  const playerName = ctx.player.name.toLowerCase();

  try {
    const area = daemon.createArea(playerName, {
      name,
      region,
      subregion,
    });

    ctx.sendLine('{green}Area created successfully!{/}');
    ctx.sendLine('');
    ctx.sendLine(`  ID: {cyan}${area.id}{/}`);
    ctx.sendLine(`  Name: ${area.name}`);
    ctx.sendLine(`  Path: /areas/${area.region}/${area.subregion}/`);
    ctx.sendLine('');
    ctx.sendLine('Use {cyan}areas info ' + area.id + '{/} to see details.');

    // Auto-save
    daemon.save();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    ctx.sendLine(`{red}Failed to create area: ${message}{/}`);
  }
}

/**
 * Show area info command.
 */
function showAreaInfo(ctx: CommandContext, areaId: string): void {
  const daemon = getAreaDaemon();
  const area = daemon.getArea(areaId);

  if (!area) {
    ctx.sendLine(`{red}Area not found: ${areaId}{/}`);
    return;
  }

  // Check access
  const playerName = ctx.player.name.toLowerCase();
  if (!daemon.canBuilderAccess(playerName, areaId)) {
    ctx.sendLine('{red}You do not have access to this area.{/}');
    return;
  }

  ctx.sendLine(`{cyan}Area: ${area.name}{/}`);
  ctx.sendLine('');
  ctx.sendLine(`  ID: {white}${area.id}{/}`);
  ctx.sendLine(`  Status: ${formatStatus(area.status)}`);
  ctx.sendLine(`  Version: ${area.version}`);
  ctx.sendLine(`  Owner: ${efuns.capitalize(area.owner)}`);
  if (area.collaborators.length > 0) {
    ctx.sendLine(`  Collaborators: ${area.collaborators.map(c => efuns.capitalize(c)).join(', ')}`);
  }
  ctx.sendLine('');
  ctx.sendLine(`  Region: ${area.region}`);
  ctx.sendLine(`  Subregion: ${area.subregion}`);
  ctx.sendLine(`  Path: /areas/${area.region}/${area.subregion}/`);
  ctx.sendLine('');
  ctx.sendLine(`  Grid Size: ${area.gridSize.width}x${area.gridSize.height}x${area.gridSize.depth}`);
  ctx.sendLine(`  Rooms: ${area.rooms.length}`);
  ctx.sendLine(`  NPCs: ${area.npcs.length}`);
  ctx.sendLine(`  Items: ${area.items.length}`);
  ctx.sendLine('');
  if (area.description) {
    ctx.sendLine(`  Description: ${area.description}`);
  }
  if (area.theme) {
    ctx.sendLine(`  Theme: ${area.theme}`);
  }
  if (area.mood) {
    ctx.sendLine(`  Mood: ${area.mood}`);
  }
  if (area.tags.length > 0) {
    ctx.sendLine(`  Tags: ${area.tags.join(', ')}`);
  }
  if (area.loreReferences.length > 0) {
    ctx.sendLine(`  Lore: ${area.loreReferences.join(', ')}`);
  }
  ctx.sendLine('');
  ctx.sendLine(`  Created: ${formatDate(area.createdAt)}`);
  ctx.sendLine(`  Updated: ${formatDate(area.updatedAt)}`);
  if (area.publishedAt) {
    ctx.sendLine(`  Published: ${formatDate(area.publishedAt)}`);
    ctx.sendLine(`  Published Path: ${area.publishedPath}`);
  }

  // List rooms
  if (area.rooms.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{cyan}Rooms:{/}');
    for (const room of area.rooms) {
      const entranceMarker = room.isEntrance ? ' {green}[entrance]{/}' : '';
      const exitCount = Object.keys(room.exits).length;
      ctx.sendLine(`  {white}${room.id}{/} - ${room.shortDesc} (${room.terrain}, ${exitCount} exits)${entranceMarker}`);
    }
  }

  // List NPCs
  if (area.npcs.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{cyan}NPCs:{/}');
    for (const npc of area.npcs) {
      ctx.sendLine(`  {white}${npc.id}{/} - ${npc.name} (Level ${npc.level})`);
    }
  }

  // List Items
  if (area.items.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{cyan}Items:{/}');
    for (const item of area.items) {
      ctx.sendLine(`  {white}${item.id}{/} - ${item.name} (${item.type})`);
    }
  }
}

/**
 * Validate area command.
 */
function validateArea(ctx: CommandContext, areaId: string): void {
  const daemon = getAreaDaemon();
  const area = daemon.getArea(areaId);

  if (!area) {
    ctx.sendLine(`{red}Area not found: ${areaId}{/}`);
    return;
  }

  // Check access
  const playerName = ctx.player.name.toLowerCase();
  if (!daemon.canBuilderAccess(playerName, areaId)) {
    ctx.sendLine('{red}You do not have access to this area.{/}');
    return;
  }

  const result = daemon.validateArea(areaId);

  ctx.sendLine(`{cyan}Validation Results for: ${area.name}{/}`);
  ctx.sendLine('');

  if (result.valid) {
    ctx.sendLine('{green}Area is valid and ready to publish!{/}');
  } else {
    ctx.sendLine('{red}Area has validation errors:{/}');
  }

  if (result.errors.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{red}Errors:{/}');
    for (const error of result.errors) {
      ctx.sendLine(`  {red}*{/} ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{yellow}Warnings:{/}');
    for (const warning of result.warnings) {
      ctx.sendLine(`  {yellow}*{/} ${warning}`);
    }
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    ctx.sendLine('');
    ctx.sendLine('{dim}No issues found.{/}');
  }
}

/**
 * Delete area command.
 */
async function deleteArea(ctx: CommandContext, areaId: string): Promise<void> {
  const daemon = getAreaDaemon();
  const area = daemon.getArea(areaId);

  if (!area) {
    ctx.sendLine(`{red}Area not found: ${areaId}{/}`);
    return;
  }

  // Check ownership (only owner can delete)
  const playerName = ctx.player.name.toLowerCase();
  if (area.owner !== playerName) {
    ctx.sendLine('{red}Only the area owner can delete an area.{/}');
    return;
  }

  try {
    daemon.deleteArea(areaId);
    await daemon.save();
    ctx.sendLine(`{green}Area "${area.name}" deleted successfully.{/}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    ctx.sendLine(`{red}Failed to delete area: ${message}{/}`);
  }
}

/**
 * Publish area command.
 */
async function publishArea(ctx: CommandContext, areaId: string): Promise<void> {
  const daemon = getAreaDaemon();
  const area = daemon.getArea(areaId);

  if (!area) {
    ctx.sendLine(`{red}Area not found: ${areaId}{/}`);
    return;
  }

  // Check access
  const playerName = ctx.player.name.toLowerCase();
  if (!daemon.canBuilderAccess(playerName, areaId)) {
    ctx.sendLine('{red}You do not have access to this area.{/}');
    return;
  }

  ctx.sendLine(`{cyan}Publishing area: ${area.name}...{/}`);
  ctx.sendLine('');

  // Validate first
  const validation = daemon.validateArea(areaId);
  if (!validation.valid) {
    ctx.sendLine('{red}Cannot publish - validation failed:{/}');
    for (const error of validation.errors) {
      ctx.sendLine(`  {red}*{/} ${error}`);
    }
    return;
  }

  if (validation.warnings.length > 0) {
    ctx.sendLine('{yellow}Warnings (publishing anyway):{/}');
    for (const warning of validation.warnings) {
      ctx.sendLine(`  {yellow}*{/} ${warning}`);
    }
    ctx.sendLine('');
  }

  const result = await daemon.publishArea(areaId);

  if (result.success) {
    ctx.sendLine('{green}Area published successfully!{/}');
    ctx.sendLine('');
    ctx.sendLine(`  Path: ${result.path}`);

    // Show file statistics
    const created = result.filesCreated?.length ?? 0;
    const updated = result.filesUpdated?.length ?? 0;
    const skipped = result.filesSkipped ?? 0;
    const deleted = result.filesDeleted?.length ?? 0;

    if (created > 0) {
      ctx.sendLine(`  Files created: ${created}`);
    }
    if (updated > 0) {
      ctx.sendLine(`  Files updated: ${updated}`);
    }
    if (skipped > 0) {
      ctx.sendLine(`  Files skipped: ${skipped} (unchanged)`);
    }
    if (deleted > 0) {
      ctx.sendLine(`  Files deleted: ${deleted} (removed entities)`);
    }

    ctx.sendLine(`  Rooms: ${result.roomCount}`);
    ctx.sendLine(`  NPCs: ${result.npcCount}`);
    ctx.sendLine(`  Items: ${result.itemCount}`);
    ctx.sendLine('');
    ctx.sendLine('{dim}The area will be available after the next driver restart.{/}');
    ctx.sendLine('{dim}Or use "reload" to load it immediately.{/}');
  } else {
    ctx.sendLine(`{red}Failed to publish: ${result.error}{/}`);
  }
}

/**
 * Add collaborator command.
 */
async function addCollaborator(ctx: CommandContext, areaId: string, collaborator: string): Promise<void> {
  const daemon = getAreaDaemon();
  const area = daemon.getArea(areaId);

  if (!area) {
    ctx.sendLine(`{red}Area not found: ${areaId}{/}`);
    return;
  }

  // Check ownership
  const playerName = ctx.player.name.toLowerCase();
  if (area.owner !== playerName) {
    ctx.sendLine('{red}Only the area owner can add collaborators.{/}');
    return;
  }

  // Check if player exists
  const exists = await efuns.playerExists(collaborator.toLowerCase());
  if (!exists) {
    ctx.sendLine(`{red}Player "${collaborator}" not found.{/}`);
    return;
  }

  if (daemon.addCollaborator(areaId, collaborator)) {
    await daemon.save();
    ctx.sendLine(`{green}Added ${efuns.capitalize(collaborator)} as a collaborator on "${area.name}".{/}`);
  } else {
    ctx.sendLine('{yellow}Collaborator already added.{/}');
  }
}

/**
 * Remove collaborator command.
 */
async function removeCollaborator(ctx: CommandContext, areaId: string, collaborator: string): Promise<void> {
  const daemon = getAreaDaemon();
  const area = daemon.getArea(areaId);

  if (!area) {
    ctx.sendLine(`{red}Area not found: ${areaId}{/}`);
    return;
  }

  // Check ownership
  const playerName = ctx.player.name.toLowerCase();
  if (area.owner !== playerName) {
    ctx.sendLine('{red}Only the area owner can remove collaborators.{/}');
    return;
  }

  if (daemon.removeCollaborator(areaId, collaborator)) {
    await daemon.save();
    ctx.sendLine(`{green}Removed ${efuns.capitalize(collaborator)} from "${area.name}".{/}`);
  } else {
    ctx.sendLine('{yellow}Collaborator not found.{/}');
  }
}

/**
 * Open the GUI area selector.
 */
async function openGUI(ctx: CommandContext): Promise<void> {
  const daemon = getAreaDaemon();
  const player = ctx.player as unknown as GUIPlayer;

  await openAreaSelector(player, daemon);
}

/**
 * Import an existing area into the builder.
 */
async function importArea(ctx: CommandContext, args: string[]): Promise<void> {
  if (args.length < 1) {
    ctx.sendLine('{yellow}Usage: areas import <path> [options]{/}');
    ctx.sendLine('');
    ctx.sendLine('Options:');
    ctx.sendLine('  {white}--preview{/}      Show what would be imported without saving');
    ctx.sendLine('  {white}--force{/}        Overwrite existing draft if present');
    ctx.sendLine('  {white}--name <name>{/}  Set custom area name');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  {cyan}areas import /areas/valdoria/aldric{/}');
    ctx.sendLine('  {cyan}areas import /areas/valdoria/aldric --preview{/}');
    ctx.sendLine('  {cyan}areas import /areas/valdoria/aldric --force --name "Town of Aldric"{/}');
    return;
  }

  // Parse arguments
  let sourcePath = '';
  let preview = false;
  let force = false;
  let customName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--preview') {
      preview = true;
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--name' && args[i + 1]) {
      customName = args[++i];
    } else if (!arg.startsWith('--')) {
      sourcePath = arg;
    }
  }

  if (!sourcePath) {
    ctx.sendLine('{red}Missing path argument.{/}');
    return;
  }

  // Normalize path
  if (!sourcePath.startsWith('/')) {
    sourcePath = '/' + sourcePath;
  }
  if (!sourcePath.startsWith('/areas/')) {
    ctx.sendLine('{red}Path must start with /areas/{/}');
    return;
  }

  const daemon = getAreaDaemon();
  const playerName = ctx.player.name.toLowerCase();

  ctx.sendLine(`{cyan}${preview ? 'Previewing' : 'Importing'} area from: ${sourcePath}...{/}`);
  ctx.sendLine('');

  const result = await daemon.importArea(playerName, sourcePath, {
    name: customName,
    force,
    preview,
  });

  if (!result.success) {
    ctx.sendLine(`{red}Import failed: ${result.error}{/}`);
    return;
  }

  // Show statistics
  ctx.sendLine('{green}Import ' + (preview ? 'preview' : 'successful') + '!{/}');
  ctx.sendLine('');
  ctx.sendLine('Statistics:');
  ctx.sendLine(`  Rooms imported:  {white}${result.stats.roomsImported}{/}`);
  ctx.sendLine(`  NPCs imported:   {white}${result.stats.npcsImported}{/}`);
  ctx.sendLine(`  Items imported:  {white}${result.stats.itemsImported}{/}`);

  if (result.stats.filesSkipped.length > 0) {
    ctx.sendLine(`  Files skipped:   {yellow}${result.stats.filesSkipped.length}{/}`);
  }

  if (result.stats.parseErrors.length > 0) {
    ctx.sendLine(`  Parse errors:    {red}${result.stats.parseErrors.length}{/}`);
  }

  // Show warnings
  if (result.warnings.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{yellow}Warnings:{/}');
    for (const warning of result.warnings) {
      ctx.sendLine(`  {yellow}*{/} ${warning}`);
    }
  }

  // Show parse errors
  if (result.stats.parseErrors.length > 0) {
    ctx.sendLine('');
    ctx.sendLine('{red}Parse errors:{/}');
    for (const err of result.stats.parseErrors.slice(0, 5)) {
      ctx.sendLine(`  {red}*{/} ${err.file}: ${err.error}`);
    }
    if (result.stats.parseErrors.length > 5) {
      ctx.sendLine(`  {dim}... and ${result.stats.parseErrors.length - 5} more errors{/}`);
    }
  }

  if (!preview && result.areaId) {
    ctx.sendLine('');
    ctx.sendLine(`Area ID: {cyan}${result.areaId}{/}`);
    ctx.sendLine('');
    ctx.sendLine('Use {cyan}areas gui{/} to open the visual editor.');
    ctx.sendLine('Use {cyan}areas info ' + result.areaId + '{/} to see details.');
  }
}

/**
 * Show help.
 */
function showHelp(ctx: CommandContext): void {
  ctx.sendLine('{cyan}Area Builder - Manage your draft areas{/}');
  ctx.sendLine('');
  ctx.sendLine('Commands:');
  ctx.sendLine('  {white}areas{/}                              - List your areas');
  ctx.sendLine('  {white}areas gui{/}                          - Open visual area builder');
  ctx.sendLine('  {white}areas new{/} <region> <subregion> <name> - Create a new area');
  ctx.sendLine('  {white}areas import{/} <path> [options]      - Import existing area');
  ctx.sendLine('  {white}areas info{/} <id>                    - Show area details');
  ctx.sendLine('  {white}areas validate{/} <id>                - Validate an area');
  ctx.sendLine('  {white}areas delete{/} <id>                  - Delete a draft area');
  ctx.sendLine('  {white}areas publish{/} <id>                 - Publish area to game');
  ctx.sendLine('  {white}areas addcollab{/} <id> <player>      - Add a collaborator');
  ctx.sendLine('  {white}areas rmcollab{/} <id> <player>       - Remove a collaborator');
  ctx.sendLine('');
  ctx.sendLine('Import options:');
  ctx.sendLine('  {dim}--preview{/}   Show what would be imported without saving');
  ctx.sendLine('  {dim}--force{/}     Overwrite existing draft if present');
  ctx.sendLine('  {dim}--name <n>{/}  Set custom area name');
  ctx.sendLine('');
  ctx.sendLine('Area ID format: {dim}<region>:<subregion>{/}');
  ctx.sendLine('Example: {dim}valdoria:dark_caves{/}');
}

export async function execute(ctx: CommandContext): Promise<void> {
  const rawArgs = ctx.args.trim();

  // No args = list areas
  if (!rawArgs) {
    listAreas(ctx);
    return;
  }

  const args = parseArgs(rawArgs);
  const command = args[0].toLowerCase();
  const commandArgs = args.slice(1);

  switch (command) {
    case 'help':
    case '?':
      showHelp(ctx);
      break;

    case 'list':
    case 'ls':
      listAreas(ctx);
      break;

    case 'gui':
    case 'visual':
    case 'editor':
      await openGUI(ctx);
      break;

    case 'new':
    case 'create':
      createArea(ctx, commandArgs);
      break;

    case 'import':
      await importArea(ctx, commandArgs);
      break;

    case 'info':
    case 'show':
      if (!commandArgs[0]) {
        ctx.sendLine('{yellow}Usage: areas info <area-id>{/}');
        return;
      }
      showAreaInfo(ctx, commandArgs[0]);
      break;

    case 'validate':
    case 'check':
      if (!commandArgs[0]) {
        ctx.sendLine('{yellow}Usage: areas validate <area-id>{/}');
        return;
      }
      validateArea(ctx, commandArgs[0]);
      break;

    case 'delete':
    case 'rm':
    case 'remove':
      if (!commandArgs[0]) {
        ctx.sendLine('{yellow}Usage: areas delete <area-id>{/}');
        return;
      }
      await deleteArea(ctx, commandArgs[0]);
      break;

    case 'publish':
    case 'pub':
      if (!commandArgs[0]) {
        ctx.sendLine('{yellow}Usage: areas publish <area-id>{/}');
        return;
      }
      await publishArea(ctx, commandArgs[0]);
      break;

    case 'addcollab':
    case 'invite':
      if (!commandArgs[0] || !commandArgs[1]) {
        ctx.sendLine('{yellow}Usage: areas addcollab <area-id> <player>{/}');
        return;
      }
      await addCollaborator(ctx, commandArgs[0], commandArgs[1]);
      break;

    case 'rmcollab':
    case 'uninvite':
      if (!commandArgs[0] || !commandArgs[1]) {
        ctx.sendLine('{yellow}Usage: areas rmcollab <area-id> <player>{/}');
        return;
      }
      await removeCollaborator(ctx, commandArgs[0], commandArgs[1]);
      break;

    default:
      // Maybe it's an area ID for quick info
      const daemon = getAreaDaemon();
      if (daemon.getArea(command)) {
        showAreaInfo(ctx, command);
      } else {
        ctx.sendLine(`{red}Unknown command: ${command}{/}`);
        ctx.sendLine('Use {cyan}areas help{/} for a list of commands.');
      }
  }
}

export default { name, description, usage, execute };
