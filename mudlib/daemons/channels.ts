/**
 * Channel Daemon - Manages communication channels.
 *
 * Supports various channel types:
 * - Public: Anyone can use (e.g., shout)
 * - Permission: Requires minimum permission level (e.g., builder, admin)
 * - Membership: Requires membership in a group (e.g., class, clan)
 */

import { MudObject } from '../std/object.js';
import { composeMessage } from '../lib/message-composer.js';

/**
 * Channel access types.
 */
export type ChannelAccessType = 'public' | 'permission' | 'membership' | 'intermud' | 'intermud2';

/**
 * Channel configuration.
 */
export interface ChannelConfig {
  /** Unique channel name */
  name: string;
  /** Display name for the channel */
  displayName: string;
  /** Access type */
  accessType: ChannelAccessType;
  /** Minimum permission level (for 'permission' type) */
  minPermission?: number;
  /** Membership group (for 'membership' type, e.g., 'class:thief', 'clan:dragons') */
  membershipGroup?: string;
  /** Whether the channel is on by default for eligible players */
  defaultOn: boolean;
  /** Color/format for channel messages */
  color?: string;
  /** Description of the channel */
  description: string;
  /** Channel source ('local', 'intermud', or 'intermud2') */
  source?: 'local' | 'intermud' | 'intermud2';
  /** I3 channel name (for intermud channels) */
  i3ChannelName?: string;
  /** Host MUD for I3 channel */
  i3Host?: string;
  /** I2 channel name (for intermud2 channels) */
  i2ChannelName?: string;
}

/**
 * Player interface for channel operations.
 */
interface ChannelPlayer extends MudObject {
  name: string;
  gender?: 'male' | 'female' | 'neutral';
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  permissionLevel?: number;
}

/**
 * Emote definition interface.
 */
interface EmoteDefinition {
  [rule: string]: string;
}

/**
 * Soul daemon interface for emote operations.
 */
interface SoulDaemon {
  hasEmote(verb: string): boolean;
  getEmote(verb: string): EmoteDefinition | undefined;
}

/**
 * Channel message format.
 */
export interface ChannelMessage {
  channel: string;
  sender: string;
  message: string;
  timestamp: number;
}

/**
 * Channel Daemon class.
 */
export class ChannelDaemon extends MudObject {
  private _channels: Map<string, ChannelConfig> = new Map();
  private _history: Map<string, ChannelMessage[]> = new Map();
  private _maxHistory: number = 20;

  constructor() {
    super();
    this.shortDesc = 'Channel Daemon';
    this.longDesc = 'The channel daemon manages communication channels.';

    // Register this instance as the singleton
    setChannelDaemonInstance(this);

    // Initialize default channels
    this.initializeDefaultChannels();
  }

