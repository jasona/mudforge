/**
 * MapRenderer - SVG-based map rendering for the client.
 *
 * Renders terrain blocks, room states, and markers using SVG.
 */

/**
 * Terrain type (matches server definition).
 */
export type TerrainType =
  | 'town'
  | 'indoor'
  | 'road'
  | 'grassland'
  | 'forest'
  | 'dense_forest'
  | 'mountain'
  | 'hills'
  | 'water_shallow'
  | 'water_deep'
  | 'river'
  | 'swamp'
  | 'desert'
  | 'snow'
  | 'ice'
  | 'cave'
  | 'dungeon'
  | 'void';

/**
 * Room state from player's perspective.
 */
export type RoomState = 'explored' | 'revealed' | 'hinted' | 'unknown';

/**
 * Room data from server.
 */
export interface ClientRoomData {
  path: string;
  name: string;
  x: number;
  y: number;
  z: number;
  terrain: TerrainType;
  state: RoomState;
  current: boolean;
  exits: string[];
  icon?: string;
}

/**
 * Area change message from server.
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
 * Move message from server.
 */
export interface MapMoveMessage {
  type: 'move';
  from: string;
  to: string;
  discovered?: ClientRoomData;
}

/**
 * Zoom message from server.
 */
export interface MapZoomMessage {
  type: 'zoom';
  level: number;
  rooms: ClientRoomData[];
}

/**
 * Reveal message from server.
 */
export interface MapRevealMessage {
  type: 'reveal';
  rooms: ClientRoomData[];
}

/**
 * Union of all MAP messages.
 */
export type MapMessage =
  | MapAreaChangeMessage
  | MapMoveMessage
  | MapZoomMessage
  | MapRevealMessage;

/**
 * Terrain visual definitions (colors and characters).
 */
const TERRAIN_VISUALS: Record<TerrainType, { color: string; colorDim: string; block: string }> = {
  town: { color: '#a0a0a0', colorDim: '#505050', block: '▒' },
  indoor: { color: '#c4a882', colorDim: '#625441', block: '░' },
  road: { color: '#8b7355', colorDim: '#453a2b', block: '═' },
  grassland: { color: '#4a7c23', colorDim: '#2d4d16', block: '░' },
  forest: { color: '#228b22', colorDim: '#145214', block: '▓' },
  dense_forest: { color: '#006400', colorDim: '#003200', block: '█' },
  mountain: { color: '#696969', colorDim: '#353535', block: '▲' },
  hills: { color: '#9b8b6e', colorDim: '#4e4637', block: '∩' },
  water_shallow: { color: '#87ceeb', colorDim: '#446676', block: '≈' },
  water_deep: { color: '#1e90ff', colorDim: '#0f4880', block: '≈' },
  river: { color: '#4169e1', colorDim: '#213471', block: '~' },
  swamp: { color: '#556b2f', colorDim: '#2b3618', block: '~' },
  desert: { color: '#edc967', colorDim: '#776534', block: '∙' },
  snow: { color: '#fffafa', colorDim: '#808080', block: '*' },
  ice: { color: '#b0e0e6', colorDim: '#586f73', block: '#' },
  cave: { color: '#404040', colorDim: '#202020', block: '█' },
  dungeon: { color: '#8b0000', colorDim: '#460000', block: '█' },
  void: { color: '#000000', colorDim: '#000000', block: ' ' },
};

/**
 * Cell size at different zoom levels.
 */
const CELL_SIZES = {
  1: 8,   // World view - tiny cells
  2: 12,  // Region view - small cells
  3: 20,  // Local view (default) - medium cells
  4: 32,  // Detail view - large cells with labels
};

/**
 * MapRenderer class for rendering the map as SVG.
 */
export class MapRenderer {
  private svg: SVGSVGElement;
  private roomsGroup: SVGGElement;
  private connectionsGroup: SVGGElement;
  private markersGroup: SVGGElement;
  private rooms: Map<string, ClientRoomData> = new Map();
  // Spatial index for O(1) coordinate lookup: "x,y,z" -> roomPath
  private coordIndex: Map<string, string> = new Map();
  private currentRoomPath: string = '';
  private currentZ: number = 0;
  private zoomLevel: number = 3;
  private viewBox = { x: 0, y: 0, width: 200, height: 200 };
  private areaName: string = '';

  constructor(container: HTMLElement) {
    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'map-svg');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Create groups for layering
    this.connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.connectionsGroup.setAttribute('class', 'map-connections');

    this.roomsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.roomsGroup.setAttribute('class', 'map-rooms');

    this.markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.markersGroup.setAttribute('class', 'map-markers');

    this.svg.appendChild(this.connectionsGroup);
    this.svg.appendChild(this.roomsGroup);
    this.svg.appendChild(this.markersGroup);

