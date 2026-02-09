/**
 * Global efuns type declarations for the mudlib.
 *
 * Efuns (external functions) are provided by the driver and available
 * as a global `efuns` object in all mudlib code.
 *
 * This file provides TypeScript type information so you don't need to
 * declare efuns at the top of every file.
 */

import type { MudObject } from './std/object.js';
import type { SoundCategory } from './lib/sound-types.js';

/**
 * Player save data structure.
 */
interface PlayerSaveData {
  name: string;
  passwordHash: string;
  properties: Record<string, unknown>;
  inventory?: string[];
  equipment?: Record<string, string>;
  createdAt: number;
  lastLogin: number;
}

/**
 * Pager options for displaying long content.
 */
interface PageOptions {
  linesPerPage?: number;
  title?: string;
  showLineNumbers?: boolean;
  onExit?: () => void;
}

/**
 * IDE message for client communication.
 */
interface IdeMessage {
  action: 'open' | 'save-result' | 'error' | 'close';
  path?: string;
  content?: string;
  readOnly?: boolean;
  language?: string;
  success?: boolean;
  errors?: Array<{ line: number; column: number; message: string }>;
  message?: string;
  /** Mode for custom button text: 'bug' shows "Submit Bug" instead of "Save" */
  mode?: 'bug';
}

/**
 * GUI message for modal dialogs.
 * Full types are in lib/gui-types.ts
 */
interface GUIMessage {
  action: string;
  [key: string]: unknown;
}

/**
 * NPC AI context for configuring AI-powered dialogue.
 */
interface NPCAIContext {
  name: string;
  personality: string;
  background: string;
  currentMood?: string;
  knowledgeScope?: {
    worldLore?: string[];
    localKnowledge?: string[];
    topics?: string[];
    forbidden?: string[];
  };
  speakingStyle?: {
    formality?: 'casual' | 'formal' | 'archaic';
    verbosity?: 'terse' | 'normal' | 'verbose';
    accent?: string;
  };
  maxResponseLength?: number;
}

/**
 * AI generation options.
 */
interface AIGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string;
  /** If true, will continue generating if response is truncated (for long-form content) */
  useContinuation?: boolean;
  /** Maximum continuation requests (default: 2) */
  maxContinuations?: number;
}

/**
 * AI description details.
 */
interface AIDescribeDetails {
  name: string;
  keywords?: string[];
  theme?: string;
  existing?: string;
}

/**
 * AI generation result.
 */
interface AIGenerateResult {
  success: boolean;
  text?: string;
  error?: string;
  cached?: boolean;
}

/**
 * AI image generation result (Nano Banana).
 */
interface AIImageGenerateResult {
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  error?: string;
  cached?: boolean;
}

/**
 * AI description result.
 */
interface AIDescribeResult {
  success: boolean;
  shortDesc?: string;
  longDesc?: string;
  error?: string;
}

/**
 * AI NPC response result.
 */
interface AINpcResponseResult {
  success: boolean;
  response?: string;
  error?: string;
  fallback?: boolean;
}

/**
 * Global efuns object provided by the driver.
 */
