/**
 * Discord WebSocket Client - Manages connection to Discord for channel bridging.
 *
 * Features:
 * - Persistent Discord bot connection
 * - Two-way message bridging between Discord and in-game channels
 * - Event-based interface for message handling
 * - Auto-reconnect support
 *
 * Discord Developer Portal: https://discord.com/developers/applications
 */

import { EventEmitter } from 'events';
import {
  Client,
  GatewayIntentBits,
  TextChannel,
  Events,
  ChannelType,
  type Message,
} from 'discord.js';
import type { Logger } from 'pino';

/**
 * Discord client configuration.
 */
export interface DiscordClientConfig {
  /** Discord bot token */
  token: string;
  /** Guild (server) ID to connect to */
  guildId: string;
  /** Channel ID to bridge */
  channelId: string;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Connection states.
 */
export type DiscordConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

/**
 * Discord message event.
 */
export interface DiscordMessageEvent {
  author: string;
  content: string;
  authorId: string;
  messageId: string;
}

export interface DiscordClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  error: (error: Error) => void;
  message: (event: DiscordMessageEvent) => void;
  stateChange: (state: DiscordConnectionState) => void;
}

type EventArgs<T, K extends keyof T> = T[K] extends (...args: infer A) => void ? A : never;

/**
 * Discord WebSocket Client for channel bridging.
 */
export class DiscordClient extends EventEmitter {
  private client: Client | null = null;
  private config: DiscordClientConfig | null = null;
  private channel: TextChannel | null = null;
  private _state: DiscordConnectionState = 'disconnected';
  private messageHandler: ((author: string, content: string) => void) | null = null;
  private logger: Logger | undefined;

  onEvent<K extends keyof DiscordClientEvents>(
    event: K,
    listener: (...args: EventArgs<DiscordClientEvents, K>) => void
  ): this {
    this.on(event as string, listener as (...args: unknown[]) => void);
    return this;
  }

  emitEvent<K extends keyof DiscordClientEvents>(
    event: K,
    ...args: EventArgs<DiscordClientEvents, K>
  ): boolean {
    return this.emit(event as string, ...args);
  }

  constructor() {
    super();
  }

  /**
   * Get current connection state.
   */
  get state(): DiscordConnectionState {
    return this._state;
  }

  /**
   * Check if connected and ready.
   */
  get isConnected(): boolean {
    return this._state === 'connected' && this.client !== null && this.channel !== null;
  }

  /**
   * Get the current configuration.
   */
  getConfig(): { guildId: string; channelId: string } | null {
    if (!this.config) return null;
    return {
      guildId: this.config.guildId,
      channelId: this.config.channelId,
    };
  }

