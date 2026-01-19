/**
 * Living - Base class for living beings (players and NPCs).
 *
 * Living beings can move, communicate, and execute commands.
 */

import { MudObject } from './object.js';
import { Room } from './room.js';
import type { EquipmentSlot } from './equipment.js';
import type { Weapon } from './weapon.js';
import type { Armor } from './armor.js';
import type { CombatStats, CombatStatName, Effect } from './combat/types.js';
import { DEFAULT_COMBAT_STATS } from './combat/types.js';

/**
 * Command parser result.
 */
export interface ParsedCommand {
  verb: string;
  args: string;
  words: string[];
}

/**
 * Core stat names.
 */
export type StatName = 'strength' | 'intelligence' | 'wisdom' | 'charisma' | 'dexterity' | 'constitution' | 'luck';

/**
 * Stats configuration.
 */
export interface Stats {
  strength: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  dexterity: number;
  constitution: number;
  luck: number;
}

/**
 * Default stat value for new characters.
 */
export const DEFAULT_STAT = 1;

/**
 * Minimum and maximum stat values.
 */
export const MIN_STAT = 1;
export const MAX_STAT = 100;

/**
 * Stat short names for display.
 */
export const STAT_SHORT_NAMES: Record<StatName, string> = {
  strength: 'STR',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
  dexterity: 'DEX',
  constitution: 'CON',
  luck: 'LUK',
};

/**
 * Stat descriptions.
 */
export const STAT_DESCRIPTIONS: Record<StatName, string> = {
  strength: 'Physical power, melee damage, carry capacity',
  intelligence: 'Mental acuity, magic power, mana pool',
  wisdom: 'Perception, magic resistance, mana regeneration',
  charisma: 'Social influence, prices, leadership',
  dexterity: 'Agility, accuracy, dodge chance, stealth',
  constitution: 'Toughness, health points, resistance to ailments',
  luck: 'Fortune, critical hits, rare drops, random events',
};

/**
 * Base class for living beings.
 */
/**
 * Default enter/exit messages using tokens:
 *   $N - Living's capitalized name
 *   $n - Living's lowercase name
 *   $D - Direction (e.g., "east", "the north")
 */
export const DEFAULT_EXIT_MESSAGE = '$N leaves $D.';
export const DEFAULT_ENTER_MESSAGE = '$N arrives from $D.';

export class Living extends MudObject {
  private _name: string = 'someone';
  private _title: string = '';
  private _gender: 'male' | 'female' | 'neutral' = 'neutral';
  private _commandHistory: string[] = [];
  private _maxHistory: number = 50;

  // Enter/exit messages (customizable)
  private _exitMessage: string = DEFAULT_EXIT_MESSAGE;
  private _enterMessage: string = DEFAULT_ENTER_MESSAGE;

  // Combat stats (basic implementation)
  private _health: number = 100;
  private _maxHealth: number = 100;
  private _alive: boolean = true;

  // Magic points
  private _mana: number = 100;
  private _maxMana: number = 100;

  // Level
  private _level: number = 1;

  // Core stats - base values (before modifiers)
  private _baseStats: Stats = {
    strength: DEFAULT_STAT,
    intelligence: DEFAULT_STAT,
    wisdom: DEFAULT_STAT,
    charisma: DEFAULT_STAT,
    dexterity: DEFAULT_STAT,
    constitution: DEFAULT_STAT,
    luck: DEFAULT_STAT,
  };

  // Stat modifiers (from equipment, buffs, etc.)
  private _statModifiers: Stats = {
    strength: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
    dexterity: 0,
    constitution: 0,
    luck: 0,
  };

  // Equipment tracking
  private _equipment: Map<EquipmentSlot, Weapon | Armor> = new Map();

  // Combat stats modifiers (from equipment, buffs, etc.)
  private _combatStatModifiers: CombatStats = { ...DEFAULT_COMBAT_STATS };

  // Active effects (buffs/debuffs)
  private _effects: Map<string, Effect> = new Map();

  // Combat state
  private _inCombat: boolean = false;
  private _combatTarget: Living | null = null;
  private _attackers: Set<Living> = new Set();

  constructor() {
    super();
    this.shortDesc = 'a being';
    this.longDesc = 'You see a living being.';
  }

  // ========== Identity ==========

  /**
   * Get the living's name.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Set the living's name.
   */
  set name(value: string) {
    this._name = value;
    this.shortDesc = this.getDisplayName();
  }

  /**
   * Get the living's title.
   */
  get title(): string {
    return this._title;
  }

  /**
   * Set the living's title.
   */
  set title(value: string) {
    this._title = value;
    this.shortDesc = this.getDisplayName();
  }

