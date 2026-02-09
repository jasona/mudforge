import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SessionManager,
  getSessionManager,
  resetSessionManager,
} from '../../src/network/session-manager.js';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    resetSessionManager();
    manager = new SessionManager({
      secret: 'test-secret-key',
      ttlMs: 60000, // 1 minute for tests
      validateIp: false,
    });
  });

  afterEach(() => {
    manager.stop();
    resetSessionManager();
  });

  describe('createToken', () => {
    it('should create a valid token', () => {
      const result = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(0);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should create unique tokens for same player', () => {
      const result1 = manager.createToken('TestPlayer', 'conn-1', '192.168.1.1');
      const result2 = manager.createToken('TestPlayer', 'conn-2', '192.168.1.1');

      expect(result1.token).not.toBe(result2.token);
    });

    it('should store player name lowercase', () => {
      const result = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      const validation = manager.validateToken(result.token);

      expect(validation.valid).toBe(true);
      expect(validation.session?.playerName).toBe('testplayer');
    });

    it('should set correct expiry time', () => {
      const before = Date.now();
      const result = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      const after = Date.now();

      // TTL is 60000ms (1 minute)
      expect(result.expiresAt).toBeGreaterThanOrEqual(before + 60000);
      expect(result.expiresAt).toBeLessThanOrEqual(after + 60000);
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', () => {
      const { token } = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      const result = manager.validateToken(token);

      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.playerName).toBe('testplayer');
      expect(result.session?.connectionId).toBe('conn-123');
    });

    it('should reject invalid token format', () => {
      const result = manager.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });

    it('should reject tampered payload', () => {
      const { token } = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      const parts = token.split('.');
      // Modify the payload
      const tamperedPayload = Buffer.from('{"p":"hacker","c":"x","a":"x","e":9999999999999,"n":"x"}').toString('base64url');
      const tamperedToken = `${tamperedPayload}.${parts[1]}`;

      const result = manager.validateToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should reject tampered signature', () => {
      const { token } = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.invalidsignature`;

      const result = manager.validateToken(tamperedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('should reject expired token', () => {
      // Create manager with very short TTL
      const shortTtlManager = new SessionManager({
        secret: 'test-secret',
        ttlMs: 1, // 1ms TTL
        validateIp: false,
      });

      const { token } = shortTtlManager.createToken('TestPlayer', 'conn-123', '192.168.1.1');

      // Wait for token to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = shortTtlManager.validateToken(token);

          expect(result.valid).toBe(false);
          expect(result.error).toBe('Session expired');

          shortTtlManager.stop();
          resolve();
        }, 10);
      });
    });

    it('should reject invalidated token', () => {
      const { token } = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      manager.invalidateToken(token);

      const result = manager.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('IP validation', () => {
    let ipValidatingManager: SessionManager;

    beforeEach(() => {
      ipValidatingManager = new SessionManager({
        secret: 'test-secret',
        ttlMs: 60000,
        validateIp: true,
      });
    });

    afterEach(() => {
      ipValidatingManager.stop();
    });

    it('should validate token with matching IP', () => {
      const { token } = ipValidatingManager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      const result = ipValidatingManager.validateToken(token, '192.168.1.1');

      expect(result.valid).toBe(true);
    });

    it('should reject token with different IP', () => {
      const { token } = ipValidatingManager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      const result = ipValidatingManager.validateToken(token, '10.0.0.1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address mismatch');
    });
  });

  describe('invalidateToken', () => {
    it('should invalidate a specific token', () => {
      const { token: token1 } = manager.createToken('Player1', 'conn-1', '192.168.1.1');
      const { token: token2 } = manager.createToken('Player2', 'conn-2', '192.168.1.2');

      manager.invalidateToken(token1);

      expect(manager.validateToken(token1).valid).toBe(false);
      expect(manager.validateToken(token2).valid).toBe(true);
    });

    it('should not throw for non-existent token', () => {
      expect(() => manager.invalidateToken('nonexistent.token')).not.toThrow();
    });
  });

  describe('invalidatePlayerSessions', () => {
    it('should invalidate all sessions for a player', () => {
      const { token: token1 } = manager.createToken('TestPlayer', 'conn-1', '192.168.1.1');
      const { token: token2 } = manager.createToken('TestPlayer', 'conn-2', '192.168.1.2');
      const { token: token3 } = manager.createToken('OtherPlayer', 'conn-3', '192.168.1.3');

      manager.invalidatePlayerSessions('TestPlayer');

      expect(manager.validateToken(token1).valid).toBe(false);
      expect(manager.validateToken(token2).valid).toBe(false);
      expect(manager.validateToken(token3).valid).toBe(true);
    });

    it('should handle case-insensitive player names', () => {
      const { token } = manager.createToken('TestPlayer', 'conn-1', '192.168.1.1');

      manager.invalidatePlayerSessions('TESTPLAYER');

      expect(manager.validateToken(token).valid).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct session count', () => {
      expect(manager.getStats().activeSessions).toBe(0);

      manager.createToken('Player1', 'conn-1', '192.168.1.1');
      expect(manager.getStats().activeSessions).toBe(1);

      manager.createToken('Player2', 'conn-2', '192.168.1.2');
      expect(manager.getStats().activeSessions).toBe(2);
    });

    it('should update count after invalidation', () => {
      const { token } = manager.createToken('Player1', 'conn-1', '192.168.1.1');
      manager.createToken('Player2', 'conn-2', '192.168.1.2');

      expect(manager.getStats().activeSessions).toBe(2);

      manager.invalidateToken(token);

      expect(manager.getStats().activeSessions).toBe(1);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const manager1 = getSessionManager({ secret: 'test' });
      const manager2 = getSessionManager({ secret: 'different' });

      expect(manager1).toBe(manager2);
    });

    it('should reset instance', () => {
      const manager1 = getSessionManager({ secret: 'test' });
      manager1.createToken('TestPlayer', 'conn-1', '192.168.1.1');

      resetSessionManager();
      const manager2 = getSessionManager({ secret: 'test' });

      expect(manager2).not.toBe(manager1);
      expect(manager2.getStats().activeSessions).toBe(0);
    });
  });

  describe('security', () => {
    it('should use timing-safe comparison for signatures', () => {
      // This is a behavioral test - the actual timing-safe comparison
      // is tested implicitly by the signature validation tests
      const { token } = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
      const parts = token.split('.');

      // Try many similar signatures - all should be rejected
      for (let i = 0; i < 10; i++) {
        const originalSig = parts[1];
        const lastChar = originalSig[originalSig.length - 1] ?? 'a';
        let newChar = String.fromCharCode(97 + i);
        if (newChar === lastChar) {
          newChar = newChar === 'a' ? 'b' : 'a';
        }
        const wrongSig = originalSig.substring(0, originalSig.length - 1) + newChar;
        const tamperedToken = `${parts[0]}.${wrongSig}`;
        const result = manager.validateToken(tamperedToken);
        expect(result.valid).toBe(false);
      }
    });

    it('should generate different tokens even with same inputs', () => {
      // Tokens include a random nonce, so even identical inputs produce different tokens
      // This test would need to be very fast to possibly get same nonce
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const { token } = manager.createToken('TestPlayer', 'conn-123', '192.168.1.1');
        tokens.add(token);
        manager.invalidateToken(token);
      }
      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should auto-generate secret if not provided', () => {
      const autoSecretManager1 = new SessionManager({});
      const autoSecretManager2 = new SessionManager({});

      const { token: token1 } = autoSecretManager1.createToken('Player', 'conn-1', '192.168.1.1');

      // Token from manager1 should not validate in manager2 (different secrets)
      const result = autoSecretManager2.validateToken(token1);
      expect(result.valid).toBe(false);

      autoSecretManager1.stop();
      autoSecretManager2.stop();
    });
  });

  describe('cleanup', () => {
    it('should handle stop gracefully', () => {
      manager.createToken('TestPlayer', 'conn-1', '192.168.1.1');

      expect(() => manager.stop()).not.toThrow();
      expect(() => manager.stop()).not.toThrow(); // Double stop should be safe
    });
  });
});