  /**
   * Connect to Discord.
   */
  async connect(config: DiscordClientConfig): Promise<boolean> {
    if (this._state === 'connected' || this._state === 'connecting') {
      return this._state === 'connected';
    }

    this.config = config;
    this.logger = config.logger;
    this.setState('connecting');
    this.log('info', 'Connecting to Discord...');

    try {
      // Create Discord client with required intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ],
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Login to Discord
      await this.client.login(config.token);

      // Wait for client to be ready
      await this.waitForReady();

      // Get the channel
      const guild = this.client.guilds.cache.get(config.guildId);
      if (!guild) {
        throw new Error(`Guild ${config.guildId} not found. Make sure the bot is invited to the server.`);
      }

      const channel = guild.channels.cache.get(config.channelId);
      if (!channel) {
        throw new Error(`Channel ${config.channelId} not found in guild ${config.guildId}.`);
      }

      if (channel.type !== ChannelType.GuildText) {
        throw new Error(`Channel ${config.channelId} is not a text channel.`);
      }

      this.channel = channel as TextChannel;
      this.setState('connected');
      this.log('info', `Connected to Discord channel: #${this.channel.name}`);
      this.emitEvent('connect');

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to connect to Discord: ${message}`);
      this.setState('disconnected');
      this.emitEvent('error', error instanceof Error ? error : new Error(String(error)));
      await this.cleanup();
      return false;
    }
  }

  /**
   * Disconnect from Discord.
   */
  async disconnect(): Promise<void> {
    if (this._state === 'disconnected') {
      return;
    }

    this.log('info', 'Disconnecting from Discord...');
    await this.cleanup();
    this.setState('disconnected');
    this.emitEvent('disconnect', 'Manual disconnect');
  }

  /**
   * Send a message to Discord.
   */
  async sendMessage(playerName: string, message: string): Promise<boolean> {
    if (!this.isConnected || !this.channel) {
      this.log('warn', 'Cannot send message: not connected to Discord');
      return false;
    }

    try {
      // Format message with player name in bold
      const formattedMessage = `**${playerName}**: ${message}`;

      // Send to Discord
      await this.channel.send(formattedMessage);
      this.log('debug', `Sent message to Discord: ${formattedMessage}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('error', `Failed to send message to Discord: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Register a callback for incoming messages.
   */
  onMessage(handler: (author: string, content: string) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Set up Discord.js event handlers.
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // Handle incoming messages
    this.client.on(Events.MessageCreate, (message: Message) => {
      this.handleMessage(message);
    });

    // Handle disconnection
    this.client.on(Events.ShardDisconnect, () => {
      this.log('warn', 'Discord connection lost');
      this.setState('reconnecting');
      this.emitEvent('disconnect', 'Connection lost');
    });

    // Handle reconnection
    this.client.on(Events.ShardResume, () => {
      this.log('info', 'Discord connection resumed');
      this.setState('connected');
      this.emitEvent('connect');
    });

    // Handle errors
    this.client.on(Events.Error, (error) => {
      this.log('error', `Discord client error: ${error.message}`);
      this.emitEvent('error', error);
    });
  }

  /**
   * Handle an incoming Discord message.
   */
  private handleMessage(message: Message): void {
    // Ignore messages from bots (including ourselves)
    if (message.author.bot) {
      return;
    }

    // Only process messages from the configured channel
    if (message.channelId !== this.config?.channelId) {
      return;
    }

    // Get author name and message content
    const author = message.member?.displayName || message.author.displayName || message.author.username;
    const content = message.content;

    // Ignore empty messages
    if (!content.trim()) {
      return;
    }

    this.log('debug', `Received message from Discord: ${author}: ${content}`);

    // Emit message event
    this.emitEvent('message', {
      author,
      content,
      authorId: message.author.id,
      messageId: message.id,
    } as DiscordMessageEvent);

    // Call message handler if registered
    if (this.messageHandler) {
      this.messageHandler(author, content);
    }
  }

  /**
   * Wait for the Discord client to be ready.
   */
  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Client not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for Discord client to be ready'));
      }, 30000);

      this.client.once(Events.ClientReady, () => {
        clearTimeout(timeout);
        this.log('info', `Logged in as ${this.client?.user?.tag}`);
        resolve();
      });
    });
  }

  /**
   * Clean up Discord client resources.
   */
  private async cleanup(): Promise<void> {
    if (this.client) {
      try {
        this.client.removeAllListeners();
        await this.client.destroy();
      } catch {
        // Ignore errors during cleanup
      }
      this.client = null;
    }
    this.channel = null;
    this.config = null;
    this.messageHandler = null;
  }

  /**
   * Update connection state.
   */
  private setState(state: DiscordConnectionState): void {
    if (this._state !== state) {
      this._state = state;
      this.emitEvent('stateChange', state);
    }
  }

  /**
   * Log a message.
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (this.logger) {
      this.logger[level]({ component: 'DiscordClient' }, message);
    }
  }
}

/**
 * Singleton instance management.
 */
let discordClient: DiscordClient | null = null;

export function getDiscordClient(): DiscordClient | null {
  return discordClient;
}

export function createDiscordClient(): DiscordClient {
  if (!discordClient) {
    discordClient = new DiscordClient();
  }
  return discordClient;
}

export function destroyDiscordClient(): void {
  if (discordClient) {
    discordClient.disconnect();
    discordClient = null;
  }
}
