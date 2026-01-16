/**
 * switchrouter - Switch between Intermud 3 routers.
 *
 * Usage:
 *   switchrouter              - List available routers
 *   switchrouter <name>       - Switch to router by name
 *   switchrouter <number>     - Switch to router by index
 *
 * Examples:
 *   switchrouter
 *   switchrouter *dalet
 *   switchrouter *i4
 *   switchrouter 0
 */

import type { MudObject } from '../../lib/std.js';

interface CommandContext {
  player: MudObject & {
    name: string;
  };
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['switchrouter', 'i3router'];
export const description = 'Switch between Intermud 3 routers';
export const usage = 'switchrouter [<router-name> | <router-index>]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();

  // Get current router info
  const routers = efuns.i3GetRouters();
  const currentIndex = efuns.i3GetCurrentRouterIndex();
  const currentRouter = efuns.i3GetRouter();
  const isConnected = efuns.i3IsConnected();
  const state = efuns.i3GetState();

  // No args - list routers
  if (!args) {
    ctx.sendLine('{bold}Intermud 3 Routers{/}');
    ctx.sendLine('{dim}' + '-'.repeat(50) + '{/}');

    if (routers.length === 0) {
      ctx.sendLine('{yellow}No routers configured.{/}');
      return;
    }

    for (let i = 0; i < routers.length; i++) {
      const router = routers[i];
      if (!router) continue;

      const isCurrent = i === currentIndex;
      const marker = isCurrent ? '{green}*{/}' : ' ';
      const status = isCurrent && isConnected ? '{green}(connected){/}' :
                     isCurrent ? `{yellow}(${state}){/}` : '';

      ctx.sendLine(`  ${marker} [${i}] {bold}${router.name}{/} - ${router.host}:${router.port} ${status}`);
    }

    ctx.sendLine('{dim}' + '-'.repeat(50) + '{/}');
    ctx.sendLine(`{dim}Current: ${currentRouter ?? 'none'} - State: ${state}{/}`);
    ctx.sendLine('{dim}Use "switchrouter <name>" or "switchrouter <index>" to switch.{/}');
    return;
  }

  // Check if arg is a number (index) or string (name)
  const indexArg = parseInt(args, 10);

  if (!isNaN(indexArg)) {
    // Switch by index
    if (indexArg < 0 || indexArg >= routers.length) {
      ctx.sendLine(`{red}Invalid router index. Valid range: 0-${routers.length - 1}{/}`);
      return;
    }

    const targetRouter = routers[indexArg];
    if (!targetRouter) {
      ctx.sendLine('{red}Router not found.{/}');
      return;
    }

    ctx.sendLine(`{yellow}Switching to router ${targetRouter.name} (${targetRouter.host}:${targetRouter.port})...{/}`);

    const success = await efuns.i3SwitchRouter(indexArg);
    if (success) {
      ctx.sendLine(`{green}Switch initiated. Connecting to ${targetRouter.name}...{/}`);
    } else {
      ctx.sendLine('{red}Failed to switch router.{/}');
    }
  } else {
    // Switch by name
    const routerName = args.startsWith('*') ? args : `*${args}`;

    // Find the router
    const found = routers.find(r => r.name.toLowerCase() === routerName.toLowerCase());
    if (!found) {
      ctx.sendLine(`{red}Router "${routerName}" not found.{/}`);
      ctx.sendLine('{dim}Available routers:{/}');
      for (const r of routers) {
        ctx.sendLine(`  - ${r.name}`);
      }
      return;
    }

    ctx.sendLine(`{yellow}Switching to router ${found.name} (${found.host}:${found.port})...{/}`);

    const success = await efuns.i3SwitchRouterByName(routerName);
    if (success) {
      ctx.sendLine(`{green}Switch initiated. Connecting to ${found.name}...{/}`);
    } else {
      ctx.sendLine('{red}Failed to switch router.{/}');
    }
  }
}

export default { name, description, usage, execute };
