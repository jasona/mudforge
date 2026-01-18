/**
 * Intermud Daemon - Manages Intermud 3 protocol communication.
 *
 * This daemon handles:
 * - Connection to I3 routers
 * - Startup handshake and authentication
 * - Channel message routing
 * - Service requests (tell, who, finger, locate)
 * - MUD and channel list management
 */

import { MudObject } from '../std/object.js';

/**
 * I3 MUD information from the mudlist.
 */
export interface I3MudInfo {
  name: string;
  state: number; // -1 = down, 0+ = up
  ip: string;
  playerPort: number;
  tcpPort: number;
  udpPort: number;
  mudlib: string;
  baseMudlib: string;
  driver: string;
  mudType: string;
  openStatus: string;
  adminEmail: string;
  services: Record<string, number>;
  otherData: Record<string, unknown>;
}

/**
 * I3 channel information from the chanlist.
 */
export interface I3ChannelInfo {
  name: string;
  host: string;
  type: number; // 0 = selectively banned, 1 = selectively admitted, 2 = filtered
}

/**
 * Pending request for tracking async responses.
 */
interface PendingRequest {
  type: string;
  timestamp: number;
  callback?: (response: unknown[]) => void;
}

/**
 * I3 connection configuration.
 */
export interface I3Config {
  mudName: string;
  adminEmail: string;
  playerPort: number;
  routerName: string;
}

/**
 * Intermud Daemon class.
 */
export class IntermudDaemon extends MudObject {
  private _mudList: Map<string, I3MudInfo> = new Map();
  private _channelList: Map<string, I3ChannelInfo> = new Map();
  private _subscribedChannels: Set<string> = new Set();
  private _password: number = 0;
  private _mudListId: number = 0;
  private _chanListId: number = 0;
  private _routerName: string = '*dalet';
  private _config: I3Config | null = null;
  private _pendingRequests: Map<string, PendingRequest> = new Map();
  private _initialized: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Intermud Daemon';
    this.longDesc = 'The Intermud daemon manages communication with other MUDs on the I3 network.';

