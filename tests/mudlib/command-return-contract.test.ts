import { describe, it, expect, beforeEach } from 'vitest';
import { execute as boardExecute } from '../../mudlib/cmds/player/_board.js';
import { execute as disembarkExecute } from '../../mudlib/cmds/player/_disembark.js';
import { execute as goExecute } from '../../mudlib/cmds/player/_go.js';

interface TestContext {
  player: {
    environment: unknown;
    moveTo?: (destination: unknown) => Promise<boolean> | boolean;
  };
  verb?: string;
  args: string;
  send: (message: string) => void;
  sendLine: (message: string) => void;
}

describe('command return contract (handled failures)', () => {
  const messages: string[] = [];

  beforeEach(() => {
    messages.length = 0;
    (globalThis as unknown as {
      efuns: {
        isVehicle: (obj: unknown) => boolean;
      };
    }).efuns = {
      isVehicle: (obj: unknown) => typeof obj === 'object' && obj !== null && (obj as { __isVehicle?: boolean }).__isVehicle === true,
    };
  });

  it('board returns handled=true when no matching vehicle is found', async () => {
    const room = {
      inventory: [],
    };

    const ctx: TestContext = {
      player: { environment: room },
      args: 'ship',
      send: (message: string) => messages.push(message),
      sendLine: (message: string) => messages.push(message),
    };

    const result = await boardExecute(ctx as unknown as Parameters<typeof boardExecute>[0]);

    expect(result).toBe(true);
    expect(result !== false).toBe(true); // Mirrors command manager handled check.
    expect(messages.some((m) => m.includes("don't see that vehicle"))).toBe(true);
  });

  it('disembark returns handled=true when not on a vehicle', async () => {
    const ctx: TestContext = {
      player: { environment: { shortDesc: 'dock' } },
      args: '',
      send: (message: string) => messages.push(message),
      sendLine: (message: string) => messages.push(message),
    };

    const result = await disembarkExecute(ctx as unknown as Parameters<typeof disembarkExecute>[0]);

    expect(result).toBe(true);
    expect(result !== false).toBe(true); // Mirrors command manager handled check.
    expect(messages.some((m) => m.includes("not on a vehicle"))).toBe(true);
  });

  it('go returns handled=true when direction is unavailable', async () => {
    const room = {
      getExit: () => undefined,
    };

    const ctx: TestContext = {
      player: { environment: room },
      verb: 'north',
      args: '',
      send: (message: string) => messages.push(message),
      sendLine: (message: string) => messages.push(message),
    };

    const result = await goExecute(ctx as unknown as Parameters<typeof goExecute>[0]);

    expect(result).toBe(true);
    expect(result !== false).toBe(true); // Mirrors command manager handled check.
    expect(messages.some((m) => m.includes("can't go north"))).toBe(true);
  });
});
