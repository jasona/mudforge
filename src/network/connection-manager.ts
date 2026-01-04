/**
 * ConnectionManager - Tracks all active client connections.
 *
 * Provides methods to find, iterate, and broadcast to connections.
 */

import { Connection, type ConnectionState } from './connection.js';
import { EventEmitter } from 'events';

/**
 * Connection manager events.
 */
export interface ConnectionManagerEvents {
  connect: (connection: Connection) => void;
  disconnect: (connection: Connection, code: number, reason: string) => void;
}

/**
 * Manages all active connections.
 */
export class ConnectionManager extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private nextId: number = 1;

  /**
   * Add a connection to the manager.
   * @param connection The connection to add
   */
  add(connection: Connection): void {
    this.connections.set(connection.id, connection);

    // Set up disconnect handler
    connection.on('close', (code: number, reason: string) => {
      this.connections.delete(connection.id);
      this.emit('disconnect', connection, code, reason);
    });

    this.emit('connect', connection);
  }

  /**
   * Remove a connection from the manager.
   * @param connectionId The connection ID to remove
   */
  remove(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.connections.delete(connectionId);
      return true;
    }
    return false;
  }

  /**
   * Get a connection by ID.
   * @param connectionId The connection ID
   */
  get(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Find a connection by predicate.
   * @param predicate Function to test each connection
   */
  find(predicate: (connection: Connection) => boolean): Connection | undefined {
    for (const connection of this.connections.values()) {
      if (predicate(connection)) {
        return connection;
      }
    }
    return undefined;
  }

  /**
   * Get all connections.
   */
  getAll(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get all connections matching a predicate.
   * @param predicate Function to test each connection
   */
  filter(predicate: (connection: Connection) => boolean): Connection[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Get connections in a specific state.
   * @param state The state to filter by
   */
  getByState(state: ConnectionState): Connection[] {
    return this.filter((c) => c.state === state);
  }

  /**
   * Get connections with bound players.
   */
  getWithPlayers(): Connection[] {
    return this.filter((c) => c.player !== null);
  }

  /**
   * Get the number of connections.
   */
  get count(): number {
    return this.connections.size;
  }

  /**
   * Get the number of active (open) connections.
   */
  get activeCount(): number {
    return this.getByState('open').length;
  }

  /**
   * Get the number of connections with bound players.
   */
  get playerCount(): number {
    return this.getWithPlayers().length;
  }

  /**
   * Generate a unique connection ID.
   */
  generateId(): string {
    return `conn-${this.nextId++}`;
  }

  /**
   * Broadcast a message to all connections.
   * @param message The message to send
   * @param exclude Optional connection IDs to exclude
   */
  broadcast(message: string, exclude?: string[]): void {
    const excludeSet = new Set(exclude || []);

    for (const connection of this.connections.values()) {
      if (!excludeSet.has(connection.id) && connection.isConnected()) {
        connection.send(message);
      }
    }
  }

  /**
   * Broadcast a message to connections matching a predicate.
   * @param message The message to send
   * @param predicate Function to test each connection
   */
  broadcastTo(message: string, predicate: (connection: Connection) => boolean): void {
    for (const connection of this.connections.values()) {
      if (connection.isConnected() && predicate(connection)) {
        connection.send(message);
      }
    }
  }

  /**
   * Close all connections.
   * @param code Optional close code
   * @param reason Optional close reason
   */
  closeAll(code?: number, reason?: string): void {
    for (const connection of this.connections.values()) {
      connection.close(code, reason);
    }
  }

  /**
   * Iterate over all connections.
   */
  *[Symbol.iterator](): Iterator<Connection> {
    yield* this.connections.values();
  }

  /**
   * Execute a function for each connection.
   * @param fn Function to execute
   */
  forEach(fn: (connection: Connection) => void): void {
    for (const connection of this.connections.values()) {
      fn(connection);
    }
  }
}

// Singleton instance
let managerInstance: ConnectionManager | null = null;

/**
 * Get the global ConnectionManager instance.
 */
export function getConnectionManager(): ConnectionManager {
  if (!managerInstance) {
    managerInstance = new ConnectionManager();
  }
  return managerInstance;
}

/**
 * Reset the global connection manager. Used for testing.
 */
export function resetConnectionManager(): void {
  if (managerInstance) {
    managerInstance.closeAll();
  }
  managerInstance = null;
}

export default ConnectionManager;
