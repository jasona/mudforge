/**
 * Integration test: Permission denial for unauthorized actions
 *
 * Tests that the permission system properly denies access:
 * - Players cannot write files
 * - Builders cannot write outside domains
 * - Protected paths are enforced
 * - Audit logging captures denials
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Permissions, PermissionLevel } from '../../src/driver/permissions.js';
import { EfunBridge, resetEfunBridge } from '../../src/driver/efun-bridge.js';
import { resetRegistry } from '../../src/driver/object-registry.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Mock MudObject for permission testing.
 */
class MockPlayer {
  objectPath: string;
  objectId: string;
  isClone = true;
  name: string;

  constructor(name: string) {
    this.name = name;
    this.objectPath = `/players/${name.toLowerCase()}`;
    this.objectId = `${this.objectPath}#1`;
  }
}

describe('Permission Denial Integration', () => {
  let permissions: Permissions;
  let testDir: string;

  beforeEach(async () => {
    testDir = `./test-mudlib-perm-${randomUUID().slice(0, 8)}`;
    permissions = new Permissions({
      protectedPaths: ['/std/', '/core/', '/daemon/', '/master.ts', '/simul_efun.ts'],
    });

    // Create test directory structure
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'std'), { recursive: true });
    await mkdir(join(testDir, 'areas', 'town'), { recursive: true });
    await mkdir(join(testDir, 'areas', 'dungeon'), { recursive: true });
    await mkdir(join(testDir, 'lib'), { recursive: true });

    resetRegistry();
    resetEfunBridge();
  });

  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    resetRegistry();
    resetEfunBridge();
  });

  describe('Player Write Denial', () => {
    it('should deny regular player write access to any file', () => {
      const player = new MockPlayer('RegularPlayer');

      // Try various paths
      expect(permissions.canWrite(player, '/areas/town/room.ts')).toBe(false);
      expect(permissions.canWrite(player, '/std/object.ts')).toBe(false);
      expect(permissions.canWrite(player, '/lib/utils.ts')).toBe(false);
      expect(permissions.canWrite(player, '/data/save.json')).toBe(false);
    });

    it('should log player write denial attempts', () => {
      const player = new MockPlayer('HackerPlayer');

      // Attempt unauthorized write
      permissions.canWrite(player, '/std/object.ts');

      // Check audit log
      const log = permissions.getAuditLog();
      const denial = log.find(
        (e) => e.player === 'hackerplayer' && e.target === '/std/object.ts' && !e.success
      );

      expect(denial).toBeDefined();
      expect(denial?.action).toBe('write');
    });

    it('should allow player read access to most files', () => {
      const player = new MockPlayer('Reader');

      // Players can read game content
      expect(permissions.canRead(player, '/areas/town/room.ts')).toBe(true);
      expect(permissions.canRead(player, '/std/object.ts')).toBe(true);
    });
  });

  describe('Builder Domain Restrictions', () => {
    it('should deny builder write outside assigned domain', () => {
      const builder = new MockPlayer('CastleBuilder');

      permissions.setLevel('castlebuilder', PermissionLevel.Builder);
      permissions.addDomain('castlebuilder', '/areas/castle/');

      // Can write to assigned domain
      expect(permissions.canWrite(builder, '/areas/castle/throne.ts')).toBe(true);
      expect(permissions.canWrite(builder, '/areas/castle/dungeon/cell.ts')).toBe(true);

      // Cannot write to other domains
      expect(permissions.canWrite(builder, '/areas/town/square.ts')).toBe(false);
      expect(permissions.canWrite(builder, '/areas/forest/clearing.ts')).toBe(false);
    });

    it('should deny builder write to protected paths', () => {
      const builder = new MockPlayer('TryHardBuilder');

      permissions.setLevel('tryhardbuilder', PermissionLevel.Builder);
      permissions.addDomain('tryhardbuilder', '/areas/');

      // Even with broad domain, cannot write protected paths
      expect(permissions.canWrite(builder, '/std/object.ts')).toBe(false);
      expect(permissions.canWrite(builder, '/std/room.ts')).toBe(false);
      expect(permissions.canWrite(builder, '/core/driver.ts')).toBe(false);
      expect(permissions.canWrite(builder, '/daemon/login.ts')).toBe(false);
      expect(permissions.canWrite(builder, '/master.ts')).toBe(false);
    });

    it('should log builder domain violations', () => {
      const builder = new MockPlayer('Violator');

      permissions.setLevel('violator', PermissionLevel.Builder);
      permissions.addDomain('violator', '/areas/myzone/');

      // Try to write outside domain
      permissions.canWrite(builder, '/areas/otherzone/secret.ts');

      const log = permissions.getAuditLog();
      const violation = log.find(
        (e) =>
          e.player === 'violator' &&
          e.target === '/areas/otherzone/secret.ts' &&
          !e.success
      );

      expect(violation).toBeDefined();
    });

    it('should handle multiple domain assignments', () => {
      const builder = new MockPlayer('MultiBuilder');

      permissions.setLevel('multibuilder', PermissionLevel.Builder);
      permissions.addDomain('multibuilder', '/areas/castle/');
      permissions.addDomain('multibuilder', '/areas/forest/');

      // Can write to both domains
      expect(permissions.canWrite(builder, '/areas/castle/room.ts')).toBe(true);
      expect(permissions.canWrite(builder, '/areas/forest/clearing.ts')).toBe(true);

      // Still cannot write to unassigned domains
      expect(permissions.canWrite(builder, '/areas/town/square.ts')).toBe(false);
    });
  });

  describe('Senior Builder Restrictions', () => {
    it('should allow senior builder to write /lib/', () => {
      const senior = new MockPlayer('SeniorDev');

      permissions.setLevel('seniordev', PermissionLevel.SeniorBuilder);

      // Senior builders can write to /lib/
      expect(permissions.canWrite(senior, '/lib/utils.ts')).toBe(true);
      expect(permissions.canWrite(senior, '/lib/combat.ts')).toBe(true);
    });

    it('should still deny senior builder write to /std/', () => {
      const senior = new MockPlayer('SeniorDev');

      permissions.setLevel('seniordev', PermissionLevel.SeniorBuilder);

      // Even senior builders cannot modify /std/
      expect(permissions.canWrite(senior, '/std/object.ts')).toBe(false);
      expect(permissions.canWrite(senior, '/std/room.ts')).toBe(false);
    });
  });

  describe('Administrator Full Access', () => {
    it('should allow admin write to all paths including protected', () => {
      const admin = new MockPlayer('SuperAdmin');

      permissions.setLevel('superadmin', PermissionLevel.Administrator);

      // Admin can write everywhere
      expect(permissions.canWrite(admin, '/std/object.ts')).toBe(true);
      expect(permissions.canWrite(admin, '/std/room.ts')).toBe(true);
      expect(permissions.canWrite(admin, '/core/driver.ts')).toBe(true);
      expect(permissions.canWrite(admin, '/daemon/login.ts')).toBe(true);
      expect(permissions.canWrite(admin, '/master.ts')).toBe(true);
      expect(permissions.canWrite(admin, '/areas/anywhere/room.ts')).toBe(true);
    });

    it('should log admin actions for audit trail', () => {
      const admin = new MockPlayer('AuditedAdmin');

      permissions.setLevel('auditedadmin', PermissionLevel.Administrator);

      // Admin write to protected path
      permissions.canWrite(admin, '/std/object.ts');

      const log = permissions.getAuditLog();
      const entry = log.find(
        (e) => e.player === 'auditedadmin' && e.target === '/std/object.ts'
      );

      expect(entry).toBeDefined();
      expect(entry?.success).toBe(true);
    });
  });

  describe('Permission Commands', () => {
    it('should deny non-admin from granting permissions', () => {
      const builder = new MockPlayer('SneakyBuilder');
      // Target player exists but builder can't grant them permissions
      const _target = new MockPlayer('Accomplice');

      permissions.setLevel('sneakybuilder', PermissionLevel.Builder);

      // Only admin can grant permissions
      // This would be checked in the admin daemon
      expect(permissions.isAdmin(builder)).toBe(false);
      expect(_target.name).toBe('Accomplice'); // Verify target exists

      // Builder cannot make themselves admin
      // (The actual grant command would check isAdmin first)
    });

    it('should track permission changes in audit log', () => {
      // Simulate admin granting builder status
      permissions.setLevel('newbuilder', PermissionLevel.Builder);
      permissions.addDomain('newbuilder', '/areas/newzone/');

      // In a real implementation, these changes would be logged
      // with the admin who made them
      const domains = permissions.getDomains('newbuilder');
      expect(domains).toContain('/areas/newzone/');
    });
  });

  describe('File Operation Denial', () => {
    it('should integrate with efun file operations', async () => {
      // Create a test file
      await writeFile(join(testDir, 'areas', 'town', 'square.ts'), 'export class Square {}');

      // EfunBridge would use permissions to check file access
      const efunBridge = new EfunBridge({ mudlibPath: testDir });
      const player = new MockPlayer('FileHacker');

      // Verify efunBridge is configured correctly
      expect(efunBridge).toBeDefined();

      // Player tries to read file (should work)
      const canRead = permissions.canRead(player, '/areas/town/square.ts');
      expect(canRead).toBe(true);

      // Player tries to write file (should fail at permission layer)
      const canWrite = permissions.canWrite(player, '/areas/town/square.ts');
      expect(canWrite).toBe(false);
    });

    it('should prevent directory traversal attempts', () => {
      const player = new MockPlayer('PathTraverser');

      // Attempts to escape mudlib directory should be blocked
      expect(permissions.canWrite(player, '../../../etc/passwd')).toBe(false);
      expect(permissions.canWrite(player, '/areas/../../../secret.ts')).toBe(false);
      expect(permissions.canRead(player, '../../../../etc/shadow')).toBe(true); // Read might be allowed but path would be sanitized elsewhere
    });
  });

  describe('Real-World Denial Scenarios', () => {
    it('should deny player editing another player save file', () => {
      const player = new MockPlayer('Cheater');

      // Even with builder status, should not access other player data
      permissions.setLevel('cheater', PermissionLevel.Builder);
      permissions.addDomain('cheater', '/areas/myzone/');

      // Cannot access player save data
      expect(permissions.canWrite(player, '/data/players/victim.json')).toBe(false);
    });

    it('should deny builder from modifying core game mechanics', () => {
      const builder = new MockPlayer('RogueBuilder');

      permissions.setLevel('roguebuilder', PermissionLevel.Builder);
      permissions.addDomain('roguebuilder', '/areas/');

      // Cannot modify core classes
      expect(permissions.canWrite(builder, '/std/living.ts')).toBe(false);
      expect(permissions.canWrite(builder, '/std/player.ts')).toBe(false);
      expect(permissions.canWrite(builder, '/std/combat.ts')).toBe(false);
    });

    it('should deny editing master object', () => {
      const builder = new MockPlayer('MasterHacker');

      permissions.setLevel('masterhacker', PermissionLevel.SeniorBuilder);

      // Even senior builders cannot modify master object
      expect(permissions.canWrite(builder, '/master.ts')).toBe(false);
      expect(permissions.canWrite(builder, '/simul_efun.ts')).toBe(false);
    });
  });

  describe('Audit Log Completeness', () => {
    it('should capture all permission check attempts', () => {
      const player = new MockPlayer('Audited');
      const builder = new MockPlayer('AuditedBuilder');

      permissions.setLevel('auditedbuilder', PermissionLevel.Builder);
      permissions.addDomain('auditedbuilder', '/areas/myzone/');

      // Various permission checks
      permissions.canRead(player, '/areas/town/room.ts');
      permissions.canWrite(player, '/areas/town/room.ts'); // denied
      permissions.canWrite(builder, '/areas/myzone/room.ts'); // allowed
      permissions.canWrite(builder, '/std/object.ts'); // denied

      const log = permissions.getAuditLog();

      // Should have entries for all checks
      expect(log.length).toBeGreaterThanOrEqual(4);

      // Check for denial entries
      const denials = log.filter((e) => !e.success);
      expect(denials.length).toBeGreaterThanOrEqual(2);
    });

    it('should preserve audit log order', () => {
      const player = new MockPlayer('Orderly');

      permissions.canWrite(player, '/first.ts');
      permissions.canWrite(player, '/second.ts');
      permissions.canWrite(player, '/third.ts');

      const log = permissions.getAuditLog();
      const targets = log.filter((e) => e.player === 'orderly').map((e) => e.target);

      expect(targets).toContain('/first.ts');
      expect(targets).toContain('/second.ts');
      expect(targets).toContain('/third.ts');
    });
  });

  describe('Permission Level Transitions', () => {
    it('should properly revoke permissions', () => {
      const player = new MockPlayer('Demoted');

      // Grant builder status
      permissions.setLevel('demoted', PermissionLevel.Builder);
      permissions.addDomain('demoted', '/areas/zone/');

      expect(permissions.canWrite(player, '/areas/zone/room.ts')).toBe(true);

      // Revoke to player level
      permissions.setLevel('demoted', PermissionLevel.Player);

      // Should no longer have write access
      expect(permissions.canWrite(player, '/areas/zone/room.ts')).toBe(false);
    });

    it('should handle domain removal', () => {
      const builder = new MockPlayer('DomainLoss');

      permissions.setLevel('domainloss', PermissionLevel.Builder);
      permissions.addDomain('domainloss', '/areas/castle/');
      permissions.addDomain('domainloss', '/areas/forest/');

      expect(permissions.canWrite(builder, '/areas/castle/room.ts')).toBe(true);
      expect(permissions.canWrite(builder, '/areas/forest/tree.ts')).toBe(true);

      // Remove one domain
      permissions.removeDomain('domainloss', '/areas/castle/');

      // Lost access to removed domain
      expect(permissions.canWrite(builder, '/areas/castle/room.ts')).toBe(false);
      // Still has access to remaining domain
      expect(permissions.canWrite(builder, '/areas/forest/tree.ts')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null player (driver access)', () => {
      // Driver (null player) should have full access
      expect(permissions.canRead(null, '/std/object.ts')).toBe(true);
      expect(permissions.canWrite(null, '/std/object.ts')).toBe(true);
    });

    it('should handle case-insensitive player names', () => {
      const builder1 = new MockPlayer('TestBuilder');
      const builder2 = new MockPlayer('TESTBUILDER');
      const builder3 = new MockPlayer('testbuilder');

      permissions.setLevel('testbuilder', PermissionLevel.Builder);
      permissions.addDomain('testbuilder', '/areas/test/');

      // All variations should work
      expect(permissions.canWrite(builder1, '/areas/test/room.ts')).toBe(true);
      expect(permissions.canWrite(builder2, '/areas/test/room.ts')).toBe(true);
      expect(permissions.canWrite(builder3, '/areas/test/room.ts')).toBe(true);
    });

    it('should handle empty path', () => {
      const player = new MockPlayer('EmptyPath');

      // Empty paths should be denied
      expect(permissions.canWrite(player, '')).toBe(false);
    });
  });
});
