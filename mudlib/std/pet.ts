/**
 * Pet - Base class for player pets/companions.
 *
 * Pets are owned by players, follow them around, and can carry items.
 * Only owners can access pet inventory, and pets can only be attacked
 * when PK is enabled.
 */

import { NPC } from './npc.js';
import { Living } from './living.js';
import { MudObject } from './object.js';
import { Room } from './room.js';
import { Corpse } from './corpse.js';
import { Item } from './item.js';
import { getCombatDaemon } from '../daemons/combat.js';
import type { ConfigDaemon } from '../daemons/config.js';

// Re-export PetSaveData from player.ts for convenience
export type { PetSaveData } from './player.js';

/**
 * Pet template definition for creating different pet types.
 */
export interface PetTemplate {
  type: string;           // 'horse', 'mule', 'dog', 'floating_chest'
  shortDesc: string;
  longDesc: string;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  maxItems: number;
  maxWeight: number;
  health: number;
  cost: number;
}

/**
 * Pet class - extends NPC with pet-specific behavior.
 */
export class Pet extends NPC {
  readonly isPet: boolean = true;

  // Owner tracking
  private _ownerName: string | null = null;
  private _petName: string | null = null;
  private _petId: string;
  private _templateType: string = 'generic';

  // Base short description (e.g., "a floating chest")
  private _baseShortDesc: string = 'a pet';

  // Container capacity
  private _maxItems: number = 20;
  private _maxWeight: number = 200;

  // Follow state
  private _following: boolean = true;

  // Sent away state (pet is stored, not in world)
  private _sentAway: boolean = false;

