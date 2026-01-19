import { describe, it, expect, beforeEach } from 'vitest';
import {
  Permissions,
  PermissionLevel,
  getPermissions,
  resetPermissions,
} from '../../src/driver/permissions.js';

describe('Permissions', () => {
  let permissions: Permissions;

  beforeEach(() => {
    resetPermissions();
    permissions = new Permissions();
  });

  describe('PermissionLevel', () => {
    it('should have correct level values', () => {
      expect(PermissionLevel.Player).toBe(0);
      expect(PermissionLevel.Builder).toBe(1);
      expect(PermissionLevel.SeniorBuilder).toBe(2);
      expect(PermissionLevel.Administrator).toBe(3);
    });
  });

  describe('getLevel/setLevel', () => {
    it('should return Player level by default', () => {
      expect(permissions.getLevel('unknown')).toBe(PermissionLevel.Player);
    });

    it('should set and get player level', () => {
      permissions.setLevel('alice', PermissionLevel.Builder);
      expect(permissions.getLevel('alice')).toBe(PermissionLevel.Builder);
    });

    it('should handle case-insensitive names', () => {
      permissions.setLevel('Alice', PermissionLevel.Administrator);
      expect(permissions.getLevel('alice')).toBe(PermissionLevel.Administrator);
      expect(permissions.getLevel('ALICE')).toBe(PermissionLevel.Administrator);
    });

    it('should accept MudObject with name', () => {
      permissions.setLevel('bob', PermissionLevel.SeniorBuilder);
      const player = { name: 'Bob' };
      expect(permissions.getLevel(player)).toBe(PermissionLevel.SeniorBuilder);
    });

    it('should return Player for MudObject without name', () => {
      const obj = {};
      expect(permissions.getLevel(obj)).toBe(PermissionLevel.Player);
    });
  });

  describe('hasLevel', () => {
    it('should return true when player has required level', () => {
      permissions.setLevel('admin', PermissionLevel.Administrator);
      expect(permissions.hasLevel('admin', PermissionLevel.Player)).toBe(true);
      expect(permissions.hasLevel('admin', PermissionLevel.Builder)).toBe(true);
      expect(permissions.hasLevel('admin', PermissionLevel.Administrator)).toBe(true);
    });

    it('should return false when player lacks required level', () => {
      permissions.setLevel('builder', PermissionLevel.Builder);
      expect(permissions.hasLevel('builder', PermissionLevel.Administrator)).toBe(false);
    });
  });

  describe('isAdmin/isBuilder', () => {
    it('should identify administrators', () => {
      permissions.setLevel('admin', PermissionLevel.Administrator);
      expect(permissions.isAdmin('admin')).toBe(true);
      expect(permissions.isAdmin('unknown')).toBe(false);
    });

    it('should identify builders (and higher)', () => {
      permissions.setLevel('builder', PermissionLevel.Builder);
      permissions.setLevel('admin', PermissionLevel.Administrator);

      expect(permissions.isBuilder('builder')).toBe(true);
      expect(permissions.isBuilder('admin')).toBe(true);
      expect(permissions.isBuilder('unknown')).toBe(false);
    });
  });

  describe('canRead', () => {
    it('should allow driver (null player) to read anything', () => {
      expect(permissions.canRead(null, '/secret/data.txt')).toBe(true);
    });

    it('should allow players to read files', () => {
      const player = { name: 'guest' };
      expect(permissions.canRead(player, '/areas/town/room.ts')).toBe(true);
    });
  });

  describe('canWrite', () => {
    it('should allow driver (null player) to write anywhere', () => {
      expect(permissions.canWrite(null, '/std/object.ts')).toBe(true);
    });

    it('should deny Players write access', () => {
      const player = { name: 'guest' };
      expect(permissions.canWrite(player, '/areas/town/room.ts')).toBe(false);
    });

    it('should deny Builders write to unassigned paths', () => {
      permissions.setLevel('builder', PermissionLevel.Builder);
      const player = { name: 'builder' };
      expect(permissions.canWrite(player, '/areas/town/room.ts')).toBe(false);
    });

    it('should allow Builders write to assigned domains', () => {
      permissions.setLevel('builder', PermissionLevel.Builder);
      permissions.addDomain('builder', '/areas/castle/');
      const player = { name: 'builder' };

      expect(permissions.canWrite(player, '/areas/castle/room1.ts')).toBe(true);
      expect(permissions.canWrite(player, '/areas/castle/npcs/guard.ts')).toBe(true);
      expect(permissions.canWrite(player, '/areas/town/room.ts')).toBe(false);
    });

    it('should deny Builders write to protected paths', () => {
      permissions.setLevel('builder', PermissionLevel.Builder);
      permissions.addDomain('builder', '/std/');
      const player = { name: 'builder' };

      expect(permissions.canWrite(player, '/std/object.ts')).toBe(false);
    });

    it('should allow SeniorBuilders write to /lib/', () => {
      permissions.setLevel('senior', PermissionLevel.SeniorBuilder);
      const player = { name: 'senior' };

      expect(permissions.canWrite(player, '/lib/utils.ts')).toBe(true);
      expect(permissions.canWrite(player, '/areas/town/room.ts')).toBe(false);
    });

    it('should allow Administrators write anywhere', () => {
      permissions.setLevel('admin', PermissionLevel.Administrator);
      const player = { name: 'admin' };

      expect(permissions.canWrite(player, '/std/object.ts')).toBe(true);
      expect(permissions.canWrite(player, '/core/driver.ts')).toBe(true);
      expect(permissions.canWrite(player, '/areas/castle/room.ts')).toBe(true);
    });
  });

  describe('canExecute', () => {
    it('should allow driver to execute anything', () => {
      expect(permissions.canExecute(null, '/daemon/secret.ts')).toBe(true);
    });

    it('should allow players to execute objects', () => {
      const player = { name: 'guest' };
      expect(permissions.canExecute(player, '/std/object')).toBe(true);
    });
  });

  describe('isProtectedPath', () => {
    it('should identify protected paths', () => {
      expect(permissions.isProtectedPath('/std/object.ts')).toBe(true);
      expect(permissions.isProtectedPath('/daemons/login.ts')).toBe(true);
    });

    it('should allow non-protected paths', () => {
      expect(permissions.isProtectedPath('/areas/town/room.ts')).toBe(false);
      expect(permissions.isProtectedPath('/lib/utils.ts')).toBe(false);
    });
  });

  describe('Domain Management', () => {
    it('should return empty array for unknown player', () => {
      expect(permissions.getDomains('unknown')).toEqual([]);
    });

    it('should add domains', () => {
      permissions.addDomain('builder', '/areas/castle/');
      permissions.addDomain('builder', '/areas/forest/');

      const domains = permissions.getDomains('builder');
      expect(domains).toContain('/areas/castle/');
      expect(domains).toContain('/areas/forest/');
    });

    it('should not add duplicate domains', () => {
      permissions.addDomain('builder', '/areas/castle/');
      permissions.addDomain('builder', '/areas/castle/');

      expect(permissions.getDomains('builder')).toHaveLength(1);
    });

    it('should remove domains', () => {
      permissions.addDomain('builder', '/areas/castle/');
      permissions.addDomain('builder', '/areas/forest/');
      permissions.removeDomain('builder', '/areas/castle/');

      const domains = permissions.getDomains('builder');
      expect(domains).not.toContain('/areas/castle/');
      expect(domains).toContain('/areas/forest/');
    });

    it('should set domains (replace all)', () => {
      permissions.addDomain('builder', '/areas/old/');
      permissions.setDomains('builder', ['/areas/new1/', '/areas/new2/']);

      const domains = permissions.getDomains('builder');
      expect(domains).not.toContain('/areas/old/');
      expect(domains).toContain('/areas/new1/');
      expect(domains).toContain('/areas/new2/');
    });

    it('should check hasDomain', () => {
      permissions.addDomain('builder', '/areas/castle/');

      expect(permissions.hasDomain('builder', '/areas/castle/')).toBe(true);
      expect(permissions.hasDomain('builder', '/areas/forest/')).toBe(false);
    });

    it('should get all domain assignments', () => {
      permissions.addDomain('alice', '/areas/castle/');
      permissions.addDomain('bob', '/areas/forest/');

      const all = permissions.getAllDomains();
      expect(all).toHaveLength(2);
      expect(all.find((a) => a.playerName === 'alice')?.paths).toContain('/areas/castle/');
      expect(all.find((a) => a.playerName === 'bob')?.paths).toContain('/areas/forest/');
    });
  });

  describe('Audit Log', () => {
    it('should log read access', () => {
      const player = { name: 'tester' };
      permissions.canRead(player, '/areas/town/room.ts');

      const log = permissions.getAuditLog(10);
      expect(log).toHaveLength(1);
      expect(log[0].player).toBe('tester');
      expect(log[0].action).toBe('read');
      expect(log[0].target).toBe('/areas/town/room.ts');
      expect(log[0].success).toBe(true);
    });

    it('should log write denials', () => {
      const player = { name: 'guest' };
      permissions.canWrite(player, '/areas/town/room.ts');

      const log = permissions.getAuditLog(10);
      expect(log).toHaveLength(1);
      expect(log[0].success).toBe(false);
      expect(log[0].details).toContain('Insufficient');
    });

    it('should limit audit log entries', () => {
      const player = { name: 'tester' };
      for (let i = 0; i < 150; i++) {
        permissions.canRead(player, `/file${i}.ts`);
      }

      const log = permissions.getAuditLog(200);
      expect(log.length).toBeLessThanOrEqual(150);
    });

    it('should filter audit log by player', () => {
      const alice = { name: 'alice' };
      const bob = { name: 'bob' };

      permissions.canRead(alice, '/file1.ts');
      permissions.canRead(bob, '/file2.ts');
      permissions.canRead(alice, '/file3.ts');

      const aliceLog = permissions.getAuditLogForPlayer('alice', 10);
      expect(aliceLog).toHaveLength(2);
      expect(aliceLog.every((e) => e.player === 'alice')).toBe(true);
    });

    it('should clear audit log', () => {
      const player = { name: 'tester' };
      permissions.canRead(player, '/file.ts');
      expect(permissions.getAuditLog(10)).toHaveLength(1);

      permissions.clearAuditLog();
      expect(permissions.getAuditLog(10)).toHaveLength(0);
    });
  });

  describe('Export/Import', () => {
    it('should export permissions data', () => {
      permissions.setLevel('admin', PermissionLevel.Administrator);
      permissions.setLevel('builder', PermissionLevel.Builder);
      permissions.addDomain('builder', '/areas/castle/');

      const data = permissions.export();

      expect(data.levels['admin']).toBe(PermissionLevel.Administrator);
      expect(data.levels['builder']).toBe(PermissionLevel.Builder);
      expect(data.domains['builder']).toContain('/areas/castle/');
    });

    it('should import permissions data', () => {
      const data = {
        levels: {
          admin: PermissionLevel.Administrator,
          builder: PermissionLevel.Builder,
        },
        domains: {
          builder: ['/areas/castle/', '/areas/forest/'],
        },
      };

      permissions.import(data);

      expect(permissions.getLevel('admin')).toBe(PermissionLevel.Administrator);
      expect(permissions.getLevel('builder')).toBe(PermissionLevel.Builder);
      expect(permissions.getDomains('builder')).toContain('/areas/castle/');
      expect(permissions.getDomains('builder')).toContain('/areas/forest/');
    });
  });

  describe('getLevelName', () => {
    it('should return correct level names', () => {
      expect(permissions.getLevelName(PermissionLevel.Player)).toBe('Player');
      expect(permissions.getLevelName(PermissionLevel.Builder)).toBe('Builder');
      expect(permissions.getLevelName(PermissionLevel.SeniorBuilder)).toBe('Senior Builder');
      expect(permissions.getLevelName(PermissionLevel.Administrator)).toBe('Administrator');
    });

    it('should return Unknown for invalid levels', () => {
      expect(permissions.getLevelName(99 as PermissionLevel)).toBe('Unknown');
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const p1 = getPermissions();
      const p2 = getPermissions();

      expect(p1).toBe(p2);
    });

    it('should reset instance', () => {
      const p1 = getPermissions();
      p1.setLevel('test', PermissionLevel.Administrator);

      resetPermissions();
      const p2 = getPermissions();

      expect(p2).not.toBe(p1);
      expect(p2.getLevel('test')).toBe(PermissionLevel.Player);
    });

    it('should accept config on first call', () => {
      resetPermissions();
      const p = getPermissions({
        protectedPaths: ['/custom/'],
      });

      expect(p.isProtectedPath('/custom/file.ts')).toBe(true);
      expect(p.isProtectedPath('/std/object.ts')).toBe(false);
    });
  });
});
