import { describe, it, expect } from 'vitest';
import { execute as removeExecute } from '../../mudlib/cmds/player/_remove.js';

describe('remove command', () => {
  it('handles equipped items map without crashing and removes matching armor', () => {
    const messages: string[] = [];
    const armor = {
      shortDesc: 'iron helm',
      id: (name: string) => name === 'helm',
      remove: () => ({ success: true, message: 'You remove the iron helm.' }),
    };

    const ctx = {
      player: {
        name: 'Tester',
        environment: { broadcast: () => undefined },
        getAllEquipped: () => new Map([['head', armor]]),
      },
      args: 'helm',
      send: (message: string) => messages.push(message),
      sendLine: (message: string) => messages.push(message),
    };

    expect(() => removeExecute(ctx as unknown as Parameters<typeof removeExecute>[0])).not.toThrow();
    expect(messages.some((m) => m.includes('You remove the iron helm.'))).toBe(true);
  });
});
