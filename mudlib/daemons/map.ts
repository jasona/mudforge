/**
 * Map Daemon - Manages the mapping system.
 *
 * Responsibilities:
 * - Area definitions and registration
 * - Room coordinate management
 * - Auto-layout for rooms without explicit coordinates
 * - Map data generation for clients
 * - Euclidean exit validation
 */

import { MudObject } from '../lib/std.js';
import type { TerrainType } from '../lib/terrain.js';
import { getDirectionDelta, OPPOSITE_DIRECTIONS } from '../lib/terrain.js';
import type {
  AreaDefinition,
  MapCoordinates,
  ClientRoomData,
  RoomState,
  MapAreaChangeMessage,
  MapMoveMessage,
} from '../lib/map-types.js';
import { normalizeCoordinates } from '../lib/map-types.js';

/**
 * Room interface for map operations.
 */
interface MapRoom extends MudObject {
  objectPath: string;
  shortDesc: string;
  getTerrain(): TerrainType;
  getMapData(): { coords?: Partial<MapCoordinates>; icon?: string; hidden?: boolean };
  getExitDirections(): string[];
  getExit(direction: string): { destination: string | MudObject } | undefined;
  isOneWayExit?(direction: string): boolean;
}

/**
 * Player interface for map operations.
 */
interface MapPlayer extends MudObject {
  name: string;
  hasExplored(roomPath: string): boolean;
  hasRevealed(roomPath: string): boolean;
  markExplored(roomPath: string): boolean;
  getExploredRooms(): string[];
  getRevealedRooms(): string[];
  receive(message: string): void;
}

/**
 * Euclidean validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  roomPath: string;
  direction: string;
  message: string;
}

export interface ValidationWarning {
  roomPath: string;
  direction: string;
  message: string;
}

/**
 * Map Daemon class.
 */
export class MapDaemon extends MudObject {
  private _areas: Map<string, AreaDefinition> = new Map();
  private _coordinateCache: Map<string, MapCoordinates> = new Map();

  constructor() {
    super();
    this.shortDesc = 'Map Daemon';
    this.longDesc = 'The map daemon manages the world mapping system.';

    // Initialize default areas
    this.initializeDefaultAreas();
  }

  /**
   * Initialize default area definitions.
   */
  private initializeDefaultAreas(): void {
    this.registerArea({
      id: 'default',
      name: 'Unknown Region',
      defaultZ: 0,
    });

    this.registerArea({
      id: 'town',
      name: 'Town of Aldric',
      defaultZ: 0,
      defaultZoom: 3,
    });

    this.registerArea({
      id: 'void',
      name: 'The Void',
      defaultZ: 0,
    });

    this.registerArea({
      id: '/areas/valdoria/aldric_depths',
      name: 'Castle Dungeons',
      defaultZ: -1,
      defaultZoom: 3,
    });
  }

  // ========== Area Management ==========

  /**
   * Register an area definition.
   * @param area The area definition
   */
  registerArea(area: AreaDefinition): void {
    this._areas.set(area.id, area);
  }

  /**
   * Get an area definition by ID.
   * @param areaId The area ID
   */
  getArea(areaId: string): AreaDefinition | undefined {
    return this._areas.get(areaId);
  }

  /**
   * Get all registered areas.
   */
  getAllAreas(): AreaDefinition[] {
    return Array.from(this._areas.values());
  }

  // ========== Coordinate Management ==========

  /**
   * Get coordinates for a room, using cache or calculating if needed.
   * @param room The room object
   */
  getRoomCoordinates(room: MapRoom): MapCoordinates {
    const path = room.objectPath;

    // Check cache first
    const cached = this._coordinateCache.get(path);
    if (cached) {
      return cached;
    }

    // Get from room's map data
    const mapData = room.getMapData();
    const coords = normalizeCoordinates(mapData.coords, { area: 'default', z: 0 });

    // Cache the result
    this._coordinateCache.set(path, coords);

    return coords;
  }

  /**
   * Clear coordinate cache for a room (e.g., after hot-reload).
   * @param roomPath The room path
   */
  clearCoordinateCache(roomPath?: string): void {
    if (roomPath) {
      this._coordinateCache.delete(roomPath);
    } else {
      this._coordinateCache.clear();
    }
  }