  /**
   * Get the living's gender.
   */
  get gender(): 'male' | 'female' | 'neutral' {
    return this._gender;
  }

  /**
   * Set the living's gender.
   */
  set gender(value: 'male' | 'female' | 'neutral') {
    this._gender = value;
  }

  // ========== Enter/Exit Messages ==========

  /**
   * Get the exit message template.
   * Tokens: $N (name), $n (lowercase name), $D (direction)
   */
  get exitMessage(): string {
    return this._exitMessage;
  }

  /**
   * Set the exit message template.
   */
  set exitMessage(value: string) {
    this._exitMessage = value;
  }

  /**
   * Get the enter message template.
   * Tokens: $N (name), $n (lowercase name), $D (direction)
   */
  get enterMessage(): string {
    return this._enterMessage;
  }

  /**
   * Set the enter message template.
   */
  set enterMessage(value: string) {
    this._enterMessage = value;
  }

  /**
   * Compose an enter or exit message by replacing tokens.
   * @param template The message template
   * @param direction The direction of movement
   * @returns The composed message
   */
  composeMovementMessage(template: string, direction: string): string {
    const capName = typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;
    return template
      .replace(/\$N/g, capName)
      .replace(/\$n/g, this._name.toLowerCase())
      .replace(/\$D/g, direction);
  }

  /**
   * Get the opposite direction for enter messages.
   */
  static getOppositeDirection(direction: string): string {
    const opposites: Record<string, string> = {
      north: 'the south',
      south: 'the north',
      east: 'the west',
      west: 'the east',
      up: 'below',
      down: 'above',
      northeast: 'the southwest',
      northwest: 'the southeast',
      southeast: 'the northwest',
      southwest: 'the northeast',
      in: 'outside',
      out: 'inside',
      enter: 'outside',
      exit: 'inside',
    };
    return opposites[direction.toLowerCase()] || `the ${direction}`;
  }

  /**
   * Get the display name (name + title).
   */
  getDisplayName(): string {
    if (this._title) {
      return `${this._name} ${this._title}`;
    }
    return this._name;
  }

  /**
   * Get subjective pronoun (he/she/they).
   */
  get subjective(): string {
    switch (this._gender) {
      case 'male':
        return 'he';
      case 'female':
        return 'she';
      default:
        return 'they';
    }
  }

  /**
   * Get objective pronoun (him/her/them).
   */
  get objective(): string {
    switch (this._gender) {
      case 'male':
        return 'him';
      case 'female':
        return 'her';
      default:
        return 'them';
    }
  }

  /**
   * Get possessive pronoun (his/her/their).
   */
  get possessive(): string {
    switch (this._gender) {
      case 'male':
        return 'his';
      case 'female':
        return 'her';
      default:
        return 'their';
    }
  }

  // ========== Health ==========

  /**
   * Get current health.
   */
  get health(): number {
    return this._health;
  }

  /**
   * Set current health.
   */
  set health(value: number) {
    this._health = Math.max(0, Math.min(value, this._maxHealth));
    if (this._health <= 0 && this._alive) {
      this._alive = false;
      this.onDeath();
    }
  }

  /**
   * Get maximum health.
   */
  get maxHealth(): number {
    return this._maxHealth;
  }

  /**
   * Set maximum health.
   */
  set maxHealth(value: number) {
    this._maxHealth = Math.max(1, value);
    if (this._health > this._maxHealth) {
      this._health = this._maxHealth;
    }
  }

  /**
   * Check if alive.
   */
  get alive(): boolean {
    return this._alive;
  }

  /**
   * Heal the living.
   * @param amount Amount to heal
   */
  heal(amount: number): void {
    if (this._alive) {
      this.health = Math.min(this._health + amount, this._maxHealth);
    }
  }

  /**
   * Damage the living.
   * @param amount Amount of damage
   */
  damage(amount: number): void {
    if (this._alive) {
      this.health -= amount;
    }
  }

  // ========== Mana ==========

  /**
   * Get current mana.
   */
  get mana(): number {
    return this._mana;
  }

  /**
   * Set current mana.
   */
  set mana(value: number) {
    this._mana = Math.max(0, Math.min(value, this._maxMana));
  }

  /**
   * Get maximum mana.
   */
  get maxMana(): number {
    return this._maxMana;
  }

  /**
   * Set maximum mana.
   */
  set maxMana(value: number) {
    this._maxMana = Math.max(0, value);
    if (this._mana > this._maxMana) {
      this._mana = this._maxMana;
    }
  }

  /**
   * Restore mana.
   * @param amount Amount to restore
   */
  restoreMana(amount: number): void {
    this.mana = Math.min(this._mana + amount, this._maxMana);
  }

