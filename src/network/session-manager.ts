/**
 * Session Manager - Handles session token creation and validation for WebSocket reconnection.
 *
 * Session tokens allow clients to reconnect without re-authenticating when:
 * - Network briefly drops and recovers
 * - User refreshes the browser page
 * - Server restarts (if within TTL)
 *
 * Tokens are HMAC-signed for security and include optional IP validation.
 */

import { createHmac, randomBytes } from 'crypto';

/**
 * Session data stored for validation.
 */
export interface SessionData {
  /** Player name (lowercase) */
  playerName: string;
  /** Connection ID that created this session */
  connectionId: string;
  /** Remote IP address (for optional validation) */
  remoteAddress: string;
  /** When the session was created */
  createdAt: number;
  /** When the session expires */
  expiresAt: number;
}

/**
 * Session token payload (encoded in token).
 */
interface TokenPayload {
  /** Player name */
  p: string;
  /** Connection ID */
  c: string;
  /** Remote address hash (first 8 chars of SHA256) */
  a: string;
  /** Expiry timestamp */
  e: number;
  /** Random nonce for uniqueness */
  n: string;
}

/**
 * Session manager configuration.
 */
export interface SessionManagerConfig {
  /** Secret key for HMAC signing (auto-generated if not provided) */
  secret?: string;
  /** Session TTL in milliseconds (default: 15 minutes) */
  ttlMs?: number;
  /** Whether to validate IP address on resume (default: false) */
  validateIp?: boolean;
}

/**
 * Result of token validation.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  session?: SessionData;
}

/**
 * Singleton session manager instance.
 */
let sessionManagerInstance: SessionManager | null = null;

/**
 * Session manager for creating and validating reconnection tokens.
 */
/** Maximum number of sessions to prevent unbounded memory growth */
const MAX_SESSIONS = 10000;

export class SessionManager {
  private secret: string;
  private ttlMs: number;
  private validateIp: boolean;
  private activeSessions: Map<string, SessionData> = new Map();

  constructor(config: SessionManagerConfig = {}) {
    // Generate a random secret if not provided
    this.secret = config.secret || randomBytes(32).toString('hex');
    this.ttlMs = config.ttlMs ?? 15 * 60 * 1000; // 15 minutes default
    this.validateIp = config.validateIp ?? false;

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create a session token for a player.
   */
  createToken(playerName: string, connectionId: string, remoteAddress: string): {
    token: string;
    expiresAt: number;
  } {
    // Check if we're at the session limit
    if (this.activeSessions.size >= MAX_SESSIONS) {
      // Force cleanup of expired sessions
      this.cleanupExpiredSessions();

      // If still at limit after cleanup, reject new session creation
      if (this.activeSessions.size >= MAX_SESSIONS) {
        throw new Error('Session limit reached');
      }
    }

    const now = Date.now();
    const expiresAt = now + this.ttlMs;
    const nonce = randomBytes(8).toString('hex');

    // Create payload
    const payload: TokenPayload = {
      p: playerName.toLowerCase(),
      c: connectionId,
      a: this.hashIp(remoteAddress),
      e: expiresAt,
      n: nonce,
    };

    // Encode payload as base64
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Create HMAC signature
    const signature = this.sign(payloadStr);

    // Token format: payload.signature
    const token = `${payloadStr}.${signature}`;

    // Store session data
    const session: SessionData = {
      playerName: playerName.toLowerCase(),
      connectionId,
      remoteAddress,
      createdAt: now,
      expiresAt,
    };
    this.activeSessions.set(token, session);

    return { token, expiresAt };
  }

  /**
   * Validate a session token.
   */
  validateToken(token: string, remoteAddress?: string): ValidationResult {
    // Split token into payload and signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid token format' };
    }

    const payloadStr = parts[0]!;
    const signature = parts[1]!;

    // Verify signature
    const expectedSignature = this.sign(payloadStr);
    if (!this.secureCompare(signature, expectedSignature)) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    let payload: TokenPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString());
    } catch {
      return { valid: false, error: 'Invalid payload' };
    }

    // Check expiry
    if (Date.now() > payload.e) {
      this.activeSessions.delete(token);
      return { valid: false, error: 'Session expired' };
    }

    // Check if session still exists in our map
    const session = this.activeSessions.get(token);
    if (!session) {
      return { valid: false, error: 'Session not found' };
    }

    // Optional IP validation
    if (this.validateIp && remoteAddress) {
      const ipHash = this.hashIp(remoteAddress);
      if (ipHash !== payload.a) {
        return { valid: false, error: 'IP address mismatch' };
      }
    }

    return { valid: true, session };
  }

  /**
   * Invalidate a session token (e.g., on logout).
   */
  invalidateToken(token: string): void {
    this.activeSessions.delete(token);
  }

  /**
   * Invalidate all sessions for a player.
   */
  invalidatePlayerSessions(playerName: string): void {
    const lowerName = playerName.toLowerCase();
    for (const [token, session] of this.activeSessions) {
      if (session.playerName === lowerName) {
        this.activeSessions.delete(token);
      }
    }
  }

  /**
   * Get session statistics.
   */
  getStats(): { activeSessions: number } {
    return {
      activeSessions: this.activeSessions.size,
    };
  }

  /**
   * HMAC sign a payload.
   */
  private sign(payload: string): string {
    const hmac = createHmac('sha256', this.secret);
    hmac.update(payload);
    return hmac.digest('base64url');
  }

  /**
   * Hash an IP address for storage (privacy-preserving).
   */
  private hashIp(ip: string): string {
    const hmac = createHmac('sha256', this.secret);
    hmac.update(ip);
    return hmac.digest('hex').substring(0, 8);
  }

  /**
   * Timing-safe string comparison to prevent timing attacks.
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Clean up expired sessions periodically.
   */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private startCleanupInterval(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.activeSessions) {
      if (now > session.expiresAt) {
        this.activeSessions.delete(token);
      }
    }
  }

  /**
   * Stop the cleanup interval (for testing/shutdown).
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Get the global session manager instance.
 */
export function getSessionManager(config?: SessionManagerConfig): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager(config);
  }
  return sessionManagerInstance;
}

/**
 * Reset the session manager (for testing).
 */
export function resetSessionManager(): void {
  if (sessionManagerInstance) {
    sessionManagerInstance.stop();
    sessionManagerInstance = null;
  }
}

export default SessionManager;
