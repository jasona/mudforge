/**
 * Grapevine Daemon - Manages Grapevine chat network communication.
 *
 * This daemon handles:
 * - Channel message routing
 * - Channel subscription management
 * - State persistence
 *
 * Protocol: https://grapevine.haus/docs
 */

import { MudObject } from '../std/object.js';

/**
 * Grapevine event structure (from network client).
 */
export interface GrapevineEvent {
  event: string;
  ref?: string;
  status?: string;
  error?: string;
  payload?: Record<string, unknown>;
}

/**
 * Channel broadcast payload.
 */
export interface ChannelBroadcast {
  channel: string;
  message: string;
  game: string;
  name: string;
}

/**
 * Grapevine connection configuration.
 */
export interface GrapevineConfig {
  clientId: string;
  clientSecret: string;
  gameName: string;
  defaultChannels: string[];
}

/**
 * Grapevine Daemon class.
 */
export class GrapevineDaemon extends MudObject {
  private _subscribedChannels: Set<string> = new Set();
  private _config: GrapevineConfig | null = null;
  private _initialized: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Grapevine Daemon';
    this.longDesc = 'The Grapevine daemon manages communication with the Grapevine chat network.';

    // Register this instance as the singleton
    setGrapevineDaemonInstance(this);
  }

  /**
   * Initialize the daemon and register for Grapevine messages.
   */
  async initialize(config: GrapevineConfig): Promise<void> {
    this._config = config;

    // Register to receive Grapevine messages
    efuns.grapevineOnMessage((event: GrapevineEvent) => {
      this.handleEvent(event);
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
   * Get Grapevine connection state.
   */
  get connectionState(): string {
    return efuns.grapevineGetState();
  }

  /**
   * Check if connected to Grapevine.
   */
  get isConnected(): boolean {
    return efuns.grapevineIsConnected();
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
  async subscribeChannel(channel: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    const lowerChannel = channel.toLowerCase();
    if (this._subscribedChannels.has(lowerChannel)) {
      return true; // Already subscribed
    }

    const success = await efuns.grapevineSubscribe(lowerChannel);
    if (success) {
      this._subscribedChannels.add(lowerChannel);
      await this.saveState();

      // Register with local channel daemon so players can use it
      this.registerWithChannelDaemon(lowerChannel);
    }

    return success;
  }

  /**
   * Register a Grapevine channel with the local channel daemon.
   */
  private registerWithChannelDaemon(channelName: string): void {
    try {
      // Use efuns to find the channel daemon (require is not available in sandbox)
      const daemon = efuns.findObject('/daemons/channels') as {
        registerGrapevineChannel: (name: string) => boolean;
      } | null;
      if (!daemon) {
        console.error(`[GrapevineDaemon] Channel daemon not found`);
        return;
      }
      const result = daemon.registerGrapevineChannel(channelName);
      console.log(`[GrapevineDaemon] Registered channel '${channelName}' with ChannelDaemon: ${result}`);
    } catch (error) {
      console.error(`[GrapevineDaemon] Failed to register channel '${channelName}':`, error);
    }
  }

  /**
   * Unsubscribe from a channel.
   */
  async unsubscribeChannel(channel: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    const lowerChannel = channel.toLowerCase();
    if (!this._subscribedChannels.has(lowerChannel)) {
      return true; // Already unsubscribed
    }

    const success = await efuns.grapevineUnsubscribe(lowerChannel);
    if (success) {
      this._subscribedChannels.delete(lowerChannel);
      await this.saveState();
    }

    return success;
  }

  /**
   * Send a message on a channel.
   */
  sendChannelMessage(channel: string, senderName: string, message: string): boolean {
    if (!this.isConnected) {
      return false;
    }

    return efuns.grapevineSend(channel.toLowerCase(), senderName, message);
  }

  /**
   * Called when Grapevine connection is authenticated.
   * Registers all subscribed channels with the ChannelDaemon.
   */
  onAuthenticated(): void {
    const channels = Array.from(this._subscribedChannels);
    console.log(`[GrapevineDaemon] onAuthenticated called with ${channels.length} channels: ${channels.join(', ')}`);
    // Register all subscribed channels with the channel daemon
    for (const channel of this._subscribedChannels) {
      this.registerWithChannelDaemon(channel);
    }
  }

  /**
   * Handle incoming Grapevine event.
   */
  handleEvent(event: GrapevineEvent): void {
    switch (event.event) {
      case 'authenticate':
        // Authentication successful - register all subscribed channels
        if (!event.error) {
          console.log(`[GrapevineDaemon] Authenticate event received, registering ${this._subscribedChannels.size} channels`);
          for (const channel of this._subscribedChannels) {
            this.registerWithChannelDaemon(channel);
          }
        }
        break;

      case 'channels/broadcast':
        this.handleChannelBroadcast(event.payload as ChannelBroadcast);
        break;

      case 'channels/subscribe':
        if (event.status === 'success' && event.payload?.channel) {
          const channel = (event.payload.channel as string).toLowerCase();
          this._subscribedChannels.add(channel);
          this.saveState();
          this.registerWithChannelDaemon(channel);
        }
        break;

      case 'channels/unsubscribe':
        if (event.status === 'success' && event.payload?.channel) {
          const channel = (event.payload.channel as string).toLowerCase();
          this._subscribedChannels.delete(channel);
          this.saveState();
        }
        break;

      case 'channels/send':
        if (event.status === 'failure' && event.error) {
          // Could notify the sender of failure
        }
        break;
    }
  }

  /**
   * Handle incoming channel broadcast.
   */
  private handleChannelBroadcast(payload: ChannelBroadcast): void {
    if (!payload) return;

    const { channel, message, game, name } = payload;

    // Call the callback for channel daemon integration
    this.onChannelMessage(channel.toLowerCase(), game, name, message);
  }

  // ========== Event callbacks (to be hooked by channel daemon) ==========

  /**
   * Called when a channel message is received.
   * This will be hooked by the channel daemon.
   */
  onChannelMessage(channel: string, game: string, sender: string, message: string): void {
    // Forward to channel daemon
    try {
      const daemon = efuns.findObject('/daemons/channels') as {
        receiveGrapevineMessage: (
          channel: string,
          game: string,
          sender: string,
          message: string
        ) => void;
      } | null;
      if (daemon) {
        daemon.receiveGrapevineMessage(channel, game, sender, message);
      }
    } catch {
      // Channel daemon not available
    }
  }

  // ========== Persistence ==========

  /**
   * Save daemon state to disk.
   */
  private async saveState(): Promise<void> {
    const state = {
      subscribedChannels: Array.from(this._subscribedChannels),
    };

    try {
      await efuns.writeFile('/data/grapevine-state.json', JSON.stringify(state, null, 2));
    } catch {
      // Ignore save errors
    }
  }

  /**
   * Load daemon state from disk.
   */
  private async loadState(): Promise<void> {
    try {
      const content = await efuns.readFile('/data/grapevine-state.json');
      const state = JSON.parse(content);

      if (Array.isArray(state.subscribedChannels)) {
        this._subscribedChannels = new Set(state.subscribedChannels);
      }
    } catch {
      // No saved state, use defaults from config
      if (this._config?.defaultChannels) {
        this._subscribedChannels = new Set(
          this._config.defaultChannels.map((c) => c.toLowerCase())
        );
      }
    }
  }
}

// Singleton - set by constructor or getGrapevineDaemon
let grapevineDaemonInstance: GrapevineDaemon | null = null;

/**
 * Set the singleton instance. Called internally.
 */
export function setGrapevineDaemonInstance(instance: GrapevineDaemon): void {
  grapevineDaemonInstance = instance;
}

export function getGrapevineDaemon(): GrapevineDaemon {
  if (!grapevineDaemonInstance) {
    grapevineDaemonInstance = new GrapevineDaemon();
  }
  return grapevineDaemonInstance;
}

export function resetGrapevineDaemon(): void {
  grapevineDaemonInstance = null;
}