  /**
   * Use mana for a spell or ability.
   * @param amount Amount of mana to use
   * @returns true if mana was successfully used, false if not enough mana
   */
  useMana(amount: number): boolean {
    if (this._mana >= amount) {
      this._mana -= amount;
      return true;
    }
    return false;
  }

  /**
   * Check if the living has enough mana.
   * @param amount Amount of mana required
   */
  hasMana(amount: number): boolean {
    return this._mana >= amount;
  }

  /**
   * Get mana as a percentage (0-100).
   */
  get manaPercent(): number {
    if (this._maxMana === 0) return 0;
    return Math.round((this._mana / this._maxMana) * 100);
  }

  /**
   * Get health as a percentage (0-100).
   */
  get healthPercent(): number {
    if (this._maxHealth === 0) return 0;
    return Math.round((this._health / this._maxHealth) * 100);
  }

  // ========== Level ==========

  /**
   * Get current level.
   */
  get level(): number {
    return this._level;
  }

  /**
   * Set current level.
   */
  set level(value: number) {
    this._level = Math.max(1, value);
  }

  // ========== Communication ==========

  /**
   * Receive a message (output to this living).
   * Override this in Player to send to connection.
   * @param message The message to receive
   */
  receive(message: string): void {
    // Default: do nothing (NPCs don't display messages)
  }

  /**
   * Say something to the room.
   * @param message What to say
   */
  say(message: string): void {
    const env = this.environment as Room | null;
    if (!env) return;

    const name =
      typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;

    // Message to the speaker
    this.receive(`You say: ${message}`);

    // Message to others in the room
    if (typeof env.broadcast === 'function') {
      env.broadcast(`${name} says: ${message}`, { exclude: [this] });
    }
  }

  /**
   * Emote an action.
   * @param action The action to emote
   */
  emote(action: string): void {
    const env = this.environment as Room | null;
    if (!env) return;

    const name =
      typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;
    const message = `${name} ${action}`;

    // Message to everyone including the emoter
    if (typeof env.broadcast === 'function') {
      env.broadcast(message);
    }
  }

  /**
   * Whisper to a specific target.
   * @param target The target to whisper to
   * @param message The message to whisper
   */
  whisper(target: Living, message: string): void {
    const name =
      typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;

    this.receive(`You whisper to ${target.name}: ${message}`);
    target.receive(`${name} whispers: ${message}`);
  }

  // ========== Commands ==========

  /**
   * Parse a command string into verb and args.
   * @param input The command string
   */
  parseCommand(input: string): ParsedCommand {
    const trimmed = input.trim();
    const words = trimmed.split(/\s+/);
    const verb = words[0]?.toLowerCase() || '';
    const args = words.slice(1).join(' ');

    return { verb, args, words };
  }

  /**
   * Execute a command.
   * @param input The command string
   * @returns true if command was handled
   */
  async command(input: string): Promise<boolean> {
    if (!input.trim()) {
      return false;
    }

    // Add to history
    this._commandHistory.push(input);
    if (this._commandHistory.length > this._maxHistory) {
      this._commandHistory.shift();
    }

    const parsed = this.parseCommand(input);

    // Try actions on self
    const selfAction = this.getAction(parsed.verb);
    if (selfAction) {
      const result = await selfAction.handler(parsed.args);
      if (result) return true;
    }

    // Try actions on items in inventory
    for (const item of this.inventory) {
      const action = item.getAction(parsed.verb);
      if (action) {
        const result = await action.handler(parsed.args);
        if (result) return true;
      }
    }

    // Try actions on items in environment
    if (this.environment) {
      // Check the room itself
      const roomAction = this.environment.getAction(parsed.verb);
      if (roomAction) {
        const result = await roomAction.handler(parsed.args);
        if (result) return true;
      }

      // Check items in the room
      for (const item of this.environment.inventory) {
        if (item === this) continue;
        const action = item.getAction(parsed.verb);
        if (action) {
          const result = await action.handler(parsed.args);
          if (result) return true;
        }
      }
    }

    return false;
  }

  /**
   * Get command history.
   */
  getHistory(): string[] {
    return [...this._commandHistory];
  }

  /**
   * Clear command history.
   */
  clearHistory(): void {
    this._commandHistory = [];
  }

  // ========== Movement ==========

