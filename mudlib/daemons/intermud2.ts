/**
 * Intermud2 Daemon - Manages Intermud 2 protocol communication.
 *
 * This daemon handles:
 * - UDP communication with other I2 MUDs
 * - Channel message routing (gchannel)
 * - Tell messages (gtell)
 * - Who/finger queries
 * - MUD list management
 */

import { MudObject } from '../std/object.js';
import { getChannelDaemon, setChannelDaemonInstance } from './channels.js';

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
 * I2 message structure.
 */
export interface I2Message {
  command: string;
  params: Record<string, string | string[]>;
}

/**
 * I2 configuration.
 */
export interface I2Config {
  mudName: string;
  host: string;
  gamePort: number;
  udpPort: number;
}

/**
 * I2 command constants.
 */
const I2Commands = {
  STARTUP: 'startup',
  SHUTDOWN: 'shutdown',
  PING_Q: 'ping_q',
  PING_A: 'ping_a',
  MUDLIST_Q: 'mudlist_q',
  MUDLIST_A: 'mudlist_a',
  GTELL: 'gtell',
  GCHANNEL: 'gchannel',
  GWIZMSG: 'gwizmsg',
  GFINGER_Q: 'gfinger_q',
  GFINGER_A: 'gfinger_a',
  LOCATE_Q: 'locate_q',
  LOCATE_A: 'locate_a',
  RWHO_Q: 'rwho_q',
  RWHO_A: 'rwho_a',
} as const;

/**
 * I2 parameter constants.
 */
const I2Params = {
  NAME: 'NAME',
  HOST: 'HOST',
  HOSTADDRESS: 'HOSTADDRESS',
  PORT: 'PORT',
  PORTUDP: 'PORTUDP',
  WIZNAME: 'WIZNAME',
  WIZFROM: 'WIZFROM',
  WIZTO: 'WIZTO',
  MSG: 'MSG',
  CHANNEL: 'CHANNEL',
  EMOTE: 'EMOTE',
} as const;

/**
 * Intermud2 Daemon class.
 */
export class Intermud2Daemon extends MudObject {
  private _config: I2Config | null = null;
  private _initialized = false;

  constructor() {
    super();
    this.shortDesc = 'Intermud2 Daemon';
    this.longDesc = 'The Intermud2 daemon manages communication with other MUDs via the I2 UDP protocol.';

    // Register this instance as the singleton
    setIntermud2DaemonInstance(this);
  }

  /**
   * Initialize the daemon and register for I2 messages.
   */
  async initialize(config: I2Config): Promise<void> {
    this._config = config;

    // Register to receive I2 messages
    efuns.i2OnMessage((message: I2Message, rinfo: { address: string; port: number }) => {
      this.handleMessage(message, rinfo);
    });

    this._initialized = true;
  }

  /**
   * Check if the daemon is initialized.
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Check if I2 is ready.
   */
  get isReady(): boolean {
    return efuns.i2IsReady();
  }

  /**
   * Get all known MUDs.
   */
  getMudList(): I2MudInfo[] {
    return efuns.i2GetMudList();
  }

  /**
   * Get MUDs that have been seen recently.
   */
  getOnlineMuds(): I2MudInfo[] {
    return efuns.i2GetOnlineMuds();
  }

  /**
   * Get a specific MUD's info.
   */
  getMudInfo(mudName: string): I2MudInfo | null {
    return efuns.i2GetMudInfo(mudName);
  }

  /**
   * Send a channel message.
   */
  sendChannelMessage(channel: string, senderName: string, message: string, isEmote = false): boolean {
    if (!this.isReady || !this._config) {
      return false;
    }

    const msg: I2Message = {
      command: I2Commands.GCHANNEL,
      params: {
        [I2Params.NAME]: this._config.mudName,
        [I2Params.CHANNEL]: channel,
        [I2Params.WIZNAME]: senderName,
        [I2Params.MSG]: message,
        [I2Params.EMOTE]: isEmote ? '1' : '0',
      },
    };

    // Broadcast to all known MUDs
    efuns.i2Broadcast(msg);
    return true;
  }

