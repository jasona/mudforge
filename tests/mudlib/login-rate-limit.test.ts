import { describe, it, expect, beforeEach } from 'vitest';
import { LoginDaemon } from '../../mudlib/daemons/login.js';

describe('LoginDaemon rate limiting', () => {
  beforeEach(() => {
    (globalThis as unknown as { efuns: Record<string, unknown> }).efuns = {
      playerExists: async () => true,
      loadPlayerData: async () => ({
        state: {
          properties: {
            passwordHash: 'ignored:ignored',
          },
        },
      }),
      verifyPassword: async () => false,
    };
  });

  it('limits repeated invalid GUI login attempts', async () => {
    const daemon = new LoginDaemon();
    const responses: Array<{ success: boolean; error?: string }> = [];
    const connection = {
      send: () => {},
      close: () => {},
      isConnected: () => true,
      getRemoteAddress: () => '127.0.0.1',
      sendAuthResponse: (payload: { success: boolean; error?: string }) => responses.push(payload),
    };

    for (let i = 0; i < 9; i++) {
      await (daemon as unknown as {
        handleAuthLogin: (conn: unknown, req: unknown) => Promise<void>;
      }).handleAuthLogin(connection, {
        type: 'login',
        name: 'Tester',
        password: 'wrong-password',
      });
    }

    expect(responses.some((r) => (r.error ?? '').includes('Too many failed attempts'))).toBe(true);
  });
});