  /**
   * Move in a direction.
   * @param direction The direction to move
   * @returns true if movement succeeded
   */
  async moveDirection(direction: string): Promise<boolean> {
    const env = this.environment as Room | null;
    if (!env || typeof env.getExit !== 'function') {
      this.receive("You can't go that way.");
      return false;
    }

    const exit = env.getExit(direction);
    if (!exit) {
      this.receive("You can't go that way.");
      return false;
    }

    // Check if we can pass
    if (exit.canPass) {
      const canPass = await exit.canPass(this);
      if (!canPass) {
        this.receive("You can't go that way.");
        return false;
      }
    }

    // Get destination room
    const dest = await env.resolveExit(exit);
    if (!dest) {
      this.receive("That exit leads nowhere.");
      return false;
    }

    // Notify current room with exit message
    const exitMsg = this.composeMovementMessage(this._exitMessage, direction);
    env.broadcast(exitMsg, { exclude: [this] });
    if (typeof env.onLeave === 'function') {
      await env.onLeave(this, dest);
    }

    // Move
    await this.moveTo(dest);

    // Notify new room with enter message
    const newEnv = this.environment as Room | null;
    if (newEnv) {
      const oppositeDir = Living.getOppositeDirection(direction);
      const enterMsg = this.composeMovementMessage(this._enterMessage, oppositeDir);
      newEnv.broadcast(enterMsg, { exclude: [this] });
      if (typeof newEnv.onEnter === 'function') {
        await newEnv.onEnter(this, env);
      }

      // Notify NPCs in the room that someone entered
      for (const obj of newEnv.inventory) {
        if (obj !== this && obj instanceof Living) {
          // Check if the living has an onEnter method (NPCs do)
          const npc = obj as Living & { onEnter?: (who: Living, from?: Room) => void | Promise<void> };
          if (typeof npc.onEnter === 'function') {
            await npc.onEnter(this, env);
          }
        }
      }

      // Quest integration: track room exploration for explore objectives
      if ('getProperty' in this) {
        // Use dynamic import to avoid circular dependency
        import('../daemons/quest.js')
          .then(({ getQuestDaemon }) => {
            try {
              const questDaemon = getQuestDaemon();
              const roomPath = newEnv.objectPath || '';
              type QuestPlayer = Parameters<typeof questDaemon.updateExploreObjective>[0];
              questDaemon.updateExploreObjective(this as unknown as QuestPlayer, roomPath);
            } catch {
              // Quest daemon may not be initialized yet
            }
          })
          .catch(() => {
            // Ignore import errors
          });
      }

      // Show room description (brief mode shows glance, normal shows full look)
      const self = this as Living & { getConfig?: <T>(key: string) => T };
      const briefMode = typeof self.getConfig === 'function' ? self.getConfig<boolean>('brief') : false;

      if (briefMode && typeof newEnv.glance === 'function') {
        newEnv.glance(this);
      } else if (typeof newEnv.look === 'function') {
        newEnv.look(this);
      }
    }

    return true;
  }

  // ========== Lifecycle Hooks ==========

  /**
   * Called when the living dies.
   * Override this for death handling.
   */
  onDeath(): void | Promise<void> {
    const env = this.environment as Room | null;
    if (env && typeof env.broadcast === 'function') {
      const name =
        typeof efuns !== 'undefined' ? efuns.capitalize(this._name) : this._name;
      env.broadcast(`${name} has died!`);
    }
  }

  /**
   * Revive the living.
   * @param health Health to restore (defaults to max)
   */
  revive(health?: number): void {
    this._alive = true;
    this._health = health !== undefined ? health : this._maxHealth;
  }

  /**
   * Called each heartbeat by the scheduler.
   * Override this for periodic behavior (regeneration, AI, etc.)
   */
  heartbeat(): void {
    // Default: do nothing
    // NPCs can override for AI behavior
    // Players override for monitor display
  }

  // ========== Core Stats ==========

  /**
   * Get a stat's effective value (base + modifiers).
   * @param stat The stat name
   */
  getStat(stat: StatName): number {
    const base = this._baseStats[stat];
    const modifier = this._statModifiers[stat];
    return Math.max(MIN_STAT, Math.min(MAX_STAT, base + modifier));
  }

  /**
   * Get a stat's base value (without modifiers).
   * @param stat The stat name
   */
  getBaseStat(stat: StatName): number {
    return this._baseStats[stat];
  }

  /**
   * Set a stat's base value.
   * @param stat The stat name
   * @param value The new base value
   */
  setBaseStat(stat: StatName, value: number): void {
    this._baseStats[stat] = Math.max(MIN_STAT, Math.min(MAX_STAT, value));
  }

  /**
   * Get a stat's modifier value.
   * @param stat The stat name
   */
  getStatModifier(stat: StatName): number {
    return this._statModifiers[stat];
  }

  /**
   * Set a stat's modifier value.
   * @param stat The stat name
   * @param value The modifier value (can be negative)
   */
  setStatModifier(stat: StatName, value: number): void {
    this._statModifiers[stat] = value;
  }

