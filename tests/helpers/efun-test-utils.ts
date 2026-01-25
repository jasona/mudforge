/**
 * Shared test utilities for efun-bridge tests.
 */

import { EfunBridge, resetEfunBridge } from '../../src/driver/efun-bridge.js';
import { resetRegistry } from '../../src/driver/object-registry.js';
import { resetScheduler } from '../../src/driver/scheduler.js';
import { resetPermissions } from '../../src/driver/permissions.js';
import { BaseMudObject } from '../../src/driver/base-object.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Create a test environment with a temporary mudlib directory.
 */
export async function createTestEnvironment(): Promise<{
  efunBridge: EfunBridge;
  testMudlibPath: string;
  cleanup: () => Promise<void>;
}> {
  resetRegistry();
  resetScheduler();
  resetEfunBridge();
  resetPermissions();

  const testMudlibPath = join(process.cwd(), `test-mudlib-${randomUUID()}`);
  await mkdir(testMudlibPath, { recursive: true });
  await mkdir(join(testMudlibPath, 'data'), { recursive: true });

  const efunBridge = new EfunBridge({ mudlibPath: testMudlibPath });

  const cleanup = async () => {
    resetEfunBridge();
    resetScheduler();
    resetRegistry();
    resetPermissions();

    try {
      await rm(testMudlibPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  return { efunBridge, testMudlibPath, cleanup };
}

/**
 * Create a mock player object with common methods.
 */
export function createMockPlayer(
  path: string = '/players/test',
  options: {
    name?: string;
    level?: number;
  } = {}
): BaseMudObject & {
  name: string;
  level: number;
  receive: (msg: string) => void;
  receivedMessages: string[];
  setInputHandler: (handler: ((input: string) => void | Promise<void>) | null) => void;
  inputHandler: ((input: string) => void | Promise<void>) | null;
} {
  const player = new BaseMudObject() as BaseMudObject & {
    name: string;
    level: number;
    receive: (msg: string) => void;
    receivedMessages: string[];
    setInputHandler: (handler: ((input: string) => void | Promise<void>) | null) => void;
    inputHandler: ((input: string) => void | Promise<void>) | null;
  };

  // Set up the object path properly
  player._setupAsBlueprint(path);

  player.name = options.name ?? 'testplayer';
  player.level = options.level ?? 3; // Admin by default for testing
  player.receivedMessages = [];
  player.inputHandler = null;

  player.receive = (msg: string) => {
    player.receivedMessages.push(msg);
  };

  player.setInputHandler = (handler) => {
    player.inputHandler = handler;
  };

  return player;
}

/**
 * Create a mock connection object.
 */
export function createMockConnection(): {
  send: (msg: string) => void;
  sentMessages: string[];
  player: BaseMudObject | null;
  setInputHandler: (handler: ((input: string) => void) | null) => void;
  inputHandler: ((input: string) => void) | null;
} {
  const connection = {
    sentMessages: [] as string[],
    player: null as BaseMudObject | null,
    inputHandler: null as ((input: string) => void) | null,
    send(msg: string) {
      this.sentMessages.push(msg);
    },
    setInputHandler(handler: ((input: string) => void) | null) {
      this.inputHandler = handler;
    },
  };

  return connection;
}

/**
 * Strip ANSI escape codes from a string for easier testing.
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Strip color tokens like {red} from a string.
 */
export function stripColorTokens(str: string): string {
  return str.replace(/\{[a-zA-Z/:0-9]+\}/g, '');
}
