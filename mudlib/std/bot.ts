/**
 * Bot - Simulated player class.
 *
 * Bots are simulated players with AI-generated personalities that behave
 * like real players - logging in/out, moving through the world, chatting
 * on channels, and appearing idle at points of interest.
 */

import { Player } from './player.js';
import { MudObject } from './object.js';
import { getChannelDaemon } from '../daemons/channels.js';

/**
 * Bot personality data structure.
 */
export interface BotPersonality {
  id: string;
  name: string;
  race: string;
  guild: string;
  level: number;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  longDesc: string;
  personality: string;
  playerType: 'explorer' | 'socializer' | 'achiever' | 'casual';
  chatStyle: string;
  interests: string[];
  createdAt: number;
  profilePortrait?: string; // AI-generated portrait data URI
}

/**
 * Bot behavior states.
 */
export type BotBehaviorState = 'idle' | 'moving' | 'chatting' | 'exploring';

/**
 * Null connection for bots (they don't have real connections).
 */
const nullConnection = {
  send: () => {},
  sendMap: () => {},
  sendStats: () => {},
  sendGUI: () => {},
  sendCompletion: () => {},
  sendCombat: () => {},
  close: () => {},
  isConnected: () => true,
};

/**
 * Bot class - extends Player with bot-specific behavior.
 */
export class Bot extends Player {
  private _personality: BotPersonality | null = null;
  private _behaviorState: BotBehaviorState = 'idle';
  private _nextActionTimerId: number | null = null;
  private _logoutTimerId: number | null = null;
  private _chatTimerId: number | null = null;
  private _isBot: boolean = true;
  private _sessionStartTime: number = 0;
  private _sessionDurationMinutes: number = 0;

  constructor() {
    super();
    this.shortDesc = 'a bot';
    this.longDesc = 'A simulated player.';
  }

  /**
   * Check if this is a bot.
   */
  get isBot(): boolean {
    return this._isBot;
  }

  /**
   * Get the bot's personality.
   */
  get personality(): BotPersonality | null {
    return this._personality;
  }

  /**
   * Initialize the bot with a personality.
   */
  initializeWithPersonality(personality: BotPersonality): void {
    this._personality = personality;

    // Set up player properties from personality
    this.name = personality.name;
    this.level = personality.level;
    this.longDesc = personality.longDesc;

    // Set stats
    this.setBaseStat('strength', personality.stats.str);
    this.setBaseStat('dexterity', personality.stats.dex);
    this.setBaseStat('constitution', personality.stats.con);
    this.setBaseStat('intelligence', personality.stats.int);
    this.setBaseStat('wisdom', personality.stats.wis);
    this.setBaseStat('charisma', personality.stats.cha);

    // Set race
    this.race = personality.race as 'human' | 'elf' | 'dwarf' | 'halfling' | 'orc';

    // Set guild property
    this.setProperty('guild', personality.guild);

    // Calculate HP/MP based on level and stats
    const baseHp = 50 + (personality.level * 10) + (personality.stats.con * 2);
    const baseMp = 20 + (personality.level * 5) + (personality.stats.int * 2);
    this.maxHealth = baseHp;
    this.health = baseHp;
    this.maxMana = baseMp;
    this.mana = baseMp;

    // Set AI-generated portrait if available
    if (personality.profilePortrait) {
      this.setProperty('profilePortrait', personality.profilePortrait);
    }
  }

  /**
   * Called when the bot logs in.
   * Sets up behavior timers and schedules actions.
   */
  async onBotLogin(sessionDurationMinutes: number): Promise<void> {
    this._sessionStartTime = Date.now();
    this._sessionDurationMinutes = sessionDurationMinutes;

    // Bind a null connection (bots don't have real connections)
    this.bindConnection(nullConnection);

    // Schedule logout
    const logoutDelayMs = sessionDurationMinutes * 60 * 1000;
    if (typeof efuns !== 'undefined' && efuns.callOut) {
      this._logoutTimerId = efuns.callOut(() => {
        this.onBotLogout();
      }, logoutDelayMs);
    }

    // Schedule first action
    this.scheduleNextAction();

    // Schedule chat
    this.scheduleChatMessage();

    // Announce login via notify channel (same format as real players)
    const channelDaemon = getChannelDaemon();
    channelDaemon.sendNotification(
      'notify',
      `{bold}${this.name}{/} logged in`
    );
  }

  /**
   * Called when the bot logs out.
   */
  async onBotLogout(): Promise<void> {
    // Clear all timers
    this.clearAllTimers();

    // Announce logout via notify channel (same format as real players)
    const channelDaemon = getChannelDaemon();
    channelDaemon.sendNotification(
      'notify',
      `{bold}${this.name}{/} logged out`
    );

    // Move to null (remove from world)
    await this.moveTo(null);

    // Unbind connection
    this.unbindConnection();

    // Notify bot daemon
    try {
      const { getBotDaemon } = await import('../daemons/bots.js');
      getBotDaemon().handleBotLogout(this._personality?.id || '');
    } catch {
      // Bot daemon not available
    }
  }