  /**
   * Send a tell to a player on another MUD.
   */
  sendTell(targetMud: string, targetUser: string, senderName: string, message: string): boolean {
    if (!this.isReady || !this._config) {
      return false;
    }

    const msg: I2Message = {
      command: I2Commands.GTELL,
      params: {
        [I2Params.NAME]: this._config.mudName,
        [I2Params.WIZFROM]: senderName,
        [I2Params.WIZTO]: `${targetUser}@${targetMud}`,
        [I2Params.MSG]: message,
      },
    };

    return efuns.i2SendToMud(msg, targetMud);
  }

  /**
   * Request who list from another MUD.
   */
  requestWho(targetMud: string, requesterName: string): boolean {
    if (!this.isReady || !this._config) {
      return false;
    }

    const msg: I2Message = {
      command: I2Commands.RWHO_Q,
      params: {
        [I2Params.NAME]: this._config.mudName,
        [I2Params.WIZNAME]: requesterName,
      },
    };

    return efuns.i2SendToMud(msg, targetMud);
  }

  /**
   * Handle incoming I2 message.
   */
  handleMessage(message: I2Message, rinfo: { address: string; port: number }): void {
    const command = message.command;

    switch (command) {
      case I2Commands.GCHANNEL:
        this.handleChannelMessage(message);
        break;
      case I2Commands.GTELL:
        this.handleTell(message);
        break;
      case I2Commands.PING_Q:
        this.handlePingRequest(message, rinfo);
        break;
      case I2Commands.RWHO_Q:
        this.handleWhoRequest(message, rinfo);
        break;
      case I2Commands.RWHO_A:
        this.handleWhoReply(message);
        break;
      case I2Commands.GFINGER_Q:
        this.handleFingerRequest(message, rinfo);
        break;
      case I2Commands.GFINGER_A:
        this.handleFingerReply(message);
        break;
      case I2Commands.LOCATE_Q:
        this.handleLocateRequest(message, rinfo);
        break;
      case I2Commands.LOCATE_A:
        this.handleLocateReply(message);
        break;
      default:
        // Unknown command - ignore
        break;
    }
  }

  /**
   * Handle incoming channel message.
   */
  private handleChannelMessage(message: I2Message): void {
    const mudName = this.getParam(message, I2Params.NAME);
    const channel = this.getParam(message, I2Params.CHANNEL);
    const sender = this.getParam(message, I2Params.WIZNAME);
    const msg = this.getParam(message, I2Params.MSG);
    const isEmote = this.getParam(message, I2Params.EMOTE) === '1';

    if (!mudName || !channel || !sender || !msg) {
      return;
    }

    // Route to channel daemon
    const daemon = getChannelDaemon();
    if (isEmote) {
      daemon.receiveI2Emote(channel, mudName, sender, msg);
    } else {
      daemon.receiveI2Message(channel, mudName, sender, msg);
    }
  }

  /**
   * Handle incoming tell.
   */
  private handleTell(message: I2Message): void {
    const mudName = this.getParam(message, I2Params.NAME);
    const fromWiz = this.getParam(message, I2Params.WIZFROM);
    const toWiz = this.getParam(message, I2Params.WIZTO);
    const msg = this.getParam(message, I2Params.MSG);

    if (!mudName || !fromWiz || !toWiz || !msg) {
      return;
    }

    // Extract target user from WIZTO (format: user@mud or just user)
    const targetUser = toWiz.includes('@') ? toWiz.split('@')[0] : toWiz;
    if (!targetUser) return;

    // Find target player and deliver message
    const player = efuns.findConnectedPlayer(targetUser);
    if (player) {
      efuns.send(player, `\n[I2 Tell] ${fromWiz}@${mudName} tells you: ${msg}\n`);
    }
  }

  /**
   * Handle ping request.
   */
  private handlePingRequest(message: I2Message, rinfo: { address: string; port: number }): void {
    if (!this._config) return;

    const response: I2Message = {
      command: I2Commands.PING_A,
      params: {
        [I2Params.NAME]: this._config.mudName,
        [I2Params.HOST]: this._config.host,
        [I2Params.HOSTADDRESS]: this._config.host,
        [I2Params.PORT]: this._config.gamePort.toString(),
        [I2Params.PORTUDP]: this._config.udpPort.toString(),
      },
    };

    efuns.i2Send(response, rinfo.address, rinfo.port);
  }

