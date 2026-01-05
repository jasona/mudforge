/**
 * Server - HTTP and WebSocket server using Fastify.
 *
 * Serves the web client and handles WebSocket connections for the MUD.
 */

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { join, resolve } from 'path';
import { Connection } from './connection.js';
import { ConnectionManager, getConnectionManager } from './connection-manager.js';
import { EventEmitter } from 'events';
import type { Logger } from 'pino';

/**
 * Server configuration.
 */
export interface ServerConfig {
  /** HTTP port */
  port: number;
  /** Bind address */
  host: string;
  /** Path to static client files */
  clientPath: string;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Server events.
 */
export interface ServerEvents {
  connection: (connection: Connection) => void;
  disconnect: (connection: Connection, code: number, reason: string) => void;
  message: (connection: Connection, message: string) => void;
  error: (error: Error) => void;
}

/**
 * MUD server handling HTTP and WebSocket connections.
 */
export class Server extends EventEmitter {
  private config: ServerConfig;
  private fastify: FastifyInstance;
  private connectionManager: ConnectionManager;
  private running: boolean = false;

  constructor(config: Partial<ServerConfig> = {}) {
    super();

    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? '0.0.0.0',
      clientPath: config.clientPath ?? join(process.cwd(), 'dist', 'client'),
      ...(config.logger ? { logger: config.logger } : {}),
    };

    this.connectionManager = getConnectionManager();

    // Create Fastify instance
    this.fastify = Fastify({
      logger: this.config.logger ? true : false,
    });
  }

  /**
   * Set up HTTP routes and WebSocket handler.
   */
  private async setupRoutes(): Promise<void> {
    // Register static file serving
    await this.fastify.register(fastifyStatic, {
      root: resolve(this.config.clientPath),
      prefix: '/',
    });

    // Register WebSocket support
    await this.fastify.register(fastifyWebsocket, {
      options: {
        maxPayload: 64 * 1024, // 64KB max message size
      },
    });

    // Health check endpoint
    this.fastify.get('/health', async () => {
      return {
        status: 'ok',
        uptime: process.uptime(),
        players: this.connectionManager.playerCount,
        connections: this.connectionManager.count,
      };
    });

    // Readiness check endpoint
    this.fastify.get('/ready', async () => {
      if (!this.running) {
        throw new Error('Server not ready');
      }
      return { status: 'ready' };
    });

    // WebSocket endpoint
    this.fastify.get('/ws', { websocket: true }, (socket: WebSocket, request) => {
      this.handleWebSocketConnection(socket, request);
    });
  }

  /**
   * Handle a new WebSocket connection.
   */
  private handleWebSocketConnection(socket: WebSocket, request: { ip?: string }): void {
    const id = this.connectionManager.generateId();
    const remoteAddress = request.ip || 'unknown';

    const connection = new Connection(socket, id, remoteAddress);
    this.connectionManager.add(connection);

    // Forward events
    connection.on('message', (message: string) => {
      this.emit('message', connection, message);
    });

    connection.on('close', (code: number, reason: string) => {
      this.emit('disconnect', connection, code, reason);
    });

    connection.on('error', (error: Error) => {
      this.emit('error', error);
    });

    // Emit connection event
    this.emit('connection', connection);
  }

  /**
   * Start the server.
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      await this.setupRoutes();
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });

      this.running = true;
      console.log(`Server listening on ${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Stop the server.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Close all connections
    this.connectionManager.closeAll(1001, 'Server shutting down');

    // Stop Fastify
    await this.fastify.close();

    this.running = false;
    console.log('Server stopped');
  }

  /**
   * Check if the server is running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the connection manager.
   */
  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }

  /**
   * Get the Fastify instance.
   */
  getFastify(): FastifyInstance {
    return this.fastify;
  }

  /**
   * Get the server port.
   */
  get port(): number {
    return this.config.port;
  }

  /**
   * Get the server host.
   */
  get host(): string {
    return this.config.host;
  }
}

export default Server;
