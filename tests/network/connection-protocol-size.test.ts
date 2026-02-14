import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { Connection } from '../../src/network/connection.js';

class MockWebSocket extends EventEmitter {
  readyState = 1;
  OPEN = 1;
  bufferedAmount = 0;
  send = vi.fn();
  close = vi.fn();
  terminate = vi.fn();
  ping = vi.fn();
}

describe('Connection protocol frame size guard', () => {
  it('drops oversized protocol frames', () => {
    const socket = new MockWebSocket() as unknown as import('ws').WebSocket;
    const conn = new Connection(socket, 'conn-test', '127.0.0.1');

    const oversizedPortrait = `data:image/png;base64,${'A'.repeat(600000)}`;
    conn.sendCombat({
      type: 'target_update',
      target: {
        name: 'HugeTarget',
        level: 1,
        portrait: oversizedPortrait,
        health: 10,
        maxHealth: 10,
        healthPercent: 100,
        isPlayer: false,
      },
    });

    expect((socket as unknown as MockWebSocket).send).not.toHaveBeenCalled();
  });

  it('sends normal protocol frames under the cap', () => {
    const socket = new MockWebSocket() as unknown as import('ws').WebSocket;
    const conn = new Connection(socket, 'conn-test', '127.0.0.1');

    conn.sendCombat({
      type: 'target_update',
      target: {
        name: 'Goblin',
        level: 1,
        portrait: 'avatar_m1',
        health: 10,
        maxHealth: 10,
        healthPercent: 100,
        isPlayer: false,
      },
    });

    expect((socket as unknown as MockWebSocket).send).toHaveBeenCalledTimes(1);
  });
});