  /**
   * Initialize the default channels.
   */
  private initializeDefaultChannels(): void {
    // Public channels
    this.registerChannel({
      name: 'shout',
      displayName: 'Shout',
      accessType: 'public',
      defaultOn: true,
      color: 'yellow',
      description: 'Public channel for shouting to everyone in the game.',
    });

    this.registerChannel({
      name: 'ooc',
      displayName: 'OOC',
      accessType: 'public',
      defaultOn: true,
      color: 'cyan',
      description: 'Out-of-character chat for general discussion.',
    });

    this.registerChannel({
      name: 'newbie',
      displayName: 'Newbie',
      accessType: 'public',
      defaultOn: true,
      color: 'green',
      description: 'Help channel for new players.',
    });

    // Permission-based channels
    this.registerChannel({
      name: 'builder',
      displayName: 'Builder',
      accessType: 'permission',
      minPermission: 1, // Builder level
      defaultOn: true,
      color: 'magenta',
      description: 'Channel for builders to communicate.',
    });

    this.registerChannel({
      name: 'admin',
      displayName: 'Admin',
      accessType: 'permission',
      minPermission: 3, // Admin level
      defaultOn: true,
      color: 'red',
      description: 'Private channel for administrators.',
    });

    // System notification channel
    this.registerChannel({
      name: 'notify',
      displayName: 'Notify',
      accessType: 'permission',
      minPermission: 1, // Builder level and up
      defaultOn: true,
      color: 'YELLOW',
      description: 'System notifications (logins, logouts, disconnects).',
    });

    // Intermud 3 channels (pre-registered, will be used when I3 connects)
    this.registerChannel({
      name: 'intermud',
      displayName: 'Intermud',
      accessType: 'intermud',
      defaultOn: true,
      color: 'cyan',
      description: 'Intermud 3 cross-MUD chat channel.',
      source: 'intermud',
      i3ChannelName: 'intermud',
      i3Host: '*dalet',
    });

    this.registerChannel({
      name: 'imud_code',
      displayName: 'IMud_Code',
      accessType: 'intermud',
      defaultOn: false,
      color: 'cyan',
      description: 'Intermud 3 coding discussion channel.',
      source: 'intermud',
      i3ChannelName: 'imud_code',
      i3Host: '*dalet',
    });

    // Intermud 2 channels (pre-registered, will be used when I2 connects)
    this.registerChannel({
      name: 'gwiz',
      displayName: 'GWiz',
      accessType: 'intermud2',
      defaultOn: true,
      color: 'magenta',
      description: 'Intermud 2 global wizard channel.',
      source: 'intermud2',
      i2ChannelName: 'gwiz',
    });

    this.registerChannel({
      name: 'i2chat',
      displayName: 'I2Chat',
      accessType: 'intermud2',
      defaultOn: true,
      color: 'magenta',
      description: 'Intermud 2 general chat channel.',
      source: 'intermud2',
      i2ChannelName: 'i2chat',
    });
  }

  /**
   * Register a new channel.
   */
  registerChannel(config: ChannelConfig): boolean {
    if (this._channels.has(config.name.toLowerCase())) {
      return false;
    }

    this._channels.set(config.name.toLowerCase(), {
      ...config,
      name: config.name.toLowerCase(),
    });
    this._history.set(config.name.toLowerCase(), []);
    return true;
  }

  /**
   * Unregister a channel.
   */
  unregisterChannel(name: string): boolean {
    const channelName = name.toLowerCase();
    if (!this._channels.has(channelName)) {
      return false;
    }

    this._channels.delete(channelName);
    this._history.delete(channelName);
    return true;
  }

  /**
   * Get a channel by name.
   */
  getChannel(name: string): ChannelConfig | undefined {
    return this._channels.get(name.toLowerCase());
  }

  /**
   * Get all registered channels.
   */
  getAllChannels(): ChannelConfig[] {
    return Array.from(this._channels.values());
  }

  /**
   * Get channels available to a player.
   */
  getAvailableChannels(player: ChannelPlayer): ChannelConfig[] {
    return this.getAllChannels().filter(ch => this.canAccess(player, ch.name));
  }

  /**
   * Check if a player can access a channel.
   */
  canAccess(player: ChannelPlayer, channelName: string): boolean {
    const channel = this.getChannel(channelName);
    if (!channel) {
      return false;
    }

    switch (channel.accessType) {
      case 'public':
        return true;

      case 'permission':
        const permLevel = player.permissionLevel ?? 0;
        return permLevel >= (channel.minPermission ?? 0);

      case 'membership':
        return this.checkMembership(player, channel.membershipGroup ?? '');

      case 'intermud':
        // I3 channels are public access
        return true;

      case 'intermud2':
        // I2 channels are public access
        return true;

      default:
        return false;
    }
  }