    // Register this instance as the singleton
    setIntermudDaemonInstance(this);
  }

  /**
   * Initialize the daemon and register for I3 packets.
   */
  async initialize(config: I3Config): Promise<void> {
    this._config = config;
    this._routerName = config.routerName;

    // Register to receive I3 packets
    efuns.i3OnPacket((packet: unknown[]) => {
      this.handlePacket(packet);
    });

    // Load persisted state
    await this.loadState();

    this._initialized = true;
  }

  /**
   * Check if the daemon is initialized.
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get I3 connection state.
   */
  get connectionState(): string {
    return efuns.i3GetState();
  }

  /**
   * Check if connected to I3.
   */
  get isConnected(): boolean {
    return efuns.i3IsConnected();
  }

  /**
   * Get the current router name.
   */
  get routerName(): string {
    return efuns.i3GetRouter() ?? this._routerName;
  }

  /**
   * Get all known MUDs.
   */
  getMudList(): I3MudInfo[] {
    return Array.from(this._mudList.values());
  }

  /**
   * Get MUDs that are currently online.
   */
  getOnlineMuds(): I3MudInfo[] {
    return Array.from(this._mudList.values()).filter((m) => m.state >= 0);
  }

  /**
   * Get the current mudlist ID (for diagnostics).
   */
  get mudListId(): number {
    return this._mudListId;
  }

  /**
   * Get the current chanlist ID (for diagnostics).
   */
  get chanListId(): number {
    return this._chanListId;
  }

  /**
   * Get a specific MUD's info.
   */
  getMudInfo(mudName: string): I3MudInfo | undefined {
    // Case-insensitive lookup
    const lowerName = mudName.toLowerCase();
    for (const [name, info] of this._mudList) {
      if (name.toLowerCase() === lowerName) {
        return info;
      }
    }
    return undefined;
  }

  /**
   * Find MUDs by partial name match.
   */
  findMuds(pattern: string): I3MudInfo[] {
    const lowerPattern = pattern.toLowerCase();
    return Array.from(this._mudList.values()).filter((m) =>
      m.name.toLowerCase().includes(lowerPattern)
    );
  }

  /**
   * Get all available I3 channels.
   */
  getChannelList(): I3ChannelInfo[] {
    return Array.from(this._channelList.values());
  }

  /**
   * Get channels we're subscribed to.
   */
  getSubscribedChannels(): string[] {
    return Array.from(this._subscribedChannels);
  }

  /**
   * Check if we're subscribed to a channel.
   */
  isSubscribed(channel: string): boolean {
    return this._subscribedChannels.has(channel.toLowerCase());
  }

  /**
   * Subscribe to a channel.
   */
  subscribeChannel(channel: string): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    const lowerChannel = channel.toLowerCase();
    if (this._subscribedChannels.has(lowerChannel)) {
      return true; // Already subscribed
    }

    // Send channel-listen packet
    const packet = [
      'channel-listen',
      5,
      this._config.mudName,
      0,
      this._routerName,
      0,
      lowerChannel,
      1, // 1 = subscribe
    ];

    if (efuns.i3Send(packet)) {
      this._subscribedChannels.add(lowerChannel);
      this.saveState();

      // Register with local channel daemon so players can use it
      this.registerWithChannelDaemon(lowerChannel);

      return true;
    }

    return false;
  }

  /**
   * Register an I3 channel with the local channel daemon.
   */
  private registerWithChannelDaemon(channelName: string): void {
    try {
      const channelModule = require('./channels.js') as {
        getChannelDaemon: () => {
          registerI3Channel: (name: string, host: string) => boolean;
        };
      };
      const daemon = channelModule.getChannelDaemon();
      // Get host from channel list, or use router as fallback
      const channelInfo = this._channelList.get(channelName);
      const host = channelInfo?.host ?? this._routerName;
      daemon.registerI3Channel(channelName, host);
    } catch {
      // Channel daemon not available
    }
  }

  /**
   * Unsubscribe from a channel.
   */
  unsubscribeChannel(channel: string): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    const lowerChannel = channel.toLowerCase();
    if (!this._subscribedChannels.has(lowerChannel)) {
      return true; // Already unsubscribed
    }

    // Send channel-listen packet
    const packet = [
      'channel-listen',
      5,
      this._config.mudName,
      0,
      this._routerName,
      0,
      lowerChannel,
      0, // 0 = unsubscribe
    ];

    if (efuns.i3Send(packet)) {
      this._subscribedChannels.delete(lowerChannel);
      this.saveState();
      return true;
    }

    return false;
  }

  /**
   * Send a message on a channel.
   */
  sendChannelMessage(channel: string, senderName: string, message: string): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    const packet = [
      'channel-m',
      5,
      this._config.mudName,
      senderName,
      0,
      0,
      channel.toLowerCase(),
      senderName,
      message,
    ];

    return efuns.i3Send(packet);
  }

  /**
   * Send an emote on a channel.
   */
  sendChannelEmote(channel: string, senderName: string, emote: string): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    const packet = [
      'channel-e',
      5,
      this._config.mudName,
      senderName,
      0,
      0,
      channel.toLowerCase(),
      senderName,
      emote,
    ];

    return efuns.i3Send(packet);
  }

  /**
   * Send a tell to a player on another MUD.
   */
  sendTell(
    targetMud: string,
    targetUser: string,
    senderName: string,
    message: string
  ): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    const packet = [
      'tell',
      5,
      this._config.mudName,
      senderName,
      targetMud,
      targetUser,
      senderName,
      message,
    ];

    return efuns.i3Send(packet);
  }

  /**
   * Request who list from another MUD.
   */
  requestWho(targetMud: string, requesterName: string): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    const packet = [
      'who-req',
      5,
      this._config.mudName,
      requesterName,
      targetMud,
      0,
    ];

    // Track pending request
    const requestId = `who:${targetMud}:${requesterName}`;
    this._pendingRequests.set(requestId, {
      type: 'who',
      timestamp: Date.now(),
    });

    return efuns.i3Send(packet);
  }

  /**
   * Request finger info from another MUD.
   */
  requestFinger(targetMud: string, targetUser: string, requesterName: string): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    const packet = [
      'finger-req',
      5,
      this._config.mudName,
      requesterName,
      targetMud,
      targetUser,
    ];

    return efuns.i3Send(packet);
  }

  /**
   * Request to locate a player across all MUDs.
   */
  requestLocate(targetUser: string, requesterName: string): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    const packet = [
      'locate-req',
      5,
      this._config.mudName,
      requesterName,
      0,
      0,
      targetUser,
    ];

    return efuns.i3Send(packet);
  }

  /**
   * Refresh the mudlist by requesting a full list from the router.
   * This clears the current mudlist and resets mudListId to 0,
   * then sends a new startup request to get the complete list.
   */
  refreshMudlist(): boolean {
    if (!this.isConnected || !this._config) {
      return false;
    }

    // Clear existing mudlist
    this._mudList.clear();

    // Reset mudListId to request full list
    this._mudListId = 0;

    // Save state (persists the reset mudListId)
    this.saveState();

    // Send new startup request to get fresh mudlist
    return this.sendStartupRequest();
  }

  /**
   * Send startup request to router.
   * Called by the driver when I3 client connects.
   */
  sendStartupRequest(): boolean {
    if (!this._config) {
      return false;
    }

    const packet = [
      'startup-req-3',
      5,
      this._config.mudName,
      0,
      this._routerName,
      0,
      this._password, // 0 for new MUD
      this._mudListId,
      this._chanListId,
      this._config.playerPort,
      0, // imud tcp port (not used)
      0, // imud udp port (not used)
      'MudForge', // mudlib
      'MudForge', // base mudlib
      'MudForge', // driver
      'LP', // mud type
      'mudlib development', // open status
      this._config.adminEmail,
      {
        tell: 1,
        who: 1,
        finger: 1,
        locate: 1,
        channel: 1,
      },
      {}, // other data
    ];

    return efuns.i3Send(packet);
  }

  /**
   * Handle incoming I3 packet.
   */
  handlePacket(packet: unknown[]): void {
    if (!Array.isArray(packet) || packet.length < 6) {
      return;
    }

    const packetType = packet[0] as string;

    switch (packetType) {
      case 'startup-reply':
        this.handleStartupReply(packet);
        break;
      case 'mudlist':
        this.handleMudlist(packet);
        break;
      case 'chanlist-reply':
        this.handleChanlist(packet);
        break;
      case 'channel-m':
        this.handleChannelMessage(packet);
        break;
      case 'channel-e':
        this.handleChannelEmote(packet);
        break;
      case 'channel-t':
        this.handleChannelTargetedEmote(packet);
        break;
      case 'tell':
        this.handleTell(packet);
        break;
      case 'who-req':
        this.handleWhoRequest(packet);
        break;
      case 'who-reply':
        this.handleWhoReply(packet);
        break;
      case 'finger-req':
        this.handleFingerRequest(packet);
        break;
      case 'finger-reply':
        this.handleFingerReply(packet);
        break;
      case 'locate-req':
        this.handleLocateRequest(packet);
        break;
      case 'locate-reply':
        this.handleLocateReply(packet);
        break;
      case 'error':
        this.handleError(packet);
        break;
      default:
        // Unknown packet type - ignore
        break;
    }
  }

  /**
   * Handle startup-reply from router.
   */
  private handleStartupReply(packet: unknown[]): void {
    // packet[6] = router list
    // packet[7] = password
    if (packet.length >= 8) {
      const password = packet[7];
      if (typeof password === 'number') {
        this._password = password;
        this.saveState();
      }
    }

    // Subscribe to default channels after startup
    this.subscribeDefaultChannels();
  }

  /**
   * Handle mudlist update from router.
   */
  private handleMudlist(packet: unknown[]): void {
    // packet[6] = mudlist_id
    // packet[7] = mudlist mapping
    if (packet.length >= 8) {
      const mudlistId = packet[6];
      const mudlist = packet[7];

      if (typeof mudlistId === 'number') {
        this._mudListId = mudlistId;
      }

      if (mudlist && typeof mudlist === 'object' && !Array.isArray(mudlist)) {
        for (const [name, data] of Object.entries(mudlist)) {
          if (data === 0) {
            // MUD is down, mark or remove
            const existing = this._mudList.get(name);
            if (existing) {
              existing.state = -1;
            }
          } else if (Array.isArray(data)) {
            // MUD info array
            this._mudList.set(name, this.parseMudInfo(name, data));
          }
        }

        // Auto-seed I2 mudlist from I3 data
        if (efuns.i2IsReady()) {
          const seeded = efuns.i2SeedFromI3();
          if (seeded > 0) {
            efuns.debug(`Auto-seeded ${seeded} MUDs to I2 from I3 mudlist`);
          }
        }
      }
    }
  }

  /**
   * Parse MUD info from mudlist array.
   */
  private parseMudInfo(name: string, data: unknown[]): I3MudInfo {
    return {
      name,
      state: typeof data[0] === 'number' ? data[0] : 0,
      ip: typeof data[1] === 'string' ? data[1] : '',
      playerPort: typeof data[2] === 'number' ? data[2] : 0,
      tcpPort: typeof data[3] === 'number' ? data[3] : 0,
      udpPort: typeof data[4] === 'number' ? data[4] : 0,
      mudlib: typeof data[5] === 'string' ? data[5] : '',
      baseMudlib: typeof data[6] === 'string' ? data[6] : '',
      driver: typeof data[7] === 'string' ? data[7] : '',
      mudType: typeof data[8] === 'string' ? data[8] : '',
      openStatus: typeof data[9] === 'string' ? data[9] : '',
      adminEmail: typeof data[10] === 'string' ? data[10] : '',
      services:
        data[11] && typeof data[11] === 'object' && !Array.isArray(data[11])
          ? (data[11] as Record<string, number>)
          : {},
      otherData:
        data[12] && typeof data[12] === 'object' && !Array.isArray(data[12])
          ? (data[12] as Record<string, unknown>)
          : {},
    };
  }

  /**
   * Handle chanlist update from router.
   */
  private handleChanlist(packet: unknown[]): void {
    // packet[6] = chanlist_id
    // packet[7] = chanlist mapping
    if (packet.length >= 8) {
      const chanlistId = packet[6];
      const chanlist = packet[7];

      if (typeof chanlistId === 'number') {
        this._chanListId = chanlistId;
      }

      if (chanlist && typeof chanlist === 'object' && !Array.isArray(chanlist)) {
        for (const [name, data] of Object.entries(chanlist)) {
          if (data === 0) {
            // Channel removed
            this._channelList.delete(name);
          } else if (Array.isArray(data) && data.length >= 2) {
            // Channel info: [host, type]
            this._channelList.set(name, {
              name,
              host: typeof data[0] === 'string' ? data[0] : '',
              type: typeof data[1] === 'number' ? data[1] : 0,
            });
          }
        }
      }
    }
  }

  /**
   * Handle incoming channel message.
   */
  private handleChannelMessage(packet: unknown[]): void {
    // packet[2] = origin mud
    // packet[3] = origin user
    // packet[6] = channel
    // packet[7] = visible name
    // packet[8] = message
    if (packet.length >= 9) {
      const originMud = packet[2] as string;
      const channel = (packet[6] as string).toLowerCase();
      const visibleName = packet[7] as string;
      const message = packet[8] as string;

      // Emit event for channel daemon to handle
      this.onChannelMessage(channel, originMud, visibleName, message);
    }
  }

  /**
   * Handle incoming channel emote.
   */
  private handleChannelEmote(packet: unknown[]): void {
    // packet[2] = origin mud
    // packet[3] = origin user
    // packet[6] = channel
    // packet[7] = visible name
    // packet[8] = emote
    if (packet.length >= 9) {
      const originMud = packet[2] as string;
      const channel = (packet[6] as string).toLowerCase();
      const visibleName = packet[7] as string;
      const emote = packet[8] as string;

      // Emit event for channel daemon to handle
      this.onChannelEmote(channel, originMud, visibleName, emote);
    }
  }

  /**
   * Handle incoming targeted channel emote.
   */
  private handleChannelTargetedEmote(packet: unknown[]): void {
    // Similar to emote but with target
    if (packet.length >= 10) {
      const originMud = packet[2] as string;
      const channel = (packet[6] as string).toLowerCase();
      const visibleName = packet[7] as string;
      const targetName = packet[8] as string;
      const emote = packet[9] as string;

      this.onChannelTargetedEmote(channel, originMud, visibleName, targetName, emote);
    }
  }

  /**
   * Handle incoming tell.
   */
  private handleTell(packet: unknown[]): void {
    // packet[2] = origin mud
    // packet[3] = origin user
    // packet[5] = target user
    // packet[6] = sender visible name
    // packet[7] = message
    if (packet.length >= 8) {
      const originMud = packet[2] as string;
      const originUser = packet[3] as string;
      const targetUser = packet[5] as string;
      const senderName = packet[6] as string;
      const message = packet[7] as string;

      this.onTell(originMud, senderName, targetUser, message);
    }
  }

  /**
   * Handle who request from another MUD.
   */
  private handleWhoRequest(packet: unknown[]): void {
    if (!this._config) return;

    const originMud = packet[2] as string;
    const originUser = packet[3] as string;

    // Build who list from connected players
    const players = efuns.allPlayers();
    const whoList: unknown[][] = [];

    for (const player of players) {
      const name = player.getProperty('name') as string;
      const idleTime = 0; // Would need to track idle time
      const extraInfo = ''; // Additional info like title

      whoList.push([name, idleTime, extraInfo]);
    }

    // Send who-reply
    const reply = [
      'who-reply',
      5,
      this._config.mudName,
      0,
      originMud,
      originUser,
      whoList,
    ];

    efuns.i3Send(reply);
  }

  /**
   * Handle who reply from another MUD.
   */
  private handleWhoReply(packet: unknown[]): void {
    // packet[2] = origin mud
    // packet[5] = target user (requester)
    // packet[6] = who list
    if (packet.length >= 7) {
      const originMud = packet[2] as string;
      const targetUser = packet[5] as string;
      const whoList = packet[6] as unknown[][];

      this.onWhoReply(originMud, targetUser, whoList);
    }
  }

  /**
   * Handle finger request from another MUD.
   */
  private handleFingerRequest(packet: unknown[]): void {
    if (!this._config) return;

    const originMud = packet[2] as string;
    const originUser = packet[3] as string;
    const targetUser = packet[5] as string;

    // Find the player
    const player = efuns.findConnectedPlayer(targetUser) ?? efuns.findActivePlayer(targetUser);

    if (player) {
      const name = player.getProperty('name') as string;
      const title = (player.getProperty('title') as string) ?? '';
      const realName = ''; // Not exposed
      const email = ''; // Not exposed
      const loginTime = (player.getProperty('loginTime') as number) ?? 0;
      const idleTime = 0;
      const ip = ''; // Not exposed
      const extraInfo = '';

      const reply = [
        'finger-reply',
        5,
        this._config.mudName,
        0,
        originMud,
        originUser,
        name,
        title,
        realName,
        email,
        loginTime,
        idleTime,
        ip,
        extraInfo,
      ];

      efuns.i3Send(reply);
    }
  }

  /**
   * Handle finger reply from another MUD.
   */
  private handleFingerReply(packet: unknown[]): void {
    // packet[2] = origin mud
    // packet[5] = target user (requester)
    // packet[6+] = finger info
    if (packet.length >= 7) {
      const originMud = packet[2] as string;
      const targetUser = packet[5] as string;
      const fingerData = {
        name: packet[6] as string,
        title: packet[7] as string,
        realName: packet[8] as string,
        email: packet[9] as string,
        loginTime: packet[10] as number,
        idleTime: packet[11] as number,
        ip: packet[12] as string,
        extraInfo: packet[13] as string,
      };

      this.onFingerReply(originMud, targetUser, fingerData);
    }
  }

  /**
   * Handle locate request from another MUD.
   */
  private handleLocateRequest(packet: unknown[]): void {
    if (!this._config) return;

    const originMud = packet[2] as string;
    const originUser = packet[3] as string;
    const targetUser = packet[6] as string;

    // Check if player is here
    const player = efuns.findConnectedPlayer(targetUser) ?? efuns.findActivePlayer(targetUser);

    if (player) {
      const status = player.getProperty('isIdle') ? 1 : 0;

      const reply = [
        'locate-reply',
        5,
        this._config.mudName,
        0,
        originMud,
        originUser,
        this._config.mudName,
        targetUser,
        status,
      ];

      efuns.i3Send(reply);
    }
  }

  /**
   * Handle locate reply from another MUD.
   */
  private handleLocateReply(packet: unknown[]): void {
    // packet[2] = origin mud
    // packet[5] = target user (requester)
    // packet[6] = mud where found
    // packet[7] = user name
    // packet[8] = status
    if (packet.length >= 9) {
      const originMud = packet[2] as string;
      const targetUser = packet[5] as string;
      const foundMud = packet[6] as string;
      const foundUser = packet[7] as string;
      const status = packet[8] as number;

      this.onLocateReply(originMud, targetUser, foundMud, foundUser, status);
    }
  }

  /**
   * Handle error packet.
   */
  private handleError(packet: unknown[]): void {
    // packet[2] = origin mud
    // packet[6] = error code
    // packet[7] = error message
    if (packet.length >= 8) {
      const errorCode = packet[6] as string;
      const errorMessage = packet[7] as string;

      this.onError(errorCode, errorMessage);
    }
  }

  /**
   * Subscribe to default channels after startup.
   */
  private subscribeDefaultChannels(): void {
    // Default channels to subscribe to
    const defaultChannels = ['intermud', 'imud_code'];

    for (const channel of defaultChannels) {
      if (!this._subscribedChannels.has(channel)) {
        this.subscribeChannel(channel);
      }
    }
  }

  // ========== Event callbacks (to be overridden or hooked) ==========

  /**
   * Called when a channel message is received.
   * Override this or register a callback.
   */
  onChannelMessage(channel: string, mud: string, sender: string, message: string): void {
    // Default: log and broadcast to local players
    // This will be hooked by the channel daemon
  }

  /**
   * Called when a channel emote is received.
   */
  onChannelEmote(channel: string, mud: string, sender: string, emote: string): void {
    // Default: log and broadcast to local players
  }

  /**
   * Called when a targeted channel emote is received.
   */
  onChannelTargetedEmote(
    channel: string,
    mud: string,
    sender: string,
    target: string,
    emote: string
  ): void {
    // Default: log and broadcast to local players
  }

  /**
   * Called when a tell is received.
   */
  onTell(mud: string, sender: string, target: string, message: string): void {
    // Find target player and deliver message
    const player = efuns.findConnectedPlayer(target);
    if (player) {
      efuns.send(player, `\n[I3 Tell] ${sender}@${mud} tells you: ${message}\n`);
    }
  }

  /**
   * Called when a who reply is received.
   */
  onWhoReply(mud: string, requester: string, whoList: unknown[][]): void {
    const player = efuns.findConnectedPlayer(requester);
    if (player) {
      let output = `\nPlayers on ${mud}:\n`;
      output += '-'.repeat(40) + '\n';

      if (whoList.length === 0) {
        output += 'No players online.\n';
      } else {
        for (const entry of whoList) {
          const name = entry[0] as string;
          const idle = entry[1] as number;
          const extra = entry[2] as string;
          const idleStr = idle > 60 ? ` (idle ${Math.floor(idle / 60)}m)` : '';
          output += `  ${name}${idleStr}${extra ? ' - ' + extra : ''}\n`;
        }
      }

      efuns.send(player, output);
    }
  }

  /**
   * Called when a finger reply is received.
   */
  onFingerReply(
    mud: string,
    requester: string,
    data: {
      name: string;
      title: string;
      realName: string;
      email: string;
      loginTime: number;
      idleTime: number;
      ip: string;
      extraInfo: string;
    }
  ): void {
    const player = efuns.findConnectedPlayer(requester);
    if (player) {
      let output = `\nFinger info for ${data.name}@${mud}:\n`;
      output += '-'.repeat(40) + '\n';
      if (data.title) output += `Title: ${data.title}\n`;
      if (data.loginTime) output += `Login: ${new Date(data.loginTime * 1000).toLocaleString()}\n`;
      if (data.idleTime) output += `Idle: ${Math.floor(data.idleTime / 60)} minutes\n`;
      if (data.extraInfo) output += `Info: ${data.extraInfo}\n`;

      efuns.send(player, output);
    }
  }

  /**
   * Called when a locate reply is received.
   */
  onLocateReply(
    mud: string,
    requester: string,
    foundMud: string,
    foundUser: string,
    status: number
  ): void {
    const player = efuns.findConnectedPlayer(requester);
    if (player) {
      const statusStr = status === 1 ? ' (idle)' : '';
      efuns.send(player, `\n[I3 Locate] ${foundUser} found on ${foundMud}${statusStr}\n`);
    }
  }

  /**
   * Called when an error is received.
   */
  onError(code: string, message: string): void {
    // Log the error
    // Could notify admins for serious errors
  }

  // ========== Persistence ==========

  /**
   * Save daemon state to disk.
   */
  private async saveState(): Promise<void> {
    const state = {
      password: this._password,
      mudListId: this._mudListId,
      chanListId: this._chanListId,
      subscribedChannels: Array.from(this._subscribedChannels),
    };

    try {
      await efuns.writeFile('/data/intermud-state.json', JSON.stringify(state, null, 2));
    } catch {
      // Ignore save errors
    }
  }

  /**
   * Load daemon state from disk.
   * Note: mudListId and chanListId are intentionally NOT loaded.
   * We always request fresh lists on startup to ensure we have the
   * complete mudlist, not just delta updates from a stale ID.
   */
  private async loadState(): Promise<void> {
    try {
      const content = await efuns.readFile('/data/intermud-state.json');
      const state = JSON.parse(content);

      if (typeof state.password === 'number') {
        this._password = state.password;
      }
      // Intentionally NOT loading mudListId - we want a fresh mudlist on startup
      // Intentionally NOT loading chanListId - we want a fresh chanlist on startup
      if (Array.isArray(state.subscribedChannels)) {
        this._subscribedChannels = new Set(state.subscribedChannels);
      }
    } catch {
      // No saved state, use defaults
    }
  }
}

// Singleton - set by constructor or getIntermudDaemon
let intermudDaemonInstance: IntermudDaemon | null = null;

/**
 * Set the singleton instance. Called internally.
 */
export function setIntermudDaemonInstance(instance: IntermudDaemon): void {
  intermudDaemonInstance = instance;
}

export function getIntermudDaemon(): IntermudDaemon {
  if (!intermudDaemonInstance) {
    intermudDaemonInstance = new IntermudDaemon();
  }
  return intermudDaemonInstance;
}

export function resetIntermudDaemon(): void {
  intermudDaemonInstance = null;
}
