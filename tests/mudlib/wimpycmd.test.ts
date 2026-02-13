import { describe, it, expect } from 'vitest';
import { execute } from '../../mudlib/cmds/player/_wimpycmd.js';

describe('wimpycmd', () => {
  it('rejects unsafe base commands', () => {
    const messages: string[] = [];
    const properties = new Map<string, unknown>();
    const ctx = {
      player: {
        getProperty: (key: string) => properties.get(key),
        setProperty: (key: string, value: unknown) => properties.set(key, value),
      },
      args: 'force bob quit',
      send: (message: string) => messages.push(message),
      sendLine: (message: string) => messages.push(message),
    };

    execute(ctx);
    expect(properties.get('wimpycmd')).toBeUndefined();
    expect(messages.some((msg) => msg.includes('not allowed'))).toBe(true);
  });

  it('accepts allowed base commands', () => {
    const properties = new Map<string, unknown>();
    const ctx = {
      player: {
        getProperty: (key: string) => properties.get(key),
        setProperty: (key: string, value: unknown) => properties.set(key, value),
      },
      args: 'flee north',
      send: () => {},
      sendLine: () => {},
    };

    execute(ctx);
    expect(properties.get('wimpycmd')).toBe('flee north');
  });
});
