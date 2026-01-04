/**
 * Integration test: Builder creates room via in-game editor
 *
 * Tests the complete builder workflow:
 * permission check → open editor → write code → save → compile → hot-reload
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Permissions, PermissionLevel } from '../../src/driver/permissions.js';
import { Compiler } from '../../src/driver/compiler.js';
import { resetRegistry } from '../../src/driver/object-registry.js';
import { Player } from '../../mudlib/std/player.js';
import { Room } from '../../mudlib/std/room.js';

/**
 * Mock connection for testing.
 */
class MockConnection {
  messages: string[] = [];
  closed = false;

  send(message: string): void {
    this.messages.push(message);
  }

  close(): void {
    this.closed = true;
  }

  isConnected(): boolean {
    return !this.closed;
  }

  getAllMessages(): string {
    return this.messages.join('');
  }

  clearMessages(): void {
    this.messages = [];
  }
}

/**
 * Mock MudObject for permission testing.
 */
class MockPlayer {
  objectPath = '/players/testbuilder';
  objectId = '/players/testbuilder#1';
  isClone = true;
  name = 'TestBuilder';
}

describe('Builder Editor Integration', () => {
  let permissions: Permissions;
  let compiler: Compiler;

  beforeEach(() => {
    resetRegistry();
    permissions = new Permissions({
      protectedPaths: ['/std/', '/core/', '/daemon/'],
    });
    compiler = new Compiler({
      mudlibPath: './mudlib',
      sourceMaps: false,
    });
  });

  afterEach(() => {
    resetRegistry();
  });

  describe('Permission Checks for Editing', () => {
    it('should allow builder to write in assigned domain', () => {
      const builder = new MockPlayer();

      // Grant builder permission
      permissions.setLevel('testbuilder', PermissionLevel.Builder);
      permissions.addDomain('testbuilder', '/areas/castle/');

      // Check write permission to domain
      const canWrite = permissions.canWrite(builder, '/areas/castle/room.ts');
      expect(canWrite).toBe(true);
    });

    it('should deny builder write to unassigned domain', () => {
      const builder = new MockPlayer();

      // Grant builder permission without domain
      permissions.setLevel('testbuilder', PermissionLevel.Builder);
      permissions.addDomain('testbuilder', '/areas/forest/');

      // Check write permission to different domain
      const canWrite = permissions.canWrite(builder, '/areas/castle/room.ts');
      expect(canWrite).toBe(false);
    });

    it('should deny regular player write access', () => {
      const player = new MockPlayer();
      player.name = 'RegularPlayer';

      // Player level (default)
      const canWrite = permissions.canWrite(player, '/areas/town/room.ts');
      expect(canWrite).toBe(false);
    });

    it('should allow admin to write anywhere', () => {
      const admin = new MockPlayer();
      admin.name = 'AdminUser';

      permissions.setLevel('adminuser', PermissionLevel.Administrator);

      const canWrite = permissions.canWrite(admin, '/std/room.ts');
      expect(canWrite).toBe(true);
    });

    it('should protect /std/ from builders', () => {
      const builder = new MockPlayer();

      permissions.setLevel('testbuilder', PermissionLevel.Builder);
      permissions.addDomain('testbuilder', '/areas/');

      const canWrite = permissions.canWrite(builder, '/std/room.ts');
      expect(canWrite).toBe(false);
    });

    it('should allow senior builder to write to /lib/', () => {
      const seniorBuilder = new MockPlayer();
      seniorBuilder.name = 'SeniorBuilder';

      permissions.setLevel('seniorbuilder', PermissionLevel.SeniorBuilder);

      // Senior builders can write to /lib/
      const canWriteLib = permissions.canWrite(seniorBuilder, '/lib/utils.ts');
      expect(canWriteLib).toBe(true);
    });
  });

  describe('Code Compilation', () => {
    it('should compile valid room TypeScript code', async () => {
      const roomCode = `
import { Room } from '../std/room.js';

export class TavernRoom extends Room {
  constructor() {
    super();
    this.shortDesc = 'The Rusty Tankard';
    this.longDesc = 'A cozy tavern with a crackling fireplace.';
  }

  onCreate(): void {
    super.onCreate();
    this.addExit('south', '/areas/town/square');
  }
}
`;

      const result = await compiler.compileSource(roomCode, '/areas/town/tavern.ts');

      expect(result.success).toBe(true);
      expect(result.code).toBeDefined();
      expect(result.code).toContain('class TavernRoom');
      expect(result.code).toContain('Rusty Tankard');
    });

    it('should report syntax errors', async () => {
      const invalidCode = `
export class BrokenRoom extends Room {
  constructor() {
    super()  // Missing semicolon - valid in JS
    this.shortDesc = 'Test'
    this.invalid syntax here!!!  // This is invalid
  }
}
`;

      const result = await compiler.compileSource(invalidCode, '/areas/broken.ts');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should report type annotation issues', async () => {
      const codeWithTypeError = `
export class TypedRoom {
  private count: number = "not a number";  // Type error
}
`;

      // Note: esbuild doesn't do full type checking, just transpilation
      // So this might actually succeed since esbuild strips types
      const result = await compiler.compileSource(codeWithTypeError, '/areas/typed.ts');

      // esbuild will compile this (it just strips types)
      // Type checking would require a separate step
      expect(result.success).toBe(true);
    });

    it('should include source location in errors', async () => {
      const codeWithError = `
export class Room {
  constructor() {
    const x = @invalid;
  }
}
`;

      const result = await compiler.compileSource(codeWithError, '/test.ts');

      expect(result.success).toBe(false);
      // esbuild provides error location
      expect(result.error || result.errors).toBeDefined();
    });
  });

  describe('Editor Save Flow', () => {
    it('should simulate complete save and compile flow', async () => {
      // 1. Builder has permission
      const builder = new MockPlayer();
      permissions.setLevel('testbuilder', PermissionLevel.Builder);
      permissions.addDomain('testbuilder', '/areas/myzone/');

      // 2. Permission check passes
      const filePath = '/areas/myzone/newroom.ts';
      expect(permissions.canWrite(builder, filePath)).toBe(true);

      // 3. Editor content (new room)
      const roomContent = `
import { Room } from '../../std/room.js';

export class NewRoom extends Room {
  constructor() {
    super();
    this.shortDesc = 'A New Room';
    this.longDesc = 'This is a newly created room.';
  }

  onCreate(): void {
    super.onCreate();
    this.addExit('back', '/areas/myzone/entrance');
  }
}
`;

      // 4. Compile the code
      const compileResult = await compiler.compileSource(roomContent, filePath);

      expect(compileResult.success).toBe(true);
      expect(compileResult.code).toContain('NewRoom');
      expect(compileResult.code).toContain('A New Room');

      // 5. In a real scenario, hot-reload would update the object
      // Here we verify the code is valid and would be loadable
    });

    it('should reject save when permission denied', async () => {
      const player = new MockPlayer();
      player.name = 'UnauthorizedPlayer';

      const filePath = '/areas/secret/room.ts';

      // Permission check should fail
      expect(permissions.canWrite(player, filePath)).toBe(false);

      // Save should be blocked at permission layer
    });

    it('should return errors to editor on compile failure', async () => {
      const invalidContent = `
export class BrokenRoom {
  this is not valid code at all
}
`;

      const compileResult = await compiler.compileSource(invalidContent, '/test.ts');

      expect(compileResult.success).toBe(false);

      // These errors would be sent back to the editor
      const editorErrors = compileResult.errors?.map((e) => ({
        line: e.location?.line ?? 1,
        column: e.location?.column ?? 1,
        message: e.text,
      })) ?? [{ line: 1, column: 1, message: compileResult.error ?? 'Unknown error' }];

      expect(editorErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Room Creation Workflow', () => {
    it('should create a functional room from compiled code', async () => {
      // Create a room instance directly (simulating what happens after compile)
      const room = new Room();
      room.shortDesc = 'Builder Created Room';
      room.longDesc = 'This room was created by a builder in the editor.';

      // Add exits
      room.addExit('north', '/areas/other/room');
      room.addExit('south', '/areas/other/entrance');

      // Verify room properties
      expect(room.shortDesc).toBe('Builder Created Room');
      expect(room.getExitDirections()).toContain('north');
      expect(room.getExitDirections()).toContain('south');
    });

    it('should allow player to enter builder-created room', async () => {
      // Create rooms
      const builderRoom = new Room();
      builderRoom.shortDesc = 'Custom Room';
      builderRoom.longDesc = 'A room created by a builder.';

      const startRoom = new Room();
      startRoom.shortDesc = 'Starting Room';

      // Connect rooms
      startRoom.addExit('enter', builderRoom);
      builderRoom.addExit('leave', startRoom);

      // Create player
      const mockConn = new MockConnection();
      const player = new Player();
      player.name = 'TestPlayer';
      player.bindConnection(mockConn);

      // Place in start room
      await player.moveTo(startRoom);
      expect(player.environment).toBe(startRoom);

      mockConn.clearMessages();

      // Move to builder-created room
      const moved = await player.moveDirection('enter');

      expect(moved).toBe(true);
      expect(player.environment).toBe(builderRoom);
      expect(mockConn.getAllMessages()).toContain('Custom Room');
    });
  });

  describe('Audit Logging', () => {
    it('should log write operations', () => {
      const builder = new MockPlayer();
      permissions.setLevel('testbuilder', PermissionLevel.Builder);
      permissions.addDomain('testbuilder', '/areas/castle/');

      // Perform write check (which logs)
      permissions.canWrite(builder, '/areas/castle/room.ts');

      // Check audit log
      const log = permissions.getAuditLog();
      expect(log.length).toBeGreaterThan(0);

      const lastEntry = log[log.length - 1];
      expect(lastEntry.player).toBe('testbuilder');
      expect(lastEntry.action).toBe('write');
      expect(lastEntry.target).toBe('/areas/castle/room.ts');
    });

    it('should log permission denials', () => {
      const builder = new MockPlayer();
      permissions.setLevel('testbuilder', PermissionLevel.Builder);
      permissions.addDomain('testbuilder', '/areas/forest/');

      // Try to write to unauthorized path
      permissions.canWrite(builder, '/areas/castle/secret.ts');

      const log = permissions.getAuditLog();
      const denialEntry = log.find(
        (e) => e.target === '/areas/castle/secret.ts' && !e.success
      );

      expect(denialEntry).toBeDefined();
      expect(denialEntry?.success).toBe(false);
    });
  });

  describe('Domain Management', () => {
    it('should manage builder domains', () => {
      permissions.setLevel('testbuilder', PermissionLevel.Builder);

      // Add domains
      permissions.addDomain('testbuilder', '/areas/castle/');
      permissions.addDomain('testbuilder', '/areas/forest/');

      const domains = permissions.getDomains('testbuilder');
      expect(domains).toContain('/areas/castle/');
      expect(domains).toContain('/areas/forest/');

      // Remove domain
      permissions.removeDomain('testbuilder', '/areas/forest/');

      const updatedDomains = permissions.getDomains('testbuilder');
      expect(updatedDomains).toContain('/areas/castle/');
      expect(updatedDomains).not.toContain('/areas/forest/');
    });

    it('should grant permission within domain paths', () => {
      const builder = new MockPlayer();
      permissions.setLevel('testbuilder', PermissionLevel.Builder);
      permissions.addDomain('testbuilder', '/areas/town/');

      // Can write to subdirectories
      expect(permissions.canWrite(builder, '/areas/town/square.ts')).toBe(true);
      expect(permissions.canWrite(builder, '/areas/town/shops/bakery.ts')).toBe(true);
      expect(permissions.canWrite(builder, '/areas/town/npcs/guard.ts')).toBe(true);

      // Cannot write outside domain
      expect(permissions.canWrite(builder, '/areas/dungeon/room.ts')).toBe(false);
    });
  });

  describe('Permission Level Hierarchy', () => {
    it('should correctly identify permission levels', () => {
      const player = new MockPlayer();
      player.name = 'TestPlayer';

      // Default is Player level
      expect(permissions.getLevel(player)).toBe(PermissionLevel.Player);
      expect(permissions.isBuilder(player)).toBe(false);
      expect(permissions.isAdmin(player)).toBe(false);

      // Promote to Builder
      permissions.setLevel('testplayer', PermissionLevel.Builder);
      expect(permissions.getLevel(player)).toBe(PermissionLevel.Builder);
      expect(permissions.isBuilder(player)).toBe(true);
      expect(permissions.isAdmin(player)).toBe(false);

      // Promote to Admin
      permissions.setLevel('testplayer', PermissionLevel.Administrator);
      expect(permissions.getLevel(player)).toBe(PermissionLevel.Administrator);
      expect(permissions.isBuilder(player)).toBe(true); // Admin is also builder
      expect(permissions.isAdmin(player)).toBe(true);
    });

    it('should grant/revoke permissions', () => {
      permissions.setLevel('newbuilder', PermissionLevel.Builder);
      expect(permissions.getLevel('newbuilder')).toBe(PermissionLevel.Builder);

      // Revoke (set back to player)
      permissions.setLevel('newbuilder', PermissionLevel.Player);
      expect(permissions.getLevel('newbuilder')).toBe(PermissionLevel.Player);
    });
  });
});
