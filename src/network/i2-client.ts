/**
 * I2 UDP Client - Manages UDP communication for Intermud 2.
 *
 * Features:
 * - UDP socket for sending/receiving messages
 * - Mudlist management
 * - Event-based interface for packet handling
 * - Periodic mudlist refresh
 */

import { EventEmitter } from 'events';
import { createSocket, type Socket } from 'dgram';
import {
  encodeI2Packet,
  decodeI2Packet,
  createStartupMessage,
  createShutdownMessage,
  createMudlistRequest,
  type I2Message,
} from './i2-codec.js';
import type { Logger } from 'pino';

/**
 * I2 MUD information.
 */
export interface I2MudInfo {
  name: string;
  host: string;
  port: number;
  udpPort: number;
  lastSeen: number;
}

/**
 * Known I2 mudlist servers.
 */
export const I2_MUDLIST_SERVERS = [
  { name: '*dalet', host: '97.107.133.86', port: 8888 },
] as const;

/**
 * Known I2 MUDs from the Intermud network.
 * Source: https://aldebaran.mud.de/cgi-bin/mudlist.cgi
 */
export const I2_SEED_MUDS = [
  { name: 'Aldebaran', host: '85.214.77.105', port: 23, udpPort: 4246 },
  { name: '3k', host: '75.75.210.82', port: 23, udpPort: 4246 },
  { name: 'AbendDaemmerung', host: '178.254.21.129', port: 23, udpPort: 4246 },
  { name: 'AgeOfHeroes', host: '128.76.165.163', port: 23, udpPort: 2347 },
  { name: 'Alatia', host: '190.92.179.48', port: 23, udpPort: 2001 },
  { name: 'AncientAnguish', host: '67.203.2.146', port: 23, udpPort: 4249 },
  { name: 'AnderLand', host: '152.53.16.20', port: 23, udpPort: 4247 },
  { name: 'Ava-Homemud', host: '87.123.244.104', port: 23, udpPort: 4246 },
  { name: 'Avalon', host: '85.10.205.77', port: 23, udpPort: 4246 },
  { name: 'Beutelland', host: '128.130.95.62', port: 23, udpPort: 4246 },
  { name: 'ChmdLand', host: '212.17.80.127', port: 23, udpPort: 4246 },
  { name: 'DeeperTrouble', host: '172.104.251.185', port: 23, udpPort: 8889 },
  { name: 'DevDune', host: '138.197.134.82', port: 23, udpPort: 6791 },
  { name: 'DragonfireII', host: '97.83.30.122', port: 23, udpPort: 2000 },
  { name: 'Dune', host: '138.197.134.82', port: 23, udpPort: 6790 },
  { name: 'Efferdland', host: '152.53.16.20', port: 23, udpPort: 4246 },
  { name: 'EotL', host: '38.86.32.239', port: 23, udpPort: 4246 },
  { name: 'EotL-Muz', host: '64.184.136.21', port: 23, udpPort: 4246 },
  { name: 'FinalFrontier', host: '78.46.121.106', port: 23, udpPort: 7610 },
  { name: 'Gnomis Wasserwelt', host: '93.104.26.135', port: 23, udpPort: 3335 },
  { name: 'GraphicMUD', host: '212.60.194.176', port: 23, udpPort: 4246 },
  { name: 'Kerovnia', host: '151.198.54.56', port: 23, udpPort: 1985 },
  { name: 'Magicmud', host: '152.53.16.20', port: 23, udpPort: 3002 },
  { name: 'Midgard', host: '94.130.89.183', port: 23, udpPort: 4246 },
  { name: 'MorgenGrauen', host: '89.58.11.82', port: 23, udpPort: 4246 },
  { name: 'MUD-AI', host: '141.75.150.81', port: 23, udpPort: 3335 },
  { name: 'NewMoon2', host: '131.252.208.48', port: 23, udpPort: 5756 },
  { name: 'Nightfall', host: '82.153.225.173', port: 23, udpPort: 4246 },
  { name: 'Noname-Mud', host: '141.75.152.41', port: 23, udpPort: 3335 },
  { name: 'NuclearWar', host: '173.255.201.173', port: 23, udpPort: 4085 },
  { name: 'OuterSpace', host: '159.69.87.242', port: 23, udpPort: 3002 },
  { name: 'Pangea', host: '178.254.32.94', port: 23, udpPort: 3335 },
  { name: 'Proberaum', host: '87.98.217.104', port: 23, udpPort: 4246 },
  { name: 'QS', host: '76.68.15.90', port: 23, udpPort: 2533 },
  { name: 'Realmsmud', host: '68.58.66.113', port: 23, udpPort: 4246 },
  { name: 'Seifenblase', host: '217.11.52.247', port: 23, udpPort: 4246 },
  { name: 'SilberLand', host: '77.237.49.230', port: 23, udpPort: 4246 },
  { name: 'SilberlandLD', host: '195.201.131.11', port: 23, udpPort: 4246 },
  { name: 'Steam Arcana', host: '173.212.241.56', port: 23, udpPort: 4006 },
  { name: 'Tamedhon', host: '212.132.115.155', port: 23, udpPort: 4246 },
  { name: 'Tamedhon-LP-OLD', host: '93.83.129.180', port: 23, udpPort: 4246 },
  { name: 'TAPPMud', host: '213.95.11.211', port: 23, udpPort: 4246 },
  { name: 'Tauros', host: '34.221.136.93', port: 23, udpPort: 5050 },
  { name: 'TheLand', host: '213.95.79.14', port: 23, udpPort: 6664 },
  { name: 'Theloria', host: '178.254.12.82', port: 23, udpPort: 3335 },
  { name: 'TimMUD', host: '104.154.76.197', port: 23, udpPort: 5561 },
  { name: 'Tubmud', host: '85.214.44.4', port: 23, udpPort: 7683 },
  { name: 'UNItopia', host: '217.11.52.248', port: 23, udpPort: 3335 },
  { name: 'VerseMUD', host: '97.118.241.200', port: 23, udpPort: 4246 },
  { name: 'WL-Development', host: '49.13.232.95', port: 23, udpPort: 5757 },
  { name: 'Wunderland', host: '49.13.232.95', port: 23, udpPort: 4246 },
  { name: 'WunMUD', host: '94.247.40.156', port: 23, udpPort: 4246 },
] as const;