  /**
   * Add to a stat's modifier.
   * @param stat The stat name
   * @param value The amount to add (can be negative)
   */
  addStatModifier(stat: StatName, value: number): void {
    this._statModifiers[stat] += value;
  }

  /**
   * Reset all stat modifiers to zero.
   */
  resetStatModifiers(): void {
    for (const stat of Object.keys(this._statModifiers) as StatName[]) {
      this._statModifiers[stat] = 0;
    }
  }

  // ========== Equipment ==========

  /**
   * Get equipment in a specific slot.
   * @param slot The equipment slot to check
   */
  getEquipped(slot: EquipmentSlot): Weapon | Armor | undefined {
    return this._equipment.get(slot);
  }

  /**
   * Get all equipped items.
   */
  getAllEquipped(): Map<EquipmentSlot, Weapon | Armor> {
    return new Map(this._equipment);
  }

  /**
   * Get wielded weapons.
   */
  getWieldedWeapons(): { mainHand?: Weapon; offHand?: Weapon } {
    const mainHand = this._equipment.get('main_hand');
    const offHand = this._equipment.get('off_hand');
    return {
      mainHand: mainHand && 'wield' in mainHand ? (mainHand as Weapon) : undefined,
      offHand: offHand && 'wield' in offHand ? (offHand as Weapon) : undefined,
    };
  }

  /**
   * Check if a slot is occupied.
   * @param slot The slot to check
   */
  isSlotOccupied(slot: EquipmentSlot): boolean {
    return this._equipment.has(slot);
  }

  /**
   * Check if off-hand is available (not blocked by two-handed weapon).
   */
  isOffHandAvailable(): boolean {
    if (this._equipment.has('off_hand')) return false;

    // Check if main_hand has a two-handed weapon
    const mainHand = this._equipment.get('main_hand');
    if (mainHand && 'handedness' in mainHand) {
      const weapon = mainHand as Weapon;
      if (weapon.handedness === 'two_handed') return false;
    }

    return true;
  }

  /**
   * Get conflicts for equipping to slots.
   * @param slots The slots to check
   * @returns Array of items that would need to be removed
   */
  getSlotConflicts(slots: EquipmentSlot[]): (Weapon | Armor)[] {
    const conflicts: (Weapon | Armor)[] = [];
    for (const slot of slots) {
      const equipped = this._equipment.get(slot);
      if (equipped && !conflicts.includes(equipped)) {
        conflicts.push(equipped);
      }
    }
    return conflicts;
  }

  /**
   * Equip an item to a slot (internal - used by Weapon.wield and Armor.wear).
   * @param slot The slot to equip to
   * @param item The item to equip
   * @param occupiesBoth If true, also occupies off_hand (for two-handed weapons)
   */
  equipToSlot(slot: EquipmentSlot, item: Weapon | Armor, occupiesBoth: boolean = false): void {
    this._equipment.set(slot, item);
    if (occupiesBoth && slot === 'main_hand') {
      this._equipment.set('off_hand', item);
    }
  }

  /**
   * Unequip an item from a slot (internal).
   * @param slot The slot to unequip from
   * @returns The unequipped item, if any
   */
  unequipFromSlot(slot: EquipmentSlot): Weapon | Armor | undefined {
    const item = this._equipment.get(slot);
    if (!item) return undefined;

    // For two-handed weapons, clear both slots
    if ('handedness' in item && (item as Weapon).handedness === 'two_handed') {
      this._equipment.delete('main_hand');
      this._equipment.delete('off_hand');
    } else {
      this._equipment.delete(slot);
    }

    return item;
  }

  /**
   * Get all worn armor (excludes weapons).
   */
  getWornArmor(): Armor[] {
    const armor: Armor[] = [];
    for (const [slot, item] of this._equipment) {
      // Skip weapon slots unless it's a shield
      if (slot === 'main_hand') continue;
      if (slot === 'off_hand' && 'wield' in item) continue;
      if ('wear' in item) {
        armor.push(item as Armor);
      }
    }
    return armor;
  }

  /**
   * Get all base stats.
   */
  getBaseStats(): Stats {
    return { ...this._baseStats };
  }

  /**
   * Get all effective stats (base + modifiers).
   */
  getStats(): Stats {
    return {
      strength: this.getStat('strength'),
      intelligence: this.getStat('intelligence'),
      wisdom: this.getStat('wisdom'),
      charisma: this.getStat('charisma'),
      dexterity: this.getStat('dexterity'),
      constitution: this.getStat('constitution'),
      luck: this.getStat('luck'),
    };
  }