  constructor() {
    super();
    // Generate unique pet ID
    this._petId = `pet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this._baseShortDesc = 'a pet';
    this.longDesc = 'A loyal companion.';
  }

  // ========== Short Description Override ==========

  /**
   * Get the short description.
   * Returns "<Custom name>, a <pet type> owned by <Owner>" or "a <pet type> owned by <Owner>"
   */
  override get shortDesc(): string {
    if (this._petName && this._ownerName) {
      return `${this._petName}, ${this._baseShortDesc} owned by ${this._ownerName}`;
    } else if (this._ownerName) {
      return `${this._baseShortDesc} owned by ${this._ownerName}`;
    } else if (this._petName) {
      return `${this._petName}, ${this._baseShortDesc}`;
    }
    return this._baseShortDesc;
  }

  /**
   * Set the base short description (e.g., "a floating chest").
   */
  override set shortDesc(value: string) {
    this._baseShortDesc = value;
  }

  /**
   * Get the base short description without owner/name info.
   */
  get baseShortDesc(): string {
    return this._baseShortDesc;
  }

  // ========== Owner Management ==========

  /**
   * Get the owner's name.
   */
  get ownerName(): string | null {
    return this._ownerName;
  }

  /**
   * Set the owner's name.
   */
  set ownerName(name: string | null) {
    this._ownerName = name;
  }

  /**
   * Get the pet's custom name.
   */
  get petName(): string | null {
    return this._petName;
  }

  /**
   * Set the pet's custom name.
   */
  set petName(name: string | null) {
    this._petName = name;
  }

  /**
   * Get the pet's unique ID.
   */
  get petId(): string {
    return this._petId;
  }

  /**
   * Get the template type.
   */
  get templateType(): string {
    return this._templateType;
  }

  /**
   * Set the template type.
   */
  set templateType(type: string) {
    this._templateType = type;
  }

  /**
   * Check if someone is the owner of this pet.
   */
  isOwner(who: MudObject): boolean {
    if (!this._ownerName) return false;
    const whoName = (who as Living & { name?: string }).name;
    return whoName?.toLowerCase() === this._ownerName.toLowerCase();
  }

  // ========== Container Capacity ==========

  /**
   * Get the maximum number of items this pet can carry.
   */
  get maxItems(): number {
    return this._maxItems;
  }

  /**
   * Set the maximum number of items.
   */
  set maxItems(value: number) {
    this._maxItems = Math.max(0, value);
  }

  /**
   * Get the maximum weight this pet can carry.
   */
  get maxWeight(): number {
    return this._maxWeight;
  }

  /**
   * Set the maximum weight.
   */
  set maxWeight(value: number) {
    this._maxWeight = Math.max(0, value);
  }

  /**
   * Get the current number of items.
   */
  get itemCount(): number {
    return this.inventory.length;
  }

  /**
   * Get the current total weight of items.
   */
  get currentWeight(): number {
    let total = 0;
    for (const obj of this.inventory) {
      const item = obj as Item;
      if (typeof item.weight === 'number') {
        total += item.weight;
      }
    }
    return total;
  }

  /**
   * Get remaining item capacity.
   */
  get remainingItems(): number {
    return Math.max(0, this._maxItems - this.itemCount);
  }

  /**
   * Get remaining weight capacity.
   */
  get remainingWeight(): number {
    return Math.max(0, this._maxWeight - this.currentWeight);
  }

  /**
   * Check if an item can be placed in this pet's inventory.
   */
  canHold(item: MudObject): boolean {
    if (this.itemCount >= this._maxItems) {
      return false;
    }

    const itemObj = item as Item;
    if (typeof itemObj.weight === 'number') {
      if (this.currentWeight + itemObj.weight > this._maxWeight) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the reason why an item can't be held.
   */
  getCannotHoldReason(item: MudObject): string | null {
    if (this.itemCount >= this._maxItems) {
      return `${this.getDisplayShortDesc()} is carrying too many items.`;
    }

    const itemObj = item as Item;
    if (typeof itemObj.weight === 'number') {
      if (this.currentWeight + itemObj.weight > this._maxWeight) {
        return `${this.getDisplayShortDesc()} cannot carry that much weight.`;
      }
    }

    return null;
  }

  // ========== Inventory Access Control ==========

  /**
   * Check if someone can access this pet's inventory.
   * Only the owner can take items from the pet.
   * Anyone can put items into the pet (giving items).
   */
  canAccessInventory(who: MudObject): boolean {
    return this.isOwner(who);
  }

  // ========== Combat/Attack Control ==========

  /**
   * Check if this pet can be attacked.
   * Pets can only be attacked when PK is enabled.
   */
  canBeAttacked(attacker: MudObject): { canAttack: boolean; reason: string } {
    // Get config daemon to check PK setting
    const configDaemon = typeof efuns !== 'undefined'
      ? efuns.findObject('/daemons/config') as ConfigDaemon | undefined
      : undefined;
    const pkEnabled = configDaemon?.get<boolean>('combat.playerKilling') ?? false;

    if (!pkEnabled) {
      return {
        canAttack: false,
        reason: `${this.getDisplayShortDesc()} belongs to ${this._ownerName}. Player killing is disabled.`,
      };
    }

    // PK enabled - allow attack
    return { canAttack: true, reason: '' };
  }

  // ========== Follow Behavior ==========

  /**
   * Check if this pet is following its owner.
   */
  get following(): boolean {
    return this._following;
  }

  /**
   * Set whether this pet should follow its owner.
   */
  set following(value: boolean) {
    this._following = value;
  }

  /**
   * Check if this pet is sent away.
   */
  get sentAway(): boolean {
    return this._sentAway;
  }

  /**
   * Set whether this pet is sent away.
   */
  set sentAway(value: boolean) {
    this._sentAway = value;
  }

  /**
   * Follow the owner when they move.
   * Called by the pet daemon when the owner moves rooms.
   */
  async followOwner(
    owner: MudObject,
    fromRoom: MudObject,
    toRoom: MudObject,
    direction: string
  ): Promise<boolean> {
    if (!this._following) {
      return false;
    }

    if (this._sentAway) {
      return false;
    }

    // Can't follow if in combat
    if (this.inCombat) {
      const ownerLiving = owner as Living;
      ownerLiving.receive?.(`{yellow}${this.getDisplayShortDesc()} is in combat and cannot follow you.{/}\n`);
      return false;
    }

    // Make sure we're in the same room as the owner was
    if (this.environment !== fromRoom) {
      return false;
    }

    // Move to the new room
    const moved = await this.moveTo(toRoom);
    if (!moved) {
      return false;
    }

    // Broadcast follow message to the new room
    const newRoom = toRoom as Room & { broadcast?: (msg: string, opts?: { exclude?: MudObject[] }) => void };
    if (newRoom.broadcast) {
      newRoom.broadcast(
        `{dim}${this.getDisplayShortDesc()} follows ${this._ownerName} ${direction}.{/}`,
        { exclude: [owner] }
      );
    }

    return true;
  }

  // ========== Display ==========

  /**
   * Get the display short description for messages.
   * Returns "Shadowmere the horse" if named, or "a horse" if not.
   * Does not include owner info (use shortDesc for that).
   */
  getDisplayShortDesc(): string {
    if (this._petName) {
      // Named pet: "Shadowmere the floating chest"
      return `${this._petName} the ${this._baseShortDesc.replace(/^(a|an|the)\s+/i, '')}`;
    }
    return this._baseShortDesc;
  }

  /**
   * Get the full description for the look command.
   */
  getFullDescription(): string {
    const lines: string[] = [];

    // Long description
    lines.push(this.longDesc);
    lines.push('');

    // Pet name and owner
    if (this._petName) {
      lines.push(`This is ${this._petName}, a pet belonging to ${this._ownerName}.`);
    } else {
      lines.push(`This pet belongs to ${this._ownerName}.`);
    }

    // Health status
    const healthPct = this.healthPercent;
    let healthDesc: string;
    if (healthPct >= 90) {
      healthDesc = 'in excellent health';
    } else if (healthPct >= 70) {
      healthDesc = 'in good health';
    } else if (healthPct >= 50) {
      healthDesc = 'somewhat injured';
    } else if (healthPct >= 30) {
      healthDesc = 'badly wounded';
    } else {
      healthDesc = 'near death';
    }
    lines.push(`${this._petName || 'It'} appears to be ${healthDesc}.`);

    // Inventory count
    if (this.inventory.length > 0) {
      lines.push(`${this._petName || 'It'} is carrying ${this.inventory.length} item${this.inventory.length !== 1 ? 's' : ''}.`);
    }

    return lines.join('\n');
  }

  // ========== Death Handling ==========

  /**
   * Called when the pet dies.
   * Creates a corpse with inventory, notifies owner, destroys pet.
   */
  override async onDeath(): Promise<void> {
    const deathRoom = this.environment;

    // End all combat
    const combatDaemon = getCombatDaemon();
    combatDaemon.endAllCombats(this);

    // Create corpse
    const corpse = new Corpse();
    corpse.ownerName = this._petName || this.name;
    corpse.isPlayerCorpse = false;
    corpse.level = this.level;

    // Transfer pet's inventory to corpse
    const items = [...this.inventory];
    for (const item of items) {
      await item.moveTo(corpse);
    }

    // Move corpse to death location
    if (deathRoom) {
      await corpse.moveTo(deathRoom);
    }

    // Notify room and owner
    if (deathRoom && 'broadcast' in deathRoom) {
      const broadcast = (deathRoom as MudObject & { broadcast: (msg: string) => void }).broadcast.bind(deathRoom);
      broadcast(`{red}${this.getDisplayShortDesc()} has been slain!{/}\n`);
    }

    // Try to notify owner
    if (this._ownerName && typeof efuns !== 'undefined' && efuns.findActivePlayer) {
      const owner = efuns.findActivePlayer(this._ownerName);
      if (owner && 'receive' in owner) {
        (owner as MudObject & { receive: (msg: string) => void }).receive(
          `{red}Your pet ${this.getDisplayShortDesc()} has been killed!{/}\n`
        );
      }
    }

    // Remove from pet daemon registry
    import('../daemons/pet.js')
      .then(({ getPetDaemon }) => {
        const petDaemon = getPetDaemon();
        petDaemon.removePet(this._petId);
      })
      .catch(() => {
        // Pet daemon not available
      });

    // Destroy the pet
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.callOut(() => {
        efuns.destruct(this);
      }, 1000);
    }
  }

  // ========== Serialization ==========

  /**
   * Serialize the pet for saving.
   */
  serialize(): PetSaveData {
    // Get inventory item paths
    const inventoryPaths: string[] = [];
    for (const item of this.inventory) {
      if (item.objectPath) {
        inventoryPaths.push(item.objectPath);
      }
    }

    return {
      petId: this._petId,
      templateType: this._templateType,
      petName: this._petName,
      ownerName: this._ownerName || '',
      health: this.health,
      maxHealth: this.maxHealth,
      inventory: inventoryPaths,
      sentAway: this._sentAway,
    };
  }

  /**
   * Restore the pet from saved data.
   */
  restore(data: PetSaveData): void {
    this._petId = data.petId;
    this._templateType = data.templateType;
    this._petName = data.petName;
    this._ownerName = data.ownerName;
    this.health = data.health;
    this.maxHealth = data.maxHealth;
    this._sentAway = data.sentAway;

    // Inventory is restored separately by the pet daemon
  }

  /**
   * Restore inventory items from paths.
   * Called after the pet is restored.
   */
  async restoreInventory(itemPaths: string[]): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.cloneObject) {
      return;
    }

    for (const itemPath of itemPaths) {
      try {
        const item = await efuns.cloneObject(itemPath);
        if (item) {
          await item.moveTo(this);
        }
      } catch (error) {
        console.error(`[Pet] Error restoring inventory item ${itemPath}:`, error);
      }
    }
  }

  // ========== ID Matching ==========

  /**
   * Override id() to also match pet name.
   */
  override id(name: string): boolean {
    const lowerName = name.toLowerCase();

    // Check pet name
    if (this._petName && this._petName.toLowerCase() === lowerName) {
      return true;
    }

    // Check template type
    if (this._templateType.toLowerCase() === lowerName) {
      return true;
    }

    // Fall back to parent implementation
    return super.id(name);
  }

  // ========== Setup ==========

  /**
   * Configure the pet from a template.
   */
  setPetFromTemplate(template: PetTemplate, owner: string): void {
    this._templateType = template.type;
    this._ownerName = owner;
    this.shortDesc = template.shortDesc;
    this.longDesc = template.longDesc;
    this._maxItems = template.maxItems;
    this._maxWeight = template.maxWeight;
    this.maxHealth = template.health;
    this.health = template.health;

    // Set name to a readable version (replace underscores with spaces)
    this.name = template.type.replace(/_/g, ' ');

    // Add IDs for the template type
    this.addId(template.type);
    this.addId('pet');

    // Add individual words as IDs (e.g., "floating_chest" -> "floating", "chest")
    const words = template.type.split('_');
    for (const word of words) {
      if (word.length > 0) {
        this.addId(word);
      }
    }
  }

  // ========== Heartbeat Override ==========

  /**
   * Override heartbeat to disable NPC wandering and chat for pets.
   */
  override async heartbeat(): Promise<void> {
    // Pets don't wander or chat on their own
    // Just do basic living heartbeat (effect ticking, etc.)
    Living.prototype.heartbeat.call(this);

    if (!this.alive) return;
  }
}

export default Pet;
