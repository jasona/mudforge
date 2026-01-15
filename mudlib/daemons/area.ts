/**
 * Area Daemon - Central registry and manager for draft areas.
 *
 * Provides a centralized system for creating, editing, and publishing
 * game areas. Tracks ownership, collaborators, and draft/published status.
 * Draft areas are stored as JSON and can be published to generate actual
 * TypeScript room/NPC/item files.
 *
 * Usage:
 *   const daemon = getAreaDaemon();
 *   const area = daemon.createArea('builder', { name: 'Dark Cave', region: 'valdoria', subregion: 'caves' });
 *   daemon.addRoom(area.id, { id: 'entrance', shortDesc: 'Cave Entrance', ... });
 *   await daemon.publishArea(area.id);
 */

import { MudObject } from '../std/object.js';
import type {
  AreaDefinition,
  AreaStatus,
  CreateAreaOptions,
  DraftRoom,
  DraftNPC,
  DraftItem,
  ValidationResult,
  PublishResult,
  AreaListEntry,
} from '../lib/area-types.js';

/**
 * Serialized format for persistence.
 */
interface SerializedAreas {
  areas: AreaDefinition[];
}

/**
 * Valid exit directions.
 */
const VALID_DIRECTIONS = [
  'north', 'south', 'east', 'west',
  'northeast', 'northwest', 'southeast', 'southwest',
  'up', 'down', 'in', 'out',
];

/**
 * Opposite direction mapping.
 */
const OPPOSITE_DIRECTION: Record<string, string> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  northeast: 'southwest',
  southwest: 'northeast',
  northwest: 'southeast',
  southeast: 'northwest',
  up: 'down',
  down: 'up',
  in: 'out',
  out: 'in',
};

/**
 * Area Daemon class.
 */
export class AreaDaemon extends MudObject {
  private _areas: Map<string, AreaDefinition> = new Map();
  private _dirty: boolean = false;
  private _loaded: boolean = false;

  constructor() {
    super();
    this.shortDesc = 'Area Daemon';
    this.longDesc = 'The area daemon manages draft areas for the area building system.';
  }

  // ==================== Area CRUD ====================

  /**
   * Create a new draft area.
   */
  createArea(builder: string, options: CreateAreaOptions): AreaDefinition {
    const id = `${options.region}:${options.subregion}`;

    // Check if area already exists
    if (this._areas.has(id)) {
      throw new Error(`Area ${id} already exists`);
    }

    const now = Date.now();
    const area: AreaDefinition = {
      id,
      name: options.name,
      region: options.region,
      subregion: options.subregion,
      description: options.description ?? '',
      theme: options.theme ?? '',
      mood: undefined,
      owner: builder.toLowerCase(),
      collaborators: [],
      status: 'draft',
      version: 1,
      gridSize: options.gridSize ?? { width: 10, height: 10, depth: 1 },
      rooms: [],
      npcs: [],
      items: [],
      tags: [],
      loreReferences: [],
      createdAt: now,
      updatedAt: now,
    };

    this._areas.set(id, area);
    this._dirty = true;
    console.log(`[AreaDaemon] Created area ${id} for ${builder}`);
    return area;
  }

  /**
   * Get an area by ID.
   */
  getArea(areaId: string): AreaDefinition | undefined {
    return this._areas.get(areaId);
  }

  /**
   * Update an area's metadata.
   */
  updateArea(areaId: string, updates: Partial<Omit<AreaDefinition, 'id' | 'createdAt' | 'owner'>>): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    // Apply updates (excluding protected fields)
    const { rooms, npcs, items, ...safeUpdates } = updates;
    Object.assign(area, safeUpdates, { updatedAt: Date.now() });

