/**
 * Pet Daemon - Central management for all active pets.
 *
 * Handles pet creation, tracking, follow behavior, and persistence.
 */

import { MudObject } from '../std/object.js';
import { Pet, type PetTemplate, type PetSaveData } from '../std/pet.js';
import type { Living } from '../std/living.js';

/**
 * Default pet templates.
 */
const DEFAULT_TEMPLATES: Map<string, PetTemplate> = new Map([
  ['dog', {
    type: 'dog',
    shortDesc: 'a loyal dog',
    longDesc: 'A friendly dog with bright eyes and a wagging tail. It looks eager to carry things for its owner.',
    size: 'small',
    maxItems: 5,
    maxWeight: 30,
    health: 50,
    cost: 100,
  }],
  ['mule', {
    type: 'mule',
    shortDesc: 'a sturdy mule',
    longDesc: 'A strong, patient mule built for carrying heavy loads. Its saddlebags look well-worn from many journeys.',
    size: 'large',
    maxItems: 30,
    maxWeight: 500,
    health: 100,
    cost: 500,
  }],
  ['horse', {
    type: 'horse',
    shortDesc: 'a swift horse',
    longDesc: 'A beautiful horse with a glossy coat. It has saddlebags for carrying supplies.',
    size: 'large',
    maxItems: 15,
    maxWeight: 200,
    health: 80,
    cost: 800,
  }],
  ['floating_chest', {
    type: 'floating_chest',
    shortDesc: 'a floating chest',
    longDesc: 'A magical chest that floats behind its owner. Arcane runes glow softly on its surface. It can hold an enormous amount of items.',
    size: 'medium',
    maxItems: 50,
    maxWeight: 1000,
    health: 30,
    cost: 2000,
  }],
]);

/**
 * Pet Daemon class.
 */
export class PetDaemon extends MudObject {
  /** Active pets tracked by petId */
  private _pets: Map<string, Pet> = new Map();

  /** Owner name -> Set of petIds */
  private _ownerPets: Map<string, Set<string>> = new Map();

  /** Custom templates (added at runtime) */
  private _templates: Map<string, PetTemplate> = new Map(DEFAULT_TEMPLATES);