  /**
   * Calculate auto-layout coordinates for a room based on its connections.
   * Uses BFS from rooms with known coordinates.
   * @param startRoom The room to calculate coordinates for
   * @param knownRooms Map of room paths to their known coordinates
   */
  calculateAutoLayout(
    startRoom: MapRoom,
    knownRooms: Map<string, MapCoordinates>
  ): MapCoordinates | null {
    // If room has explicit coordinates, use those
    const mapData = startRoom.getMapData();
    if (mapData.coords?.x !== undefined && mapData.coords?.y !== undefined) {
      return normalizeCoordinates(mapData.coords);
    }

    // BFS to find a room with known coordinates and calculate path
    const visited = new Set<string>();
    const queue: Array<{ room: MapRoom; path: Array<{ dir: string; from: string }> }> = [
      { room: startRoom, path: [] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentPath = current.room.objectPath;

      if (visited.has(currentPath)) continue;
      visited.add(currentPath);

      // Check if this room has known coordinates
      const known = knownRooms.get(currentPath);
      if (known && current.path.length > 0) {
        // Walk back from known room to start room
        let x = known.x;
        let y = known.y;
        let z = known.z;

        // Reverse the path and apply opposite deltas
        for (let i = current.path.length - 1; i >= 0; i--) {
          const step = current.path[i];
          const opposite = OPPOSITE_DIRECTIONS[step.dir];
          if (opposite) {
            const delta = getDirectionDelta(opposite);
            if (delta) {
              x += delta[0];
              y += delta[1];
              z += delta[2];
            }
          }
        }

        return { x, y, z, area: known.area };
      }

      // Add neighbors to queue
      for (const dir of current.room.getExitDirections()) {
        const exit = current.room.getExit(dir);
        if (!exit) continue;

        const destPath = typeof exit.destination === 'string'
          ? exit.destination
          : exit.destination.objectPath;

        if (!visited.has(destPath)) {
          // Try to load the destination room
          if (typeof efuns !== 'undefined') {
            const destRoom = efuns.findObject(destPath) as MapRoom | undefined;
            if (destRoom) {
              queue.push({
                room: destRoom,
                path: [...current.path, { dir, from: currentPath }],
              });
            }
          }
        }
      }
    }

    // No path to a room with known coordinates - return origin
    return { x: 0, y: 0, z: 0, area: 'default' };
  }

  // ========== Map Data Generation ==========

  /**
   * Get the room state for a player.
   * @param roomPath The room path
   * @param player The player to check
   */
  getRoomState(roomPath: string, player: MapPlayer): RoomState {
    if (player.hasExplored(roomPath)) {
      return 'explored';
    }
    if (player.hasRevealed(roomPath)) {
      return 'revealed';
    }
    return 'hinted';
  }

  /**
   * Generate client room data for a room.
   * @param room The room object
   * @param player The player viewing the map
   * @param isCurrent Whether this is the player's current room
   */
  generateClientRoomData(
    room: MapRoom,
    player: MapPlayer,
    isCurrent: boolean
  ): ClientRoomData {
    const coords = this.getRoomCoordinates(room);
    const mapData = room.getMapData();
    const state = this.getRoomState(room.objectPath, player);

    return {
      path: room.objectPath,
      name: state === 'explored' ? room.shortDesc : '???',
      x: coords.x,
      y: coords.y,
      z: coords.z,
      terrain: room.getTerrain(),
      state,
      current: isCurrent,
      exits: room.getExitDirections(),
      icon: state === 'explored' ? mapData.icon : undefined,
    };
  }

  /**
   * Generate map data for a player entering a room.
   * Returns data for all rooms the player knows about in the current area.
   * @param player The player
   * @param currentRoom The room the player is in
   */
  generateAreaMapData(player: MapPlayer, currentRoom: MapRoom): MapAreaChangeMessage {
    const currentCoords = this.getRoomCoordinates(currentRoom);
    const areaId = currentCoords.area;
    const area = this.getArea(areaId) || { id: areaId, name: 'Unknown Region', defaultZ: 0 };

    const rooms: ClientRoomData[] = [];
    const processedPaths = new Set<string>();

    // Add current room (and mark as explored)
    player.markExplored(currentRoom.objectPath);
    rooms.push(this.generateClientRoomData(currentRoom, player, true));
    processedPaths.add(currentRoom.objectPath);

    // Add all explored rooms in this area
    for (const roomPath of player.getExploredRooms()) {
      if (processedPaths.has(roomPath)) continue;

      if (typeof efuns !== 'undefined') {
        const room = efuns.findObject(roomPath) as MapRoom | undefined;
        if (room) {
          const roomCoords = this.getRoomCoordinates(room);
          if (roomCoords.area === areaId) {
            rooms.push(this.generateClientRoomData(room, player, false));
            processedPaths.add(roomPath);
          }
        }
      }
    }

    // Add revealed rooms in this area
    for (const roomPath of player.getRevealedRooms()) {
      if (processedPaths.has(roomPath)) continue;

      if (typeof efuns !== 'undefined') {
        const room = efuns.findObject(roomPath) as MapRoom | undefined;
        if (room) {
          const roomCoords = this.getRoomCoordinates(room);
          if (roomCoords.area === areaId) {
            rooms.push(this.generateClientRoomData(room, player, false));
            processedPaths.add(roomPath);
          }
        }
      }
    }

    // Add hinted rooms (connected to explored rooms but not visited)
    for (const roomPath of player.getExploredRooms()) {
      if (typeof efuns !== 'undefined') {
        const room = efuns.findObject(roomPath) as MapRoom | undefined;
        if (room) {
          for (const dir of room.getExitDirections()) {
            const exit = room.getExit(dir);
            if (!exit) continue;

            const destPath = typeof exit.destination === 'string'
              ? exit.destination
              : exit.destination.objectPath;

            if (processedPaths.has(destPath)) continue;

            const destRoom = efuns.findObject(destPath) as MapRoom | undefined;
            if (destRoom) {
              const destCoords = this.getRoomCoordinates(destRoom);
              if (destCoords.area === areaId) {
                // Check if it's hidden
                const destMapData = destRoom.getMapData();
                if (!destMapData.hidden) {
                  rooms.push(this.generateClientRoomData(destRoom, player, false));
                  processedPaths.add(destPath);
                }
              }
            }
          }
        }
      }
    }

    return {
      type: 'area_change',
      area: {
        id: area.id,
        name: area.name,
      },
      rooms,
      current: currentRoom.objectPath,
      zoom: area.defaultZoom || 3,
    };
  }

  /**
   * Generate map move message when player moves to a new room.
   * @param player The player
   * @param fromRoom The room they left
   * @param toRoom The room they entered
   */
  generateMoveMessage(
    player: MapPlayer,
    fromRoom: MapRoom,
    toRoom: MapRoom
  ): MapMoveMessage {
    const wasExplored = player.hasExplored(toRoom.objectPath);
    const isNewDiscovery = player.markExplored(toRoom.objectPath);

    const message: MapMoveMessage = {
      type: 'move',
      from: fromRoom.objectPath,
      to: toRoom.objectPath,
    };

    if (isNewDiscovery || !wasExplored) {
      message.discovered = this.generateClientRoomData(toRoom, player, true);
    }

    return message;
  }

  // ========== Euclidean Validation ==========

  /**
   * Validate that all exits in an area follow euclidean rules.
   * @param areaId The area to validate (or undefined for all areas)
   */
  validateArea(areaId?: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get all rooms (this would need a proper registry in production)
    // For now, we'll validate rooms as they're accessed
    // This is a placeholder for the full implementation

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single room's exits.
   * @param room The room to validate
   */
  validateRoomExits(room: MapRoom): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const roomPath = room.objectPath;

    for (const dir of room.getExitDirections()) {
      const exit = room.getExit(dir);
      if (!exit) continue;

      // Skip one-way exits
      if (room.isOneWayExit && room.isOneWayExit(dir)) {
        continue;
      }

      const destPath = typeof exit.destination === 'string'
        ? exit.destination
        : exit.destination.objectPath;

      // Try to load destination room
      if (typeof efuns !== 'undefined') {
        const destRoom = efuns.findObject(destPath) as MapRoom | undefined;
        if (destRoom) {
          const oppositeDir = OPPOSITE_DIRECTIONS[dir];
          if (oppositeDir) {
            const reverseExit = destRoom.getExit(oppositeDir);
            if (!reverseExit) {
              warnings.push({
                roomPath,
                direction: dir,
                message: `No reverse exit from ${destPath} going ${oppositeDir}`,
              });
            } else {
              const reverseDest = typeof reverseExit.destination === 'string'
                ? reverseExit.destination
                : reverseExit.destination.objectPath;
              if (reverseDest !== roomPath) {
                errors.push({
                  roomPath,
                  direction: dir,
                  message: `Reverse exit from ${destPath} goes to ${reverseDest} instead of ${roomPath}`,
                });
              }
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Singleton instance
let mapDaemonInstance: MapDaemon | null = null;

/**
 * Get the map daemon singleton.
 */
export function getMapDaemon(): MapDaemon {
  if (!mapDaemonInstance) {
    mapDaemonInstance = new MapDaemon();
  }
  return mapDaemonInstance;
}

export default MapDaemon;