  /**
   * Check membership for a membership-based channel.
   */
  private checkMembership(player: ChannelPlayer, group: string): boolean {
    if (!group) return false;

    const [type, value] = group.split(':');

    switch (type) {
      case 'class':
        // Check player's class
        const playerClass = player.getProperty('class') as string | undefined;
        return playerClass?.toLowerCase() === value?.toLowerCase();

      case 'clan':
        // Check player's clan
        const playerClan = player.getProperty('clan') as string | undefined;
        return playerClan?.toLowerCase() === value?.toLowerCase();

      case 'guild':
        // Check player's guild
        const playerGuild = player.getProperty('guild') as string | undefined;
        return playerGuild?.toLowerCase() === value?.toLowerCase();

      case 'race':
        // Check player's race
        const playerRace = player.getProperty('race') as string | undefined;
        return playerRace?.toLowerCase() === value?.toLowerCase();

      case 'custom':
        // Check custom membership list
        const members = player.getProperty(`channel_member_${value}`) as boolean | undefined;
        return members === true;

      default:
        return false;
    }
  }

  /**
   * Check if a player has a channel turned on.
   */
  isChannelOn(player: ChannelPlayer, channelName: string): boolean {
    const channel = this.getChannel(channelName);
    if (!channel) return false;

    // Check player's channel settings
    const channels = player.getProperty('channels') as Record<string, boolean> | undefined;

    if (channels && channelName.toLowerCase() in channels) {
      return channels[channelName.toLowerCase()];
    }

    // Return default
    return channel.defaultOn;
  }

  /**
   * Turn a channel on for a player.
   */
  turnOn(player: ChannelPlayer, channelName: string): boolean {
    const channel = this.getChannel(channelName);
    if (!channel || !this.canAccess(player, channelName)) {
      return false;
    }

    const channels = (player.getProperty('channels') as Record<string, boolean>) ?? {};
    channels[channelName.toLowerCase()] = true;
    player.setProperty('channels', channels);
    return true;
  }

  /**
   * Turn a channel off for a player.
   */
  turnOff(player: ChannelPlayer, channelName: string): boolean {
    const channel = this.getChannel(channelName);
    if (!channel) {
      return false;
    }

    const channels = (player.getProperty('channels') as Record<string, boolean>) ?? {};
    channels[channelName.toLowerCase()] = false;
    player.setProperty('channels', channels);
    return true;
  }

  /**
   * Send a message to a channel.
   */
  send(player: ChannelPlayer, channelName: string, message: string): boolean {
    const channel = this.getChannel(channelName);
    if (!channel) {
      player.receive(`No such channel: ${channelName}\n`);
      return false;
    }

    if (!this.canAccess(player, channelName)) {
      player.receive(`You don't have access to the ${channel.displayName} channel.\n`);
      return false;
    }

    if (!this.isChannelOn(player, channelName)) {
      player.receive(`You have the ${channel.displayName} channel turned off.\n`);
      return false;
    }

    // Check for emote syntax (message starts with :)
    if (message.startsWith(':')) {
      return this.sendEmote(player, channelName, message.slice(1).trim());
    }

    // If this is an I3 channel, also send to I3 network
    if (channel.source === 'intermud' && channel.i3ChannelName) {
      this.sendToI3(channel.i3ChannelName, player.name, message);
    }

    // If this is an I2 channel, also send to I2 network
    if (channel.source === 'intermud2' && channel.i2ChannelName) {
      this.sendToI2(channel.i2ChannelName, player.name, message);
    }

    // Format the message
    const formattedMessage = this.formatMessage(channel, player.name, message);

    // Store in history
    this.addToHistory(channelName, {
      channel: channelName,
      sender: player.name,
      message: message,
      timestamp: Date.now(),
    });

    // Broadcast to all eligible players
    this.broadcast(channelName, formattedMessage, player);

    return true;
  }