  /**
   * Set all base stats at once.
   * @param stats The stats to set
   */
  setBaseStats(stats: Partial<Stats>): void {
    for (const [stat, value] of Object.entries(stats) as [StatName, number][]) {
      if (value !== undefined) {
        this.setBaseStat(stat, value);
      }
    }
  }

  /**
   * Get the stat bonus from equipment, buffs, etc.
   * This is an alias for getStatModifier for convenience.
   * @param stat The stat name
   */
  getStatBonus(stat: StatName): number {
    return this._statModifiers[stat];
  }

  /**
   * Perform a stat check (roll against a difficulty).
   * @param stat The stat to check
   * @param difficulty The difficulty (default 10)
   * @returns Object with success, roll, and total
   */
  statCheck(stat: StatName, difficulty: number = 10): { success: boolean; roll: number; total: number; bonus: number } {
    const roll = Math.floor(Math.random() * 20) + 1; // d20
    const bonus = this.getStatBonus(stat);
    const total = roll + bonus;
    const success = total >= difficulty;
    return { success, roll, total, bonus };
  }

  // ========== Combat Stats ==========

  /**
   * Get a combat stat's effective value (base + modifiers from effects).
   * @param stat The combat stat name
   */
  getCombatStat(stat: CombatStatName): number {
    const base = DEFAULT_COMBAT_STATS[stat];
    const modifier = this._combatStatModifiers[stat];
    return base + modifier;
  }

  /**
   * Get all combat stats.
   */
  getCombatStats(): CombatStats {
    return {
      toHit: this.getCombatStat('toHit'),
      toCritical: this.getCombatStat('toCritical'),
      toBlock: this.getCombatStat('toBlock'),
      toDodge: this.getCombatStat('toDodge'),
      attackSpeed: this.getCombatStat('attackSpeed'),
      damageBonus: this.getCombatStat('damageBonus'),
      armorBonus: this.getCombatStat('armorBonus'),
    };
  }

  /**
   * Set a combat stat modifier.
   * @param stat The combat stat name
   * @param value The modifier value
   */
  setCombatStatModifier(stat: CombatStatName, value: number): void {
    this._combatStatModifiers[stat] = value;
  }

  /**
   * Add to a combat stat modifier.
   * @param stat The combat stat name
   * @param value The amount to add (can be negative)
   */
  addCombatStatModifier(stat: CombatStatName, value: number): void {
    this._combatStatModifiers[stat] += value;
  }

  /**
   * Reset all combat stat modifiers to defaults.
   */
  resetCombatStatModifiers(): void {
    this._combatStatModifiers = { ...DEFAULT_COMBAT_STATS };
  }

  // ========== Effects (Buffs/Debuffs) ==========

  /**
   * Add an effect to this living.
   * @param effect The effect to add
   */
  addEffect(effect: Effect): void {
    const existing = this._effects.get(effect.id);

    // Handle stacking
    if (existing && effect.maxStacks && existing.stacks) {
      existing.stacks = Math.min(existing.stacks + 1, effect.maxStacks);
      existing.duration = effect.duration; // Refresh duration
      return;
    }

    // Add new effect
    const newEffect = { ...effect };
    if (newEffect.maxStacks && !newEffect.stacks) {
      newEffect.stacks = 1;
    }
    this._effects.set(effect.id, newEffect);

    // Apply stat modifiers immediately
    if (effect.type === 'stat_modifier' && effect.stat) {
      this.addStatModifier(effect.stat, effect.magnitude);
    }
    if (effect.type === 'combat_modifier' && effect.combatStat) {
      this.addCombatStatModifier(effect.combatStat, effect.magnitude);
    }
  }

  /**
   * Remove an effect from this living.
   * @param effectId The effect ID to remove
   * @returns true if effect was removed
   */
  removeEffect(effectId: string): boolean {
    const effect = this._effects.get(effectId);
    if (!effect) return false;

    // Remove stat modifiers
    if (effect.type === 'stat_modifier' && effect.stat) {
      this.addStatModifier(effect.stat, -effect.magnitude);
    }
    if (effect.type === 'combat_modifier' && effect.combatStat) {
      this.addCombatStatModifier(effect.combatStat, -effect.magnitude);
    }

    // Call onRemove callback
    if (effect.onRemove) {
      effect.onRemove(this, effect);
    }

    this._effects.delete(effectId);
    return true;
  }

  /**
   * Check if this living has an effect.
   * @param effectId The effect ID to check
   */
  hasEffect(effectId: string): boolean {
    return this._effects.has(effectId);
  }

  /**
   * Get an effect by ID.
   * @param effectId The effect ID
   */
  getEffect(effectId: string): Effect | undefined {
    return this._effects.get(effectId);
  }

  /**
   * Get all active effects.
   */
  getEffects(): Effect[] {
    return Array.from(this._effects.values());
  }

