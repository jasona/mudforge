/**
 * Channel Daemon - Manages communication channels.
 *
 * Supports various channel types:
 * - Public: Anyone can use (e.g., shout)
 * - Permission: Requires minimum permission level (e.g., builder, admin)
 * - Membership: Requires membership in a group (e.g., class, clan)
 */

import { MudObject } from '../lib/std.js';

/**
 * Channel access types.
 */
export type ChannelAccessType = 'public' | 'permission' | 'membership';

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
}

/**
 * Player interface for channel operations.
 */
interface ChannelPlayer extends MudObject {
  name: string;
  receive(message: string): void;
  getProperty(key: string): unknown;
  setProperty(key: string, value: unknown): void;
  permissionLevel?: number;
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

    return lines.join('\n') + '\n';
  }
}

// Singleton instance
let channelDaemon: ChannelDaemon | null = null;

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