    container.appendChild(this.svg);

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => this.updateViewBox());
    resizeObserver.observe(container);

    this.updateViewBox();
  }

  /**
   * Get coordinate key for spatial index.
   */
  private getCoordKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  /**
   * Add a room to the spatial index.
   */
  private indexRoom(room: ClientRoomData): void {
    const key = this.getCoordKey(room.x, room.y, room.z);
    this.coordIndex.set(key, room.path);
  }

  /**
   * Remove a room from the spatial index.
   */
  private unindexRoom(room: ClientRoomData): void {
    const key = this.getCoordKey(room.x, room.y, room.z);
    this.coordIndex.delete(key);
  }

  /**
   * Handle area change message.
   */
  handleAreaChange(message: MapAreaChangeMessage): void {
    this.areaName = message.area.name;
    this.rooms.clear();
    this.coordIndex.clear();

    for (const room of message.rooms) {
      this.rooms.set(room.path, room);
      this.indexRoom(room);
      if (room.current) {
        this.currentRoomPath = room.path;
        this.currentZ = room.z;
      }
    }

    if (message.zoom) {
      this.zoomLevel = message.zoom;
    }

    this.render();
  }

  /**
   * Handle move message.
   */
  handleMove(message: MapMoveMessage): void {
    // Update old room to not be current
    const oldRoom = this.rooms.get(message.from);
    if (oldRoom) {
      oldRoom.current = false;
    }

    // Add discovered room if present
    if (message.discovered) {
      this.rooms.set(message.discovered.path, message.discovered);
      this.indexRoom(message.discovered);
    }

    // Update new room to be current
    const newRoom = this.rooms.get(message.to);
    if (newRoom) {
      newRoom.current = true;
      newRoom.state = 'explored';
      this.currentRoomPath = newRoom.path;
      this.currentZ = newRoom.z;
    }

    this.render();
  }

  /**
   * Handle zoom message.
   */
  handleZoom(message: MapZoomMessage): void {
    this.zoomLevel = message.level;
    if (message.rooms) {
      for (const room of message.rooms) {
        this.rooms.set(room.path, room);
        this.indexRoom(room);
      }
    }
    this.render();
  }

  /**
   * Handle reveal message.
   */
  handleReveal(message: MapRevealMessage): void {
    for (const room of message.rooms) {
      // Only update if we don't already have it explored
      const existing = this.rooms.get(room.path);
      if (!existing || existing.state !== 'explored') {
        this.rooms.set(room.path, room);
        this.indexRoom(room);
      }
    }
    this.render();
  }

  /**
   * Set zoom level (1-4).
   */
  setZoom(level: number): void {
    this.zoomLevel = Math.max(1, Math.min(4, level));
    this.render();
  }

  /**
   * Get current zoom level.
   */
  getZoom(): number {
    return this.zoomLevel;
  }

  /**
   * Set Z level to view.
   */
  setZLevel(z: number): void {
    this.currentZ = z;
    this.render();
  }

  /**
   * Get current area name.
   */
  getAreaName(): string {
    return this.areaName;
  }

  /**
   * Update the SVG viewBox based on room positions and container size.
   */
  private updateViewBox(): void {
    const cellSize = CELL_SIZES[this.zoomLevel as keyof typeof CELL_SIZES] || CELL_SIZES[3];
    const padding = cellSize * 2;

    // Find bounds of rooms at current Z level
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let hasRooms = false;

    for (const room of this.rooms.values()) {
      if (room.z !== this.currentZ) continue;
      hasRooms = true;
      minX = Math.min(minX, room.x);
      maxX = Math.max(maxX, room.x);
      minY = Math.min(minY, room.y);
      maxY = Math.max(maxY, room.y);
    }

    if (!hasRooms) {
      // Default view if no rooms
      this.viewBox = { x: -100, y: -100, width: 200, height: 200 };
    } else {
      // Calculate pixel bounds
      const pxMinX = minX * cellSize - padding;
      const pxMaxX = (maxX + 1) * cellSize + padding;
      const pxMinY = minY * cellSize - padding;
      const pxMaxY = (maxY + 1) * cellSize + padding;

      this.viewBox = {
        x: pxMinX,
        y: pxMinY,
        width: pxMaxX - pxMinX,
        height: pxMaxY - pxMinY,
      };
    }

    this.svg.setAttribute('viewBox',
      `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`
    );
  }

  /**
   * Render the complete map.
   */
  render(): void {
    // Clear existing elements
    this.roomsGroup.innerHTML = '';
    this.connectionsGroup.innerHTML = '';
    this.markersGroup.innerHTML = '';

    const cellSize = CELL_SIZES[this.zoomLevel as keyof typeof CELL_SIZES] || CELL_SIZES[3];

    // Render rooms at current Z level
    for (const room of this.rooms.values()) {
      if (room.z !== this.currentZ) continue;
      this.renderRoom(room, cellSize);
    }

    // Render connections
    this.renderConnections(cellSize);

    // Update viewBox
    this.updateViewBox();
  }

  /**
   * Render a single room.
   */
  private renderRoom(room: ClientRoomData, cellSize: number): void {
    const x = room.x * cellSize;
    const y = room.y * cellSize;
    const visual = TERRAIN_VISUALS[room.terrain] || TERRAIN_VISUALS.indoor;

    // Create room rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(cellSize));
    rect.setAttribute('height', String(cellSize));
    rect.setAttribute('rx', '2');
    rect.setAttribute('ry', '2');
    rect.setAttribute('data-path', room.path);
    rect.setAttribute('data-name', room.name);

    // Apply color based on state
    let fillColor: string;
    let opacity = '1';

    switch (room.state) {
      case 'explored':
        fillColor = visual.color;
        break;
      case 'revealed':
        fillColor = visual.colorDim;
        opacity = '0.8';
        break;
      case 'hinted':
        fillColor = '#1a1a1f';
        opacity = '0.6';
        break;
      default:
        return; // Don't render unknown rooms
    }

    rect.setAttribute('fill', fillColor);
    rect.setAttribute('opacity', opacity);

    // Add border for current room
    if (room.current) {
      rect.setAttribute('stroke', '#ffffff');
      rect.setAttribute('stroke-width', '2');
    } else {
      rect.setAttribute('stroke', 'rgba(0,0,0,0.3)');
      rect.setAttribute('stroke-width', '1');
    }

    // Add tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = room.state === 'explored' ? room.name : '???';
    rect.appendChild(title);

    this.roomsGroup.appendChild(rect);

    // Render marker or player position
    if (room.current) {
      this.renderMarker(x, y, cellSize, '@', '#ffffff', true);
    } else if (room.icon && room.state === 'explored') {
      this.renderMarker(x, y, cellSize, room.icon, '#ffd700', false);
    } else if (room.state === 'hinted') {
      this.renderMarker(x, y, cellSize, '?', '#666666', false);
    }
  }

  /**
   * Render a marker (player position, POI, etc.)
   */
  private renderMarker(
    x: number,
    y: number,
    cellSize: number,
    marker: string,
    color: string,
    highlight: boolean
  ): void {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x + cellSize / 2));
    text.setAttribute('y', String(y + cellSize / 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', color);
    text.setAttribute('font-family', 'monospace');
    text.setAttribute('font-size', String(cellSize * 0.6));
    text.setAttribute('font-weight', highlight ? 'bold' : 'normal');
    text.textContent = marker;

    if (highlight) {
      text.setAttribute('class', 'player-marker');
    }

    this.markersGroup.appendChild(text);
  }

  /**
   * Render connections between rooms.
   */
  private renderConnections(cellSize: number): void {
    const halfCell = cellSize / 2;
    const drawnConnections = new Set<string>();

    for (const room of this.rooms.values()) {
      if (room.z !== this.currentZ) continue;
      if (room.state === 'unknown') continue;

      const fromX = room.x * cellSize + halfCell;
      const fromY = room.y * cellSize + halfCell;

      for (const exit of room.exits) {
        const delta = this.getDirectionDelta(exit);
        if (!delta) continue;

        const toPath = this.findRoomAt(room.x + delta[0], room.y + delta[1], room.z + delta[2]);
        if (!toPath) continue;

        const destRoom = this.rooms.get(toPath);
        if (!destRoom || destRoom.state === 'unknown') continue;

        // Create unique key to avoid drawing same connection twice
        const connKey = [room.path, toPath].sort().join('::');
        if (drawnConnections.has(connKey)) continue;
        drawnConnections.add(connKey);

        // Only draw if destination is at same Z level
        if (delta[2] !== 0) continue;

        const toX = destRoom.x * cellSize + halfCell;
        const toY = destRoom.y * cellSize + halfCell;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(fromX));
        line.setAttribute('y1', String(fromY));
        line.setAttribute('x2', String(toX));
        line.setAttribute('y2', String(toY));
        line.setAttribute('stroke', 'rgba(100, 100, 100, 0.4)');
        line.setAttribute('stroke-width', '2');

        this.connectionsGroup.appendChild(line);
      }
    }
  }

  /**
   * Find room at given coordinates using spatial index (O(1) lookup).
   */
  private findRoomAt(x: number, y: number, z: number): string | null {
    const key = this.getCoordKey(x, y, z);
    return this.coordIndex.get(key) ?? null;
  }

  /**
   * Get coordinate delta for a direction.
   */
  private getDirectionDelta(direction: string): [number, number, number] | null {
    const dir = direction.toLowerCase();
    switch (dir) {
      case 'north': case 'n': return [0, -1, 0];
      case 'south': case 's': return [0, 1, 0];
      case 'east': case 'e': return [1, 0, 0];
      case 'west': case 'w': return [-1, 0, 0];
      case 'northeast': case 'ne': return [1, -1, 0];
      case 'northwest': case 'nw': return [-1, -1, 0];
      case 'southeast': case 'se': return [1, 1, 0];
      case 'southwest': case 'sw': return [-1, 1, 0];
      case 'up': case 'u': return [0, 0, 1];
      case 'down': case 'd': return [0, 0, -1];
      default: return null;
    }
  }

  /**
   * Get room at position from click event.
   */
  getRoomAtPosition(event: MouseEvent): ClientRoomData | null {
    const target = event.target as SVGElement;
    if (target.tagName === 'rect') {
      const path = target.getAttribute('data-path');
      if (path) {
        return this.rooms.get(path) || null;
      }
    }
    return null;
  }
}

export default MapRenderer;