  /**
   * Process effect ticks and expirations.
   * Should be called each heartbeat.
   * @param deltaMs Time elapsed in milliseconds
   */
  tickEffects(deltaMs: number): void {
    const expiredEffects: string[] = [];

    for (const [id, effect] of this._effects) {
      // Update duration
      effect.duration -= deltaMs;

      // Process ticks for DoT/HoT effects
      if (effect.tickInterval && effect.nextTick !== undefined) {
        effect.nextTick -= deltaMs;
        while (effect.nextTick <= 0 && effect.duration > 0) {
          // Execute tick
          if (effect.onTick) {
            effect.onTick(this, effect);
          } else {
            // Default tick behavior
            if (effect.type === 'damage_over_time') {
              const stacks = effect.stacks || 1;
              this.damage(effect.magnitude * stacks);
            } else if (effect.type === 'heal_over_time') {
              const stacks = effect.stacks || 1;
              this.heal(effect.magnitude * stacks);
            }
          }
          effect.nextTick += effect.tickInterval;
        }
      }

      // Check expiration
      if (effect.duration <= 0) {
        expiredEffects.push(id);
      }
    }

    // Remove expired effects
    for (const id of expiredEffects) {
      const effect = this._effects.get(id);
      if (effect) {
        // Remove stat modifiers
        if (effect.type === 'stat_modifier' && effect.stat) {
          this.addStatModifier(effect.stat, -effect.magnitude);
        }
        if (effect.type === 'combat_modifier' && effect.combatStat) {
          this.addCombatStatModifier(effect.combatStat, -effect.magnitude);
        }

        // Notify when effect expires (unless hidden)
        if (!effect.hidden) {
          // Determine message color based on category
          const category = effect.category;
          let color = 'yellow';
          if (category === 'debuff') {
            color = 'green'; // Debuff wearing off is good
          } else if (category === 'buff') {
            color = 'yellow'; // Buff wearing off is a warning
          }
          this.receive(`{${color}}${effect.name} has worn off.{/}\n`);
        }

        // Call onExpire callback
        if (effect.onExpire) {
          effect.onExpire(this, effect);
        }

        this._effects.delete(id);
      }
    }
  }

  /**
   * Remove all effects.
   */
  clearEffects(): void {
    for (const effect of this._effects.values()) {
      // Remove stat modifiers
      if (effect.type === 'stat_modifier' && effect.stat) {
        this.addStatModifier(effect.stat, -effect.magnitude);
      }
      if (effect.type === 'combat_modifier' && effect.combatStat) {
        this.addCombatStatModifier(effect.combatStat, -effect.magnitude);
      }
    }
    this._effects.clear();
  }

  // ========== Combat State ==========

  /**
   * Check if in combat.
   */
  get inCombat(): boolean {
    return this._inCombat;
  }

  /**
   * Get current combat target.
   */
  get combatTarget(): Living | null {
    return this._combatTarget;
  }

  /**
   * Get all attackers currently targeting this living.
   */
  get attackers(): Living[] {
    return Array.from(this._attackers);
  }

  /**
   * Start combat with a target.
   * @param target The target to attack
   */
  startCombat(target: Living): void {
    this._inCombat = true;
    this._combatTarget = target;
    target.addAttacker(this);
  }

  /**
   * End combat (clear target and combat state).
   */
  endCombat(): void {
    // Remove self from target's attackers
    if (this._combatTarget) {
      this._combatTarget.removeAttacker(this);
    }
    this._inCombat = false;
    this._combatTarget = null;

    // If no one is attacking us anymore, we're fully out of combat
    if (this._attackers.size === 0) {
      this._inCombat = false;
    }
  }

  /**
   * Add an attacker to the list.
   * @param attacker The attacker
   */
  addAttacker(attacker: Living): void {
    this._attackers.add(attacker);
    this._inCombat = true;
  }

  /**
   * Remove an attacker from the list.
   * @param attacker The attacker to remove
   */
  removeAttacker(attacker: Living): void {
    this._attackers.delete(attacker);

    // If no more attackers and we have no target, we're out of combat
    if (this._attackers.size === 0 && !this._combatTarget) {
      this._inCombat = false;
    }
  }

  /**
   * Check if being attacked.
   */
  isBeingAttacked(): boolean {
    return this._attackers.size > 0;
  }

  /**
   * Check if this living is stunned (cannot attack).
   */
  isStunned(): boolean {
    for (const effect of this._effects.values()) {
      if (effect.type === 'stun') return true;
    }
    return false;
  }

  /**
   * Check if this living is invulnerable.
   */
  isInvulnerable(): boolean {
    for (const effect of this._effects.values()) {
      if (effect.type === 'invulnerable') return true;
    }
    return false;
  }

