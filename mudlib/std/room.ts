/**
 * Room - Base class for all room objects.
 *
 * Rooms are locations in the MUD that can contain players, NPCs, and items.
 * They have exits that connect to other rooms.
 */

import { MudObject } from './object.js';
import { Living } from './living.js';
import { reflowText } from '../lib/colors.js';
import { Container } from './container.js';
import { NPC } from './npc.js';
import { GoldPile } from './gold-pile.js';
import {
  type TerrainType,
  type TerrainDefinition,
  getTerrain as getTerrainDef,
  getDefaultTerrain,
  isValidTerrain,
  OPPOSITE_DIRECTIONS,
} from '../lib/terrain.js';
import type { RoomMapData, MapCoordinates, POIMarker } from '../lib/map-types.js';

/**
 * Exit definition.
 */
export interface Exit {
  /** Direction name (e.g., "north", "up", "enter") */
  direction: string;
  /** Destination room path or room object */
  destination: string | MudObject;
  /** Optional description for the exit */
  description?: string;
  /** Optional function to check if exit is available */
  canPass?: (who: MudObject) => boolean | Promise<boolean>;
}

/**
 * Options for broadcasting messages.
 */
export interface BroadcastOptions {
  /** Objects to exclude from receiving the message */
  exclude?: MudObject[];
  /** Only send to objects matching this filter */
  filter?: (obj: MudObject) => boolean;
}

/**
 * Base class for rooms.
 */
export class Room extends MudObject {
  private _exits: Map<string, Exit> = new Map();
  private _items: string[] = [];
  private _npcs: string[] = [];
  private _spawnedNpcIds: Set<string> = new Set(); // Track NPCs spawned by this room
  private _resetMessage: string = '';
  private _terrain: TerrainType = getDefaultTerrain();
  private _mapData: RoomMapData = {};

  constructor() {
    super();
    this.shortDesc = 'A room';
    this.longDesc = 'You are in a nondescript room.';
  }

  // ========== Lifecycle ==========

  /**
   * Called when the room is first loaded.
   * Spawns initial NPCs and items.
   */
  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn NPCs configured for this room
    await this.spawnMissingNpcs();