  /**
   * Send an emote to a channel.
   * Syntax: :smile or :smile @bob
   */
  sendEmote(player: ChannelPlayer, channelName: string, emoteArgs: string): boolean {
    const channel = this.getChannel(channelName);
    if (!channel) {
      return false;
    }

    if (!emoteArgs) {
      player.receive(`{yellow}Usage: ${channelName} :emote or ${channelName} :emote @target{/}\n`);
      return false;
    }

    // Parse emote and optional @target
    const parts = emoteArgs.split(/\s+/);
    const verb = parts[0]!.toLowerCase();
    let targetName: string | null = null;

    // Check for @target in any position
    for (let i = 1; i < parts.length; i++) {
      if (parts[i]!.startsWith('@')) {
        targetName = parts[i]!.substring(1);
        break;
      }
    }

    // Get the soul daemon
    const soulDaemon = (typeof efuns !== 'undefined' ? efuns.findObject('/daemons/soul') : null) as SoulDaemon | null;

    if (!soulDaemon) {
      player.receive(`{red}Error: Soul daemon not available.{/}\n`);
      return false;
    }

    // Check if emote exists
    if (!soulDaemon.hasEmote(verb)) {
      player.receive(`{red}Unknown emote: {bold}${verb}{/}\n`);
      return false;
    }

    const emote = soulDaemon.getEmote(verb);
    if (!emote) {
      player.receive(`{red}Unknown emote: {bold}${verb}{/}\n`);
      return false;
    }

    // Determine template and find target
    let template: string | undefined;
    let target: ChannelPlayer | null = null;

    if (targetName) {
      // Targeted emote - need LIV rule
      template = emote['LIV'];
      if (!template) {
        player.receive(`{yellow}You cannot ${verb} someone on this channel.{/}\n`);
        return false;
      }

      // Find target among channel players
      const players = (typeof efuns !== 'undefined' && efuns.allPlayers ? efuns.allPlayers() : []) as ChannelPlayer[];
      for (const p of players) {
        if (p.name.toLowerCase() === targetName.toLowerCase() ||
            p.name.toLowerCase().startsWith(targetName.toLowerCase())) {
          if (this.canAccess(p, channelName) && this.isChannelOn(p, channelName)) {
            target = p;
            break;
          }
        }
      }

      if (!target) {
        player.receive(`{yellow}${targetName} is not on the ${channel.displayName} channel.{/}\n`);
        return false;
      }

      if (target === player) {
        player.receive(`{yellow}You can't target yourself with a channel emote.{/}\n`);
        return false;
      }
    } else {
      // Solo emote - use no-target rule
      template = emote[''];
      if (!template) {
        // If no solo rule, check if it requires a target
        if (emote['LIV']) {
          player.receive(`{yellow}${verb.charAt(0).toUpperCase() + verb.slice(1)} who? Use :${verb} @name{/}\n`);
          return false;
        }
        player.receive(`{yellow}Cannot do that.{/}\n`);
        return false;
      }
    }

    // Store in history (raw emote for replay)
    this.addToHistory(channelName, {
      channel: channelName,
      sender: player.name,
      message: `:${emoteArgs}`,
      timestamp: Date.now(),
    });

    // Broadcast emote to all channel members with viewer-specific messages
    this.broadcastEmote(channelName, channel, template, player, target);

    return true;
  }

  /**
   * Broadcast an emote to all channel members with viewer-specific messages.
   */
  private broadcastEmote(
    channelName: string,
    channel: ChannelConfig,
    template: string,
    actor: ChannelPlayer,
    target: ChannelPlayer | null
  ): void {
    // Get all connected players
    let players: MudObject[] = [];
    if (typeof efuns !== 'undefined' && efuns.allPlayers) {
      players = efuns.allPlayers();
    }

    const color = channel.color ?? 'white';

    for (const obj of players) {
      const player = obj as ChannelPlayer;

      // Skip if player can't access channel
      if (!this.canAccess(player, channelName)) {
        continue;
      }

      // Skip if player has channel off
      if (!this.isChannelOn(player, channelName)) {
        continue;
      }

      // Compose viewer-specific message
      const message = composeMessage(template, player, actor, target, '');

      // Format with channel prefix and emote indicator
      const formattedMessage = `{${color}}[${channel.displayName}]{/} * ${message}\n`;

      // Send message
      if (typeof player.receive === 'function') {
        player.receive(formattedMessage);
      }
    }
  }

  /**
   * Format a channel message with colors.
   */
  private formatMessage(channel: ChannelConfig, sender: string, message: string): string {
    // Apply channel color if defined
    const color = channel.color ?? 'white';
    return `{${color}}[${channel.displayName}]{/} {bold}${sender}{/}: ${message}\n`;
  }

