/**
 * Soul Daemon - Manages emotes/social commands.
 *
 * Emotes are social actions players can perform like smile, nod, wave, etc.
 * Each emote can have multiple "rules" that define how they work with
 * different targets:
 *
 *   ""     - No target (e.g., "smile" -> "Hero smiles happily.")
 *   "LIV"  - Living target (e.g., "smile bob" -> "Hero smiles at Bob.")
 *   "STR"  - String argument (e.g., "smile broadly" -> "Hero smiles broadly.")
 *
 * Messages use tokens that get replaced based on the viewer:
 *   $N - Actor name, $T - Target name, $vverb - Conjugated verb, etc.
 */

import { MudObject } from '../std/object.js';
import { composeAllMessages, makeRemoteMessage, type ComposedMessages } from '../lib/message-composer.js';
import { getPlayerColor, formatWithColor } from '../lib/chat-colors.js';

/**
 * Rule types that determine how an emote handles arguments.
 */
export type EmoteRule = '' | 'LIV' | 'STR' | 'LIV LIV' | 'LIV STR';

/**
 * Emote definition with messages for each rule.
 */
export interface EmoteDefinition {
  [rule: string]: string; // rule -> message template
}

/**
 * Emote execution result.
 */
export interface EmoteResult {
  success: boolean;
  error?: string;
  messages?: ComposedMessages;
}

/**
 * Soul Daemon class.
 */
export class SoulDaemon extends MudObject {
  private _emotes: Map<string, EmoteDefinition> = new Map();
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Soul Daemon';
    this.longDesc = 'The soul daemon manages emotes and social commands.';

    // Load defaults immediately so emotes work even before load() is called
    this._loadDefaultEmotes();

