/**
 * patch - Call a method on a living object with primitive arguments.
 *
 * Usage:
 *   patch <target> <method> [args...]
 *
 * Examples:
 *   patch me set_hit_points 50
 *   patch acer setBaseStat strength 15
 *   patch goblin setHealth 10
 *   patch me monitorEnabled true
 */

import type { MudObject } from '../../std/object.js';

interface LivingObject extends MudObject {
  id(name: string): boolean;
  name?: string;
  [key: string]: unknown;
}

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['patch'];
export const description = 'Call a method on a living object (builder only)';
export const usage = 'patch <target> <method> [args...]';

/**
 * Parse a string value into a primitive type.
 */
function parsePrimitive(value: string): string | number | boolean {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') return num;

  // String (remove quotes if present)
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * Find a living object by name in the room or as self-reference.
 */
function findTarget(player: MudObject, targetName: string): LivingObject | null {
  const name = targetName.toLowerCase();

  // Self-reference
  if (name === 'me' || name === 'self' || name === 'myself') {
    return player as LivingObject;
  }

  // Search room inventory
  const room = player.environment;
  if (!room) return null;

  for (const obj of room.inventory) {
    const living = obj as LivingObject;

    // Check by id() method
    if (living.id && living.id(name)) {
      return living;
    }

    // Check by name property
    if (living.name && living.name.toLowerCase() === name) {
      return living;
    }
  }

  return null;
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string {
  if (value === undefined) return '{dim}undefined{/}';
  if (value === null) return '{dim}null{/}';
  if (typeof value === 'string') return `{green}"${value}"{/}`;
  if (typeof value === 'number') return `{cyan}${value}{/}`;
  if (typeof value === 'boolean') return value ? '{green}true{/}' : '{red}false{/}';
  if (typeof value === 'object') return '{dim}[object]{/}';
  return String(value);
}

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;

  if (!args.trim()) {
    ctx.sendLine('Usage: {cyan}patch <target> <method> [args...]{/}');
    ctx.sendLine('');
    ctx.sendLine('Examples:');
    ctx.sendLine('  {dim}patch me set_hit_points 50{/}');
    ctx.sendLine('  {dim}patch me setBaseStat strength 15{/}');
    ctx.sendLine('  {dim}patch goblin setHealth 10{/}');
    ctx.sendLine('  {dim}patch me monitorEnabled true{/}');
    return;
  }

  // Parse arguments: target, method, and remaining args
  const parts = args.trim().split(/\s+/);

  if (parts.length < 2) {
    ctx.sendLine('{red}Error:{/} Need at least a target and method name.');
    ctx.sendLine('Usage: {cyan}patch <target> <method> [args...]{/}');
    return;
  }

  const [targetName, methodName, ...methodArgs] = parts;

  // Find the target
  const target = findTarget(player, targetName);
  if (!target) {
    ctx.sendLine(`{red}Error:{/} Cannot find target "${targetName}".`);
    return;
  }

  // Get the method or property
  const member = target[methodName];

  // Check if it's a method (function)
  if (typeof member === 'function') {
    // Parse the arguments
    const parsedArgs = methodArgs.map(parsePrimitive);

    try {
      // Call the method
      const result = member.apply(target, parsedArgs);

      // Report success
      const argsStr = parsedArgs.map(formatValue).join(', ');
      ctx.sendLine(`{green}✓{/} Called {cyan}${methodName}{/}(${argsStr}) on {yellow}${target.name || target.shortDesc}{/}`);

      // Show return value if any
      if (result !== undefined) {
        ctx.sendLine(`  Returned: ${formatValue(result)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.sendLine(`{red}Error calling ${methodName}:{/} ${message}`);
    }
    return;
  }

  // Check if it's a property (with one arg to set, or no args to get)
  if (methodArgs.length === 0) {
    // Get the property value
    ctx.sendLine(`{cyan}${methodName}{/} = ${formatValue(member)}`);
    return;
  }

  if (methodArgs.length === 1) {
    // Try to set the property
    const newValue = parsePrimitive(methodArgs[0]);

    try {
      target[methodName] = newValue;
      const actualValue = target[methodName];

      ctx.sendLine(`{green}✓{/} Set {cyan}${methodName}{/} = ${formatValue(newValue)} on {yellow}${target.name || target.shortDesc}{/}`);

      // Verify the value was set
      if (actualValue !== newValue) {
        ctx.sendLine(`  {dim}(Actual value: ${formatValue(actualValue)}){/}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.sendLine(`{red}Error setting ${methodName}:{/} ${message}`);
    }
    return;
  }

  // Multiple args but not a function
  ctx.sendLine(`{red}Error:{/} "${methodName}" is not a method (cannot pass multiple arguments).`);
  ctx.sendLine(`  Current value: ${formatValue(member)}`);
}

export default { name, description, usage, execute };
