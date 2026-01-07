/**
 * Map System Type Definitions
 *
 * Shared types used by the map system across server and client.
 */

import type { TerrainType } from './terrain.js';

/**
 * Map coordinates for a room.
 */
export interface MapCoordinates {
  /** X coordinate (east is positive) */
  x: number;
  /** Y coordinate (south is positive) */
  y: number;
  /** Z coordinate / floor level (up is positive) */
  z: number;
  /** Area identifier for grouping rooms on separate maps */
  area: string;
}

/**
 * Room state on the map from player's perspective.
 */
export type RoomState = 'explored' | 'revealed' | 'hinted' | 'unknown';

/**
 * Point of interest marker types.
 */
export type POIMarker =
  | '$'  // Shop / Merchant
  | '!'  // Quest giver / Important NPC
  | '†'  // Danger / Boss
  | '♦'  // Treasure / Loot
  | '↑'  // Stairs up
  | '↓'  // Stairs down
  | '◊'  // Portal / Teleporter
  | '⚑'  // Landmark / Waypoint
  | 'T'  // Trainer
  | '♥'  // Healing / Rest area
  | string; // Custom marker

/**
 * Per-room map data stored on the room.
 */
export interface RoomMapData {
  /** Room coordinates (optional - can use auto-layout) */
  coords?: Partial<MapCoordinates>;
  /** POI marker overlay */
  icon?: POIMarker;
  /** Hidden from map unless discovered */
  hidden?: boolean;
  /** Short label for detail view */
  label?: string;
}

/**
 * Area definition for grouping rooms.
 */
export interface AreaDefinition {
  /** Unique area identifier */
  id: string;
  /** Human-readable area name */
  name: string;
  /** Default Z level for rooms in this area */
  defaultZ: number;
  /** Optional bounds for fixed-size areas */
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  /** Default zoom level for this area (1-4) */
  defaultZoom?: number;
}

/**
 * Room data sent to client.
 */
export interface ClientRoomData {
  /** Room object path */
  path: string;
  /** Room short description / name */
  name: string;
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Z coordinate */
  z: number;
  /** Terrain type */
  terrain: TerrainType;
  /** Room state from player's perspective */
  state: RoomState;
  /** Is this the player's current room */
  current: boolean;
  /** Exit directions from this room */
  exits: string[];
  /** POI marker (if any) */
  icon?: POIMarker;
}

/**
 * MAP protocol message - area change.
 */
export interface MapAreaChangeMessage {
  type: 'area_change';
  area: {
    id: string;
    name: string;
  };
  rooms: ClientRoomData[];
  current: string;
  zoom: number;
}

/**
 * MAP protocol message - player moved.
 */
export interface MapMoveMessage {
  type: 'move';
  from: string;
  to: string;
  /** Newly discovered room data (if first visit) */
  discovered?: ClientRoomData;
}

/**
 * MAP protocol message - zoom level change.
 */
export interface MapZoomMessage {
  type: 'zoom';
  level: number;
  rooms: ClientRoomData[];
}

/**
 * MAP protocol message - room revealed (e.g., from treasure map).
 */
export interface MapRevealMessage {
  type: 'reveal';
  rooms: ClientRoomData[];
}

/**
 * Union of all MAP protocol messages.
 */
export type MapMessage =
  | MapAreaChangeMessage
  | MapMoveMessage
  | MapZoomMessage
  | MapRevealMessage;

/**
 * Player's exploration data (persisted).
 */
export interface PlayerExplorationData {
  /** Set of explored room paths */
  exploredRooms: string[];
  /** Set of revealed room paths (from treasure maps) */
  revealedRooms: string[];
  /** Detected hidden exits: roomPath -> direction[] */
  detectedHiddenExits: Record<string, string[]>;
}

/**
 * Full map coordinates with defaults.
 */
export function normalizeCoordinates(
  partial: Partial<MapCoordinates> | undefined,
  defaults: { area?: string; z?: number } = {}
): MapCoordinates {
  return {
    x: partial?.x ?? 0,
    y: partial?.y ?? 0,
    z: partial?.z ?? defaults.z ?? 0,
    area: partial?.area ?? defaults.area ?? 'default',
  };
}