  /**
   * Get total thorns damage to reflect to attackers.
   */
  getThornsDamage(): number {
    let total = 0;
    for (const effect of this._effects.values()) {
      if (effect.type === 'thorns') {
        total += effect.magnitude * (effect.stacks || 1);
      }
    }
    return total;
  }

  /**
   * Get total damage shield absorption remaining.
   */
  getDamageShield(): number {
    let total = 0;
    for (const effect of this._effects.values()) {
      if (effect.type === 'damage_shield') {
        total += effect.magnitude * (effect.stacks || 1);
      }
    }
    return total;
  }

  /**
   * Absorb damage with damage shield effects.
   * @param amount The damage amount
   * @returns The remaining damage after absorption
   */
  absorbDamageShield(amount: number): number {
    let remaining = amount;

    for (const [id, effect] of this._effects) {
      if (effect.type === 'damage_shield' && remaining > 0) {
        const absorbed = Math.min(remaining, effect.magnitude);
        effect.magnitude -= absorbed;
        remaining -= absorbed;

        // Remove depleted shields
        if (effect.magnitude <= 0) {
          this._effects.delete(id);
        }
      }
    }

    return remaining;
  }

  // Individual stat getters for convenience
  get strength(): number {
    return this.getStat('strength');
  }

  get intelligence(): number {
    return this.getStat('intelligence');
  }

  get wisdom(): number {
    return this.getStat('wisdom');
  }

  get charisma(): number {
    return this.getStat('charisma');
  }

  get dexterity(): number {
    return this.getStat('dexterity');
  }

  get constitution(): number {
    return this.getStat('constitution');
  }

  get luck(): number {
    return this.getStat('luck');
  }

  // Individual stat setters for convenience (sets base stat)
  set strength(value: number) {
    this.setBaseStat('strength', value);
  }

  set intelligence(value: number) {
    this.setBaseStat('intelligence', value);
  }

  set wisdom(value: number) {
    this.setBaseStat('wisdom', value);
  }

  set charisma(value: number) {
    this.setBaseStat('charisma', value);
  }

  set dexterity(value: number) {
    this.setBaseStat('dexterity', value);
  }

  set constitution(value: number) {
    this.setBaseStat('constitution', value);
  }

  set luck(value: number) {
    this.setBaseStat('luck', value);
  }

  // ========== Setup ==========

  /**
   * Configure the living.
   */
  setLiving(options: {
    name?: string;
    title?: string;
    gender?: 'male' | 'female' | 'neutral';
    level?: number;
    health?: number;
    maxHealth?: number;
    mana?: number;
    maxMana?: number;
    stats?: Partial<Stats>;
  }): void {
    if (options.name) this.name = options.name;
    if (options.title) this.title = options.title;
    if (options.gender) this.gender = options.gender;
    if (options.level !== undefined) this.level = options.level;
    if (options.maxHealth) this.maxHealth = options.maxHealth;
    if (options.health !== undefined) this.health = options.health;
    if (options.maxMana) this.maxMana = options.maxMana;
    if (options.mana !== undefined) this.mana = options.mana;
    if (options.stats) this.setBaseStats(options.stats);
  }

  /**
   * Generate random stats using 3d6 method.
   * Generates values between 3 and 18.
   */
  rollStats(): void {
    const roll3d6 = () => {
      let total = 0;
      for (let i = 0; i < 3; i++) {
        total += Math.floor(Math.random() * 6) + 1;
      }
      return total;
    };

    this._baseStats = {
      strength: roll3d6(),
      intelligence: roll3d6(),
      wisdom: roll3d6(),
      charisma: roll3d6(),
      dexterity: roll3d6(),
      constitution: roll3d6(),
      luck: roll3d6(),
    };
  }

  /**
   * Generate random stats using 4d6-drop-lowest method.
   * Generally produces higher stats (10-18 range is common).
   */
  rollStatsHeroic(): void {
    const roll4d6DropLowest = () => {
      const rolls = [];
      for (let i = 0; i < 4; i++) {
        rolls.push(Math.floor(Math.random() * 6) + 1);
      }
      rolls.sort((a, b) => b - a); // Sort descending
      return rolls[0] + rolls[1] + rolls[2]; // Sum top 3
    };

    this._baseStats = {
      strength: roll4d6DropLowest(),
      intelligence: roll4d6DropLowest(),
      wisdom: roll4d6DropLowest(),
      charisma: roll4d6DropLowest(),
      dexterity: roll4d6DropLowest(),
      constitution: roll4d6DropLowest(),
      luck: roll4d6DropLowest(),
    };
  }
}

export default Living;