  /**
   * Broadcast a message to all players on a channel.
   */
  private broadcast(channelName: string, message: string, sender?: ChannelPlayer): void {
    // Get all connected players
    let players: MudObject[] = [];
    if (typeof efuns !== 'undefined' && efuns.allPlayers) {
      players = efuns.allPlayers();
    }

    for (const obj of players) {
      const player = obj as ChannelPlayer;

      // Skip if player can't access channel
      if (!this.canAccess(player, channelName)) {
        continue;
      }

      // Skip if player has channel off
      if (!this.isChannelOn(player, channelName)) {
        continue;
      }

      // Send message
      if (typeof player.receive === 'function') {
        player.receive(message);
      }
    }
  }

  /**
   * Send a system notification to a channel (no sender, just message).
   * Used for login/logout/disconnect notifications.
   * @param channelName The channel to send to
   * @param message The notification message
   */
  sendNotification(channelName: string, message: string): void {
    const channel = this.getChannel(channelName);
    if (!channel) return;

    // Format as system notification
    const color = channel.color ?? 'yellow';
    const formattedMessage = `{${color}}[${channel.displayName}]{/} ${message}\n`;

    // Add to history
    this.addToHistory(channelName, {
      channel: channelName,
      sender: 'SYSTEM',
      message: message,
      timestamp: Date.now(),
    });

    // Broadcast to all eligible players
    this.broadcast(channelName, formattedMessage);
  }

  /**
   * Add a message to channel history.
   */
  private addToHistory(channelName: string, msg: ChannelMessage): void {
    const history = this._history.get(channelName.toLowerCase());
    if (history) {
      history.push(msg);
      // Keep only the last N messages
      while (history.length > this._maxHistory) {
        history.shift();
      }
    }
  }

  /**
   * Get channel history.
   */
  getHistory(channelName: string, count: number = 10): ChannelMessage[] {
    const history = this._history.get(channelName.toLowerCase());
    if (!history) return [];
    return history.slice(-count);
  }

  /**
   * Create a membership-based channel (e.g., for a class or clan).
   */
  createMembershipChannel(
    name: string,
    displayName: string,
    membershipGroup: string,
    description: string
  ): boolean {
    return this.registerChannel({
      name,
      displayName,
      accessType: 'membership',
      membershipGroup,
      defaultOn: true,
      description,
    });
  }

  /**
   * Create a class channel.
   */
  createClassChannel(className: string): boolean {
    const name = className.toLowerCase();
    return this.createMembershipChannel(
      name,
      className.charAt(0).toUpperCase() + className.slice(1),
      `class:${name}`,
      `Private channel for ${className} class members.`
    );
  }

  /**
   * Create a clan channel.
   */
  createClanChannel(clanName: string): boolean {
    const safeName = clanName.toLowerCase().replace(/\s+/g, '_');
    return this.createMembershipChannel(
      `clan_${safeName}`,
      `[${clanName}]`,
      `clan:${clanName.toLowerCase()}`,
      `Private channel for ${clanName} clan members.`
    );
  }

  /**
   * Create a guild channel.
   */
  createGuildChannel(guildName: string): boolean {
    const safeName = guildName.toLowerCase().replace(/\s+/g, '_');
    return this.createMembershipChannel(
      `guild_${safeName}`,
      `{${guildName}}`,
      `guild:${guildName.toLowerCase()}`,
      `Private channel for ${guildName} guild members.`
    );
  }

