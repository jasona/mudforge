import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ConnectionManager,
  getConnectionManager,
  resetConnectionManager,
} from '../../src/network/connection-manager.js';
import { Connection } from '../../src/network/connection.js';
import { EventEmitter } from 'events';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  readyState = 1; // WebSocket.OPEN
  OPEN = 1;

  send = vi.fn();
  close = vi.fn();
  terminate = vi.fn();
}

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    resetConnectionManager();
    manager = new ConnectionManager();
  });

  afterEach(() => {
    resetConnectionManager();
  });

  function createMockConnection(id: string): Connection {
    const socket = new MockWebSocket() as unknown as import('ws').WebSocket;
    return new Connection(socket, id, '127.0.0.1');
  }

  describe('add/remove', () => {
    it('should add connection', () => {
      const conn = createMockConnection('test-1');
      manager.add(conn);

      expect(manager.count).toBe(1);
      expect(manager.get('test-1')).toBe(conn);
    });

    it('should remove connection', () => {
      const conn = createMockConnection('test-1');
      manager.add(conn);

      const result = manager.remove('test-1');

      expect(result).toBe(true);
      expect(manager.count).toBe(0);
    });

    it('should return false when removing non-existent connection', () => {
      const result = manager.remove('nonexistent');
      expect(result).toBe(false);
    });

    it('should emit connect event', () => {
      const handler = vi.fn();
      manager.on('connect', handler);

      const conn = createMockConnection('test-1');
      manager.add(conn);

      expect(handler).toHaveBeenCalledWith(conn);
    });
  });

  describe('get/find', () => {
    it('should get connection by ID', () => {
      const conn = createMockConnection('test-1');
      manager.add(conn);

      expect(manager.get('test-1')).toBe(conn);
    });

    it('should return undefined for unknown ID', () => {
      expect(manager.get('nonexistent')).toBeUndefined();
    });

    it('should find connection by predicate', () => {
      const conn1 = createMockConnection('test-1');
      const conn2 = createMockConnection('test-2');
      manager.add(conn1);
      manager.add(conn2);

      const found = manager.find((c) => c.id === 'test-2');
      expect(found).toBe(conn2);
    });

    it('should filter connections', () => {
      const conn1 = createMockConnection('a-1');
      const conn2 = createMockConnection('b-2');
      const conn3 = createMockConnection('a-3');
      manager.add(conn1);
      manager.add(conn2);
      manager.add(conn3);

      const filtered = manager.filter((c) => c.id.startsWith('a-'));
      expect(filtered).toHaveLength(2);
      expect(filtered).toContain(conn1);
      expect(filtered).toContain(conn3);
    });
  });

  describe('getAll', () => {
    it('should return all connections', () => {
      const conn1 = createMockConnection('test-1');
      const conn2 = createMockConnection('test-2');
      manager.add(conn1);
      manager.add(conn2);

      const all = manager.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(conn1);
      expect(all).toContain(conn2);
    });
  });

  describe('counts', () => {
    it('should track count', () => {
      expect(manager.count).toBe(0);

      manager.add(createMockConnection('test-1'));
      expect(manager.count).toBe(1);

      manager.add(createMockConnection('test-2'));
      expect(manager.count).toBe(2);
    });

    it('should track active count', () => {
      manager.add(createMockConnection('test-1'));
      manager.add(createMockConnection('test-2'));

      expect(manager.activeCount).toBe(2);
    });

    it('should track player count', () => {
      const conn1 = createMockConnection('test-1');
      const conn2 = createMockConnection('test-2');
      manager.add(conn1);
      manager.add(conn2);

      expect(manager.playerCount).toBe(0);

      conn1.bindPlayer({ name: 'Player1' });
      expect(manager.playerCount).toBe(1);

      conn2.bindPlayer({ name: 'Player2' });
      expect(manager.playerCount).toBe(2);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = manager.generateId();
      const id2 = manager.generateId();
      const id3 = manager.generateId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1.startsWith('conn-')).toBe(true);
    });
  });

  describe('broadcast', () => {
    it('should broadcast to all connections', () => {
      const conn1 = createMockConnection('test-1');
      const conn2 = createMockConnection('test-2');
      const send1 = vi.spyOn(conn1, 'send');
      const send2 = vi.spyOn(conn2, 'send');
      manager.add(conn1);
      manager.add(conn2);

      manager.broadcast('Hello, world!');

      expect(send1).toHaveBeenCalledWith('Hello, world!');
      expect(send2).toHaveBeenCalledWith('Hello, world!');
    });

    it('should exclude specified connections', () => {
      const conn1 = createMockConnection('test-1');
      const conn2 = createMockConnection('test-2');
      const send1 = vi.spyOn(conn1, 'send');
      const send2 = vi.spyOn(conn2, 'send');
      manager.add(conn1);
      manager.add(conn2);

      manager.broadcast('Hello!', ['test-1']);

      expect(send1).not.toHaveBeenCalled();
      expect(send2).toHaveBeenCalledWith('Hello!');
    });

    it('should broadcast to filtered connections', () => {
      const conn1 = createMockConnection('test-1');
      const conn2 = createMockConnection('test-2');
      conn1.bindPlayer({ name: 'Player1' });
      const send1 = vi.spyOn(conn1, 'send');
      const send2 = vi.spyOn(conn2, 'send');
      manager.add(conn1);
      manager.add(conn2);

      manager.broadcastTo('Hello players!', (c) => c.player !== null);

      expect(send1).toHaveBeenCalledWith('Hello players!');
      expect(send2).not.toHaveBeenCalled();
    });
  });

  describe('iteration', () => {
    it('should support iteration', () => {
      const conn1 = createMockConnection('test-1');
      const conn2 = createMockConnection('test-2');
      manager.add(conn1);
      manager.add(conn2);

      const connections = [...manager];
      expect(connections).toHaveLength(2);
    });

    it('should support forEach', () => {
      const conn1 = createMockConnection('test-1');
      const conn2 = createMockConnection('test-2');
      manager.add(conn1);
      manager.add(conn2);

      const ids: string[] = [];
      manager.forEach((c) => ids.push(c.id));

      expect(ids).toContain('test-1');
      expect(ids).toContain('test-2');
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const manager1 = getConnectionManager();
      const manager2 = getConnectionManager();

      expect(manager1).toBe(manager2);
    });

    it('should reset instance', () => {
      const manager1 = getConnectionManager();
      manager1.add(createMockConnection('test-1'));

      resetConnectionManager();
      const manager2 = getConnectionManager();

      expect(manager2).not.toBe(manager1);
      expect(manager2.count).toBe(0);
    });
  });
});
