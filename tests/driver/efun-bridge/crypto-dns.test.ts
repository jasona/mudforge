/**
 * Tests for crypto/DNS efuns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../../helpers/efun-test-utils.js';
import type { EfunBridge } from '../../../src/driver/efun-bridge.js';

describe('Crypto/DNS Efuns', () => {
  let efunBridge: EfunBridge;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const env = await createTestEnvironment();
    efunBridge = env.efunBridge;
    cleanup = env.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('hashPassword returns a salt:hash string', async () => {
    const hash = await efunBridge.hashPassword('secret');
    const parts = hash.split(':');
    expect(parts.length).toBe(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('verifyPassword validates correct and rejects incorrect passwords', async () => {
    const hash = await efunBridge.hashPassword('secret');
    const ok = await efunBridge.verifyPassword('secret', hash);
    const bad = await efunBridge.verifyPassword('wrong', hash);
    expect(ok).toBe(true);
    expect(bad).toBe(false);
  });

  it('reverseDns returns a string or null without throwing', async () => {
    const result = await efunBridge.reverseDns('127.0.0.1');
    expect(result === null || typeof result === 'string').toBe(true);
  });
});
