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
import { importAreaFromPath, type ImportResult, type ImportOptions } from '../lib/area-importer.js';

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

    // Apply updates (excluding protected fields and undefined values)
    const { rooms, npcs, items, ...safeUpdates } = updates;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(safeUpdates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }
    Object.assign(area, filteredUpdates, { updatedAt: Date.now() });

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
   * Unpublish an area - changes status back to draft.
   * Note: This does NOT delete the published files from disk.
   * The files remain and can be manually deleted or will be overwritten on next publish.
   */
  unpublishArea(areaId: string): boolean {
    const area = this._areas.get(areaId);
    if (!area) return false;

    if (area.status !== 'published') {
      return false; // Already unpublished
    }

    area.status = 'draft';
    area.publishedAt = undefined;
    this._dirty = true;
    console.log(`[AreaDaemon] Unpublished area ${areaId}`);
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

    // Filter out undefined values to avoid overwriting existing properties
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    // If coordinates are changing, validate
    if (filteredUpdates.x !== undefined || filteredUpdates.y !== undefined || filteredUpdates.z !== undefined) {
      const newX = (filteredUpdates.x as number) ?? room.x;
      const newY = (filteredUpdates.y as number) ?? room.y;
      const newZ = (filteredUpdates.z as number) ?? room.z;

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

    Object.assign(room, filteredUpdates);
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

    // Filter out undefined values to avoid overwriting existing properties
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    Object.assign(npc, filteredUpdates);
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

    // Filter out undefined values to avoid overwriting existing properties
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    Object.assign(item, filteredUpdates);
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

    // Check external exits
    for (const room of area.rooms) {
      if (room.externalExits) {
        for (const [dir, path] of Object.entries(room.externalExits)) {
          // Validate path format
          if (!path.startsWith('/areas/')) {
            errors.push(`Room ${room.id} external exit "${dir}" has invalid path (must start with /areas/): ${path}`);
          }
          // Warn if both internal and external exit exist for same direction
          if (room.exits[dir]) {
            warnings.push(`Room ${room.id} has both internal and external exit for "${dir}" - external will take priority`);
          }
        }
      }
    }

    // Check for orphan rooms (no exits except entrance)
    for (const room of area.rooms) {
      if (room.isEntrance) continue;
      // Consider both internal and external exits
      const hasIncomingExit = area.rooms.some(r =>
        r.id !== room.id && Object.values(r.exits).includes(room.id)
      );
      const totalExits = Object.keys(room.exits).length + Object.keys(room.externalExits ?? {}).length;
      if (!hasIncomingExit && totalExits === 0) {
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

    // Build exits (internal exits first, then external exits that aren't in internal)
    const exitLines: string[] = [];

    // Add internal exits
    for (const [dir, target] of Object.entries(room.exits)) {
      // Skip if there's an external exit for this direction (external takes priority)
      if (room.externalExits?.[dir]) continue;
      exitLines.push(`    this.addExit('${dir}', '${areaPath}/${target}');`);
    }

    // Add external exits
    if (room.externalExits) {
      for (const [dir, path] of Object.entries(room.externalExits)) {
        exitLines.push(`    this.addExit('${dir}', '${path}');`);
      }
    }

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

    // Extract custom code blocks by type
    const blocks = room.customCodeBlocks ?? [];
    const customImports = blocks.filter(b => b.type === 'import').map(b => b.code);
    const customProperties = blocks.filter(b => b.type === 'property').map(b => b.code);
    const constructorTail = blocks.filter(b => b.type === 'constructor-tail').map(b => b.code);
    const customMethods = blocks.filter(b => b.type === 'method').sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(b => b.code);

    // Build imports section
    const importsSection = [
      "import { Room } from '../../../lib/std.js';",
      ...customImports,
    ].join('\n');

    // Build properties section (if any)
    const propertiesSection = customProperties.length > 0
      ? '\n' + customProperties.map(p => '  ' + p).join('\n') + '\n'
      : '';

    // Build constructor tail section
    const constructorTailSection = constructorTail.length > 0
      ? '\n    // Preserved custom code\n' + constructorTail.map(c => c.split('\n').map(l => '    ' + l.trim()).join('\n')).join('\n') + '\n'
      : '';

    // Build methods section - filter out methods that would duplicate generated ones
    const generatedMethodNames = ['setupRoom'];
    const filteredCustomMethods = customMethods.filter(m => {
      // Check if this method matches a generated method name
      const methodNameMatch = m.match(/(?:private|public|protected)?\s*(?:async\s+)?(\w+)\s*\(/);
      if (methodNameMatch) {
        const methodName = methodNameMatch[1];
        return !generatedMethodNames.includes(methodName);
      }
      return true;
    });

    const methodsSection = filteredCustomMethods.length > 0
      ? '\n\n  // Preserved custom methods\n' + filteredCustomMethods.map(m => '  ' + m.split('\n').join('\n  ')).join('\n\n')
      : '';

    return `/**
 * ${room.shortDesc}
 *
 * Generated by Area Builder on ${new Date().toISOString()}
 * Area: ${area.name} (${area.id})
 */

${importsSection}

export class ${className} extends Room {${propertiesSection}
  constructor() {
    super();
    this.shortDesc = '${this.escapeString(room.shortDesc)}';
    this.longDesc = \`${room.longDesc.replace(/`/g, '\\`')}\`;
    this.setMapCoordinates({ x: ${room.x}, y: ${room.y}, z: ${room.z}, area: '${areaPath}' });
    this.setTerrain('${room.terrain}');
${room.mapIcon ? `    this.mapIcon = '${room.mapIcon}';\n` : ''}    this.setupRoom();${constructorTailSection}  }

  private setupRoom(): void {
    // Exits
${exitLines.length > 0 ? exitLines.join('\n') : '    // No exits'}

${npcPaths.length > 0 ? `    // NPCs\n    this.setNpcs([${npcPaths.map(p => `'${p}'`).join(', ')}]);\n` : ''}${itemPaths.length > 0 ? `    // Items\n    this.setItems([${itemPaths.map(p => `'${p}'`).join(', ')}]);\n` : ''}${actionLines.length > 0 ? `    // Custom actions\n${actionLines.join('\n')}\n` : ''}  }${methodsSection}
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

    // Determine base class and import based on subclass
    let baseClass = 'NPC';
    let baseImport = "import { NPC } from '../../../lib/std.js';";
    let subclassSpecificCode = '';

    const subclass = npc.subclass ?? 'npc';

    switch (subclass) {
      case 'merchant':
        baseClass = 'Merchant';
        baseImport = "import { Merchant } from '../../../lib/std.js';";
        if (npc.merchantConfig) {
          const mc = npc.merchantConfig;
          const configParts: string[] = [
            `name: '${this.escapeString(npc.name)}'`,
            `shopName: '${this.escapeString(mc.shopName)}'`,
          ];
          if (mc.shopDescription) configParts.push(`shopDescription: '${this.escapeString(mc.shopDescription)}'`);
          configParts.push(`buyRate: ${mc.buyRate}`);
          configParts.push(`sellRate: ${mc.sellRate}`);
          if (mc.acceptedTypes && mc.acceptedTypes.length > 0) {
            configParts.push(`acceptedTypes: [${mc.acceptedTypes.map(t => `'${t}'`).join(', ')}]`);
          }
          configParts.push(`shopGold: ${mc.shopGold}`);
          if (mc.charismaEffect !== undefined) configParts.push(`charismaEffect: ${mc.charismaEffect}`);
          if (mc.restockEnabled) configParts.push(`restockEnabled: true`);
          subclassSpecificCode += `    this.setMerchant({\n      ${configParts.join(',\n      ')},\n    });\n`;
        }
        // Add stock items
        if (npc.merchantStock && npc.merchantStock.length > 0) {
          subclassSpecificCode += `    // Shop inventory\n`;
          for (const item of npc.merchantStock) {
            const itemPath = item.itemPath.startsWith('/') ? item.itemPath : `${areaPath}/${item.itemPath}`;
            subclassSpecificCode += `    this.addStock('${itemPath}', '${this.escapeString(item.name)}', ${item.price}, ${item.quantity}${item.category ? `, '${item.category}'` : ''});\n`;
          }
        }
        break;

      case 'trainer':
        baseClass = 'Trainer';
        baseImport = "import { Trainer } from '../../../lib/std.js';";
        if (npc.trainerConfig) {
          const tc = npc.trainerConfig;
          const configParts: string[] = [];
          if (tc.canTrainLevel !== undefined) configParts.push(`canTrainLevel: ${tc.canTrainLevel}`);
          if (tc.trainableStats && tc.trainableStats.length > 0) {
            configParts.push(`trainableStats: [${tc.trainableStats.map(s => `'${s}'`).join(', ')}]`);
          }
          if (tc.costMultiplier !== undefined) configParts.push(`costMultiplier: ${tc.costMultiplier}`);
          if (tc.greeting) configParts.push(`greeting: '${this.escapeString(tc.greeting)}'`);
          if (configParts.length > 0) {
            subclassSpecificCode += `    this.setTrainerConfig({\n      ${configParts.join(',\n      ')},\n    });\n`;
          }
        }
        if (npc.baseStats) {
          const bs = npc.baseStats;
          const statParts: string[] = [];
          if (bs.strength !== undefined) statParts.push(`strength: ${bs.strength}`);
          if (bs.intelligence !== undefined) statParts.push(`intelligence: ${bs.intelligence}`);
          if (bs.wisdom !== undefined) statParts.push(`wisdom: ${bs.wisdom}`);
          if (bs.charisma !== undefined) statParts.push(`charisma: ${bs.charisma}`);
          if (bs.dexterity !== undefined) statParts.push(`dexterity: ${bs.dexterity}`);
          if (bs.constitution !== undefined) statParts.push(`constitution: ${bs.constitution}`);
          if (bs.luck !== undefined) statParts.push(`luck: ${bs.luck}`);
          if (statParts.length > 0) {
            subclassSpecificCode += `    this.setBaseStats({\n      ${statParts.join(',\n      ')},\n    });\n`;
          }
        }
        break;

      case 'petMerchant':
        baseClass = 'PetMerchant';
        baseImport = "import { PetMerchant } from '../../../lib/std.js';";
        if (npc.petMerchantConfig) {
          const pmc = npc.petMerchantConfig;
          const configParts: string[] = [
            `name: '${this.escapeString(npc.name)}'`,
            `shopName: '${this.escapeString(pmc.shopName)}'`,
          ];
          if (pmc.shopDescription) configParts.push(`shopDescription: '${this.escapeString(pmc.shopDescription)}'`);
          subclassSpecificCode += `    this.setPetMerchant({\n      ${configParts.join(',\n      ')},\n    });\n`;
        }
        // For pet merchants, we typically load from pet daemon
        // Add a setup call if there's pet stock specified
        if (npc.petStock && npc.petStock.length > 0) {
          subclassSpecificCode += `    // Pet stock loaded from pet daemon\n`;
          subclassSpecificCode += `    this.setupPetStock();\n`;
        }
        break;
    }

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

    // Determine NPC type for setLevel call
    const npcType = npc.npcType || 'normal';

    // Check if maxHealth was manually overridden (different from auto-calculated value)
    // Auto-calc formula: (50 + level * 15) * multiplier
    const multipliers: Record<string, number> = { normal: 1.0, miniboss: 1.5, elite: 2.0, boss: 3.0 };
    const mult = multipliers[npcType] || 1.0;
    const autoMaxHealth = Math.round((50 + npc.level * 15) * mult);
    const healthOverridden = npc.maxHealth !== autoMaxHealth;

    // Extract custom code blocks by type
    const blocks = npc.customCodeBlocks ?? [];
    const customImports = blocks.filter(b => b.type === 'import').map(b => b.code);
    const customProperties = blocks.filter(b => b.type === 'property').map(b => b.code);
    const constructorTail = blocks.filter(b => b.type === 'constructor-tail').map(b => b.code);
    const customMethods = blocks.filter(b => b.type === 'method').sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(b => b.code);

    // Build imports section
    const importsSection = [
      baseImport,
      ...customImports,
    ].join('\n');

    // Build properties section (if any)
    const propertiesSection = customProperties.length > 0
      ? '\n' + customProperties.map(p => '  ' + p).join('\n') + '\n'
      : '';

    // Build constructor tail section
    const constructorTailSection = constructorTail.length > 0
      ? '\n    // Preserved custom code\n' + constructorTail.map(c => c.split('\n').map(l => '    ' + l.trim()).join('\n')).join('\n') + '\n'
      : '';

    // Build methods section
    const methodsSection = customMethods.length > 0
      ? '\n\n  // Preserved custom methods\n' + customMethods.map(m => '  ' + m.split('\n').join('\n  ')).join('\n\n')
      : '';

    return `/**
 * ${npc.name}
 *
 * Generated by Area Builder on ${new Date().toISOString()}
 * Area: ${area.name} (${area.id})
 */

${importsSection}

export class ${className} extends ${baseClass} {${propertiesSection}
  constructor() {
    super();
${subclass === 'npc' ? `    this.name = '${this.escapeString(npc.name)}';\n` : ''}    this.shortDesc = '${this.escapeString(npc.shortDesc)}';
    this.longDesc = \`${npc.longDesc.replace(/`/g, '\\`')}\`;
    this.setLevel(${npc.level}, '${npcType}');
${healthOverridden ? `    // Override auto-calculated health\n    this.maxHealth = ${npc.maxHealth};\n    this.health = ${npc.health ?? npc.maxHealth};\n` : ''}${npc.gender ? `    this.gender = '${npc.gender}';\n` : ''}${npc.keywords && npc.keywords.length > 0 ? `    this.keywords = [${npc.keywords.map(k => `'${k}'`).join(', ')}];\n` : ''}${npc.chatChance !== undefined ? `    this.chatChance = ${npc.chatChance};\n` : ''}${chatLines.length > 0 ? `    this.chats = [\n${chatLines.join('\n')}\n    ];\n` : ''}${responseLines.length > 0 ? `    this.responses = [\n${responseLines.join('\n')}\n    ];\n` : ''}${combatConfigStr ? `${combatConfigStr}\n` : ''}${npc.wandering !== undefined ? `    this.wandering = ${npc.wandering};\n` : ''}${npc.respawnTime !== undefined ? `    this.respawnTime = ${npc.respawnTime};\n` : ''}${npc.questsOffered && npc.questsOffered.length > 0 ? `    this.setQuestsOffered([${npc.questsOffered.map(q => `'${q}'`).join(', ')}]);\n` : ''}${npc.questsTurnedIn && npc.questsTurnedIn.length > 0 ? `    this.setQuestsTurnedIn([${npc.questsTurnedIn.map(q => `'${q}'`).join(', ')}]);\n` : ''}${npc.items && npc.items.length > 0 ? `    this.setSpawnItems([${npc.items.map(i => i.startsWith('/') ? `'${i}'` : `'${areaPath}/${i}'`).join(', ')}]);\n` : ''}${subclassSpecificCode}${constructorTailSection}  }${methodsSection}
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
    let baseImport = "import { Item } from '../../../lib/std.js';";
    let typeSpecificCode = '';

    switch (item.type) {
      case 'weapon':
        baseClass = 'Weapon';
        baseImport = "import { Weapon } from '../../../lib/std.js';";
        // Set handedness and damageType first
        typeSpecificCode += `    this.damageType = '${props.damageType ?? 'slashing'}';\n`;
        typeSpecificCode += `    this.handedness = '${props.handedness ?? 'one_handed'}';\n`;
        // Use setItemLevel for auto-balance if itemLevel is set
        if (props.itemLevel !== undefined) {
          typeSpecificCode += `    this.setItemLevel(${props.itemLevel});\n`;
          // Allow explicit overrides
          if (props.minDamage !== undefined) {
            typeSpecificCode += `    this.minDamage = ${props.minDamage}; // Override\n`;
          }
          if (props.maxDamage !== undefined) {
            typeSpecificCode += `    this.maxDamage = ${props.maxDamage}; // Override\n`;
          }
          if (props.toHit !== undefined) {
            typeSpecificCode += `    this.toHit = ${props.toHit}; // Override\n`;
          }
        } else {
          // Manual damage values
          typeSpecificCode += `    this.minDamage = ${props.minDamage ?? 1};\n`;
          typeSpecificCode += `    this.maxDamage = ${props.maxDamage ?? 3};\n`;
          if (props.toHit !== undefined && props.toHit !== 0) {
            typeSpecificCode += `    this.toHit = ${props.toHit};\n`;
          }
        }
        if (props.attackSpeed !== undefined && props.attackSpeed !== 0) {
          typeSpecificCode += `    this.attackSpeed = ${props.attackSpeed};\n`;
        }
        break;

      case 'armor':
        baseClass = 'Armor';
        baseImport = "import { Armor } from '../../../lib/std.js';";
        // Set slot and size first
        typeSpecificCode += `    this.slot = '${props.slot ?? 'chest'}';\n`;
        if (props.size) {
          typeSpecificCode += `    this.size = '${props.size}';\n`;
        }
        // Use setItemLevel for auto-balance if itemLevel is set
        if (props.itemLevel !== undefined) {
          typeSpecificCode += `    this.setItemLevel(${props.itemLevel});\n`;
          // Allow explicit overrides
          if (props.armor !== undefined) {
            typeSpecificCode += `    this.armor = ${props.armor}; // Override\n`;
          }
          if (props.toDodge !== undefined) {
            typeSpecificCode += `    this.toDodge = ${props.toDodge}; // Override\n`;
          }
          if (props.toBlock !== undefined) {
            typeSpecificCode += `    this.toBlock = ${props.toBlock}; // Override\n`;
          }
        } else {
          // Manual armor value
          typeSpecificCode += `    this.armor = ${props.armor ?? 1};\n`;
          if (props.toDodge !== undefined && props.toDodge !== 0) {
            typeSpecificCode += `    this.toDodge = ${props.toDodge};\n`;
          }
          if (props.toBlock !== undefined && props.toBlock !== 0) {
            typeSpecificCode += `    this.toBlock = ${props.toBlock};\n`;
          }
        }
        break;

      case 'container':
        baseClass = 'Container';
        baseImport = "import { Container } from '../../../lib/std.js';";
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

    // Extract custom code blocks by type
    const blocks = item.customCodeBlocks ?? [];
    const customImports = blocks.filter(b => b.type === 'import').map(b => b.code);
    const customProperties = blocks.filter(b => b.type === 'property').map(b => b.code);
    const constructorTail = blocks.filter(b => b.type === 'constructor-tail').map(b => b.code);
    const customMethods = blocks.filter(b => b.type === 'method').sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(b => b.code);

    // Build imports section
    const importsSection = [
      baseImport,
      ...customImports,
    ].join('\n');

    // Build properties section (if any)
    const propertiesSection = customProperties.length > 0
      ? '\n' + customProperties.map(p => '  ' + p).join('\n') + '\n'
      : '';

    // Build constructor tail section
    const constructorTailSection = constructorTail.length > 0
      ? '\n    // Preserved custom code\n' + constructorTail.map(c => c.split('\n').map(l => '    ' + l.trim()).join('\n')).join('\n') + '\n'
      : '';

    // Build methods section
    const methodsSection = customMethods.length > 0
      ? '\n\n  // Preserved custom methods\n' + customMethods.map(m => '  ' + m.split('\n').join('\n  ')).join('\n\n')
      : '';

    return `/**
 * ${item.name}
 *
 * Generated by Area Builder on ${new Date().toISOString()}
 * Area: ${area.name} (${area.id})
 */

${importsSection}

export class ${className} extends ${baseClass} {${propertiesSection}
  constructor() {
    super();
    this.shortDesc = '${this.escapeString(item.shortDesc)}';
    this.longDesc = \`${item.longDesc.replace(/`/g, '\\`')}\`;
${keywordLines.length > 0 ? keywordLines.join('\n') + '\n' : ''}${item.weight !== undefined ? `    this.weight = ${item.weight};\n` : ''}${item.value !== undefined ? `    this.value = ${item.value};\n` : ''}${typeSpecificCode}${constructorTailSection}  }${methodsSection}
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

  // ==================== Import ====================

  /**
   * Import an existing published area into the draft system.
   *
   * @param importerName The name of the builder doing the import
   * @param sourcePath The path to import from (e.g., /areas/valdoria/aldric)
   * @param options Import options (name, force, preview)
   * @returns ImportResult with statistics and any warnings
   */
  async importArea(
    importerName: string,
    sourcePath: string,
    options: ImportOptions = {},
  ): Promise<ImportResult> {
    // Extract area ID from path to check for existing
    const pathParts = sourcePath.replace('/areas/', '').split('/');
    if (pathParts.length < 2) {
      return {
        success: false,
        error: 'Path must include region and subregion (e.g., /areas/valdoria/aldric)',
        stats: { roomsImported: 0, npcsImported: 0, itemsImported: 0, filesSkipped: [], parseErrors: [] },
        warnings: [],
      };
    }

    const region = pathParts[0];
    const subregion = pathParts[1];
    const areaId = `${region}:${subregion}`;

    // Check for existing area
    if (this._areas.has(areaId) && !options.force) {
      return {
        success: false,
        error: `Area ${areaId} already exists. Use --force to overwrite.`,
        stats: { roomsImported: 0, npcsImported: 0, itemsImported: 0, filesSkipped: [], parseErrors: [] },
        warnings: [],
      };
    }

    // Perform the import
    const { area, result } = await importAreaFromPath(sourcePath, importerName, options);

    if (!result.success) {
      return result;
    }

    // If preview mode, don't save
    if (options.preview) {
      return result;
    }

    // Save the imported area
    if (options.force && this._areas.has(areaId)) {
      // Delete existing area first
      this._areas.delete(areaId);
    }

    this._areas.set(areaId, area);
    this._dirty = true;

    // Save to disk
    await this.save();

    console.log(`[AreaDaemon] Imported area ${areaId} from ${sourcePath}`);

    return result;
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

  // ==================== External Exit Helpers ====================

  /**
   * Get a list of published areas by scanning the /areas directory.
   * Returns an array of { path, name } objects.
   */
  async getPublishedAreaPaths(): Promise<Array<{ path: string; name: string }>> {
    if (typeof efuns === 'undefined' || !efuns.readDir) {
      return [];
    }

    const results: Array<{ path: string; name: string }> = [];

    try {
      // Read regions from /areas
      const regions = await efuns.readDir('/areas');
      for (const region of regions) {
        // Skip non-directories and system files
        if (region.startsWith('.') || region.startsWith('_')) continue;

        try {
          // Read subregions within each region
          const subregions = await efuns.readDir(`/areas/${region}`);
          for (const subregion of subregions) {
            if (subregion.startsWith('.') || subregion.startsWith('_')) continue;
            if (subregion.endsWith('.ts') || subregion.endsWith('.js')) continue;

            const areaPath = `/areas/${region}/${subregion}`;
            // Check if this directory has any .ts files (indicating it's an area)
            try {
              const files = await efuns.readDir(areaPath);
              const hasTsFiles = files.some(f => f.endsWith('.ts'));
              if (hasTsFiles) {
                // Use subregion as display name, converting underscores to spaces and capitalizing
                const displayName = subregion
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, c => c.toUpperCase());
                results.push({ path: areaPath, name: displayName });
              }
            } catch {
              // Directory not accessible
            }
          }
        } catch {
          // Region not accessible
        }
      }
    } catch {
      // /areas directory not accessible
    }

    return results;
  }

  /**
   * Get a list of rooms in a published area by scanning the directory.
   * Returns an array of { id, shortDesc } objects.
   */
  async getRoomsInPublishedArea(areaPath: string): Promise<Array<{ id: string; shortDesc: string }>> {
    if (typeof efuns === 'undefined' || !efuns.readDir || !efuns.readFile) {
      return [];
    }

    const results: Array<{ id: string; shortDesc: string }> = [];

    try {
      const files = await efuns.readDir(areaPath);
      for (const file of files) {
        if (!file.endsWith('.ts')) continue;

        const roomId = file.replace('.ts', '');
        let shortDesc = roomId; // Default to ID

        // Try to extract shortDesc from the file
        try {
          const content = await efuns.readFile(`${areaPath}/${file}`);
          // Look for shortDesc assignment
          const match = content.match(/this\.shortDesc\s*=\s*['"`]([^'"`]+)['"`]/);
          if (match) {
            shortDesc = match[1];
          }
        } catch {
          // Couldn't read file
        }

        results.push({ id: roomId, shortDesc });
      }
    } catch {
      // Directory not accessible
    }

    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Get a list of rooms in a draft area.
   * Returns an array of { id, shortDesc } objects.
   */
  getRoomsInDraftArea(areaId: string): Array<{ id: string; shortDesc: string }> {
    const area = this._areas.get(areaId);
    if (!area) return [];

    return area.rooms.map(room => ({
      id: room.id,
      shortDesc: room.shortDesc,
    })).sort((a, b) => a.id.localeCompare(b.id));
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
