/**
 * Bot Daemon - Manages simulated player bots.
 *
 * Handles bot lifecycle, scheduling, and persistence.
 * Bots appear as real players - logging in/out, moving through the world,
 * chatting on channels, and appearing idle at points of interest.
 */

import { MudObject } from '../std/object.js';
import { Bot, type BotPersonality } from '../std/bot.js';
import { getConfigDaemon } from './config.js';

/**
 * Bot status for display.
 */
export interface BotStatus {
  id: string;
  name: string;
  online: boolean;
  level: number;
  race: string;
  guild: string;
  location?: string;
}

/**
 * Bot Daemon class.
 */
export class BotDaemon extends MudObject {
  private _enabled: boolean = false;
  private _activeBots: Map<string, Bot> = new Map();
  private _botPersonalities: Map<string, BotPersonality> = new Map();
  private _loginTimers: Map<string, number> = new Map();
  private _initialized: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Bot Daemon';
    this.longDesc = 'The bot daemon manages simulated player bots.';

    // Register singleton
    setBotDaemonInstance(this);
  }

  /**
   * Initialize the bot daemon.
   * Loads personalities from disk and optionally starts the system.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    // Load saved personalities
    await this.loadPersonalities();

    // Check if we should auto-enable
    const configDaemon = getConfigDaemon();
    const shouldEnable = configDaemon.get<boolean>('bots.enabled');

    if (shouldEnable) {
      await this.enable();
    }

    this._initialized = true;
    console.log('[BotDaemon] Initialized');
  }

  /**
   * Enable the bot system.
   */
  async enable(): Promise<{ success: boolean; error?: string }> {
    if (this._enabled) {
      return { success: true };
    }

    this._enabled = true;

    // Save enabled state
    const configDaemon = getConfigDaemon();
    configDaemon.set('bots.enabled', true);
    await configDaemon.save();

    // Schedule initial logins
    this.scheduleRandomLogins();

    console.log('[BotDaemon] Bot system enabled');
    return { success: true };
  }

  /**
   * Disable the bot system.
   */
  async disable(): Promise<void> {
    this._enabled = false;

    // Clear all login timers
    for (const timerId of this._loginTimers.values()) {
      if (typeof efuns !== 'undefined' && efuns.removeCallOut) {
        efuns.removeCallOut(timerId);
      }
    }
    this._loginTimers.clear();

    // Log out all active bots
    for (const bot of this._activeBots.values()) {
      await bot.forceLogout();
    }
    this._activeBots.clear();

    // Save disabled state
    const configDaemon = getConfigDaemon();
    configDaemon.set('bots.enabled', false);
    await configDaemon.save();

    console.log('[BotDaemon] Bot system disabled');
  }

  /**
   * Create a new bot with an AI-generated personality.
   */
  async createBot(): Promise<{ success: boolean; bot?: BotPersonality; error?: string }> {
    // Generate a unique ID
    const id = `bot_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    // Generate personality using AI or fallback
    let personality: BotPersonality;

    if (typeof efuns !== 'undefined' && efuns.aiGenerate) {
      try {
        const prompt = `Generate a fantasy MUD character personality as JSON. Include:
- name: A fantasy-appropriate first name only (no titles)
- race: One of "human", "elf", "dwarf", "halfling", "orc"
- guild: One of "fighter", "mage", "cleric", "rogue", "ranger"
- level: A number between 5 and 25
- stats: An object with str, dex, con, int, wis, cha (each 8-18, appropriate for race/guild)
- longDesc: A 2-3 sentence physical description
- personality: A brief description of their demeanor and quirks
- playerType: One of "explorer", "socializer", "achiever", "casual"
- chatStyle: How they write messages (formal, casual, uses slang, etc.)
- interests: An array of 3-5 topics they might discuss

Return only valid JSON, no markdown formatting.`;

        const result = await efuns.aiGenerate(prompt);
        if (result && result.success && result.text) {
          const parsed = JSON.parse(result.text);
          personality = {
            id,
            name: parsed.name,
            race: parsed.race,
            guild: parsed.guild,
            level: parsed.level,
            stats: parsed.stats,
            longDesc: parsed.longDesc,
            personality: parsed.personality,
            playerType: parsed.playerType,
            chatStyle: parsed.chatStyle,
            interests: parsed.interests,
            createdAt: Date.now(),
          };
        } else {
          personality = this.generateFallbackPersonality(id);
        }
      } catch (error) {
        console.error('[BotDaemon] AI generation failed:', error);
        personality = this.generateFallbackPersonality(id);
      }
    } else {
      personality = this.generateFallbackPersonality(id);
    }

    // Generate AI portrait for the bot
    const portrait = await this.generateBotPortrait(personality);
    if (portrait) {
      personality.profilePortrait = portrait;
    }

    // Save personality
    this._botPersonalities.set(id, personality);
    await this.savePersonality(personality);

    console.log(`[BotDaemon] Created bot: ${personality.name} (${id})`);
    return { success: true, bot: personality };
  }

  /**
   * Generate an AI portrait for a bot based on their personality.
   */
  private async generateBotPortrait(personality: BotPersonality): Promise<string | null> {
    if (typeof efuns === 'undefined' || !efuns.aiImageAvailable?.()) {
      console.log('[BotDaemon] AI image generation not available, skipping portrait');
      return null;
    }

    try {
      // Build a portrait prompt from the bot's personality
      const prompt = `Create a portrait for a fantasy RPG character.

CHARACTER DESCRIPTION:
${personality.longDesc}

Race: ${personality.race}
Class/Guild: ${personality.guild}
Level: ${personality.level}
Demeanor: ${personality.personality}

Style requirements:
- Fantasy portrait art style with rich colors
- Portrait/headshot composition showing face and upper body
- Dramatic lighting with atmospheric mood
- Painterly texture suitable for a game character portrait
- Professional quality, detailed and polished
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`;

      const result = await efuns.aiImageGenerate(prompt, {
        aspectRatio: '1:1',
      });

      if (result && result.success && result.imageBase64 && result.mimeType) {
        const dataUri = `data:${result.mimeType};base64,${result.imageBase64}`;
        console.log(`[BotDaemon] Generated portrait for ${personality.name}`);
        return dataUri;
      }

      return null;
    } catch (error) {
      console.error('[BotDaemon] Portrait generation failed:', error);
      return null;
    }
  }

  /**
   * Generate a fallback personality without AI.
   */
  private generateFallbackPersonality(id: string): BotPersonality {
    const names = [
      'Aldric', 'Brynn', 'Cedric', 'Dara', 'Elwin', 'Fern', 'Galen', 'Hazel',
      'Iris', 'Jasper', 'Kira', 'Linden', 'Mira', 'Nolan', 'Opal', 'Penn',
      'Quinn', 'Rowan', 'Sage', 'Theron', 'Uma', 'Vance', 'Wren', 'Xander',
    ];
    const races = ['human', 'elf', 'dwarf', 'halfling', 'orc'];
    const guilds = ['fighter', 'mage', 'cleric', 'rogue', 'ranger'];
    const playerTypes: ('explorer' | 'socializer' | 'achiever' | 'casual')[] = ['explorer', 'socializer', 'achiever', 'casual'];
    const chatStyles = [
      'Speaks formally with proper grammar.',
      'Uses casual, friendly language.',
      'Tends to be brief and to the point.',
      'Asks lots of questions.',
      'Often makes jokes and puns.',
    ];
    const allInterests = [
      'ancient history', 'rare weapons', 'spell components', 'treasure hunting',
      'guild politics', 'tavern stories', 'monster lore', 'crafting',
      'exploration', 'combat tactics', 'magical artifacts', 'dungeon delving',
    ];

    const name = names[Math.floor(Math.random() * names.length)]!;
    const race = races[Math.floor(Math.random() * races.length)]!;
    const guild = guilds[Math.floor(Math.random() * guilds.length)]!;
    const level = 5 + Math.floor(Math.random() * 21);
    const playerType = playerTypes[Math.floor(Math.random() * playerTypes.length)]!;
    const chatStyle = chatStyles[Math.floor(Math.random() * chatStyles.length)]!;

    // Pick 3-5 random interests
    const shuffled = [...allInterests].sort(() => Math.random() - 0.5);
    const interests = shuffled.slice(0, 3 + Math.floor(Math.random() * 3));

    // Generate stats appropriate for guild
    const statBases: Record<string, Record<string, number>> = {
      fighter: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      mage: { str: 8, dex: 12, con: 10, int: 16, wis: 14, cha: 10 },
      cleric: { str: 12, dex: 10, con: 12, int: 10, wis: 16, cha: 12 },
      rogue: { str: 10, dex: 16, con: 12, int: 12, wis: 10, cha: 12 },
      ranger: { str: 12, dex: 14, con: 12, int: 10, wis: 14, cha: 10 },
    };
    const base = statBases[guild] || statBases['fighter']!;
    const stats = {
      str: base['str']! + Math.floor(Math.random() * 5) - 2,
      dex: base['dex']! + Math.floor(Math.random() * 5) - 2,
      con: base['con']! + Math.floor(Math.random() * 5) - 2,
      int: base['int']! + Math.floor(Math.random() * 5) - 2,
      wis: base['wis']! + Math.floor(Math.random() * 5) - 2,
      cha: base['cha']! + Math.floor(Math.random() * 5) - 2,
    };

    const descriptions = [
      `A ${race} of average build with keen eyes that seem to take in everything.`,
      `This ${race} carries themselves with quiet confidence, their ${guild} training evident.`,
      `A weathered ${race} who looks like they've seen many adventures.`,
      `An eager-looking ${race} with the bearing of an experienced ${guild}.`,
    ];
    const longDesc = descriptions[Math.floor(Math.random() * descriptions.length)]!;

    const personalities = [
      'Friendly and always willing to help newcomers.',
      'Quiet and observant, speaks only when necessary.',
      'Enthusiastic about adventure and new discoveries.',
      'Cautious and methodical in their approach.',
      'Good-humored with a quick wit.',
    ];
    const personality = personalities[Math.floor(Math.random() * personalities.length)]!;

    return {
      id,
      name,
      race,
      guild,
      level,
      stats,
      longDesc,
      personality,
      playerType,
      chatStyle,
      interests,
      createdAt: Date.now(),
    };
  }

  /**
   * Delete a bot permanently.
   */
  async deleteBot(botId: string): Promise<{ success: boolean; error?: string }> {
    const personality = this._botPersonalities.get(botId);
    if (!personality) {
      return { success: false, error: 'Bot not found' };
    }

    // If online, log them out first
    const bot = this._activeBots.get(botId);
    if (bot) {
      await bot.forceLogout();
      this._activeBots.delete(botId);
    }

    // Clear any pending login timer
    const timerId = this._loginTimers.get(botId);
    if (timerId && typeof efuns !== 'undefined' && efuns.removeCallOut) {
      efuns.removeCallOut(timerId);
      this._loginTimers.delete(botId);
    }

    // Remove personality
    this._botPersonalities.delete(botId);

    // Delete from disk
    if (typeof efuns !== 'undefined' && efuns.deleteData) {
      try {
        await efuns.deleteData('bots', botId);
      } catch {
        // Data might not exist
      }
    }

    console.log(`[BotDaemon] Deleted bot: ${personality.name} (${botId})`);
    return { success: true };
  }

  /**
   * Log in a specific bot.
   */
  async loginBot(botId: string): Promise<{ success: boolean; error?: string }> {
    const personality = this._botPersonalities.get(botId);
    if (!personality) {
      return { success: false, error: 'Bot not found' };
    }

    // Check if already online
    if (this._activeBots.has(botId)) {
      return { success: false, error: 'Bot is already online' };
    }

    // Check max bots
    const configDaemon = getConfigDaemon();
    const maxBots = configDaemon.get<number>('bots.maxBots') ?? 5;
    if (this._activeBots.size >= maxBots) {
      return { success: false, error: `Maximum bots (${maxBots}) already online` };
    }

    // Create bot instance
    const bot = new Bot();
    bot.initializeWithPersonality(personality);

    // Move to a starting location
    const startRoom = await this.findStartingRoom();
    if (startRoom) {
      await bot.moveTo(startRoom);
    }

    // Calculate session duration
    const minMinutes = configDaemon.get<number>('bots.minOnlineMinutes') ?? 15;
    const maxMinutes = configDaemon.get<number>('bots.maxOnlineMinutes') ?? 120;
    const sessionMinutes = minMinutes + Math.floor(Math.random() * (maxMinutes - minMinutes));

    // Initialize bot
    await bot.onBotLogin(sessionMinutes);

    // Track as active
    this._activeBots.set(botId, bot);

    // Register with driver's player tracking
    if (typeof efuns !== 'undefined' && efuns.registerActivePlayer) {
      efuns.registerActivePlayer(bot);
    }

    console.log(`[BotDaemon] Bot logged in: ${personality.name} (session: ${sessionMinutes}min)`);
    return { success: true };
  }

  /**
   * Log out a specific bot.
   */
  async logoutBot(botId: string): Promise<{ success: boolean; error?: string }> {
    const bot = this._activeBots.get(botId);
    if (!bot) {
      return { success: false, error: 'Bot is not online' };
    }

    await bot.forceLogout();
    return { success: true };
  }

  /**
   * Handle when a bot logs itself out (natural session end).
   */
  handleBotLogout(botId: string): void {
    const bot = this._activeBots.get(botId);
    if (bot) {
      // Unregister from driver
      if (typeof efuns !== 'undefined' && efuns.unregisterActivePlayer) {
        efuns.unregisterActivePlayer(bot);
      }
    }

    this._activeBots.delete(botId);

    // If enabled, schedule next login
    if (this._enabled) {
      this.scheduleLogin(botId);
    }
  }

  /**
   * Find a suitable starting room for a bot.
   */
  private async findStartingRoom(): Promise<MudObject | null> {
    // Prefer interesting locations
    const preferredLocations = [
      '/areas/valdoria/aldric/center',
      '/areas/valdoria/aldric/tavern',
      '/areas/valdoria/aldric/market',
      '/areas/valdoria/aldric/guild_hall',
    ];

    if (typeof efuns !== 'undefined' && efuns.loadObject) {
      // Try preferred locations first
      for (const path of preferredLocations) {
        try {
          const room = await efuns.loadObject(path);
          if (room) return room;
        } catch {
          // Location doesn't exist, try next
        }
      }

      // Fall back to center
      try {
        return await efuns.loadObject('/areas/valdoria/aldric/center');
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Schedule random logins for all bots.
   * Spreads logins over a period of time for natural appearance.
   */
  private scheduleRandomLogins(): void {
    const configDaemon = getConfigDaemon();
    const maxBots = configDaemon.get<number>('bots.maxBots') ?? 5;

    // Get list of bots not currently online
    const offlineBots = Array.from(this._botPersonalities.keys()).filter(
      (id) => !this._activeBots.has(id)
    );

    if (offlineBots.length === 0) return;

    // Calculate how many should log in (up to maxBots)
    const currentOnline = this._activeBots.size;
    const slotsAvailable = maxBots - currentOnline;
    const toLogin = Math.min(slotsAvailable, offlineBots.length);

    // Spread logins over 5-15 minutes
    const spreadTimeMs = (5 + Math.random() * 10) * 60 * 1000;

    for (let i = 0; i < toLogin; i++) {
      const botId = offlineBots[i]!;
      const delayMs = (i / toLogin) * spreadTimeMs + Math.random() * 30000;

      this.scheduleLogin(botId, delayMs);
    }
  }

  /**
   * Schedule a bot to log in after a delay.
   */
  private scheduleLogin(botId: string, delayMs?: number): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    // Clear existing timer if any
    const existingTimer = this._loginTimers.get(botId);
    if (existingTimer) {
      efuns.removeCallOut(existingTimer);
    }

    // If no delay specified, use configured offline time
    if (delayMs === undefined) {
      const configDaemon = getConfigDaemon();
      const minMinutes = configDaemon.get<number>('bots.minOfflineMinutes') ?? 30;
      const maxMinutes = configDaemon.get<number>('bots.maxOfflineMinutes') ?? 240;
      delayMs = (minMinutes + Math.random() * (maxMinutes - minMinutes)) * 60 * 1000;
    }

    const timerId = efuns.callOut(async () => {
      this._loginTimers.delete(botId);
      if (this._enabled) {
        await this.loginBot(botId);
      }
    }, delayMs);

    this._loginTimers.set(botId, timerId);
  }

  /**
   * Regenerate a bot's personality.
   */
  async regeneratePersonality(botId: string): Promise<{ success: boolean; bot?: BotPersonality; error?: string }> {
    const existing = this._botPersonalities.get(botId);
    if (!existing) {
      return { success: false, error: 'Bot not found' };
    }

    // If online, log out first
    const bot = this._activeBots.get(botId);
    if (bot) {
      await bot.forceLogout();
      this._activeBots.delete(botId);
    }

    // Delete old personality
    this._botPersonalities.delete(botId);

    // Create new one (will get a new ID)
    return this.createBot();
  }

  /**
   * Configure the bot system.
   */
  async configure(settings: {
    maxBots?: number;
    minOnlineMinutes?: number;
    maxOnlineMinutes?: number;
    minOfflineMinutes?: number;
    maxOfflineMinutes?: number;
    chatFrequencyMinutes?: number;
  }): Promise<{ success: boolean; error?: string }> {
    const configDaemon = getConfigDaemon();

    if (settings.maxBots !== undefined) {
      const result = configDaemon.set('bots.maxBots', settings.maxBots);
      if (!result.success) return result;
    }
    if (settings.minOnlineMinutes !== undefined) {
      const result = configDaemon.set('bots.minOnlineMinutes', settings.minOnlineMinutes);
      if (!result.success) return result;
    }
    if (settings.maxOnlineMinutes !== undefined) {
      const result = configDaemon.set('bots.maxOnlineMinutes', settings.maxOnlineMinutes);
      if (!result.success) return result;
    }
    if (settings.minOfflineMinutes !== undefined) {
      const result = configDaemon.set('bots.minOfflineMinutes', settings.minOfflineMinutes);
      if (!result.success) return result;
    }
    if (settings.maxOfflineMinutes !== undefined) {
      const result = configDaemon.set('bots.maxOfflineMinutes', settings.maxOfflineMinutes);
      if (!result.success) return result;
    }
    if (settings.chatFrequencyMinutes !== undefined) {
      const result = configDaemon.set('bots.chatFrequencyMinutes', settings.chatFrequencyMinutes);
      if (!result.success) return result;
    }

    await configDaemon.save();
    return { success: true };
  }

  /**
   * Get the status of the bot system.
   */
  getStatus(): {
    enabled: boolean;
    onlineCount: number;
    totalBots: number;
    maxBots: number;
    settings: Record<string, unknown>;
  } {
    const configDaemon = getConfigDaemon();

    return {
      enabled: this._enabled,
      onlineCount: this._activeBots.size,
      totalBots: this._botPersonalities.size,
      maxBots: configDaemon.get<number>('bots.maxBots') ?? 5,
      settings: {
        minOnlineMinutes: configDaemon.get<number>('bots.minOnlineMinutes'),
        maxOnlineMinutes: configDaemon.get<number>('bots.maxOnlineMinutes'),
        minOfflineMinutes: configDaemon.get<number>('bots.minOfflineMinutes'),
        maxOfflineMinutes: configDaemon.get<number>('bots.maxOfflineMinutes'),
        chatFrequencyMinutes: configDaemon.get<number>('bots.chatFrequencyMinutes'),
      },
    };
  }

  /**
   * Get all active (online) bot instances.
   * Used by the driver to include bots in allPlayers() for the who list.
   */
  getActiveBots(): Bot[] {
    return Array.from(this._activeBots.values());
  }

  /**
   * List all bots with their status.
   */
  listBots(): BotStatus[] {
    const statuses: BotStatus[] = [];

    for (const [id, personality] of this._botPersonalities) {
      const bot = this._activeBots.get(id);
      statuses.push({
        id,
        name: personality.name,
        online: !!bot,
        level: personality.level,
        race: personality.race,
        guild: personality.guild,
        location: bot?.environment?.shortDesc || undefined,
      });
    }

    return statuses;
  }

  /**
   * Get detailed info about a specific bot.
   */
  getBotInfo(botId: string): BotPersonality | null {
    return this._botPersonalities.get(botId) || null;
  }

  /**
   * Load personalities from disk.
   */
  async loadPersonalities(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.listDataKeys || !efuns.loadData) return;

    try {
      const keys = await efuns.listDataKeys('bots');
      for (const botId of keys) {
        try {
          const personality = await efuns.loadData<BotPersonality>('bots', botId);
          if (personality) {
            this._botPersonalities.set(personality.id, personality);
          }
        } catch {
          console.error(`[BotDaemon] Failed to load personality: ${botId}`);
        }
      }

      console.log(`[BotDaemon] Loaded ${this._botPersonalities.size} bot personalities`);
    } catch {
      console.log('[BotDaemon] No existing bot personalities found');
    }
  }

  /**
   * Save a personality to disk.
   */
  private async savePersonality(personality: BotPersonality): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.saveData) return;

    try {
      await efuns.saveData('bots', personality.id, personality);
    } catch (error) {
      console.error(`[BotDaemon] Failed to save personality: ${error}`);
    }
  }

  /**
   * Check if this is enabled.
   */
  get isEnabled(): boolean {
    return this._enabled;
  }
}

// Singleton instance
let botDaemon: BotDaemon | null = null;

/**
 * Set the singleton instance. Called from constructor.
 */
export function setBotDaemonInstance(instance: BotDaemon): void {
  botDaemon = instance;
}

/**
 * Get the global BotDaemon instance.
 */
export function getBotDaemon(): BotDaemon {
  if (!botDaemon) {
    botDaemon = new BotDaemon();
  }
  return botDaemon;
}

/**
 * Reset the bot daemon (for testing).
 */
export function resetBotDaemon(): void {
  botDaemon = null;
}

export default BotDaemon;