  /**
   * List channels for a player (for display purposes).
   */
  listChannels(player: ChannelPlayer): string {
    const available = this.getAvailableChannels(player);

    if (available.length === 0) {
      return 'No channels available.\n';
    }

    const lines: string[] = ['{bold}Available channels:{/}'];
    lines.push('{dim}' + '-'.repeat(50) + '{/}');

    for (const channel of available) {
      const status = this.isChannelOn(player, channel.name)
        ? '{green}ON {/}'
        : '{red}OFF{/}';
      const color = channel.color ?? 'white';
      const access = channel.accessType === 'public' ? '' : ` {dim}(${channel.accessType}){/}`;
      lines.push(`  [${status}] {${color}}${channel.displayName.padEnd(15)}{/} - ${channel.description}${access}`);
    }

    lines.push('{dim}' + '-'.repeat(50) + '{/}');
    lines.push('{dim}Use "channel <name> on/off" to toggle channels.{/}');
    lines.push('{dim}Use "<channel> <message>" to send a message.{/}');
    lines.push('{dim}Use "<channel> :emote" or ":emote @target" for emotes.{/}');

    return lines.join('\n') + '\n';
  }

  // ========== Intermud 3 Methods ==========

  /**
   * Register an I3 channel.
   * Called by IntermudDaemon when channel list is received.
   * The channel is registered using its I3 name directly (e.g., "intermud")
   * so users can type "intermud hello" to send messages.
   */
  registerI3Channel(i3Name: string, hostMud: string): boolean {
    const channelName = i3Name.toLowerCase();

    // Don't register if already exists
    if (this._channels.has(channelName)) {
      return false;
    }

    return this.registerChannel({
      name: channelName,
      displayName: i3Name.charAt(0).toUpperCase() + i3Name.slice(1),
      accessType: 'intermud',
      defaultOn: true, // I3 channels on by default
      color: 'cyan',
      description: `Intermud 3 channel (hosted by ${hostMud})`,
      source: 'intermud',
      i3ChannelName: i3Name,
      i3Host: hostMud,
    });
  }

  /**
   * Unregister an I3 channel.
   */
  unregisterI3Channel(i3Name: string): boolean {
    const channelName = i3Name.toLowerCase();
    return this.unregisterChannel(channelName);
  }

  /**
   * Send a message to I3 network.
   * Used when a local player sends on an I3 channel.
   */
  private sendToI3(i3ChannelName: string, senderName: string, message: string): void {
    // Import and use the intermud daemon
    try {
      // Dynamic import to avoid circular dependency
      const intermudModule = require('./intermud.js') as { getIntermudDaemon: () => { sendChannelMessage: (c: string, s: string, m: string) => boolean } };
      const intermudDaemon = intermudModule.getIntermudDaemon();
      intermudDaemon.sendChannelMessage(i3ChannelName, senderName, message);
    } catch {
      // Intermud not available
    }
  }

  /**
   * Receive a message from I3 network.
   * Called by IntermudDaemon when a remote message arrives.
   */
  receiveI3Message(i3ChannelName: string, mud: string, sender: string, message: string): void {
    const channelName = i3ChannelName.toLowerCase();
    const channel = this.getChannel(channelName);

    if (!channel) {
      // Channel not registered locally, ignore
      return;
    }

    // Format with MUD name
    const displaySender = `${sender}@${mud}`;
    const formattedMessage = this.formatMessage(channel, displaySender, message);

    // Store in history
    this.addToHistory(channelName, {
      channel: channelName,
      sender: displaySender,
      message: message,
      timestamp: Date.now(),
    });

    // Broadcast to local players
    this.broadcast(channelName, formattedMessage);
  }

  /**
   * Receive an emote from I3 network.
   */
  receiveI3Emote(i3ChannelName: string, mud: string, sender: string, emote: string): void {
    const channelName = i3ChannelName.toLowerCase();
    const channel = this.getChannel(channelName);

    if (!channel) {
      return;
    }

    // Format emote with MUD name
    const displaySender = `${sender}@${mud}`;
    const color = channel.color ?? 'cyan';

    // Replace $N with sender name
    const emoteText = emote.replace(/\$N/g, displaySender);
    const formattedMessage = `{${color}}[${channel.displayName}]{/} * ${emoteText}\n`;

    // Store in history
    this.addToHistory(channelName, {
      channel: channelName,
      sender: displaySender,
      message: `:${emote}`,
      timestamp: Date.now(),
    });

    // Broadcast to local players
    this.broadcast(channelName, formattedMessage);
  }