  /** Sent-away pets stored by owner name -> PetSaveData[] */
  private _sentAwayPets: Map<string, PetSaveData[]> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Pet Daemon';
    this.longDesc = 'The pet daemon manages all active pets.';
  }

  // ========== Template Management ==========

  /**
   * Get a pet template by type.
   */
  getTemplate(type: string): PetTemplate | undefined {
    return this._templates.get(type);
  }

  /**
   * Get all available templates.
   */
  getAllTemplates(): PetTemplate[] {
    return Array.from(this._templates.values());
  }

  /**
   * Register a custom template.
   */
  registerTemplate(template: PetTemplate): void {
    this._templates.set(template.type, template);
  }

  // ========== Pet Creation ==========

  /**
   * Create a new pet for a player.
   */
  async createPet(owner: MudObject, templateType: string): Promise<Pet | null> {
    const template = this._templates.get(templateType);
    if (!template) {
      return null;
    }

    const ownerLiving = owner as Living & { name?: string };
    const ownerName = ownerLiving.name;
    if (!ownerName) {
      return null;
    }

    // Create the pet
    const pet = new Pet();

    // Set up identity
    if (typeof efuns !== 'undefined' && efuns.initCloneIdentity) {
      efuns.initCloneIdentity(pet, '/std/pet');
    }

    // Configure from template
    pet.setPetFromTemplate(template, ownerName);

    // Register in daemon
    this._pets.set(pet.petId, pet);

    // Track owner's pets
    let ownerPetSet = this._ownerPets.get(ownerName.toLowerCase());
    if (!ownerPetSet) {
      ownerPetSet = new Set();
      this._ownerPets.set(ownerName.toLowerCase(), ownerPetSet);
    }
    ownerPetSet.add(pet.petId);

    // Move to owner's location
    if (owner.environment) {
      await pet.moveTo(owner.environment);
    }

    return pet;
  }

  /**
   * Restore a pet from saved data (on player login).
   */
  async restorePet(owner: MudObject, saveData: PetSaveData): Promise<Pet | null> {
    const ownerLiving = owner as Living & { name?: string };
    const ownerName = ownerLiving.name;
    if (!ownerName) {
      return null;
    }

    // Check if this pet is sent away
    if (saveData.sentAway) {
      // Store in sent-away registry
      let sentAway = this._sentAwayPets.get(ownerName.toLowerCase());
      if (!sentAway) {
        sentAway = [];
        this._sentAwayPets.set(ownerName.toLowerCase(), sentAway);
      }
      sentAway.push(saveData);
      return null;
    }

    // Get template for the pet
    const template = this._templates.get(saveData.templateType);
    if (!template) {
      return null;
    }

    // Create the pet
    const pet = new Pet();

    // Set up identity
    if (typeof efuns !== 'undefined' && efuns.initCloneIdentity) {
      efuns.initCloneIdentity(pet, '/std/pet');
    }

    // Configure from template first
    pet.setPetFromTemplate(template, ownerName);

    // Restore saved state (overrides template defaults)
    pet.restore(saveData);

    // Restore inventory items
    await pet.restoreInventory(saveData.inventory);

    // Register in daemon
    this._pets.set(pet.petId, pet);

    // Track owner's pets
    let ownerPetSet = this._ownerPets.get(ownerName.toLowerCase());
    if (!ownerPetSet) {
      ownerPetSet = new Set();
      this._ownerPets.set(ownerName.toLowerCase(), ownerPetSet);
    }
    ownerPetSet.add(pet.petId);

    // Move to owner's location
    if (owner.environment) {
      await pet.moveTo(owner.environment);
    }

    return pet;
  }

  // ========== Pet Lookup ==========

  /**
   * Get all active pets for a player (not sent away).
   */
  getPlayerPets(ownerName: string): Pet[] {
    const petIds = this._ownerPets.get(ownerName.toLowerCase());
    if (!petIds) {
      return [];
    }

    const pets: Pet[] = [];
    for (const petId of petIds) {
      const pet = this._pets.get(petId);
      if (pet && !pet.sentAway) {
        pets.push(pet);
      }
    }
    return pets;
  }

  /**
   * Get all sent-away pets for a player.
   */
  getSentAwayPets(ownerName: string): PetSaveData[] {
    return this._sentAwayPets.get(ownerName.toLowerCase()) || [];
  }

  /**
   * Get a pet by its custom name.
   */
  getPetByName(ownerName: string, petName: string): Pet | undefined {
    const pets = this.getPlayerPets(ownerName);
    const lowerName = petName.toLowerCase();

    return pets.find(pet =>
      pet.petName?.toLowerCase() === lowerName ||
      pet.templateType.toLowerCase() === lowerName
    );
  }

  /**
   * Get a pet by its ID.
   */
  getPetById(petId: string): Pet | undefined {
    return this._pets.get(petId);
  }

  // ========== Follow System ==========

  /**
   * Handle owner movement - trigger pet follows.
   */
  async handleOwnerMovement(
    owner: MudObject,
    fromRoom: MudObject,
    toRoom: MudObject,
    direction: string
  ): Promise<void> {
    const ownerLiving = owner as Living & { name?: string };
    const ownerName = ownerLiving.name;
    if (!ownerName) {
      return;
    }

    const pets = this.getPlayerPets(ownerName);
    for (const pet of pets) {
      if (pet.following && pet.environment === fromRoom) {
        await pet.followOwner(owner, fromRoom, toRoom, direction);
      }
    }
  }

  // ========== Send/Recall ==========

  /**
   * Send a pet away (store in daemon, remove from world).
   */
  sendAway(pet: Pet): boolean {
    if (pet.sentAway) {
      return false;
    }

    const ownerName = pet.ownerName;
    if (!ownerName) {
      return false;
    }

    // Serialize the pet
    const saveData = pet.serialize();
    saveData.sentAway = true;

    // Store in sent-away registry
    let sentAway = this._sentAwayPets.get(ownerName.toLowerCase());
    if (!sentAway) {
      sentAway = [];
      this._sentAwayPets.set(ownerName.toLowerCase(), sentAway);
    }
    sentAway.push(saveData);

    // Remove from active registry
    this._pets.delete(pet.petId);
    const ownerPetSet = this._ownerPets.get(ownerName.toLowerCase());
    if (ownerPetSet) {
      ownerPetSet.delete(pet.petId);
    }

    // Remove from world
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.destruct(pet);
    }

    return true;
  }

  /**
   * Recall a sent-away pet back to the owner's location.
   */
  async recall(owner: MudObject, petIdOrIndex: string | number): Promise<Pet | null> {
    const ownerLiving = owner as Living & { name?: string };
    const ownerName = ownerLiving.name;
    if (!ownerName) {
      return null;
    }

    const sentAway = this._sentAwayPets.get(ownerName.toLowerCase());
    if (!sentAway || sentAway.length === 0) {
      return null;
    }

    // Find the pet data
    let dataIndex: number;
    if (typeof petIdOrIndex === 'number') {
      dataIndex = petIdOrIndex;
    } else {
      dataIndex = sentAway.findIndex(data =>
        data.petId === petIdOrIndex ||
        data.petName?.toLowerCase() === petIdOrIndex.toLowerCase() ||
        data.templateType.toLowerCase() === petIdOrIndex.toLowerCase()
      );
    }

    if (dataIndex < 0 || dataIndex >= sentAway.length) {
      return null;
    }

    // Remove from sent-away list
    const [saveData] = sentAway.splice(dataIndex, 1);
    saveData.sentAway = false;

    // Restore the pet
    return this.restorePet(owner, saveData);
  }

  // ========== Pet Removal ==========

  /**
   * Remove a pet from the registry (on death or dismissal).
   */
  removePet(petId: string): boolean {
    const pet = this._pets.get(petId);
    if (!pet) {
      return false;
    }

    const ownerName = pet.ownerName;

    // Remove from active registry
    this._pets.delete(petId);

    // Remove from owner's pet set
    if (ownerName) {
      const ownerPetSet = this._ownerPets.get(ownerName.toLowerCase());
      if (ownerPetSet) {
        ownerPetSet.delete(petId);
      }
    }

    return true;
  }

  /**
   * Dismiss a pet permanently.
   */
  dismissPet(pet: Pet): boolean {
    const petId = pet.petId;
    const ownerName = pet.ownerName;

    // Remove from registries
    this._pets.delete(petId);

    if (ownerName) {
      const ownerPetSet = this._ownerPets.get(ownerName.toLowerCase());
      if (ownerPetSet) {
        ownerPetSet.delete(petId);
      }

      // Also check sent-away registry
      const sentAway = this._sentAwayPets.get(ownerName.toLowerCase());
      if (sentAway) {
        const index = sentAway.findIndex(data => data.petId === petId);
        if (index >= 0) {
          sentAway.splice(index, 1);
        }
      }
    }

    // Destroy the pet object
    if (typeof efuns !== 'undefined' && efuns.destruct) {
      efuns.destruct(pet);
    }

    return true;
  }

  // ========== Persistence Support ==========

  /**
   * Get all pet save data for a player (for saving with player data).
   */
  getPlayerPetSaveData(ownerName: string): PetSaveData[] {
    const result: PetSaveData[] = [];

    // Active pets
    const activePets = this.getPlayerPets(ownerName);
    for (const pet of activePets) {
      result.push(pet.serialize());
    }

    // Sent-away pets
    const sentAway = this._sentAwayPets.get(ownerName.toLowerCase()) || [];
    result.push(...sentAway);

    return result;
  }

  /**
   * Clean up all pets for a player (on logout).
   */
  cleanupPlayerPets(ownerName: string): void {
    const petIds = this._ownerPets.get(ownerName.toLowerCase());
    if (petIds) {
      for (const petId of petIds) {
        const pet = this._pets.get(petId);
        if (pet && typeof efuns !== 'undefined' && efuns.destruct) {
          efuns.destruct(pet);
        }
        this._pets.delete(petId);
      }
      this._ownerPets.delete(ownerName.toLowerCase());
    }

    // Don't delete sent-away pets - they persist across sessions
  }

  // ========== Stats ==========

  /**
   * Get the total number of active pets.
   */
  get activePetCount(): number {
    return this._pets.size;
  }

  /**
   * Get the total number of sent-away pets.
   */
  get sentAwayPetCount(): number {
    let count = 0;
    for (const pets of this._sentAwayPets.values()) {
      count += pets.length;
    }
    return count;
  }
}

// Singleton instance
let petDaemon: PetDaemon | null = null;

/**
 * Get the global PetDaemon instance.
 */
export function getPetDaemon(): PetDaemon {
  if (!petDaemon) {
    petDaemon = new PetDaemon();
  }
  return petDaemon;
}

/**
 * Reset the pet daemon (for testing).
 */
export function resetPetDaemon(): void {
  petDaemon = null;
}

export default PetDaemon;