  /**
   * Handle who request.
   */
  private handleWhoRequest(message: I2Message, rinfo: { address: string; port: number }): void {
    if (!this._config) return;

    const players = efuns.allPlayers();
    const whoList: string[] = [];

    for (const player of players) {
      const name = player.getProperty('name') as string;
      if (name) {
        whoList.push(name);
      }
    }

    const response: I2Message = {
      command: I2Commands.RWHO_A,
      params: {
        [I2Params.NAME]: this._config.mudName,
        [I2Params.MSG]: whoList.join(', ') || 'No players online',
      },
    };

    efuns.i2Send(response, rinfo.address, rinfo.port);
  }

  /**
   * Handle who reply.
   */
  private handleWhoReply(message: I2Message): void {
    const mudName = this.getParam(message, I2Params.NAME);
    const whoList = this.getParam(message, I2Params.MSG);

    if (!mudName) return;

    // This would need to be routed to the requesting player
    // For now, just log it
    this.onWhoReply(mudName, whoList ?? 'No players online');
  }

  /**
   * Handle finger request.
   */
  private handleFingerRequest(message: I2Message, rinfo: { address: string; port: number }): void {
    if (!this._config) return;

    const targetUser = this.getParam(message, I2Params.WIZTO);
    if (!targetUser) return;

    const player = efuns.findConnectedPlayer(targetUser) ?? efuns.findActivePlayer(targetUser);

    const response: I2Message = {
      command: I2Commands.GFINGER_A,
      params: {
        [I2Params.NAME]: this._config.mudName,
        [I2Params.WIZNAME]: targetUser,
        [I2Params.MSG]: player ? 'Online' : 'Not found',
      },
    };

    efuns.i2Send(response, rinfo.address, rinfo.port);
  }

  /**
   * Handle finger reply.
   */
  private handleFingerReply(message: I2Message): void {
    // Route to requesting player if needed
  }

  /**
   * Handle locate request.
   */
  private handleLocateRequest(message: I2Message, rinfo: { address: string; port: number }): void {
    if (!this._config) return;

    const targetUser = this.getParam(message, I2Params.WIZTO);
    if (!targetUser) return;

    const player = efuns.findConnectedPlayer(targetUser) ?? efuns.findActivePlayer(targetUser);

    if (player) {
      const response: I2Message = {
        command: I2Commands.LOCATE_A,
        params: {
          [I2Params.NAME]: this._config.mudName,
          [I2Params.WIZNAME]: targetUser,
          [I2Params.MSG]: 'Found',
        },
      };

      efuns.i2Send(response, rinfo.address, rinfo.port);
    }
  }

  /**
   * Handle locate reply.
   */
  private handleLocateReply(message: I2Message): void {
    const mudName = this.getParam(message, I2Params.NAME);
    const userName = this.getParam(message, I2Params.WIZNAME);

    if (!mudName || !userName) return;

    this.onLocateReply(mudName, userName);
  }

  /**
   * Helper to get a string parameter.
   */
  private getParam(message: I2Message, key: string): string | undefined {
    const value = message.params[key];
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }
    return undefined;
  }

  // ========== Event callbacks ==========

  /**
   * Called when a who reply is received.
   */
  onWhoReply(mud: string, whoList: string): void {
    // Default implementation - could be overridden or hooked
  }

  /**
   * Called when a locate reply is received.
   */
  onLocateReply(mud: string, userName: string): void {
    // Default implementation - could be overridden or hooked
  }
}

// Singleton
let intermud2DaemonInstance: Intermud2Daemon | null = null;

/**
 * Set the singleton instance.
 */
export function setIntermud2DaemonInstance(instance: Intermud2Daemon): void {
  intermud2DaemonInstance = instance;
}

/**
 * Get the Intermud2 daemon singleton.
 */
export function getIntermud2Daemon(): Intermud2Daemon {
  if (!intermud2DaemonInstance) {
    intermud2DaemonInstance = new Intermud2Daemon();
  }
  return intermud2DaemonInstance;
}

/**
 * Reset the daemon (for testing).
 */
export function resetIntermud2Daemon(): void {
  intermud2DaemonInstance = null;
}