  /**
   * Get all I3 channels.
   */
  getI3Channels(): ChannelConfig[] {
    return this.getAllChannels().filter((ch) => ch.source === 'intermud');
  }

  // ========== Intermud 2 Methods ==========

  /**
   * Register an I2 channel.
   * Called when an I2 channel is discovered or configured.
   */
  registerI2Channel(i2Name: string): boolean {
    const channelName = i2Name.toLowerCase();

    // Don't register if already exists
    if (this._channels.has(channelName)) {
      return false;
    }

    return this.registerChannel({
      name: channelName,
      displayName: i2Name.charAt(0).toUpperCase() + i2Name.slice(1),
      accessType: 'intermud2',
      defaultOn: true,
      color: 'magenta',
      description: `Intermud 2 channel`,
      source: 'intermud2',
      i2ChannelName: i2Name,
    });
  }

  /**
   * Unregister an I2 channel.
   */
  unregisterI2Channel(i2Name: string): boolean {
    const channelName = i2Name.toLowerCase();
    return this.unregisterChannel(channelName);
  }

  /**
   * Send a message to I2 network.
   * Used when a local player sends on an I2 channel.
   */
  private sendToI2(i2ChannelName: string, senderName: string, message: string): void {
    try {
      const intermud2Module = require('./intermud2.js') as { getIntermud2Daemon: () => { sendChannelMessage: (c: string, s: string, m: string, e?: boolean) => boolean } };
      const intermud2Daemon = intermud2Module.getIntermud2Daemon();
      intermud2Daemon.sendChannelMessage(i2ChannelName, senderName, message);
    } catch {
      // Intermud2 not available
    }
  }

  /**
   * Receive a message from I2 network.
   * Called by Intermud2Daemon when a remote message arrives.
   */
  receiveI2Message(i2ChannelName: string, mud: string, sender: string, message: string): void {
    const channelName = i2ChannelName.toLowerCase();
    const channel = this.getChannel(channelName);

    if (!channel) {
      // Channel not registered locally, ignore
      return;
    }

    // Format with MUD name
    const displaySender = `${sender}@${mud}`;
    const formattedMessage = this.formatMessage(channel, displaySender, message);

    // Store in history
    this.addToHistory(channelName, {
      channel: channelName,
      sender: displaySender,
      message: message,
      timestamp: Date.now(),
    });

    // Broadcast to local players
    this.broadcast(channelName, formattedMessage);
  }

  /**
   * Receive an emote from I2 network.
   */
  receiveI2Emote(i2ChannelName: string, mud: string, sender: string, emote: string): void {
    const channelName = i2ChannelName.toLowerCase();
    const channel = this.getChannel(channelName);

    if (!channel) {
      return;
    }

    // Format emote with MUD name
    const displaySender = `${sender}@${mud}`;
    const color = channel.color ?? 'magenta';

    // Format as emote
    const formattedMessage = `{${color}}[${channel.displayName}]{/} * ${displaySender} ${emote}\n`;

    // Store in history
    this.addToHistory(channelName, {
      channel: channelName,
      sender: displaySender,
      message: `:${emote}`,
      timestamp: Date.now(),
    });

    // Broadcast to local players
    this.broadcast(channelName, formattedMessage);
  }

  /**
   * Get all I2 channels.
   */
  getI2Channels(): ChannelConfig[] {
    return this.getAllChannels().filter((ch) => ch.source === 'intermud2');
  }
}

// Singleton instance
let channelDaemon: ChannelDaemon | null = null;

/**
 * Set the singleton instance. Called from constructor.
 */
export function setChannelDaemonInstance(instance: ChannelDaemon): void {
  channelDaemon = instance;
}

/**
 * Get the global ChannelDaemon instance.
 */
export function getChannelDaemon(): ChannelDaemon {
  if (!channelDaemon) {
    channelDaemon = new ChannelDaemon();
  }
  return channelDaemon;
}

/**
 * Reset the channel daemon (for testing).
 */
export function resetChannelDaemon(): void {
  channelDaemon = null;
}

export default ChannelDaemon;