    // Schedule async load from disk
    this._scheduleLoad();
  }

  /**
   * Schedule loading emotes from disk.
   */
  private _scheduleLoad(): void {
    // Use setTimeout to allow async loading after construction
    setTimeout(() => {
      this.load().catch((err) => {
        console.error('[SoulDaemon] Failed to load emotes:', err);
      });
    }, 0);
  }

  /**
   * Load emotes from disk (merges with defaults).
   */
  async load(): Promise<void> {
    if (this._loaded) return;

    if (typeof efuns === 'undefined' || !efuns.loadData) {
      console.log('[SoulDaemon] efuns not available, using defaults');
      this._loaded = true;
      return;
    }

    try {
      const data = await efuns.loadData<Record<string, EmoteDefinition>>('emotes', 'emotes');

      if (!data) {
        console.log('[SoulDaemon] No emotes data found, using defaults');
        this._loaded = true;
        return;
      }

      // Merge disk emotes into existing (defaults already loaded)
      for (const [verb, rules] of Object.entries(data)) {
        this._emotes.set(verb.toLowerCase(), rules);
      }

      console.log(`[SoulDaemon] Loaded ${this._emotes.size} emotes from disk`);
      this._loaded = true;
    } catch (error) {
      console.error('[SoulDaemon] Failed to load emotes from disk:', error);
      // Defaults already loaded in constructor, just mark as loaded
      this._loaded = true;
    }
  }

  /**
   * Load default starter emotes.
   */
  private _loadDefaultEmotes(): void {
    const defaults: Record<string, EmoteDefinition> = {
      smile: {
        '': '$N $vsmile happily.',
        LIV: '$N $vsmile happily at $T.',
        STR: '$N $vsmile $o.',
      },
      nod: {
        '': '$N $vnod.',
        LIV: '$N $vnod at $T.',
        STR: '$N $vnod $o.',
      },
      wave: {
        '': '$N $vwave.',
        LIV: '$N $vwave at $T.',
      },
      grin: {
        '': '$N $vgrin.',
        LIV: '$N $vgrin at $T.',
        STR: '$N $vgrin $o.',
      },
      laugh: {
        '': '$N $vlaugh.',
        LIV: '$N $vlaugh at $T.',
        STR: '$N $vlaugh $o.',
      },
      giggle: {
        '': '$N $vgiggle.',
        LIV: '$N $vgiggle at $T.',
      },
      hug: {
        '': '$N $vneed a hug.',
        LIV: '$N $vhug $T warmly.',
      },
      bow: {
        '': '$N $vbow gracefully.',
        LIV: '$N $vbow to $T.',
      },
      shrug: {
        '': '$N $vshrug.',
        LIV: '$N $vshrug at $T.',
      },
      sigh: {
        '': '$N $vsigh.',
        LIV: '$N $vsigh at $T.',
        STR: '$N $vsigh $o.',
      },
      cheer: {
        '': '$N $vcheer wildly!',
        LIV: '$N $vcheer for $T!',
      },
      wink: {
        '': '$N $vwink.',
        LIV: '$N $vwink at $T.',
      },
      poke: {
        LIV: '$N $vpoke $T.',
      },
      slap: {
        LIV: '$N $vslap $T!',
      },
      thank: {
        '': '$N $vthank everyone.',
        LIV: '$N $vthank $T.',
      },
      greet: {
        '': '$N $vgreet everyone.',
        LIV: '$N $vgreet $T warmly.',
      },
      cry: {
        '': '$N $vcry.',
        LIV: '$N $vcry on $Q shoulder.',
      },
      comfort: {
        LIV: '$N $vcomfort $T.',
      },
      dance: {
        '': '$N $vdance around happily.',
        LIV: '$N $vdance with $T.',
      },
      think: {
        '': '$N $vthink.',
        STR: '$N $vthink about $o.',
      },
      agree: {
        '': '$N $vagree.',
        LIV: '$N $vagree with $T.',
      },
      disagree: {
        '': '$N $vdisagree.',
        LIV: '$N $vdisagree with $T.',
      },
      blush: {
        '': '$N $vblush.',
      },
      frown: {
        '': '$N $vfrown.',
        LIV: '$N $vfrown at $T.',
      },
      glare: {
        '': '$N $vglare.',
        LIV: '$N $vglare at $T.',
      },
      yawn: {
        '': '$N $vyawn.',
      },
      groan: {
        '': '$N $vgroan.',
        LIV: '$N $vgroan at $T.',
      },
    };

    for (const [verb, rules] of Object.entries(defaults)) {
      this._emotes.set(verb, rules);
    }

    console.log(`[SoulDaemon] Loaded ${this._emotes.size} default emotes`);
  }

  /**
   * Save emotes to disk.
   */
  async save(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.saveData) {
      console.log('[SoulDaemon] efuns not available, cannot save');
      return;
    }

    try {
      const data: Record<string, EmoteDefinition> = {};
      for (const [verb, rules] of this._emotes) {
        data[verb] = rules;
      }

      await efuns.saveData('emotes', 'emotes', data);
      console.log(`[SoulDaemon] Saved ${this._emotes.size} emotes to disk`);
    } catch (error) {
      console.error('[SoulDaemon] Failed to save emotes:', error);
    }
  }

  /**
   * Check if an emote verb exists.
   */
  hasEmote(verb: string): boolean {
    return this._emotes.has(verb.toLowerCase());
  }

  /**
   * Get an emote definition.
   */
  getEmote(verb: string): EmoteDefinition | undefined {
    return this._emotes.get(verb.toLowerCase());
  }

  /**
   * Get all emote verbs.
   */
  getEmoteVerbs(): string[] {
    return Array.from(this._emotes.keys()).sort();
  }

  /**
   * Add or update an emote.
   */
  setEmote(verb: string, rules: EmoteDefinition): void {
    this._emotes.set(verb.toLowerCase(), rules);
  }

  /**
   * Remove an emote.
   */
  removeEmote(verb: string): boolean {
    return this._emotes.delete(verb.toLowerCase());
  }

  /**
   * Get the number of loaded emotes.
   */
  get emoteCount(): number {
    return this._emotes.size;
  }

  /**
   * Execute an emote.
   *
   * @param actor The player performing the emote
   * @param verb The emote verb
   * @param args The arguments (target name, string, etc.)
   * @returns Execution result with messages
   */
  async executeEmote(
    actor: MudObject,
    verb: string,
    args: string
  ): Promise<EmoteResult> {
    const emote = this._emotes.get(verb.toLowerCase());
    if (!emote) {
      return { success: false, error: 'Unknown emote' };
    }

    const trimmedArgs = args.trim();

    // Try to match a rule
    let template: string | undefined;
    let target: MudObject | null = null;
    let objectStr: string = '';

    if (trimmedArgs) {
      // First, try to find a living target
      const env = typeof efuns !== 'undefined' ? efuns.environment(actor) : null;
      if (env) {
        const inventory = typeof efuns !== 'undefined' ? efuns.allInventory(env) : [];
        target = this._findTarget(trimmedArgs, inventory, actor);
      }

      if (target && emote['LIV']) {
        // Found a living target
        template = emote['LIV'];
      } else if (emote['STR']) {
        // Use string rule
        template = emote['STR'];
        objectStr = trimmedArgs;
        target = null;
      } else if (!target && emote['LIV']) {
        // They tried to target someone who isn't here
        return { success: false, error: `You don't see ${trimmedArgs} here.` };
      } else if (emote['']) {
        // Fall back to no-argument rule
        template = emote[''];
      }
    } else {
      // No arguments - use the no-target rule
      template = emote[''];
    }

    if (!template) {
      // No matching rule
      if (emote['LIV'] && !emote['']) {
        return { success: false, error: `${verb.charAt(0).toUpperCase() + verb.slice(1)} who?` };
      }
      return { success: false, error: 'Cannot do that.' };
    }

    // Compose messages
    const messages = composeAllMessages(template, actor, target, objectStr);

    // Send messages to appropriate recipients
    await this._deliverMessages(actor, target, messages);

    return { success: true, messages };
  }

  /**
   * Execute a remote emote (targeting someone not in the room).
   *
   * @param actor The player performing the emote
   * @param verb The emote verb
   * @param targetName The name of the remote target
   */
  async executeRemoteEmote(
    actor: MudObject,
    verb: string,
    targetName: string
  ): Promise<EmoteResult> {
    const emote = this._emotes.get(verb.toLowerCase());
    if (!emote) {
      return { success: false, error: 'Unknown emote' };
    }

    // Remote emotes require LIV rule
    const template = emote['LIV'];
    if (!template) {
      return { success: false, error: `You cannot ${verb} someone from afar.` };
    }

    // Find the remote player
    let target: MudObject | null = null;
    if (typeof efuns !== 'undefined') {
      target = efuns.findConnectedPlayer(targetName) ?? null;
      if (!target) {
        target = efuns.findActivePlayer(targetName) ?? null;
      }
    }

    if (!target) {
      return { success: false, error: `${targetName} is not online.` };
    }

    if (target === actor) {
      return { success: false, error: "You can't remote emote yourself." };
    }

    // Compose messages
    const messages = composeAllMessages(template, actor, target, '');

    // Add "From afar, " prefix to all messages
    messages.actor = makeRemoteMessage(messages.actor);
    messages.others = makeRemoteMessage(messages.others);
    if (messages.target) {
      messages.target = makeRemoteMessage(messages.target);
    }

    // Send only to actor and target (not room)
    const actorWithReceive = actor as MudObject & { receive?: (msg: string) => void };
    const targetWithReceive = target as MudObject & { receive?: (msg: string) => void };

    // Use each recipient's remote color preference
    if (actorWithReceive.receive) {
      const actorColor = getPlayerColor(actor, 'remote');
      actorWithReceive.receive(formatWithColor(actorColor, messages.actor) + '\n');
    }

    if (messages.target && targetWithReceive.receive) {
      const targetColor = getPlayerColor(target, 'remote');
      targetWithReceive.receive(formatWithColor(targetColor, messages.target) + '\n');
    }

    return { success: true, messages };
  }

  /**
   * Find a target by name in a list of objects.
   */
  private _findTarget(
    name: string,
    objects: MudObject[],
    exclude?: MudObject
  ): MudObject | null {
    const lowerName = name.toLowerCase();

    for (const obj of objects) {
      if (obj === exclude) continue;

      // Check various name properties
      const player = obj as MudObject & { name?: string; displayName?: string };
      const objName = player.name?.toLowerCase() || '';
      const shortDesc = obj.shortDesc?.toLowerCase() || '';

      if (objName === lowerName || shortDesc === lowerName) {
        return obj;
      }

      // Partial match
      if (objName.startsWith(lowerName) || shortDesc.startsWith(lowerName)) {
        return obj;
      }
    }

    return null;
  }

  /**
   * Deliver emote messages to all appropriate recipients.
   * Sleeping players do not receive emote messages (except their own).
   */
  private async _deliverMessages(
    actor: MudObject,
    target: MudObject | null,
    messages: ComposedMessages
  ): Promise<void> {
    const actorWithReceive = actor as MudObject & { receive?: (msg: string) => void };

    // Send to actor (always receives their own emote)
    if (actorWithReceive.receive) {
      actorWithReceive.receive(messages.actor + '\n');
    }

    // Send to target (skip if sleeping)
    if (target && messages.target) {
      const targetLiving = target as MudObject & { receive?: (msg: string) => void; isSleeping?: () => boolean };
      if (targetLiving.receive && !targetLiving.isSleeping?.()) {
        targetLiving.receive(messages.target + '\n');
      }
    }

    // Send to others in the room (skip sleeping)
    const env = typeof efuns !== 'undefined' ? efuns.environment(actor) : null;
    if (env) {
      const inventory = typeof efuns !== 'undefined' ? efuns.allInventory(env) : [];
      for (const obj of inventory) {
        if (obj === actor || obj === target) continue;

        const objLiving = obj as MudObject & { receive?: (msg: string) => void; isSleeping?: () => boolean };
        if (objLiving.receive && !objLiving.isSleeping?.()) {
          objLiving.receive(messages.others + '\n');
        }
      }
    }
  }
}

// Singleton instance
let soulDaemon: SoulDaemon | null = null;

/**
 * Get the soul daemon singleton.
 */
export function getSoulDaemon(): SoulDaemon {
  if (!soulDaemon) {
    soulDaemon = new SoulDaemon();
  }
  return soulDaemon;
}

/**
 * Reset the soul daemon (for testing).
 */
export function resetSoulDaemon(): void {
  soulDaemon = null;
}

export default SoulDaemon;