  /**
   * Clear all behavior timers.
   */
  private clearAllTimers(): void {
    if (typeof efuns !== 'undefined' && efuns.removeCallOut) {
      if (this._nextActionTimerId !== null) {
        efuns.removeCallOut(this._nextActionTimerId);
        this._nextActionTimerId = null;
      }
      if (this._logoutTimerId !== null) {
        efuns.removeCallOut(this._logoutTimerId);
        this._logoutTimerId = null;
      }
      if (this._chatTimerId !== null) {
        efuns.removeCallOut(this._chatTimerId);
        this._chatTimerId = null;
      }
    }
  }

  /**
   * Schedule the next action with a random delay.
   */
  private scheduleNextAction(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    // Random delay between 10-60 seconds
    const delayMs = (10 + Math.random() * 50) * 1000;

    this._nextActionTimerId = efuns.callOut(() => {
      this.performAction();
    }, delayMs);
  }

  /**
   * Perform the current behavior action.
   */
  private async performAction(): Promise<void> {
    // Decide what to do based on weighted random
    const roll = Math.random();

    if (roll < 0.5) {
      // 50% chance: Stay idle
      this._behaviorState = 'idle';
      this.simulateIdle();
    } else if (roll < 0.85) {
      // 35% chance: Move to a random room
      this._behaviorState = 'moving';
      await this.moveToRandomRoom();
    } else {
      // 15% chance: Explore (move multiple rooms)
      this._behaviorState = 'exploring';
      await this.exploreRooms();
    }

    // Schedule next action
    this.scheduleNextAction();
  }

  /**
   * Simulate idle behavior.
   */
  private simulateIdle(): void {
    // Occasionally look around (10% chance)
    if (Math.random() < 0.1 && this.environment) {
      // Just mark that we looked - no actual output needed since bots don't see
    }
  }

  /**
   * Move to a random adjacent room.
   */
  private async moveToRandomRoom(): Promise<void> {
    const room = this.environment as MudObject & {
      exits?: Record<string, string>;
      getExits?: () => Record<string, string>;
    };

    if (!room) return;

    // Get exits
    let exits: Record<string, string> = {};
    if (room.getExits) {
      exits = room.getExits();
    } else if (room.exits) {
      exits = room.exits;
    }

    const exitDirs = Object.keys(exits);
    if (exitDirs.length === 0) return;

    // Pick a random exit
    const dir = exitDirs[Math.floor(Math.random() * exitDirs.length)]!;
    const destPath = exits[dir];

    if (!destPath) return;

    try {
      // Load and move to destination
      if (typeof efuns !== 'undefined' && efuns.loadObject) {
        const dest = await efuns.loadObject(destPath);
        if (dest) {
          // Announce departure
          const roomWithBroadcast = room as MudObject & {
            broadcast?: (msg: string, opts?: { exclude?: MudObject[] }) => void;
          };
          if (roomWithBroadcast.broadcast) {
            const exitMsg = this.exitMessage || `${this.name} leaves ${dir}.`;
            const formattedMsg = exitMsg.replace(/\$D/gi, dir);
            roomWithBroadcast.broadcast(`{dim}${formattedMsg}{/}\n`, { exclude: [this] });
          }

          await this.moveTo(dest);

          // Announce arrival
          const destRoom = dest as MudObject & {
            broadcast?: (msg: string, opts?: { exclude?: MudObject[] }) => void;
          };
          if (destRoom.broadcast) {
            const enterMsg = this.enterMessage || `${this.name} arrives.`;
            destRoom.broadcast(`{dim}${enterMsg}{/}\n`, { exclude: [this] });
          }
        }
      }
    } catch {
      // Failed to move - just stay put
    }
  }