/**
 * I2 client configuration.
 */
export interface I2ClientConfig {
  /** MUD name */
  mudName: string;
  /** Local UDP port to bind to */
  udpPort: number;
  /** Game port (for announcements) */
  gamePort: number;
  /** Host/IP address of this MUD */
  host: string;
  /** Mudlist server to use */
  mudlistServer?: { host: string; port: number };
  /** How often to refresh mudlist (ms, default 300000 = 5 minutes) */
  mudlistRefreshInterval?: number;
  /** Logger instance */
  logger?: Logger;
}

/**
 * I2 client events.
 */
export interface I2ClientEvents {
  ready: () => void;
  error: (error: Error) => void;
  message: (message: I2Message, rinfo: { address: string; port: number }) => void;
  mudlistUpdate: (muds: I2MudInfo[]) => void;
}

type EventArgs<T, K extends keyof T> = T[K] extends (...args: infer A) => void ? A : never;

/**
 * I2 UDP Client for Intermud 2 protocol.
 */
export class I2Client extends EventEmitter {
  private config: Required<Omit<I2ClientConfig, 'logger' | 'mudlistServer'>> & {
    logger: Logger | undefined;
    mudlistServer: { host: string; port: number };
  };
  private socket: Socket | null = null;
  private _isReady = false;
  private mudList: Map<string, I2MudInfo> = new Map();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  onEvent<K extends keyof I2ClientEvents>(
    event: K,
    listener: (...args: EventArgs<I2ClientEvents, K>) => void
  ): this {
    this.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  emitEvent<K extends keyof I2ClientEvents>(
    event: K,
    ...args: EventArgs<I2ClientEvents, K>
  ): boolean {
    return this.emit(event as string, ...args);
  }

  constructor(config: I2ClientConfig) {
    super();
    this.config = {
      mudName: config.mudName,
      udpPort: config.udpPort,
      gamePort: config.gamePort,
      host: config.host,
      mudlistServer: config.mudlistServer ?? { host: '97.107.133.86', port: 8888 },
      mudlistRefreshInterval: config.mudlistRefreshInterval ?? 300000,
      logger: config.logger,
    };
  }

  /**
   * Check if the client is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Get all known MUDs.
   */
  getMudList(): I2MudInfo[] {
    return Array.from(this.mudList.values());
  }

  /**
   * Get MUDs that have been seen recently (within 10 minutes).
   */
  getOnlineMuds(): I2MudInfo[] {
    const tenMinutesAgo = Date.now() - 600000;
    return this.getMudList().filter((m) => m.lastSeen > tenMinutesAgo);
  }

  /**
   * Get a specific MUD's info.
   */
  getMudInfo(name: string): I2MudInfo | undefined {
    const lowerName = name.toLowerCase();
    for (const [mudName, info] of this.mudList) {
      if (mudName.toLowerCase() === lowerName) {
        return info;
      }
    }
    return undefined;
  }

  /**
   * Seed the mudlist with known MUDs.
   * Used to bootstrap from I3 data or other sources.
   */
  seedMudList(muds: Array<{ name: string; host: string; port: number; udpPort: number }>): number {
    let added = 0;
    for (const mud of muds) {
      // Skip if no UDP port or if it's our own MUD
      if (!mud.udpPort || mud.udpPort <= 0) continue;
      if (mud.name.toLowerCase() === this.config.mudName.toLowerCase()) continue;

      // Only add if not already present
      if (!this.mudList.has(mud.name)) {
        this.mudList.set(mud.name, {
          name: mud.name,
          host: mud.host,
          port: mud.port,
          udpPort: mud.udpPort,
          lastSeen: Date.now(),
        });
        added++;
      }
    }

    if (added > 0) {
      this.log('info', `Seeded ${added} MUDs into I2 mudlist`);
      this.emitEvent('mudlistUpdate', this.getMudList());
    }

    return added;
  }

  /**
   * Start the I2 client.
   */
  async start(): Promise<void> {
    if (this.socket) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = createSocket('udp4');

      this.socket.on('error', (err) => {
        this.log('error', `UDP socket error: ${err.message}`);
        this.emitEvent('error', err);
        if (!this._isReady) {
          reject(err);
        }
      });

      this.socket.on('message', (msg, rinfo) => {
        this.handleMessage(msg, rinfo);
      });

      this.socket.on('listening', () => {
        const addr = this.socket?.address();
        this.log('info', `I2 UDP client listening on ${addr?.address}:${addr?.port}`);
        this._isReady = true;

        // Seed with known I2 MUDs
        this.seedMudList([...I2_SEED_MUDS]);

        // Send startup announcement
        this.sendStartup();

        // Request mudlist
        this.requestMudlist();

        // Start periodic mudlist refresh
        this.startRefreshTimer();

        this.emitEvent('ready');
        resolve();
      });

      // Bind to the configured UDP port
      this.socket.bind(this.config.udpPort);
    });
  }

  /**
   * Stop the I2 client.
   */
  async stop(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.socket) {
      // Send shutdown announcement
      this.sendShutdown();

      return new Promise((resolve) => {
        this.socket?.close(() => {
          this.socket = null;
          this._isReady = false;
          this.log('info', 'I2 UDP client stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Send a message to a specific MUD.
   */
  send(message: I2Message, host: string, port: number): boolean {
    if (!this.socket || !this._isReady) {
      this.log('warn', 'Cannot send: UDP socket not ready');
      return false;
    }

    try {
      const buffer = encodeI2Packet(message);
      this.socket.send(buffer, port, host, (err) => {
        if (err) {
          this.log('error', `Failed to send UDP message: ${err.message}`);
        } else {
          this.log('debug', `Sent ${message.command} to ${host}:${port}`);
        }
      });
      return true;
    } catch (error) {
      this.log('error', `Failed to encode message: ${error}`);
      return false;
    }
  }

  /**
   * Send a message to a MUD by name.
   */
  sendToMud(message: I2Message, mudName: string): boolean {
    const mud = this.getMudInfo(mudName);
    if (!mud) {
      this.log('warn', `MUD not found: ${mudName}`);
      return false;
    }
    return this.send(message, mud.host, mud.udpPort);
  }

  /**
   * Broadcast a message to all known MUDs.
   */
  broadcast(message: I2Message): void {
    for (const mud of this.getMudList()) {
      if (mud.name.toLowerCase() !== this.config.mudName.toLowerCase()) {
        this.send(message, mud.host, mud.udpPort);
      }
    }
  }

  /**
   * Send startup announcement.
   */
  private sendStartup(): void {
    const message = createStartupMessage(
      this.config.mudName,
      this.config.host,
      this.config.gamePort,
      this.config.udpPort
    );

    // Send to mudlist server
    this.send(message, this.config.mudlistServer.host, this.config.mudlistServer.port);
  }

  /**
   * Send shutdown announcement.
   */
  private sendShutdown(): void {
    const message = createShutdownMessage(this.config.mudName);

    // Send to mudlist server
    this.send(message, this.config.mudlistServer.host, this.config.mudlistServer.port);
  }

  /**
   * Request mudlist from server.
   */
  requestMudlist(): void {
    const message = createMudlistRequest(this.config.mudName);
    this.send(message, this.config.mudlistServer.host, this.config.mudlistServer.port);
  }

  /**
   * Start periodic mudlist refresh.
   */
  private startRefreshTimer(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this.requestMudlist();
    }, this.config.mudlistRefreshInterval);
  }

  /**
   * Handle incoming UDP message.
   */
  private handleMessage(data: Buffer, rinfo: { address: string; port: number }): void {
    try {
      const message = decodeI2Packet(data);
      if (!message) {
        this.log('debug', `Invalid I2 message from ${rinfo.address}:${rinfo.port}`);
        return;
      }

      this.log('debug', `Received ${message.command} from ${rinfo.address}:${rinfo.port}`);

      // Update mudlist if we see a MUD announcing itself
      this.updateMudFromMessage(message, rinfo);

      // Emit the message for the daemon to handle
      this.emitEvent('message', message, rinfo);
    } catch (error) {
      this.log('error', `Failed to decode message: ${error}`);
    }
  }

  /**
   * Update mudlist from incoming message.
   */
  private updateMudFromMessage(message: I2Message, rinfo: { address: string; port: number }): void {
    const name = message.params['NAME'];
    if (typeof name !== 'string' || !name) {
      return;
    }

    // Don't add ourselves
    if (name.toLowerCase() === this.config.mudName.toLowerCase()) {
      return;
    }

    const host = (message.params['HOSTADDRESS'] as string) || (message.params['HOST'] as string) || rinfo.address;
    const port = parseInt((message.params['PORT'] as string) || '0', 10) || 23;
    const udpPort = parseInt((message.params['PORTUDP'] as string) || '0', 10) || rinfo.port;

    const existing = this.mudList.get(name);
    const mudInfo: I2MudInfo = {
      name,
      host,
      port,
      udpPort,
      lastSeen: Date.now(),
    };

    this.mudList.set(name, mudInfo);

    // Emit mudlist update if this is a new MUD
    if (!existing) {
      this.emitEvent('mudlistUpdate', this.getMudList());
    }
  }

  /**
   * Log a message.
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.config.logger) {
      this.config.logger[level]({ component: 'I2Client' }, message);
    }
  }
}

/**
 * Singleton instance management.
 */
let i2Client: I2Client | null = null;

export function getI2Client(): I2Client | null {
  return i2Client;
}

export function createI2Client(config: I2ClientConfig): I2Client {
  if (i2Client) {
    i2Client.stop();
  }
  i2Client = new I2Client(config);
  return i2Client;
}

export function destroyI2Client(): void {
  if (i2Client) {
    i2Client.stop();
    i2Client = null;
  }
}
