import { describe, it, expect } from 'vitest';
import { Server } from '../../src/network/server.js';

describe('Server rate limiting', () => {
  it('blocks requests above configured limit', () => {
    const server = new Server();
    const limiter = new Map<string, { count: number; windowStart: number }>();
    const consume = (server as unknown as {
      consumeRateLimit: (
        map: Map<string, { count: number; windowStart: number }>,
        key: string,
        limitPerMinute: number
      ) => boolean;
    }).consumeRateLimit.bind(server);

    expect(consume(limiter, '127.0.0.1', 2)).toBe(true);
    expect(consume(limiter, '127.0.0.1', 2)).toBe(true);
    expect(consume(limiter, '127.0.0.1', 2)).toBe(false);
  });
});