  /**
   * Explore multiple rooms in a direction.
   */
  private async exploreRooms(): Promise<void> {
    // Move 2-4 rooms
    const numMoves = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numMoves; i++) {
      await this.moveToRandomRoom();
      // Small delay between moves
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Schedule the next chat message.
   */
  private scheduleChatMessage(): void {
    if (typeof efuns === 'undefined' || !efuns.callOut) return;

    // Get chat frequency from config
    let chatFrequencyMinutes = 10;
    if (efuns.getMudConfig) {
      chatFrequencyMinutes = efuns.getMudConfig<number>('bots.chatFrequencyMinutes') ?? 10;
    }

    // Random delay: 0.5x to 1.5x the configured frequency
    const delayMs = (chatFrequencyMinutes * 60 * 1000) * (0.5 + Math.random());

    this._chatTimerId = efuns.callOut(() => {
      this.sendChannelMessage();
      this.scheduleChatMessage();
    }, delayMs);
  }

  /**
   * Send an occasional channel message based on personality.
   */
  private async sendChannelMessage(): Promise<void> {
    if (!this._personality) return;

    // 60% chance to actually send a message (natural variation)
    if (Math.random() > 0.6) return;

    const channelDaemon = getChannelDaemon();

    // Choose channel based on player type and interests
    const channels = ['ooc', 'newbie'];
    const channel = channels[Math.floor(Math.random() * channels.length)]!;

    // Generate a contextual message
    const message = await this.generateChatMessage(channel);
    if (!message) return;

    // Send the message
    channelDaemon.send(this as unknown as Parameters<typeof channelDaemon.send>[0], channel, message);
  }

  /**
   * Generate a chat message based on personality and interests.
   */
  private async generateChatMessage(channel: string): Promise<string | null> {
    if (!this._personality) return null;

    // Use AI if available, otherwise fall back to canned messages
    if (typeof efuns !== 'undefined' && efuns.aiGenerate) {
      try {
        const prompt = `Generate a single short chat message (10-30 words) for a ${this._personality.playerType} type player named ${this._personality.name} with personality "${this._personality.personality}" and chat style "${this._personality.chatStyle}". They are chatting on the ${channel} channel. Interests: ${this._personality.interests.join(', ')}. Just output the message, no quotes or attribution.`;

        const result = await efuns.aiGenerate(prompt);
        if (result && result.success && result.text) {
          return result.text.trim();
        }
      } catch {
        // AI not available, use fallback
      }
    }

    // Fallback canned messages based on channel and player type
    const cannedMessages: Record<string, string[]> = {
      ooc: [
        'Anyone around?',
        'Nice weather in-game today!',
        'What area are people exploring?',
        'Back from being AFK.',
        'This game is pretty fun.',
        'How long has everyone been playing?',
        'Any tips for a returning player?',
        'Just found a cool item!',
      ],
      newbie: [
        'Hello everyone!',
        'How do I check my stats?',
        'What level should I be for the forest?',
        'Thanks for the help earlier!',
        'This is a great community.',
        'Where can I find a trainer?',
        'Is there a map anywhere?',
      ],
    };

    const messages = cannedMessages[channel] || cannedMessages['ooc']!;
    return messages[Math.floor(Math.random() * messages.length)]!;
  }

  /**
   * Handle being mentioned in a channel message.
   * @param senderName The name of the player who mentioned the bot
   * @param channelName The channel the message was sent on
   * @param message The full message that mentioned the bot
   */
  async handleMention(senderName: string, channelName: string, message: string): Promise<void> {
    if (!this._personality) return;

    // Don't respond to our own messages
    if (senderName.toLowerCase() === this.name.toLowerCase()) return;

    // Add a natural delay before responding (1-4 seconds)
    const delayMs = 1000 + Math.random() * 3000;
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Generate a response
    const response = await this.generateMentionResponse(senderName, channelName, message);
    if (!response) return;

    // Send the response on the same channel
    const channelDaemon = getChannelDaemon();
    channelDaemon.send(this as unknown as Parameters<typeof channelDaemon.send>[0], channelName, response);
  }

  /**
   * Generate a response to a mention.
   * Uses AI for complex messages, fallback for simple ones.
   */
  private async generateMentionResponse(
    senderName: string,
    channelName: string,
    message: string
  ): Promise<string | null> {
    if (!this._personality) return null;

    // Analyze message complexity
    const isSimple = this.isSimpleMessage(message);

    // For simple messages, use canned responses
    if (isSimple) {
      console.log(`[Bot ${this.name}] Simple message detected, using canned response`);
      return this.getSimpleMentionResponse(senderName, message);
    }

    // Check if AI is available
    if (typeof efuns === 'undefined' || !efuns.aiGenerate) {
      console.log(`[Bot ${this.name}] AI not available, using canned response`);
      return this.getSimpleMentionResponse(senderName, message);
    }

    // Use AI for complex messages
    console.log(`[Bot ${this.name}] Complex message detected, generating AI response...`);
    try {
      const prompt = `You are roleplaying as ${this._personality.name}, a ${this._personality.race} ${this._personality.guild} in a fantasy MUD game.

Your personality: ${this._personality.personality}
Your chat style: ${this._personality.chatStyle}
Your interests: ${this._personality.interests.join(', ')}

Someone named ${senderName} just mentioned you on the ${channelName} channel with this message:
"${message}"

Generate a short, in-character response (10-30 words max). Stay in character and match your chat style. Don't use quotes around your response. Just output the response text directly.`;

      const result = await efuns.aiGenerate(prompt);
      if (result && result.success && result.text) {
        console.log(`[Bot ${this.name}] AI response generated successfully`);
        return result.text.trim();
      }
      console.log(`[Bot ${this.name}] AI returned empty/invalid result:`, result?.error || 'no text');
    } catch (error) {
      console.error(`[Bot ${this.name}] AI generation failed:`, error);
    }

    // Fallback to simple response
    console.log(`[Bot ${this.name}] Falling back to canned response`);
    return this.getSimpleMentionResponse(senderName, message);
  }

  /**
   * Check if a message is simple enough for a canned response.
   * Only returns true for very basic greetings/farewells that are the main content.
   */
  private isSimpleMessage(message: string): boolean {
    // Remove the bot's name from the message for analysis
    const withoutName = message.replace(new RegExp(`\\b${this.name}\\b`, 'gi'), '').trim();
    const lowerMsg = withoutName.toLowerCase();
    const wordCount = withoutName.split(/\s+/).filter(w => w.length > 0).length;

    // Very short messages (3 words or less after removing bot name) are simple
    if (wordCount <= 3) {
      return true;
    }

    // Check if the message is ONLY a simple greeting/farewell (not part of a longer message)
    // These patterns should match the entire message (after removing name)
    const pureSimplePatterns = [
      /^(hi|hello|hey|yo|hiya|howdy|greetings)[!?.]*$/i,
      /^how are you[!?.]*$/i,
      /^what'?s up[!?.]*$/i,
      /^sup[!?.]*$/i,
      /^(thanks|thank you|thx)[!?.]*$/i,
      /^(bye|later|cya|see ya|goodbye)[!?.]*$/i,
      /^good (morning|afternoon|evening|night)[!?.]*$/i,
      /^you there[!?.]*$/i,
      /^welcome back[!?.]*$/i,
    ];

    for (const pattern of pureSimplePatterns) {
      if (pattern.test(lowerMsg)) return true;
    }

    // Anything else with more than 3 words is complex
    return false;
  }

  /**
   * Get a simple canned response to a mention.
   */
  private getSimpleMentionResponse(senderName: string, message: string): string | null {
    if (!this._personality) return null;

    const lowerMsg = message.toLowerCase();
    const responses: string[] = [];

    // Greetings
    if (/\b(hi|hello|hey|greetings|hiya|howdy|yo)\b/i.test(lowerMsg)) {
      responses.push(
        `Hey ${senderName}!`,
        `Hello there!`,
        `Hi ${senderName}, how's it going?`,
        `Hey!`,
        `Greetings!`,
      );
    }
    // How are you
    else if (/how are you|how'?s it going|what'?s up|sup\b/i.test(lowerMsg)) {
      responses.push(
        `Doing well, thanks for asking!`,
        `Not bad, just exploring around.`,
        `Pretty good! You?`,
        `Can't complain. How about you?`,
        `Living the adventure!`,
      );
    }
    // Thanks
    else if (/thanks|thank you/i.test(lowerMsg)) {
      responses.push(
        `You're welcome!`,
        `No problem!`,
        `Happy to help!`,
        `Anytime!`,
        `Sure thing!`,
      );
    }
    // Goodbye
    else if (/\b(bye|later|cya|see ya|gotta go)\b/i.test(lowerMsg)) {
      responses.push(
        `See ya later!`,
        `Take care!`,
        `Later!`,
        `Bye!`,
        `Safe travels!`,
      );
    }
    // Questions about the bot
    else if (/what.*doing|where.*you|you.*busy/i.test(lowerMsg)) {
      responses.push(
        `Just wandering around, looking for adventure.`,
        `Exploring the area. You?`,
        `Not much, taking a break.`,
        `Just hanging out.`,
      );
    }
    // Default acknowledgment
    else {
      responses.push(
        `Hmm?`,
        `Yeah?`,
        `What's up?`,
        `You called?`,
        `*nods*`,
      );
    }

    // Pick a random response
    return responses[Math.floor(Math.random() * responses.length)] || null;
  }

  /**
   * Override receive to do nothing (bots don't see output).
   */
  override receive(_message: string): void {
    // Bots don't process incoming messages
  }

  /**
   * Override sendPrompt to do nothing.
   */
  override sendPrompt(): void {
    // Bots don't need prompts
  }

  /**
   * Override heartbeat - bots use simplified heartbeat.
   */
  override heartbeat(): void {
    // Don't call super - bots don't need full player heartbeat
    // Just handle basic regeneration if needed
  }

  /**
   * Get the display name - just the name for bots.
   */
  override getDisplayName(): string {
    return this.name;
  }

  /**
   * Force logout the bot immediately.
   */
  async forceLogout(): Promise<void> {
    await this.onBotLogout();
  }
}

export default Bot;