    // Spawn items configured for this room
    await this.spawnMissingItems();
  }

  /**
   * Spawn all items that should be in this room but are missing.
   * Called during onCreate and onReset.
   */
  async spawnMissingItems(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.cloneObject || this._items.length === 0) {
      return;
    }

    for (const itemPath of this._items) {
      // Check if an item from this blueprint already exists in the room
      const hasItem = this.inventory.some((obj) => {
        const blueprint = (obj as MudObject & { blueprint?: { objectPath?: string } }).blueprint;
        return blueprint?.objectPath === itemPath;
      });

      // Clone if missing
      if (!hasItem) {
        try {
          const item = await efuns.cloneObject(itemPath);
          if (item) {
            // Mark as spawned by this room (prevents cleanup by reset daemon)
            item.spawnRoom = this;
            await item.moveTo(this);
          }
        } catch (error) {
          console.error(`[Room] Failed to clone item ${itemPath}:`, error);
        }
      }
    }
  }

  // ========== Terrain ==========

  /**
   * Get the terrain type of this room.
   */
  getTerrain(): TerrainType {
    return this._terrain;
  }

  /**
   * Set the terrain type of this room.
   * @param terrain The terrain type
   */
  setTerrain(terrain: TerrainType): void {
    if (!isValidTerrain(terrain)) {
      throw new Error(`Invalid terrain type: ${terrain}`);
    }
    this._terrain = terrain;
  }

  /**
   * Get the full terrain definition for this room.
   */
  getTerrainDefinition(): TerrainDefinition {
    return getTerrainDef(this._terrain);
  }

  // ========== Map Data ==========

  /**
   * Get the map data for this room.
   */
  getMapData(): RoomMapData {
    return { ...this._mapData };
  }

  /**
   * Set the map data for this room.
   * @param data The map data
   */
  setMapData(data: RoomMapData): void {
    this._mapData = { ...data };
  }

  /**
   * Get the map coordinates for this room.
   * Returns undefined if no coordinates are set.
   */
  getMapCoordinates(): Partial<MapCoordinates> | undefined {
    return this._mapData.coords;
  }

  /**
   * Set the map coordinates for this room.
   * @param coords The coordinates (x, y, z, area)
   */
  setMapCoordinates(coords: Partial<MapCoordinates>): void {
    this._mapData.coords = coords;
  }

  /**
   * Get the POI icon for this room.
   */
  getMapIcon(): POIMarker | undefined {
    return this._mapData.icon;
  }

  /**
   * Set a POI icon for this room.
   * @param icon The icon character
   */
  setMapIcon(icon: POIMarker | undefined): void {
    this._mapData.icon = icon;
  }

  /**
   * Check if this room is hidden on the map.
   */
  isMapHidden(): boolean {
    return this._mapData.hidden === true;
  }

  /**
   * Set whether this room is hidden on the map.
   * @param hidden Whether the room should be hidden
   */
  setMapHidden(hidden: boolean): void {
    this._mapData.hidden = hidden;
  }

  // ========== Exits ==========

  // Standard directions handled by the go command
  private static STANDARD_DIRECTIONS = new Set([
    'north', 'south', 'east', 'west', 'up', 'down',
    'northeast', 'northwest', 'southeast', 'southwest',
    'n', 's', 'e', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw',
    'in', 'out', 'enter', 'exit',
  ]);

  /**
   * Add an exit to this room.
   * @param direction The direction name
   * @param destination The destination room path or room object
   * @param description Optional exit description
   */
  addExit(direction: string, destination: string | MudObject, description?: string): void {
    const dir = direction.toLowerCase();
    this._exits.set(dir, {
      direction: dir,
      destination,
      description,
    });

    // For non-standard exits, add an action so typing the direction works
    if (!Room.STANDARD_DIRECTIONS.has(dir)) {
      this.addAction(dir, () => this.handleCustomExit(dir));
    }
  }

  /**
   * Handle movement through a custom (non-standard) exit.
   * This is called when a player types a custom exit name directly.
   */
  private async handleCustomExit(direction: string): Promise<boolean> {
    // Find a connected player in the room
    const player = this.findConnectedPlayer();
    if (!player) return false;

    // Use the living's moveDirection method if available
    const living = player as MudObject & { moveDirection?: (dir: string) => Promise<boolean> };
    if (typeof living.moveDirection === 'function') {
      await living.moveDirection(direction);
      return true;
    }

    return false;
  }

  /**
   * Find a connected player in this room.
   */
  private findConnectedPlayer(): MudObject | undefined {
    for (const obj of this.inventory) {
      const player = obj as MudObject & { isConnected?: () => boolean };
      if (typeof player.isConnected === 'function' && player.isConnected()) {
        return obj;
      }
    }
    return undefined;
  }

  /**
   * Add an exit with a condition check.
   * @param direction The direction name
   * @param destination The destination room path or room object
   * @param canPass Function to check if exit is passable
   * @param description Optional exit description
   */
  addConditionalExit(
    direction: string,
    destination: string | MudObject,
    canPass: (who: MudObject) => boolean | Promise<boolean>,
    description?: string
  ): void {
    const dir = direction.toLowerCase();
    this._exits.set(dir, {
      direction: dir,
      destination,
      description,
      canPass,
    });

    // For non-standard exits, add an action so typing the direction works
    if (!Room.STANDARD_DIRECTIONS.has(dir)) {
      this.addAction(dir, () => this.handleCustomExit(dir));
    }
  }

  /**
   * Add a one-way exit (no automatic reverse exit).
   * Use this for portals, falls, trap doors, etc.
   * @param direction The direction name
   * @param destination The destination room path or room object
   * @param description Optional exit description
   */
  addOneWayExit(direction: string, destination: string | MudObject, description?: string): void {
    const dir = direction.toLowerCase();
    // Mark this exit as explicitly one-way so validation doesn't complain
    const exit: Exit & { oneWay?: boolean } = {
      direction: dir,
      destination,
      description,
    };
    (exit as Exit & { oneWay: boolean }).oneWay = true;
    this._exits.set(dir, exit);

    // For non-standard exits, add an action so typing the direction works
    if (!Room.STANDARD_DIRECTIONS.has(dir)) {
      this.addAction(dir, () => this.handleCustomExit(dir));
    }
  }

  /**
   * Check if an exit is one-way.
   * @param direction The direction to check
   */
  isOneWayExit(direction: string): boolean {
    const exit = this._exits.get(direction.toLowerCase()) as Exit & { oneWay?: boolean } | undefined;
    return exit?.oneWay === true;
  }

  /**
   * Get the opposite direction for a given direction.
   * Returns undefined for non-standard directions.
   */
  static getOppositeDirection(direction: string): string | undefined {
    return OPPOSITE_DIRECTIONS[direction.toLowerCase()];
  }

  /**
   * Remove an exit from this room.
   * @param direction The direction to remove
   */
  removeExit(direction: string): void {
    this._exits.delete(direction.toLowerCase());
  }

  /**
   * Get an exit by direction.
   * @param direction The direction to look up
   */
  getExit(direction: string): Exit | undefined {
    return this._exits.get(direction.toLowerCase());
  }

  /**
   * Get all exits from this room.
   */
  getExits(): Exit[] {
    return Array.from(this._exits.values());
  }

  /**
   * Get exit directions as a list.
   */
  getExitDirections(): string[] {
    return Array.from(this._exits.keys());
  }

  /**
   * Resolve an exit destination to a room object.
   * Loads the room on demand if not already loaded.
   * @param exit The exit to resolve
   */
  async resolveExit(exit: Exit): Promise<MudObject | undefined> {
    if (typeof exit.destination === 'string') {
      if (typeof efuns !== 'undefined') {
        // First try to find already-loaded room
        let room = efuns.findObject(exit.destination);
        if (room) return room;

        // If not found, try to load/clone it
        if (efuns.cloneObject) {
          room = await efuns.cloneObject(exit.destination);
          return room;
        }
      }
      return undefined;
    }
    return exit.destination;
  }

  // ========== Broadcasting ==========

  /**
   * Send a message to all objects in this room.
   * @param message The message to send
   * @param options Broadcast options
   */
  broadcast(message: string, options: BroadcastOptions = {}): void {
    const { exclude = [], filter } = options;
    const excludeSet = new Set(exclude);

    for (const obj of this.inventory) {
      if (excludeSet.has(obj)) {
        continue;
      }

      if (filter && !filter(obj)) {
        continue;
      }

      // Check if object has a receive method
      // Note: Living.receive() and Player.receive() handle snoop forwarding
      const receiver = obj as MudObject & { receive?: (msg: string) => void };
      if (typeof receiver.receive === 'function') {
        receiver.receive(message);
      } else if (typeof efuns !== 'undefined') {
        efuns.send(obj, message);
      }
    }
  }

  // ========== Lifecycle Hooks ==========

  /**
   * Called when an object enters this room.
   * Override this to react to arrivals.
   * @param obj The entering object
   * @param from The room they came from (if any)
   */
  onEnter(obj: Living, from?: Room): void | Promise<void> {
    // Default: do nothing
  }

  /**
   * Called when an object leaves this room.
   * Override this to react to departures.
   * @param obj The leaving object
   * @param to The destination (if known)
   */
  onLeave(obj: Living, to?: Room): void | Promise<void> {
    // Default: do nothing
  }

  // ========== Reset ==========

  /**
   * Set items to clone on reset.
   * @param itemPaths Array of item paths to clone
   */
  setItems(itemPaths: string[]): void {
    this._items = [...itemPaths];
  }

  /**
   * Get the list of item paths to clone on reset.
   */
  getItems(): string[] {
    return [...this._items];
  }

  /**
   * Set NPCs to clone and maintain in this room.
   * NPCs set here will be spawned on room creation and respawned on reset if missing.
   * @param npcPaths Array of NPC paths to clone
   */
  setNpcs(npcPaths: string[]): void {
    this._npcs = [...npcPaths];
  }

  /**
   * Get the list of NPC paths maintained by this room.
   */
  getNpcs(): string[] {
    return [...this._npcs];
  }

  /**
   * Check if a spawned NPC still exists in the world (not just this room).
   * @param objectId The NPC's objectId to check
   * @returns true if the NPC exists and is alive
   */
  private isSpawnedNpcAlive(objectId: string): boolean {
    if (typeof efuns === 'undefined' || !efuns.findObject) return false;
    const obj = efuns.findObject(objectId);
    if (!obj) return false;

    // Check if it's still alive
    const living = obj as MudObject & { health?: number; alive?: boolean };
    if (typeof living.alive === 'boolean') return living.alive;
    if (typeof living.health === 'number') return living.health > 0;

    return true; // Object exists, assume alive
  }

  /**
   * Spawn all NPCs that should be in this room but are missing.
   * Called during onCreate and onReset.
   * Tracks spawned NPCs to avoid duplicates when they roam.
   */
  async spawnMissingNpcs(): Promise<void> {
    if (typeof efuns === 'undefined' || !efuns.cloneObject || this._npcs.length === 0) {
      return;
    }

    // Clean up tracked IDs for NPCs that no longer exist
    for (const npcId of this._spawnedNpcIds) {
      if (!this.isSpawnedNpcAlive(npcId)) {
        this._spawnedNpcIds.delete(npcId);
      }
    }

    for (const npcPath of this._npcs) {
      // Check if an NPC from this blueprint exists in our tracked set (anywhere in world)
      let hasLivingNpc = false;
      for (const npcId of this._spawnedNpcIds) {
        const obj = efuns.findObject(npcId);
        if (obj) {
          const blueprint = (obj as MudObject & { blueprint?: { objectPath?: string } }).blueprint;
          if (blueprint?.objectPath === npcPath) {
            hasLivingNpc = true;
            break;
          }
        }
      }

      // Clone if missing
      if (!hasLivingNpc) {
        try {
          const npc = await efuns.cloneObject(npcPath);
          if (npc) {
            // Track this NPC
            this._spawnedNpcIds.add(npc.objectId);

            // Set the NPC's spawn room to this room for respawning
            const npcWithSpawn = npc as MudObject & {
              _spawnRoom?: Room;
              _respawnTime?: number;
              setWanderAreaFromSpawnRoom?: () => void;
            };
            npcWithSpawn._spawnRoom = this;

            // Set wander area path for area-restricted wandering
            if (typeof npcWithSpawn.setWanderAreaFromSpawnRoom === 'function') {
              npcWithSpawn.setWanderAreaFromSpawnRoom();
            }

            await npc.moveTo(this);
          }
        } catch (error) {
          console.error(`[Room] Failed to clone NPC ${npcPath}:`, error);
        }
      }
    }
  }

  /**
   * Manually register an NPC as spawned by this room.
   * Use this when spawning NPCs directly in onCreate() instead of via setNpcs().
   * @param npc The NPC to register
   */
  registerSpawnedNpc(npc: MudObject): void {
    this._spawnedNpcIds.add(npc.objectId);

    // Set spawn room on the NPC
    const npcWithSpawn = npc as MudObject & {
      _spawnRoom?: Room;
      setWanderAreaFromSpawnRoom?: () => void;
    };
    npcWithSpawn._spawnRoom = this;

    // Auto-set wander area path if NPC supports it
    if (typeof npcWithSpawn.setWanderAreaFromSpawnRoom === 'function') {
      npcWithSpawn.setWanderAreaFromSpawnRoom();
    }
  }

  /**
   * Manually unregister an NPC from this room's tracking.
   * Use this when an NPC should no longer respawn here.
   * @param npc The NPC to unregister
   */
  unregisterSpawnedNpc(npc: MudObject): void {
    this._spawnedNpcIds.delete(npc.objectId);
  }

  /**
   * Get the set of spawned NPC objectIds tracked by this room.
   * Useful for debugging and admin commands.
   */
  getSpawnedNpcIds(): ReadonlySet<string> {
    return this._spawnedNpcIds;
  }

  /**
   * Set a message to display when the room resets.
   * @param message The reset message
   */
  setResetMessage(message: string): void {
    this._resetMessage = message;
  }

  /**
   * Called when the room should reset.
   * Override or extend this for custom reset behavior.
   * Default behavior: broadcast reset message and re-clone missing items/NPCs.
   */
  async onReset(): Promise<void> {
    // Broadcast reset message if set
    if (this._resetMessage) {
      this.broadcast(this._resetMessage);
    }

    // Re-clone items that are missing from the room
    await this.spawnMissingItems();

    // Re-clone NPCs that are missing from the room
    await this.spawnMissingNpcs();
  }

  // ========== Description ==========

  /**
   * Get the full room description including exits and contents.
   * @param viewer Optional viewer to exclude from contents list
   */
  getFullDescription(viewer?: MudObject): string {
    const lines: string[] = [];

    // Room description - reflow to remove manual line breaks
    // This allows screenWidth config to wrap properly
    lines.push(reflowText(this.longDesc));
    lines.push('');

    // Exits
    const exitDirs = this.getExitDirections();
    if (exitDirs.length > 0) {
      lines.push(`Obvious exits: ${exitDirs.join(', ')}`);
    } else {
      lines.push('There are no obvious exits.');
    }

    // Contents (excluding hidden items and the viewer)
    const visibleContents = this.inventory.filter((obj) => {
      // Exclude the viewer from the list
      if (viewer && obj === viewer) return false;
      // Could add visibility checks here
      return true;
    });

    if (visibleContents.length > 0) {
      // Sort: players first, NPCs second, items last
      const isPlayer = (obj: MudObject): boolean => {
        const p = obj as MudObject & { isConnected?: () => boolean };
        return typeof p.isConnected === 'function';
      };

      const sortedContents = [...visibleContents].sort((a, b) => {
        const aIsPlayer = isPlayer(a);
        const bIsPlayer = isPlayer(b);
        const aIsNPC = a instanceof NPC;
        const bIsNPC = b instanceof NPC;

        // Players first
        if (aIsPlayer && !bIsPlayer) return -1;
        if (!aIsPlayer && bIsPlayer) return 1;
        // NPCs second
        if (aIsNPC && !bIsNPC) return -1;
        if (!aIsNPC && bIsNPC) return 1;
        // Items last (same category, no change)
        return 0;
      });

      lines.push('');
      for (const obj of sortedContents) {
        let desc = obj.shortDesc;

        // Capitalize first letter of description
        if (desc && desc.length > 0) {
          desc = desc.charAt(0).toUpperCase() + desc.slice(1);
        }

        // Add open/closed indicator for containers that support it
        if (obj instanceof Container && obj.canOpenClose) {
          desc += obj.isOpen ? ' {dim}(open){/}' : ' {dim}(closed){/}';
        }
        // Gold piles displayed in bold yellow
        if (obj instanceof GoldPile) {
          desc = `{bold}{yellow}${desc}{/}`;
        }
        // NPCs displayed in red (non-bold), with quest indicators
        else if (obj instanceof NPC) {
          // Check for quest indicator if viewer is a player with quest data
          let questIndicator = '';
          if (viewer && 'getProperty' in viewer) {
            const indicator = obj.getQuestIndicatorSync(
              viewer as Parameters<typeof obj.getQuestIndicatorSync>[0]
            );
            if (indicator === '?') {
              questIndicator = ' {green}?{/}';
            } else if (indicator === '!') {
              questIndicator = ' {yellow}!{/}';
            }
          }
          desc = `{red}${desc}{/}${questIndicator}`;
        }
        lines.push(`  ${desc}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Look at the room (sends description to the viewer).
   * @param viewer The object looking at the room
   */
  look(viewer: MudObject): void {
    const receiver = viewer as MudObject & { receive?: (msg: string) => void };
    const desc = this.getFullDescription(viewer);

    if (typeof receiver.receive === 'function') {
      receiver.receive(`${this.shortDesc}\n\n${desc}`);
    } else if (typeof efuns !== 'undefined') {
      efuns.send(viewer, `${this.shortDesc}\n\n${desc}`);
    }
  }

  /**
   * Quick glance at the room (brief mode - just name and exits).
   * Used when brief mode is enabled.
   * @param viewer The object glancing at the room
   */
  glance(viewer: MudObject): void {
    const receiver = viewer as MudObject & { receive?: (msg: string) => void };
    const exitDirs = this.getExitDirections();
    const exitsStr = exitDirs.length > 0 ? ` {dim}[${exitDirs.join(', ')}]{/}` : '';
    const message = `{bold}${this.shortDesc}{/}${exitsStr}\n`;

    if (typeof receiver.receive === 'function') {
      receiver.receive(message);
    } else if (typeof efuns !== 'undefined') {
      efuns.send(viewer, message);
    }
  }
}

export default Room;