    this._dirty = true;
    return true;
  }

  /**
   * Delete a draft area.
   */
  deleteArea(areaId: string): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    // Don't allow deleting published areas (they have files on disk)
    if (area.status === 'published') {
      throw new Error('Cannot delete a published area. Use unpublish first.');
    }

    this._areas.delete(areaId);
    this._dirty = true;
    console.log(`[AreaDaemon] Deleted area ${areaId}`);
    return true;
  }

  /**
   * Get all areas.
   */
  getAllAreas(): AreaDefinition[] {
    return Array.from(this._areas.values());
  }

  // ==================== Ownership & Access ====================

  /**
   * Get all areas for a builder (owned or collaborating).
   */
  getAreasForBuilder(builder: string): AreaDefinition[] {
    const lowerBuilder = builder.toLowerCase();
    return Array.from(this._areas.values()).filter(area =>
      area.owner === lowerBuilder || area.collaborators.includes(lowerBuilder)
    );
  }

  /**
   * Check if a builder can access an area.
   */
  canBuilderAccess(builder: string, areaId: string): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const lowerBuilder = builder.toLowerCase();
    return area.owner === lowerBuilder || area.collaborators.includes(lowerBuilder);
  }

  /**
   * Add a collaborator to an area.
   */
  addCollaborator(areaId: string, collaborator: string): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const lowerCollab = collaborator.toLowerCase();
    if (area.collaborators.includes(lowerCollab)) return true;

    area.collaborators.push(lowerCollab);
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Remove a collaborator from an area.
   */
  removeCollaborator(areaId: string, collaborator: string): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const lowerCollab = collaborator.toLowerCase();
    const idx = area.collaborators.indexOf(lowerCollab);
    if (idx < 0) return false;

    area.collaborators.splice(idx, 1);
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Get a list of areas formatted for UI display.
   */
  getAreaListForBuilder(builder: string): AreaListEntry[] {
    const lowerBuilder = builder.toLowerCase();
    return this.getAreasForBuilder(builder).map(area => ({
      id: area.id,
      name: area.name,
      status: area.status,
      roomCount: area.rooms.length,
      updatedAt: area.updatedAt,
      isOwner: area.owner === lowerBuilder,
    }));
  }

  // ==================== Room Management ====================

  /**
   * Add a room to an area.
   */
  addRoom(areaId: string, room: DraftRoom): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    // Check for duplicate ID
    if (area.rooms.some(r => r.id === room.id)) {
      throw new Error(`Room ${room.id} already exists in area ${areaId}`);
    }

    // Validate coordinates are within grid
    if (room.x < 0 || room.x >= area.gridSize.width ||
        room.y < 0 || room.y >= area.gridSize.height ||
        room.z < 0 || room.z >= area.gridSize.depth) {
      throw new Error(`Room coordinates (${room.x},${room.y},${room.z}) out of grid bounds`);
    }

    // Check for coordinate collision
    if (area.rooms.some(r => r.x === room.x && r.y === room.y && r.z === room.z)) {
      throw new Error(`A room already exists at coordinates (${room.x},${room.y},${room.z})`);
    }

    // Set entity creation timestamp
    room.updatedAt = Date.now();
    area.rooms.push(room);
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Update a room in an area.
   */
  updateRoom(areaId: string, roomId: string, updates: Partial<Omit<DraftRoom, 'id'>>): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const room = area.rooms.find(r => r.id === roomId);
    if (!room) return false;

    // If coordinates are changing, validate
    if (updates.x !== undefined || updates.y !== undefined || updates.z !== undefined) {
      const newX = updates.x ?? room.x;
      const newY = updates.y ?? room.y;
      const newZ = updates.z ?? room.z;

      // Check bounds
      if (newX < 0 || newX >= area.gridSize.width ||
          newY < 0 || newY >= area.gridSize.height ||
          newZ < 0 || newZ >= area.gridSize.depth) {
        throw new Error(`Room coordinates (${newX},${newY},${newZ}) out of grid bounds`);
      }

      // Check collision (excluding this room)
      if (area.rooms.some(r => r.id !== roomId && r.x === newX && r.y === newY && r.z === newZ)) {
        throw new Error(`A room already exists at coordinates (${newX},${newY},${newZ})`);
      }
    }

    Object.assign(room, updates);
    room.updatedAt = Date.now();
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Delete a room from an area.
   */
  deleteRoom(areaId: string, roomId: string): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const idx = area.rooms.findIndex(r => r.id === roomId);
    if (idx < 0) return false;

    // Remove exits pointing to this room from other rooms
    for (const room of area.rooms) {
      for (const [dir, target] of Object.entries(room.exits)) {
        if (target === roomId) {
          delete room.exits[dir];
        }
      }
    }

    area.rooms.splice(idx, 1);
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Get a room by ID.
   */
  getRoom(areaId: string, roomId: string): DraftRoom | undefined {
    const area = this._areas.get(areaId);
    if (!area) return undefined;
    return area.rooms.find(r => r.id === roomId);
  }

  /**
   * Connect two rooms with exits.
   */
  connectRooms(areaId: string, room1Id: string, direction: string, room2Id: string, bidirectional: boolean = true): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const room1 = area.rooms.find(r => r.id === room1Id);
    const room2 = area.rooms.find(r => r.id === room2Id);
    if (!room1 || !room2) return false;

    // Validate direction
    const lowerDir = direction.toLowerCase();
    if (!VALID_DIRECTIONS.includes(lowerDir)) {
      throw new Error(`Invalid direction: ${direction}`);
    }

    // Add exit from room1 to room2
    room1.exits[lowerDir] = room2Id;
    room1.updatedAt = Date.now();

    // Add reverse exit if bidirectional
    if (bidirectional) {
      const opposite = OPPOSITE_DIRECTION[lowerDir];
      if (opposite) {
        room2.exits[opposite] = room1Id;
        room2.updatedAt = Date.now();
      }
    }

    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Disconnect an exit.
   */
  disconnectExit(areaId: string, roomId: string, direction: string, bidirectional: boolean = true): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const room = area.rooms.find(r => r.id === roomId);
    if (!room) return false;

    const lowerDir = direction.toLowerCase();
    const targetId = room.exits[lowerDir];
    if (!targetId) return false;

    delete room.exits[lowerDir];
    room.updatedAt = Date.now();

    // Remove reverse exit if bidirectional
    if (bidirectional) {
      const opposite = OPPOSITE_DIRECTION[lowerDir];
      if (opposite) {
        const targetRoom = area.rooms.find(r => r.id === targetId);
        if (targetRoom && targetRoom.exits[opposite] === roomId) {
          delete targetRoom.exits[opposite];
          targetRoom.updatedAt = Date.now();
        }
      }
    }

    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  // ==================== NPC Management ====================

  /**
   * Add an NPC to an area.
   */
  addNPC(areaId: string, npc: DraftNPC): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    if (area.npcs.some(n => n.id === npc.id)) {
      throw new Error(`NPC ${npc.id} already exists in area ${areaId}`);
    }

    // Set entity creation timestamp
    npc.updatedAt = Date.now();
    area.npcs.push(npc);
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Update an NPC in an area.
   */
  updateNPC(areaId: string, npcId: string, updates: Partial<Omit<DraftNPC, 'id'>>): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const npc = area.npcs.find(n => n.id === npcId);
    if (!npc) return false;

    Object.assign(npc, updates);
    npc.updatedAt = Date.now();
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Delete an NPC from an area.
   */
  deleteNPC(areaId: string, npcId: string): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const idx = area.npcs.findIndex(n => n.id === npcId);
    if (idx < 0) return false;

    // Remove NPC references from rooms
    for (const room of area.rooms) {
      const npcIdx = room.npcs.indexOf(npcId);
      if (npcIdx >= 0) {
        room.npcs.splice(npcIdx, 1);
      }
    }

    area.npcs.splice(idx, 1);
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Get an NPC by ID.
   */
  getNPC(areaId: string, npcId: string): DraftNPC | undefined {
    const area = this._areas.get(areaId);
    if (!area) return undefined;
    return area.npcs.find(n => n.id === npcId);
  }

  // ==================== Item Management ====================

  /**
   * Add an item to an area.
   */
  addItem(areaId: string, item: DraftItem): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    if (area.items.some(i => i.id === item.id)) {
      throw new Error(`Item ${item.id} already exists in area ${areaId}`);
    }

    // Set entity creation timestamp
    item.updatedAt = Date.now();
    area.items.push(item);
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Update an item in an area.
   */
  updateItem(areaId: string, itemId: string, updates: Partial<Omit<DraftItem, 'id'>>): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const item = area.items.find(i => i.id === itemId);
    if (!item) return false;

    Object.assign(item, updates);
    item.updatedAt = Date.now();
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Delete an item from an area.
   */
  deleteItem(areaId: string, itemId: string): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    const idx = area.items.findIndex(i => i.id === itemId);
    if (idx < 0) return false;

    // Remove item references from rooms
    for (const room of area.rooms) {
      const itemIdx = room.items.indexOf(itemId);
      if (itemIdx >= 0) {
        room.items.splice(itemIdx, 1);
      }
    }

    area.items.splice(idx, 1);
    area.updatedAt = Date.now();
    this._dirty = true;
    return true;
  }

  /**
   * Get an item by ID.
   */
  getItem(areaId: string, itemId: string): DraftItem | undefined {
    const area = this._areas.get(areaId);
    if (!area) return undefined;
    return area.items.find(i => i.id === itemId);
  }

  // ==================== Validation ====================

  /**
   * Validate an area for publishing.
   */
  validateArea(areaId: string): ValidationResult {
    const area = this._areas.get(areaId);
    if (!area) {
      return { valid: false, errors: ['Area not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Must have at least one room
    if (area.rooms.length === 0) {
      errors.push('Area must have at least one room');
    }

    // Must have an entrance
    const entrance = area.rooms.find(r => r.isEntrance);
    if (!entrance) {
      errors.push('Area must have an entrance room (isEntrance: true)');
    }

    // Check all rooms have required fields
    for (const room of area.rooms) {
      if (!room.shortDesc || room.shortDesc.trim() === '') {
        errors.push(`Room ${room.id} is missing shortDesc`);
      }
      if (!room.longDesc || room.longDesc.trim() === '') {
        warnings.push(`Room ${room.id} is missing longDesc`);
      }
      if (!room.terrain) {
        errors.push(`Room ${room.id} is missing terrain`);
      }
    }

    // Check NPCs have required fields
    for (const npc of area.npcs) {
      if (!npc.name || npc.name.trim() === '') {
        errors.push(`NPC ${npc.id} is missing name`);
      }
      if (!npc.shortDesc || npc.shortDesc.trim() === '') {
        errors.push(`NPC ${npc.id} is missing shortDesc`);
      }
      if (npc.level <= 0) {
        warnings.push(`NPC ${npc.id} has invalid level (${npc.level})`);
      }
      if (npc.maxHealth <= 0) {
        warnings.push(`NPC ${npc.id} has invalid maxHealth (${npc.maxHealth})`);
      }
    }

    // Check items have required fields
    for (const item of area.items) {
      if (!item.name || item.name.trim() === '') {
        errors.push(`Item ${item.id} is missing name`);
      }
      if (!item.type) {
        errors.push(`Item ${item.id} is missing type`);
      }

      // Validate weapon-specific properties
      if (item.type === 'weapon') {
        const props = item.properties ?? {};
        const minDamage = props.minDamage as number | undefined;
        const maxDamage = props.maxDamage as number | undefined;
        const damageType = props.damageType as string | undefined;
        const handedness = props.handedness as string | undefined;
        const attackSpeed = props.attackSpeed as number | undefined;

        if (minDamage === undefined || minDamage < 0) {
          warnings.push(`Weapon ${item.id} has invalid minDamage (${minDamage ?? 'undefined'})`);
        }
        if (maxDamage === undefined || maxDamage < 0) {
          warnings.push(`Weapon ${item.id} has invalid maxDamage (${maxDamage ?? 'undefined'})`);
        }
        if (minDamage !== undefined && maxDamage !== undefined && minDamage > maxDamage) {
          errors.push(`Weapon ${item.id} has minDamage (${minDamage}) greater than maxDamage (${maxDamage})`);
        }
        if (damageType && !['slashing', 'piercing', 'bludgeoning', 'fire', 'ice', 'lightning', 'poison', 'holy', 'dark'].includes(damageType)) {
          warnings.push(`Weapon ${item.id} has invalid damageType "${damageType}"`);
        }
        if (handedness && !['one_handed', 'two_handed'].includes(handedness)) {
          warnings.push(`Weapon ${item.id} has invalid handedness "${handedness}"`);
        }
        if (attackSpeed !== undefined && (attackSpeed < -0.5 || attackSpeed > 0.5)) {
          warnings.push(`Weapon ${item.id} has attackSpeed (${attackSpeed}) outside valid range (-0.5 to 0.5)`);
        }
      }

      // Validate armor-specific properties
      if (item.type === 'armor') {
        const props = item.properties ?? {};
        const armorValue = props.armor as number | undefined;
        const slot = props.slot as string | undefined;

        if (armorValue === undefined || armorValue < 0) {
          warnings.push(`Armor ${item.id} has invalid armor value (${armorValue ?? 'undefined'})`);
        }
        if (slot && !['head', 'chest', 'hands', 'legs', 'feet', 'cloak', 'shield'].includes(slot)) {
          warnings.push(`Armor ${item.id} has invalid slot "${slot}"`);
        }
      }
    }

    // Check room references are valid
    for (const room of area.rooms) {
      // Check exit references
      for (const [dir, targetId] of Object.entries(room.exits)) {
        if (!area.rooms.some(r => r.id === targetId)) {
          errors.push(`Room ${room.id} exit "${dir}" points to non-existent room "${targetId}"`);
        }
      }
      // Check NPC references
      for (const npcId of room.npcs) {
        if (!npcId.startsWith('/') && !area.npcs.some(n => n.id === npcId)) {
          warnings.push(`Room ${room.id} references non-existent NPC "${npcId}"`);
        }
      }
      // Check item references
      for (const itemId of room.items) {
        if (!itemId.startsWith('/') && !area.items.some(i => i.id === itemId)) {
          warnings.push(`Room ${room.id} references non-existent item "${itemId}"`);
        }
      }
    }

    // Check for orphan rooms (no exits except entrance)
    for (const room of area.rooms) {
      if (room.isEntrance) continue;
      const hasIncomingExit = area.rooms.some(r =>
        r.id !== room.id && Object.values(r.exits).includes(room.id)
      );
      if (!hasIncomingExit && Object.keys(room.exits).length === 0) {
        warnings.push(`Room ${room.id} has no exits and is not reachable`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==================== Publishing ====================

  /**
   * Publish an area to generate TypeScript files.
   * @param areaId The area ID to publish
   * @param force If true, republish all files regardless of changes
   */
  async publishArea(areaId: string, force: boolean = false): Promise<PublishResult> {
    const area = this._areas.get(areaId);
    if (!area) {
      return { success: false, error: 'Area not found' };
    }

    // Validate first
    const validation = this.validateArea(areaId);
    if (!validation.valid) {
      return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` };
    }

    if (typeof efuns === 'undefined' || !efuns.writeFile) {
      return { success: false, error: 'efuns not available' };
    }

    const basePath = `/areas/${area.region}/${area.subregion}`;
    const filesCreated: string[] = [];
    const filesUpdated: string[] = [];
    const filesDeleted: string[] = [];
    let filesSkipped = 0;

    // For incremental publishing, determine which entities need updating
    // If area was never published or force is true, publish everything
    // Otherwise, only publish entities modified after the last publish
    const lastPublishTime = area.publishedAt ?? 0;
    const isIncremental = !force && area.status === 'published' && lastPublishTime > 0;

    try {
      // Create directory
      await efuns.makeDir(basePath, true);

      // Build set of expected file names (without path)
      const expectedFiles = new Set<string>();
      for (const room of area.rooms) {
        expectedFiles.add(`${room.id}.ts`);
      }
      for (const npc of area.npcs) {
        expectedFiles.add(`${npc.id}.ts`);
      }
      for (const item of area.items) {
        expectedFiles.add(`${item.id}.ts`);
      }

      // Clean up old files that no longer exist in the area (for republishing)
      if (isIncremental && efuns.readDir && efuns.deleteFile) {
        try {
          const existingFiles = await efuns.readDir(basePath);
          for (const file of existingFiles) {
            // Only consider .ts files, skip directories and other files
            if (file.endsWith('.ts') && !expectedFiles.has(file)) {
              const filePath = `${basePath}/${file}`;
              await efuns.deleteFile(filePath);
              filesDeleted.push(filePath);
              console.log(`[AreaDaemon] Deleted old file: ${filePath}`);
            }
          }
        } catch {
          // Directory may not exist yet or readDir failed - that's ok
        }
      }

      // Helper to check if entity needs publishing
      const needsPublish = (entityUpdatedAt: number | undefined): boolean => {
        if (!isIncremental) return true; // First publish: publish everything
        // Entity needs publishing if it was modified after the last publish
        // or if it has no updatedAt (legacy entity)
        return !entityUpdatedAt || entityUpdatedAt > lastPublishTime;
      };

      // Generate room files (only changed ones for incremental publish)
      for (const room of area.rooms) {
        const roomPath = `${basePath}/${room.id}.ts`;
        if (needsPublish(room.updatedAt)) {
          const roomContent = this.generateRoomFile(area, room);
          await efuns.writeFile(roomPath, roomContent);
          if (isIncremental && room.updatedAt) {
            filesUpdated.push(roomPath);
          } else {
            filesCreated.push(roomPath);
          }
        } else {
          filesSkipped++;
        }
      }

      // Generate NPC files (only changed ones for incremental publish)
      for (const npc of area.npcs) {
        const npcPath = `${basePath}/${npc.id}.ts`;
        if (needsPublish(npc.updatedAt)) {
          const npcContent = this.generateNPCFile(area, npc);
          await efuns.writeFile(npcPath, npcContent);
          if (isIncremental && npc.updatedAt) {
            filesUpdated.push(npcPath);
          } else {
            filesCreated.push(npcPath);
          }
        } else {
          filesSkipped++;
        }
      }

      // Generate Item files (only changed ones for incremental publish)
      for (const item of area.items) {
        const itemPath = `${basePath}/${item.id}.ts`;
        if (needsPublish(item.updatedAt)) {
          const itemContent = this.generateItemFile(area, item);
          await efuns.writeFile(itemPath, itemContent);
          if (isIncremental && item.updatedAt) {
            filesUpdated.push(itemPath);
          } else {
            filesCreated.push(itemPath);
          }
        } else {
          filesSkipped++;
        }
      }

      // Update status
      area.status = 'published';
      area.publishedAt = Date.now();
      area.publishedPath = basePath;
      area.version++;
      area.updatedAt = Date.now();
      this._dirty = true;
      await this.save();

      const totalWritten = filesCreated.length + filesUpdated.length;
      console.log(`[AreaDaemon] Published area ${areaId} to ${basePath} (${totalWritten} files written, ${filesSkipped} skipped)`);

      return {
        success: true,
        path: basePath,
        filesCreated: filesCreated.length > 0 ? filesCreated : undefined,
        filesUpdated: filesUpdated.length > 0 ? filesUpdated : undefined,
        filesSkipped: filesSkipped > 0 ? filesSkipped : undefined,
        filesDeleted: filesDeleted.length > 0 ? filesDeleted : undefined,
        roomCount: area.rooms.length,
        npcCount: area.npcs.length,
        itemCount: area.items.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Generate a room TypeScript file.
   */
  private generateRoomFile(area: AreaDefinition, room: DraftRoom): string {
    const className = this.toPascalCase(room.id);
    const areaPath = `/areas/${area.region}/${area.subregion}`;

    // Build exits
    const exitLines = Object.entries(room.exits).map(([dir, target]) => {
      // Check if it's an external exit
      if (room.externalExits?.[dir]) {
        return `    this.addExit('${dir}', '${room.externalExits[dir]}');`;
      }
      return `    this.addExit('${dir}', '${areaPath}/${target}');`;
    });

    // Build NPC paths array
    const npcPaths = room.npcs.map(npcId => {
      if (npcId.startsWith('/')) {
        return npcId;
      }
      return `${areaPath}/${npcId}`;
    });

    // Build item paths array
    const itemPaths = room.items.map(itemId => {
      if (itemId.startsWith('/')) {
        return itemId;
      }
      return `${areaPath}/${itemId}`;
    });

    // Build custom actions
    const actionLines = (room.actions ?? []).map(action =>
      `    this.addAction('${action.verb}', '${this.escapeString(action.description)}', '${this.escapeString(action.response)}');`
    );

    return `/**
 * ${room.shortDesc}
 *
 * Generated by Area Builder on ${new Date().toISOString()}
 * Area: ${area.name} (${area.id})
 */

import { Room } from '../../../lib/std.js';

export class ${className} extends Room {
  constructor() {
    super();
    this.shortDesc = '${this.escapeString(room.shortDesc)}';
    this.longDesc = \`${room.longDesc.replace(/`/g, '\\`')}\`;
    this.setMapCoordinates({ x: ${room.x}, y: ${room.y}, z: ${room.z}, area: '${areaPath}' });
    this.setTerrain('${room.terrain}');
${room.mapIcon ? `    this.mapIcon = '${room.mapIcon}';\n` : ''}    this.setupRoom();
  }

  private setupRoom(): void {
    // Exits
${exitLines.length > 0 ? exitLines.join('\n') : '    // No exits'}

${npcPaths.length > 0 ? `    // NPCs\n    this.setNpcs([${npcPaths.map(p => `'${p}'`).join(', ')}]);\n` : ''}${itemPaths.length > 0 ? `    // Items\n    this.setItems([${itemPaths.map(p => `'${p}'`).join(', ')}]);\n` : ''}${actionLines.length > 0 ? `    // Custom actions\n${actionLines.join('\n')}\n` : ''}  }
}

export default ${className};
`;
  }

  /**
   * Generate an NPC TypeScript file.
   */
  private generateNPCFile(area: AreaDefinition, npc: DraftNPC): string {
    const className = this.toPascalCase(npc.id);
    const areaPath = `/areas/${area.region}/${area.subregion}`;

    // Build chats
    const chatLines = (npc.chats ?? []).map(chat =>
      `      { message: '${this.escapeString(chat.message)}', type: '${chat.type}'${chat.chance !== undefined ? `, chance: ${chat.chance}` : ''} },`
    );

    // Build responses
    const responseLines = (npc.responses ?? []).map(resp =>
      `      { pattern: '${this.escapeString(resp.pattern)}', response: '${this.escapeString(resp.response)}', type: '${resp.type}' },`
    );

    // Build combat config
    let combatConfigStr = '';
    if (npc.combatConfig) {
      const cc = npc.combatConfig;
      const parts: string[] = [`baseXP: ${cc.baseXP}`];
      if (cc.gold !== undefined) parts.push(`gold: ${cc.gold}`);
      if (cc.goldDrop) parts.push(`goldDrop: { min: ${cc.goldDrop.min}, max: ${cc.goldDrop.max} }`);
      if (cc.damage) parts.push(`damage: { min: ${cc.damage.min}, max: ${cc.damage.max} }`);
      if (cc.armor !== undefined) parts.push(`armor: ${cc.armor}`);
      if (cc.lootTable && cc.lootTable.length > 0) {
        const lootItems = cc.lootTable.map(l => `{ itemId: '${l.itemId}', chance: ${l.chance} }`).join(', ');
        parts.push(`lootTable: [${lootItems}]`);
      }
      combatConfigStr = `    this.combatConfig = { ${parts.join(', ')} };`;
    }

    return `/**
 * ${npc.name}
 *
 * Generated by Area Builder on ${new Date().toISOString()}
 * Area: ${area.name} (${area.id})
 */

import { NPC } from '../../../lib/std.js';

export class ${className} extends NPC {
  constructor() {
    super();
    this.name = '${this.escapeString(npc.name)}';
    this.shortDesc = '${this.escapeString(npc.shortDesc)}';
    this.longDesc = \`${npc.longDesc.replace(/`/g, '\\`')}\`;
    this.level = ${npc.level};
    this.maxHealth = ${npc.maxHealth};
    this.health = ${npc.health ?? npc.maxHealth};
${npc.gender ? `    this.gender = '${npc.gender}';\n` : ''}${npc.keywords && npc.keywords.length > 0 ? `    this.keywords = [${npc.keywords.map(k => `'${k}'`).join(', ')}];\n` : ''}${npc.chatChance !== undefined ? `    this.chatChance = ${npc.chatChance};\n` : ''}${chatLines.length > 0 ? `    this.chats = [\n${chatLines.join('\n')}\n    ];\n` : ''}${responseLines.length > 0 ? `    this.responses = [\n${responseLines.join('\n')}\n    ];\n` : ''}${combatConfigStr ? `${combatConfigStr}\n` : ''}${npc.wandering !== undefined ? `    this.wandering = ${npc.wandering};\n` : ''}${npc.respawnTime !== undefined ? `    this.respawnTime = ${npc.respawnTime};\n` : ''}${npc.questsOffered && npc.questsOffered.length > 0 ? `    this.questsOffered = [${npc.questsOffered.map(q => `'${q}'`).join(', ')}];\n` : ''}${npc.questsTurnedIn && npc.questsTurnedIn.length > 0 ? `    this.questsTurnedIn = [${npc.questsTurnedIn.map(q => `'${q}'`).join(', ')}];\n` : ''}${npc.items && npc.items.length > 0 ? `    this.setSpawnItems([${npc.items.map(i => i.startsWith('/') ? `'${i}'` : `'${areaPath}/${i}'`).join(', ')}]);\n` : ''}  }
}

export default ${className};
`;
  }

  /**
   * Generate an Item TypeScript file.
   */
  private generateItemFile(area: AreaDefinition, item: DraftItem): string {
    const className = this.toPascalCase(item.id);
    const props = item.properties ?? {};

    // Determine which base class to use and build type-specific code
    let baseClass = 'Item';
    let imports = "import { Item } from '../../../lib/std.js';";
    let typeSpecificCode = '';

    switch (item.type) {
      case 'weapon':
        baseClass = 'Weapon';
        imports = "import { Weapon } from '../../../lib/std.js';";
        // Always set weapon properties with defaults
        typeSpecificCode += `    this.minDamage = ${props.minDamage ?? 1};\n`;
        typeSpecificCode += `    this.maxDamage = ${props.maxDamage ?? 3};\n`;
        typeSpecificCode += `    this.damageType = '${props.damageType ?? 'slashing'}';\n`;
        typeSpecificCode += `    this.handedness = '${props.handedness ?? 'one_handed'}';\n`;
        if (props.attackSpeed !== undefined && props.attackSpeed !== 0) {
          typeSpecificCode += `    this.attackSpeed = ${props.attackSpeed};\n`;
        }
        break;

      case 'armor':
        baseClass = 'Armor';
        imports = "import { Armor } from '../../../lib/std.js';";
        // Always set armor properties with defaults
        typeSpecificCode += `    this.armor = ${props.armor ?? 1};\n`;
        typeSpecificCode += `    this.slot = '${props.slot ?? 'chest'}';\n`;
        break;

      case 'container':
        baseClass = 'Container';
        imports = "import { Container } from '../../../lib/std.js';";
        if (props.capacity !== undefined) {
          typeSpecificCode += `    this.capacity = ${props.capacity};\n`;
        }
        break;

      case 'consumable':
        // Consumables use base Item class
        if (props.healAmount !== undefined) {
          typeSpecificCode += `    // Heal amount: ${props.healAmount}\n`;
        }
        if (props.manaAmount !== undefined) {
          typeSpecificCode += `    // Mana restore: ${props.manaAmount}\n`;
        }
        break;

      case 'key':
        // Keys use base Item class with a keyId property
        if (props.keyId) {
          typeSpecificCode += `    this.setProperty('keyId', '${props.keyId}');\n`;
        }
        break;

      case 'quest':
        // Quest items may have special properties
        if (props.questId) {
          typeSpecificCode += `    this.setProperty('questId', '${props.questId}');\n`;
        }
        break;
    }

    // Build keywords
    const keywordLines = (item.keywords ?? []).map(k => `    this.addId('${this.escapeString(k)}');`);

    return `/**
 * ${item.name}
 *
 * Generated by Area Builder on ${new Date().toISOString()}
 * Area: ${area.name} (${area.id})
 */

${imports}

export class ${className} extends ${baseClass} {
  constructor() {
    super();
    this.shortDesc = '${this.escapeString(item.shortDesc)}';
    this.longDesc = \`${item.longDesc.replace(/`/g, '\\`')}\`;
${keywordLines.length > 0 ? keywordLines.join('\n') + '\n' : ''}${item.weight !== undefined ? `    this.weight = ${item.weight};\n` : ''}${item.value !== undefined ? `    this.value = ${item.value};\n` : ''}${typeSpecificCode}  }
}

export default ${className};
`;
  }

  /**
   * Convert a string to PascalCase.
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\s+/g, '');
  }

  /**
   * Escape a string for use in generated code.
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');
  }

  // ==================== Persistence ====================

  /**
   * Load areas from disk.
   */
  async load(): Promise<void> {
    if (this._loaded) return;

    if (typeof efuns === 'undefined' || !efuns.readFile) {
      console.log('[AreaDaemon] efuns not available, starting with empty areas');
      this._loaded = true;
      return;
    }

    try {
      const dataPath = '/data/areas/drafts.json';
      const exists = await efuns.fileExists(dataPath);

      if (!exists) {
        console.log('[AreaDaemon] No saved areas found, starting fresh');
        this._loaded = true;
        return;
      }

      const content = await efuns.readFile(dataPath);
      const saved = JSON.parse(content) as SerializedAreas;

      for (const area of saved.areas ?? []) {
        this._areas.set(area.id, area);
      }

      console.log(`[AreaDaemon] Loaded ${this._areas.size} areas from disk`);
      this._loaded = true;
      this._dirty = false;
    } catch (error) {
      console.error('[AreaDaemon] Failed to load areas:', error);
      this._loaded = true;
    }
  }

  /**
   * Save areas to disk.
   */
  async save(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.writeFile) {
      console.log('[AreaDaemon] efuns not available, cannot save');
      return;
    }

    try {
      const serialized: SerializedAreas = {
        areas: Array.from(this._areas.values()),
      };

      const dataPath = '/data/areas/drafts.json';
      const dirPath = '/data/areas';

      // Ensure directory exists
      const dirExists = await efuns.fileExists(dirPath);
      if (!dirExists) {
        await efuns.makeDir(dirPath, true);
      }

      await efuns.writeFile(dataPath, JSON.stringify(serialized, null, 2));
      console.log(`[AreaDaemon] Saved ${this._areas.size} areas to disk`);
      this._dirty = false;
    } catch (error) {
      console.error('[AreaDaemon] Failed to save areas:', error);
    }
  }

  /**
   * Check if there are unsaved changes.
   */
  get isDirty(): boolean {
    return this._dirty;
  }

  /**
   * Check if areas have been loaded from disk.
   */
  get isLoaded(): boolean {
    return this._loaded;
  }

  /**
   * Ensure areas are loaded before proceeding.
   * Returns immediately if already loaded, otherwise waits for load to complete.
   */
  async ensureLoaded(): Promise<void> {
    if (this._loaded) return;
    await this.load();
  }

  /**
   * Get the count of areas.
   */
  get count(): number {
    return this._areas.size;
  }
}

// Singleton instance
let areaDaemon: AreaDaemon | null = null;

/**
 * Get the area daemon singleton.
 * Automatically loads from disk on first access.
 */
export function getAreaDaemon(): AreaDaemon {
  if (!areaDaemon) {
    areaDaemon = new AreaDaemon();
    // Trigger async load (don't await - it will complete in background)
    areaDaemon.load();
  }
  return areaDaemon;
}

/**
 * Reset the area daemon (for testing).
 */
export function resetAreaDaemon(): void {
  areaDaemon = null;
}

export default AreaDaemon;