declare global {
  const efuns: {
    // ========== Object Efuns ==========

    /** Clone an object from a blueprint path */
    cloneObject(path: string): Promise<MudObject | undefined>;

    /** Destroy an object */
    destruct(object: MudObject): Promise<void>;

    /** Load an object (get blueprint) */
    loadObject(path: string): MudObject | undefined;

    /** Find an object by path or ID */
    findObject(pathOrId: string): MudObject | undefined;

    // ========== Hierarchy Efuns ==========

    /** Get all objects in an object's inventory */
    allInventory(object: MudObject): MudObject[];

    /** Get an object's environment */
    environment(object: MudObject): MudObject | null;

    /** Move an object to a new environment */
    move(object: MudObject, destination: MudObject | null): Promise<boolean>;

    // ========== Player Efuns ==========

    /** Get the current "this object" from context */
    thisObject(): MudObject | null;

    /** Get the current "this player" from context */
    thisPlayer(): MudObject | null;

    /** Get all connected players */
    allPlayers(): MudObject[];

    /** Send a message to an object (typically a player) */
    send(target: MudObject, message: string): void;

    // ========== File Efuns ==========

    /** Read a file's contents */
    readFile(path: string): Promise<string>;

    /** Write content to a file */
    writeFile(path: string, content: string): Promise<void>;

    /** Check if a file exists */
    fileExists(path: string): Promise<boolean>;

    /** Read a directory's contents */
    readDir(path: string): Promise<string[]>;

    /** Get file information */
    fileStat(path: string): Promise<{
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      mtime: Date;
    }>;

    /** Create a directory */
    makeDir(path: string, recursive?: boolean): Promise<void>;

    /** Remove a directory */
    removeDir(path: string, recursive?: boolean): Promise<void>;

    /** Remove a file */
    removeFile(path: string): Promise<void>;

    /** Move/rename a file or directory */
    moveFile(srcPath: string, destPath: string): Promise<void>;

    /** Copy a file */
    copyFileTo(srcPath: string, destPath: string): Promise<void>;

    // ========== Utility Efuns ==========

    /** Get current timestamp in seconds */
    time(): number;

    /** Get current timestamp in milliseconds */
    timeMs(): number;

    /** Get the server's timezone information */
    getTimezone(): { name: string; abbreviation: string; offset: string };

    /** Generate a random integer (0 to max-1) */
    random(max: number): number;

    /** Capitalize a string */
    capitalize(str: string): string;

    /** Split a string into an array */
    explode(str: string, delimiter: string): string[];

    /** Join an array into a string */
    implode(arr: string[], delimiter: string): string;

    /** Trim whitespace from a string */
    trim(str: string): string;

    /** Convert string to lowercase */
    lower(str: string): string;

    /** Convert string to uppercase */
    upper(str: string): string;

    /**
     * Format a string using printf-style format specifiers.
     *
     * Supported specifiers:
     *   %s - String
     *   %d, %i - Integer
     *   %f - Float (default 6 decimal places)
     *   %c - Character
     *   %x, %X - Hexadecimal (lower/upper)
     *   %o - Octal
     *   %b - Binary
     *   %j, %J - JSON (compact/pretty)
     *   %% - Literal percent
     *
     * Modifiers:
     *   - Left-align
     *   + Show sign for positive numbers
     *   0 Zero-pad numbers
     *   # Alternate form (0x, 0o, 0b prefixes)
     *   width - Minimum field width
     *   .prec - Precision (max chars for strings, decimals for floats)
     *   |width| or =width= - Center align
     *
     * @example
     * sprintf("Name: %-20s HP: %d/%d", name, hp, maxHp)
     * sprintf("Gold: %,d", gold)  // with thousands separator
     * sprintf("%|40|s", "TITLE") // centered in 40 chars
     */
    sprintf(format: string, ...args: unknown[]): string;

    /** Convert a timestamp to seconds */
    toSeconds(timestamp: number): number;

    /** Convert a timestamp to milliseconds */
    toMilliseconds(timestamp: number): number;

    /** Format a duration in seconds to human-readable string */
    formatDuration(seconds: number): string;

    /** Format a timestamp to human-readable date string */
    formatDate(timestamp: number): string;

    // ========== Permission Efuns ==========

    /** Check if current player can read a path */
    checkReadPermission(path: string): boolean;

    /** Check if current player can write to a path */
    checkWritePermission(path: string): boolean;

    /** Check if current player is an administrator */
    isAdmin(): boolean;

    /** Check if current player is a builder */
    isBuilder(): boolean;

    /** Check if an object is a Living */
    isLiving(obj: MudObject): boolean;

    /** Check if an object is a Weapon */
    isWeapon(obj: MudObject): boolean;

    /** Check if an object is Armor */
    isArmor(obj: MudObject): boolean;

    /** Check if an object is a Vehicle */
    isVehicle(obj: MudObject): boolean;

    /** Check if an object is a Pet */
    isPet(obj: MudObject): boolean;

    /** Check if an object is a Player */
    isPlayer(obj: MudObject): boolean;

    /** Check if an object is an NPC */
    isNPC(obj: MudObject): boolean;

    /** Get current player's permission level */
    getPermissionLevel(): number;

    /** Get a player's permission level by name */
    getPlayerPermissionLevel(playerName: string): number;

    /** Get current player's domains */
    getDomains(): string[];

    /**
     * Set a player's permission level.
     * Requires admin permission.
     * @param playerName The player's name
     * @param level The permission level (0=player, 1=builder, 2=senior, 3=admin)
     */
    setPermissionLevel(
      playerName: string,
      level: number
    ): { success: boolean; error?: string };

    /**
     * Get the human-readable name for a permission level.
     * @param level The permission level
     */
    getPermissionLevelName(level: number): string;

    /**
     * Hash a password using the driver crypto.
     * Returns format: salt:hash (hex encoded)
     */
    hashPassword(password: string): Promise<string>;

    /**
     * Verify a password against a stored hash.
     */
    verifyPassword(password: string, storedHash: string): Promise<boolean>;

    /**
     * Reverse DNS lookup for an IP address.
     */
    reverseDns(ip: string): Promise<string | null>;

    /**
     * Save permissions to disk.
     * Requires admin permission.
     */
    savePermissions(): Promise<{ success: boolean; error?: string }>;

    /**
     * Add a domain to a builder.
     * Requires admin permission.
     * @param playerName The player's name
     * @param path The domain path
     */
    addDomain(playerName: string, path: string): { success: boolean; error?: string };

    /**
     * Remove a domain from a builder.
     * Requires admin permission.
     * @param playerName The player's name
     * @param path The domain path
     */
    removeDomain(playerName: string, path: string): { success: boolean; error?: string };

    // ========== Role-Based Path Permissions ==========

    /** Get all builder paths */
    getBuilderPaths(): string[];

    /** Get all senior builder paths */
    getSeniorPaths(): string[];

    /** Get all protected paths (admin-only) */
    getProtectedPaths(): string[];

    /** Get all forbidden files */
    getForbiddenFiles(): string[];

    /**
     * Add a builder path.
     * Requires admin permission.
     * @param path The path to add
     */
    addBuilderPath(path: string): { success: boolean; error?: string };

    /**
     * Remove a builder path.
     * Requires admin permission.
     * @param path The path to remove
     */
    removeBuilderPath(path: string): { success: boolean; error?: string };

    /**
     * Add a senior builder path.
     * Requires admin permission.
     * @param path The path to add
     */
    addSeniorPath(path: string): { success: boolean; error?: string };

    /**
     * Remove a senior builder path.
     * Requires admin permission.
     * @param path The path to remove
     */
    removeSeniorPath(path: string): { success: boolean; error?: string };

    /**
     * Add a protected path (admin-only).
     * Requires admin permission.
     * @param path The path to add
     */
    addProtectedPath(path: string): { success: boolean; error?: string };

    /**
     * Remove a protected path.
     * Requires admin permission.
     * @param path The path to remove
     */
    removeProtectedPath(path: string): { success: boolean; error?: string };

    /**
     * Add a forbidden file.
     * Requires admin permission.
     * @param path The file path to add
     */
    addForbiddenFile(path: string): { success: boolean; error?: string };

    /**
     * Remove a forbidden file.
     * Requires admin permission.
     * @param path The file path to remove
     */
    removeForbiddenFile(path: string): { success: boolean; error?: string };

    // ========== Guild Command Path Efuns ==========

    /**
     * Add a command path for a player when joining a guild.
     * This does NOT require admin permission - it's for guild daemon use.
     * The path must start with "guilds/" to prevent abuse.
     * @param playerName The player's name
     * @param path The command path (must start with "guilds/")
     */
    guildAddCommandPath(
      playerName: string,
      path: string
    ): { success: boolean; error?: string };

    /**
     * Remove a command path from a player when leaving a guild.
     * This does NOT require admin permission - it's for guild daemon use.
     * The path must start with "guilds/" to prevent abuse.
     * @param playerName The player's name
     * @param path The command path (must start with "guilds/")
     */
    guildRemoveCommandPath(
      playerName: string,
      path: string
    ): { success: boolean; error?: string };

    // ========== Scheduler Efuns ==========

    /** Set heartbeat for an object */
    setHeartbeat(object: MudObject, enable: boolean): void;

    /** Schedule a delayed callback */
    callOut(callback: () => void | Promise<void>, delayMs: number): number;

    /** Cancel a scheduled callback */
    removeCallOut(id: number): boolean;

    // ========== Connection Efuns ==========

    /** Bind a player object to a connection */
    bindPlayerToConnection(connection: unknown, player: MudObject): void;

    /** Find a connected player by name */
    findConnectedPlayer(name: string): MudObject | undefined;

    /** Transfer a connection to an existing player (session takeover) */
    transferConnection(connection: unknown, player: MudObject): void;

    /** Find an active player by name (in game world, possibly disconnected) */
    findActivePlayer(name: string): MudObject | undefined;

    /** Register a player as active in the game world */
    registerActivePlayer(player: MudObject): void;

    /** Unregister a player from the active players list */
    unregisterActivePlayer(player: MudObject): void;

    /** Execute a command through the command manager */
    executeCommand(player: MudObject, input: string, level?: number): Promise<boolean>;

    // ========== Persistence Efuns ==========

    /** Save a player to disk */
    savePlayer(player: MudObject): Promise<void>;

    /** Load a player's saved data */
    loadPlayerData(name: string): Promise<PlayerSaveData | null>;

    /** Check if a player save exists */
    playerExists(name: string): Promise<boolean>;

    /** List all saved player names */
    listPlayers(): Promise<string[]>;

    // ========== Hot Reload Efuns ==========

    /** Reload an object from disk (for class-based objects) */
    reloadObject(path: string): Promise<{
      success: boolean;
      error?: string;
      existingClones: number;
      migratedObjects?: number;
    }>;

    /** Reload a command from disk */
    reloadCommand(path: string): Promise<{
      success: boolean;
      error?: string;
    }>;

    /** Rehash all commands */
    rehashCommands(): Promise<{
      success: boolean;
      error?: string;
      commandCount: number;
    }>;

    // ========== Paging Efuns ==========

    /** Display content with Linux-style paging */
    page(content: string | string[], options?: PageOptions): void;

    // ========== IDE Efuns ==========

    /** Send an IDE message to the client */
    ideOpen(message: IdeMessage): void;

    // ========== GUI Efuns ==========

    /** Send a GUI message to the client to open/update/close modals */
    guiSend(message: GUIMessage): void;

    /**
     * Send quest panel update to the client.
     * Updates the client's quest sidebar with the provided quest data.
     * @param quests Array of quest data (max 3 shown, most recent first)
     * @param targetPlayer Optional player to send to (uses context.thisPlayer if not provided)
     */
    sendQuestUpdate(
      quests: Array<{
        questId: string;
        name: string;
        progress: number;
        progressText: string;
        status: 'active' | 'completed';
      }>,
      targetPlayer?: MudObject
    ): void;

    /**
     * Send a communication message to a player's comm panel.
     * Used for say/tell/channel messages to populate the communications panel.
     * @param targetPlayer The player to send to
     * @param message The communication message
     */
    sendComm(
      targetPlayer: MudObject,
      message: {
        type: 'comm';
        commType: 'say' | 'tell' | 'channel';
        sender: string;
        message: string;
        channel?: string;
        recipients?: string[];
        timestamp: number;
        isSender?: boolean;
      }
    ): void;

    // ========== Sound Efuns ==========

    /**
     * Play a sound once on the target player's client.
     *
     * The category determines which indicator is shown in the UI and which
     * toggle controls playback.
     *
     * Sound resolution (in order):
     * 1. Predefined sounds (e.g., 'hit' -> 'sounds/combat-hit.mp3')
     * 2. Custom filename with .mp3 (e.g., 'custom.mp3' -> 'sounds/custom.mp3')
     * 3. Path-style (e.g., 'custom/boom' -> 'sounds/custom/boom.mp3')
     * 4. Default pattern (e.g., 'explosion' -> 'sounds/{category}-explosion.mp3')
     *
     * @param targetPlayer The player to send the sound to
     * @param category The sound category - controls UI indicator and enable toggle
     * @param sound Sound name, filename, or path
     * @param options Optional settings (volume 0.0-1.0, id for tracking)
     *
     * @example
     * // Predefined sound
     * playSound(player, 'combat', 'hit');
     *
     * @example
     * // Custom sound with combat indicator
     * playSound(player, 'combat', 'boss-roar.mp3');
     *
     * @example
     * // Custom path with spell indicator
     * playSound(player, 'spell', 'fire/explosion');
     */
    playSound(
      targetPlayer: MudObject,
      category: SoundCategory,
      sound: string,
      options?: { volume?: number; id?: string }
    ): void;

    /**
     * Loop a sound continuously on the target player's client.
     * Must provide an id to stop the sound later.
     *
     * The category determines which indicator is shown in the UI and which
     * toggle controls playback.
     *
     * Sound resolution (same as playSound):
     * 1. Predefined sounds
     * 2. Custom filename with .mp3
     * 3. Path-style
     * 4. Default pattern
     *
     * @param targetPlayer The player to send the sound to
     * @param category The sound category - controls UI indicator and enable toggle
     * @param sound Sound name, filename, or path
     * @param id Unique ID to identify this looping sound (required for stopping)
     * @param options Optional settings (volume 0.0-1.0)
     *
     * @example
     * // Predefined ambient loop
     * loopSound(player, 'ambient', 'rain', 'room-weather', { volume: 0.3 });
     *
     * @example
     * // Custom loop with ambient indicator
     * loopSound(player, 'ambient', 'dungeon/dripping.mp3', 'room-ambience');
     */
    loopSound(
      targetPlayer: MudObject,
      category: SoundCategory,
      sound: string,
      id: string,
      options?: { volume?: number }
    ): void;

    /**
     * Stop a playing/looping sound on the target player's client.
     * If no id is provided, stops all sounds in the category.
     * @param targetPlayer The player to send the stop command to
     * @param category The sound category
     * @param id Optional ID of specific sound to stop (omit to stop all in category)
     */
    stopSound(
      targetPlayer: MudObject,
      category: SoundCategory,
      id?: string
    ): void;

    // ========== Config Efuns ==========

    /**
     * Get a mud-wide configuration value.
     * @param key The setting key (e.g., 'disconnect.timeoutMinutes')
     * @returns The value, or undefined if not found
     */
    getMudConfig<T = unknown>(key: string): T | undefined;

    /**
     * Set a mud-wide configuration value.
     * Requires admin permission.
     * @param key The setting key
     * @param value The new value
     * @returns Object with success status and optional error message
     */
    setMudConfig(key: string, value: unknown): { success: boolean; error?: string };

    // ========== Stats Efuns ==========

    /**
     * Shutdown the server (hard restart).
     * Should only be called from privileged code (senior+ commands).
     * @param reason Optional reason for shutdown
     * @returns Object with success status
     */
    shutdown(reason?: string): { success: boolean; error?: string };

    /**
     * Get server uptime.
     * Available to all players.
     * @returns Object containing uptime in seconds and formatted string
     */
    getUptime(): { seconds: number; formatted: string };

    /**
     * Get driver statistics including memory, objects, scheduler, and performance metrics.
     * Requires senior builder permission (level 2) or higher.
     * @returns Object containing driver statistics or error if permission denied
     */
    getDriverStats(): {
      success: boolean;
      error?: string;
      memory?: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
        arrayBuffers: number;
      };
      uptime?: {
        seconds: number;
        formatted: string;
      };
      objects?: {
        total: number;
        blueprints: number;
        clones: number;
      };
      scheduler?: {
        heartbeats: number;
        callouts: number;
        heartbeatInterval: number;
      };
      commands?: {
        total: number;
      };
      players?: {
        active: number;
        connected: number;
      };
      nodeVersion?: string;
      platform?: string;
    };

    /**
     * Get detailed object statistics from the registry.
     * Requires builder permission (level 1) or higher.
     * @returns Object containing detailed object counts
     */
    getObjectStats(): {
      success: boolean;
      error?: string;
      totalObjects?: number;
      blueprints?: number;
      clones?: number;
      byType?: Record<string, number>;
      largestInventories?: Array<{ objectId: string; count: number }>;
      blueprintCloneCounts?: Array<{ path: string; clones: number }>;
    };

    /**
     * Get current memory usage statistics.
     * Requires builder permission (level 1) or higher.
     * @returns Object containing memory usage details
     */
    getMemoryStats(): {
      success: boolean;
      error?: string;
      heapUsed?: number;
      heapTotal?: number;
      external?: number;
      rss?: number;
      arrayBuffers?: number;
      heapUsedMb?: number;
      heapTotalMb?: number;
      rssMb?: number;
    };

    /**
     * Get performance metrics including timing histograms and slow operations.
     * Requires admin permission (level 3).
     * @returns Object containing performance metrics snapshot
     */
    getPerformanceMetrics(): {
      success: boolean;
      error?: string;
      heartbeats?: { avg: number; p95: number; p99: number; max: number; count: number };
      callOuts?: { avg: number; p95: number; p99: number; max: number; count: number };
      commands?: { avg: number; p95: number; p99: number; max: number; count: number };
      isolateAcquireWaits?: number;
      isolateQueueLength?: number;
      backpressureEvents?: number;
      droppedMessages?: number;
      slowOperations?: Array<{
        timestamp: number;
        type: string;
        identifier: string;
        durationMs: number;
      }>;
      uptimeMs?: number;
      efunTimingEnabled?: boolean;
    };

    /**
     * Set performance metrics options.
     * Requires admin permission (level 3).
     * @param option The option to set ('efunTiming')
     * @param value The value to set
     * @returns Object with success status
     */
    setPerformanceMetricsOption(
      option: string,
      value: boolean
    ): { success: boolean; error?: string };

    /**
     * Clear all performance metrics.
     * Requires admin permission (level 3).
     * @returns Object with success status
     */
    clearPerformanceMetrics(): { success: boolean; error?: string };

    // ========== AI Efuns ==========

    /** Check if Claude AI is configured and available */
    aiAvailable(): boolean;

    /**
     * Generate text using Claude AI.
     * @param prompt The prompt/instruction
     * @param context Optional context (world lore, NPC background, etc.)
     * @param options Optional configuration
     */
    aiGenerate(
      prompt: string,
      context?: string,
      options?: AIGenerateOptions
    ): Promise<AIGenerateResult>;

    /**
     * Generate a description for a room, item, or NPC.
     * @param type The object type
     * @param details Details about what to describe
     * @param style Optional style hints
     */
    aiDescribe(
      type: 'room' | 'item' | 'npc' | 'weapon' | 'armor',
      details: AIDescribeDetails,
      style?: 'verbose' | 'concise' | 'atmospheric'
    ): Promise<AIDescribeResult>;

    /**
     * Get an NPC response using AI with conversation history.
     * @param npcContext The NPC's context/personality
     * @param playerMessage What the player said
     * @param conversationHistory Previous messages in this conversation
     */
    aiNpcResponse(
      npcContext: NPCAIContext,
      playerMessage: string,
      conversationHistory?: Array<{ role: 'player' | 'npc'; content: string }>
    ): Promise<AINpcResponseResult>;

    /** Check if Gemini AI (Nano Banana) image generation is configured and available */
    aiImageAvailable(): boolean;

    /**
     * Generate an image using Gemini AI (Nano Banana).
     * @param prompt Description of the image to generate
     * @param options Optional configuration (aspectRatio)
     */
    aiImageGenerate(
      prompt: string,
      options?: { aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9' }
    ): Promise<AIImageGenerateResult>;

    // ========== Intermud 3 Efuns ==========

    /** Check if I3 is connected */
    i3IsConnected(): boolean;

    /** Get I3 connection state */
    i3GetState(): string;

    /** Get current I3 router name */
    i3GetRouter(): string | null;

    /** Get all configured I3 routers */
    i3GetRouters(): Array<{ name: string; host: string; port: number }>;

    /** Get the current router index */
    i3GetCurrentRouterIndex(): number;

    /**
     * Switch to a different router by index.
     * @param index The router index to switch to
     * @returns true if switch was initiated
     */
    i3SwitchRouter(index: number): Promise<boolean>;

    /**
     * Switch to a different router by name.
     * @param name The router name to switch to (e.g., "*dalet", "*i4")
     * @returns true if switch was initiated
     */
    i3SwitchRouterByName(name: string): Promise<boolean>;

    /**
     * Send a packet to the I3 network.
     * @param packet The LPC packet array to send
     * @returns true if sent successfully, false otherwise
     */
    i3Send(packet: unknown[]): boolean;

    /**
     * Register a callback to receive I3 packets.
     * @param callback Function to call when a packet is received
     */
    i3OnPacket(callback: (packet: unknown[]) => void): void;

    // ========== Snoop Efuns ==========

    /**
     * Register a snoop session. The snooper will see all messages received by the target.
     * @param snooper The player doing the snooping
     * @param target The object being snooped
     * @returns true if successful
     */
    snoopRegister(snooper: MudObject, target: MudObject): boolean;

    /**
     * Unregister a snoop session.
     * @param snooper The player to stop snooping
     */
    snoopUnregister(snooper: MudObject): void;

    /**
     * Forward a message to all snoopers of a target.
     * Called from Living.receive() to forward messages.
     * @param target The object that received the message
     * @param message The message that was received
     */
    snoopForward(target: MudObject, message: string): void;

    /**
     * Get the target being snooped by a snooper.
     * @param snooper The player doing the snooping
     * @returns The target's objectId, or null if not snooping
     */
    snoopGetTarget(snooper: MudObject): string | null;

    /**
     * Check if a target is being snooped.
     * @param target The object to check
     * @returns Array of snooper objectIds
     */
    snoopGetSnoopers(target: MudObject): string[];

    /**
     * Handle when a snooped target disconnects or is destroyed.
     * Cleans up all snoop sessions for this target.
     * @param target The target that disconnected
     */
    snoopTargetDisconnected(target: MudObject): void;

    // ========== Intermud 2 Efuns ==========

    /** Check if I2 is ready */
    i2IsReady(): boolean;

    /** Get all known I2 MUDs */
    i2GetMudList(): Array<{ name: string; host: string; port: number; udpPort: number; lastSeen: number }>;

    /** Get I2 MUDs seen recently */
    i2GetOnlineMuds(): Array<{ name: string; host: string; port: number; udpPort: number; lastSeen: number }>;

    /** Get info for a specific I2 MUD */
    i2GetMudInfo(name: string): { name: string; host: string; port: number; udpPort: number; lastSeen: number } | null;

    /**
     * Send an I2 message to a specific host/port.
     */
    i2Send(message: I2Message, host: string, port: number): boolean;

    /**
     * Send an I2 message to a MUD by name.
     */
    i2SendToMud(message: I2Message, mudName: string): boolean;

    /**
     * Broadcast an I2 message to all known MUDs.
     */
    i2Broadcast(message: I2Message): void;

    /**
     * Register a callback to receive I2 messages.
     */
    i2OnMessage(callback: (message: I2Message, rinfo: { address: string; port: number }) => void): void;

    /**
     * Seed I2 mudlist from I3 data.
     * Copies MUDs with UDP ports from the I3 network to the I2 mudlist.
     * @returns Number of MUDs added
     */
    i2SeedFromI3(): number;

    // ========== GitHub Efuns ==========

    /** Check if GitHub issue creation is configured and available */
    githubAvailable(): boolean;

    /**
     * Create a GitHub issue for bug reports.
     * Available to all players - no special permission required.
     * @param title Issue title
     * @param body Issue body (markdown)
     * @param labels Labels to apply (default: ["bug", "in-game-report"])
     */
    githubCreateIssue(
      title: string,
      body: string,
      labels?: string[]
    ): Promise<{ success: boolean; url?: string; issueNumber?: number; error?: string }>;

    // ========== Giphy Efuns ==========

    /** Check if Giphy GIF sharing is configured and available */
    giphyAvailable(): boolean;

    /**
     * Search for a GIF on Giphy.
     * @param query The search query
     * @returns Search result with URL and title, or error
     */
    giphySearch(query: string): Promise<{
      success: boolean;
      url?: string;
      title?: string;
      error?: string;
    }>;

    /** Generate a unique ID for a GIF share */
    giphyGenerateId(): string;

    /**
     * Cache a GIF for later retrieval via clickable link.
     * @param id Unique GIF ID
     * @param data GIF data including URL, sender, channel, query
     */
    giphyCacheGif(id: string, data: {
      url: string;
      title: string;
      senderName: string;
      channelName: string;
      query: string;
    }): void;

    /**
     * Retrieve a cached GIF by ID.
     * @param id GIF ID to look up
     * @returns Cached GIF data or undefined if not found/expired
     */
    giphyGetCachedGif(id: string): {
      url: string;
      title: string;
      senderName: string;
      channelName: string;
      query: string;
      expiresAt: number;
    } | undefined;

    // ========== Discord Efuns ==========

    /** Check if Discord is connected */
    discordIsConnected(): boolean;

    /** Get Discord connection state */
    discordGetState(): string;

    /** Get Discord configuration */
    discordGetConfig(): { guildId: string; channelId: string } | null;

    /**
     * Connect to Discord with the given configuration.
     * @param config Connection configuration with token, guildId, and channelId
     * @returns true if connected successfully
     */
    discordConnect(config: {
      token: string;
      guildId: string;
      channelId: string;
    }): Promise<boolean>;

    /** Disconnect from Discord */
    discordDisconnect(): Promise<void>;

    /**
     * Send a message to Discord.
     * @param playerName The name of the player sending the message
     * @param message The message content
     * @returns true if sent successfully
     */
    discordSend(playerName: string, message: string): Promise<boolean>;

    /**
     * Register a callback to receive Discord messages.
     * @param callback Function to call when a Discord message is received
     */
    discordOnMessage(callback: (author: string, content: string) => void): void;
  };
}

/**
 * I2 message structure for Intermud 2 protocol.
 */
interface I2Message {
  command: string;
  params: Record<string, string | string[]>;
}

export {};
