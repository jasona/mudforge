/**
 * Discord Daemon - Manages Discord channel bridging.
 *
 * Provides two-way message bridging between Discord and in-game channels.
 * Players can send messages to Discord via the 'discord' channel,
 * and Discord messages appear in the 'discord' channel in-game.
 */

import { MudObject } from '../std/object.js';
import { getConfigDaemon } from './config.js';

/**
 * Discord Daemon class.
 */
export class DiscordDaemon extends MudObject {
  private _enabled: boolean = false;
  private _guildId: string = '';
  private _channelId: string = '';
  private _connected: boolean = false;
  private _initialized: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Discord Daemon';
    this.longDesc = 'The Discord daemon manages Discord channel bridging.';

    // Register this instance as the singleton
    setDiscordDaemonInstance(this);
  }

  /**
   * Initialize the Discord daemon.
   * Called by the driver on startup if Discord is enabled.
   */
  async initialize(config: {
    token: string;
    guildId: string;
    channelId: string;
  }): Promise<void> {
    this._guildId = config.guildId;
    this._channelId = config.channelId;

    // Save config to mud settings
    const configDaemon = getConfigDaemon();
    configDaemon.set('discord.guildId', config.guildId);
    configDaemon.set('discord.channelId', config.channelId);
    configDaemon.set('discord.enabled', true);

    // Register message handler
    if (typeof efuns !== 'undefined' && efuns.discordOnMessage) {
      efuns.discordOnMessage((author: string, content: string) => {
        this.receiveFromDiscord(author, content);
      });
    }

    // Connect to Discord
    const connected = await this.connect(config.token);
    if (connected) {
      this._enabled = true;
      this._connected = true;
      this.registerDiscordChannel();
      console.log('[DiscordDaemon] Connected to Discord');
    } else {
      console.error('[DiscordDaemon] Failed to connect to Discord');
    }

    this._initialized = true;
  }

  /**
   * Configure the Discord connection.
   * @param guildId The Discord server (guild) ID
   * @param channelId The Discord channel ID to bridge
   */
  async configure(guildId: string, channelId: string): Promise<{ success: boolean; error?: string }> {
    if (!guildId || !channelId) {
      return { success: false, error: 'Guild ID and Channel ID are required' };
    }

    this._guildId = guildId;
    this._channelId = channelId;

    // Save to config daemon
    const configDaemon = getConfigDaemon();
    configDaemon.set('discord.guildId', guildId);
    configDaemon.set('discord.channelId', channelId);
    await configDaemon.save();

    return { success: true };
  }

  /**
   * Enable and connect to Discord.
   */
  async enable(): Promise<{ success: boolean; error?: string }> {
    if (!this._guildId || !this._channelId) {
      return { success: false, error: 'Discord not configured. Use discordadmin configure first.' };
    }

    // Get token from environment
    const token = process.env['DISCORD_BOT_TOKEN'];
    if (!token) {
      return { success: false, error: 'DISCORD_BOT_TOKEN environment variable not set' };
    }

    // Register message handler
    if (typeof efuns !== 'undefined' && efuns.discordOnMessage) {
      efuns.discordOnMessage((author: string, content: string) => {
        this.receiveFromDiscord(author, content);
      });
    }

    const connected = await this.connect(token);
    if (!connected) {
      return { success: false, error: 'Failed to connect to Discord. Check token and IDs.' };
    }

    this._enabled = true;
    this._connected = true;

    // Save enabled state
    const configDaemon = getConfigDaemon();
    configDaemon.set('discord.enabled', true);
    await configDaemon.save();

    // Register the discord channel
    this.registerDiscordChannel();

    return { success: true };
  }

  /**
   * Disable and disconnect from Discord.
   */
  async disable(): Promise<void> {
    if (typeof efuns !== 'undefined' && efuns.discordDisconnect) {
      await efuns.discordDisconnect();
    }

    this._enabled = false;
    this._connected = false;

    // Save disabled state
    const configDaemon = getConfigDaemon();
    configDaemon.set('discord.enabled', false);
    await configDaemon.save();
  }

  /**
   * Connect to Discord using the provided token.
   */
  private async connect(token: string): Promise<boolean> {
    if (typeof efuns === 'undefined' || !efuns.discordConnect) {
      console.error('[DiscordDaemon] Discord efuns not available');
      return false;
    }

    const connected = await efuns.discordConnect({
      token,
      guildId: this._guildId,
      channelId: this._channelId,
    });

    this._connected = connected;
    return connected;
  }

  /**
   * Register the discord channel with the channel daemon.
   */
  private registerDiscordChannel(): void {
    try {
      // Use efuns.findObject to get the actual channel daemon instance
      const daemon = efuns.findObject('/daemons/channels') as {
        registerDiscordChannel: () => boolean;
      } | null;
      if (!daemon) {
        console.error('[DiscordDaemon] Channel daemon not found');
        return;
      }
      const result = daemon.registerDiscordChannel();
      console.log(`[DiscordDaemon] Discord channel registered: ${result}`);
    } catch (error) {
      console.error('[DiscordDaemon] Failed to register discord channel:', error);
    }
  }

  /**
   * Send a message to Discord.
   * Called by the channel daemon when a player sends on the discord channel.
   */
  async sendToDiscord(playerName: string, message: string): Promise<boolean> {
    if (!this._connected) {
      return false;
    }

    if (typeof efuns === 'undefined' || !efuns.discordSend) {
      return false;
    }

    return efuns.discordSend(playerName, message);
  }

  /**
   * Receive a message from Discord.
   * Called by the message handler when a Discord message arrives.
   */
  receiveFromDiscord(author: string, content: string): void {
    // Forward to channel daemon
    try {
      const daemon = efuns.findObject('/daemons/channels') as {
        receiveDiscordMessage?: (author: string, content: string) => void;
      } | null;
      if (daemon?.receiveDiscordMessage) {
        daemon.receiveDiscordMessage(author, content);
      }
    } catch (error) {
      console.error('[DiscordDaemon] Failed to forward Discord message:', error);
    }
  }

  /**
   * Get the current status of the Discord connection.
   */
  getStatus(): {
    enabled: boolean;
    connected: boolean;
    guildId: string;
    channelId: string;
    state: string;
  } {
    let state = 'disconnected';
    if (typeof efuns !== 'undefined' && efuns.discordGetState) {
      state = efuns.discordGetState();
    }

    return {
      enabled: this._enabled,
      connected: this._connected,
      guildId: this._guildId,
      channelId: this._channelId,
      state,
    };
  }

  /**
   * Check if Discord is currently connected.
   */
  isConnected(): boolean {
    if (typeof efuns !== 'undefined' && efuns.discordIsConnected) {
      return efuns.discordIsConnected();
    }
    return this._connected;
  }

  /**
   * Auto-connect to Discord if previously enabled.
   * Called when the daemon is first loaded to restore previous state.
   */
  async autoConnect(): Promise<void> {
    // Check saved config
    const configDaemon = getConfigDaemon();
    const enabled = configDaemon.get<boolean>('discord.enabled');
    const guildId = configDaemon.get<string>('discord.guildId');
    const channelId = configDaemon.get<string>('discord.channelId');

    if (!enabled || !guildId || !channelId) {
      return;
    }

    // Get token from environment
    const token = process.env['DISCORD_BOT_TOKEN'];
    if (!token) {
      console.log('[DiscordDaemon] Auto-connect skipped: DISCORD_BOT_TOKEN not set');
      return;
    }

    console.log('[DiscordDaemon] Auto-connecting (previously enabled)...');

    this._guildId = guildId;
    this._channelId = channelId;

    // Register message handler
    if (typeof efuns !== 'undefined' && efuns.discordOnMessage) {
      efuns.discordOnMessage((author: string, content: string) => {
        this.receiveFromDiscord(author, content);
      });
    }

    const connected = await this.connect(token);
    if (connected) {
      this._enabled = true;
      this._connected = true;
      this.registerDiscordChannel();
      console.log('[DiscordDaemon] Auto-connect successful');
    } else {
      console.error('[DiscordDaemon] Auto-connect failed');
    }
  }
}

// Singleton instance
let discordDaemon: DiscordDaemon | null = null;

/**
 * Set the singleton instance. Called from constructor.
 */
export function setDiscordDaemonInstance(instance: DiscordDaemon): void {
  discordDaemon = instance;
}

/**
 * Get the global DiscordDaemon instance.
 */
export function getDiscordDaemon(): DiscordDaemon {
  if (!discordDaemon) {
    discordDaemon = new DiscordDaemon();
    // Auto-connect if previously enabled (async, don't wait)
    discordDaemon.autoConnect().catch((err) => {
      console.error('[DiscordDaemon] Auto-connect error:', err);
    });
  }
  return discordDaemon;
}

/**
 * Reset the Discord daemon (for testing).
 */
export function resetDiscordDaemon(): void {
  discordDaemon = null;
}

export default DiscordDaemon;
