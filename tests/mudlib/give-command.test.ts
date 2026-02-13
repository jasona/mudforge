import { describe, it, expect } from 'vitest';
import { execute } from '../../mudlib/cmds/player/_give.js';

function createRoom(target: unknown): { inventory: unknown[] } {
  return { inventory: [target] };
}

describe('give command', () => {
  it('gives all gold immediately', async () => {
    const messages: string[] = [];
    const target = {
      name: 'Bob',
      health: 100,
      gold: 0,
      receive: () => {},
      id: (value: string) => value === 'bob',
    };
    const room = createRoom(target);
    const player = {
      name: 'Alice',
      gold: 50,
      inventory: [],
      environment: room,
      spendGold(amount: number) {
        this.gold -= amount;
        return true;
      },
      id: () => false,
    };

    await execute({
      player: player as unknown as Parameters<typeof execute>[0]['player'],
      args: 'gold to bob',
      send: (message: string) => messages.push(message),
      sendLine: (message: string) => messages.push(message),
    });
    expect(player.gold).toBe(0);
    expect(target.gold).toBe(50);
  });
});
