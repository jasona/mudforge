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
 * World map data message from server.
 */
export interface MapWorldDataMessage {
  type: 'world_data';
  areas: Array<{
    id: string;
    name: string;
    worldX: number;
    worldY: number;
  }>;
  rooms: ClientRoomData[];
  currentRoom: string;
}

/**
 * Biome tile id from dense renderer payload.
 */
export type BiomeTileId =
  | 'void'
  | 'water_deep'
  | 'water_shallow'
  | 'coast'
  | 'sand'
  | 'grassland'
  | 'forest'
  | 'dense_forest'
  | 'hills'
  | 'mountain'
  | 'snow'
  | 'road'
  | 'town'
  | 'dungeon';

/**
 * Dense biome payload for area maps.
 */
export interface BiomeAreaDataMessage {
  type: 'biome_area';
  area: {
    id: string;
    name: string;
  };
  width: number;
  height: number;
  tileSize?: number;
  seed: number;
  origin: {
    minX: number;
    minY: number;
  };
  tiles: BiomeTileId[];
  player: {
    x: number;
    y: number;
  };
  poi: Array<{
    x: number;
    y: number;
    icon: string;
    label?: string;
  }>;
}

/**
 * Dense biome payload for world maps.
 */
export interface BiomeWorldDataMessage {
  type: 'biome_world';
  width: number;
  height: number;
  tileSize?: number;
  seed: number;
  origin: {
    minX: number;
    minY: number;
  };
  tiles: BiomeTileId[];
  areas: Array<{
    id: string;
    name: string;
    worldX: number;
    worldY: number;
  }>;
  player: {
    x: number;
    y: number;
  };
}

/**
 * Biome viewport/zoom updates.
 */
export interface BiomeViewMessage {
  type: 'biome_view';
  zoom: number;
  viewX?: number;
  viewY?: number;
}

/**
 * Union of all MAP messages.
 */
export type MapMessage =
  | MapAreaChangeMessage
  | MapMoveMessage
  | MapZoomMessage
  | MapRevealMessage
  | MapWorldDataMessage
  | BiomeAreaDataMessage
  | BiomeWorldDataMessage
  | BiomeViewMessage;

/**
 * Terrain visual definition.
 */
interface TerrainVisual {
  color: string;
  colorDim: string;
  block: string;
  border: string;
  label: string;
  glow?: string;
}

/**
 * Terrain visual definitions (colors, characters, borders, glow).
 */
const TERRAIN_VISUALS: Record<TerrainType, TerrainVisual> = {
  town:          { color: '#a0a0a0', colorDim: '#505050', block: '▒', border: '#787878', label: 'Town' },
  indoor:        { color: '#c4a882', colorDim: '#625441', block: '░', border: '#9a8468', label: 'Indoor' },
  road:          { color: '#8b7355', colorDim: '#453a2b', block: '═', border: '#6b5943', label: 'Road' },
  grassland:     { color: '#4a7c23', colorDim: '#2d4d16', block: '░', border: '#3a6218', label: 'Grassland' },
  forest:        { color: '#228b22', colorDim: '#145214', block: '▓', border: '#1a6b1a', label: 'Forest' },
  dense_forest:  { color: '#006400', colorDim: '#003200', block: '█', border: '#004a00', label: 'Dense Forest' },
  mountain:      { color: '#696969', colorDim: '#353535', block: '▲', border: '#505050', label: 'Mountain' },
  hills:         { color: '#9b8b6e', colorDim: '#4e4637', block: '∩', border: '#7a6e57', label: 'Hills' },
  water_shallow: { color: '#87ceeb', colorDim: '#446676', block: '≈', border: '#6ab0d0', label: 'Shallow Water', glow: '#87ceeb' },
  water_deep:    { color: '#1e90ff', colorDim: '#0f4880', block: '≈', border: '#1670cc', label: 'Deep Water', glow: '#1e90ff' },
  river:         { color: '#4169e1', colorDim: '#213471', block: '~', border: '#3355b8', label: 'River', glow: '#4169e1' },
  swamp:         { color: '#556b2f', colorDim: '#2b3618', block: '~', border: '#435524', label: 'Swamp' },
  desert:        { color: '#edc967', colorDim: '#776534', block: '∙', border: '#c4a654', label: 'Desert' },
  snow:          { color: '#fffafa', colorDim: '#808080', block: '*', border: '#d0d0d0', label: 'Snow', glow: '#e8e8ff' },
  ice:           { color: '#b0e0e6', colorDim: '#586f73', block: '#', border: '#8cc0c8', label: 'Ice', glow: '#b0e0e6' },
  cave:          { color: '#404040', colorDim: '#202020', block: '█', border: '#303030', label: 'Cave' },
  dungeon:       { color: '#8b0000', colorDim: '#460000', block: '█', border: '#6b0000', label: 'Dungeon', glow: '#8b0000' },
  void:          { color: '#000000', colorDim: '#000000', block: ' ', border: '#000000', label: 'Void' },
};

/**
 * Cell size at different zoom levels.
 */
const CELL_SIZES = {
  1: 11,  // World view - tiny cells
  2: 17,  // Region view - small cells
  3: 28,  // Local view (default) - medium cells
  4: 45,  // Detail view - large cells with labels
};

/**
 * Human-readable terrain label info for the legend.
 */
export interface TerrainLegendEntry {
  terrain: TerrainType;
  color: string;
  block: string;
  label: string;
}

/**
 * Get the reverse direction for one-way exit detection.
 */
function getReverseDirection(dir: string): string | null {
  const d = dir.toLowerCase();
  switch (d) {
    case 'north': case 'n': return 'south';
    case 'south': case 's': return 'north';
    case 'east': case 'e': return 'west';
    case 'west': case 'w': return 'east';
    case 'northeast': case 'ne': return 'southwest';
    case 'northwest': case 'nw': return 'southeast';
    case 'southeast': case 'se': return 'northwest';
    case 'southwest': case 'sw': return 'northeast';
    case 'up': case 'u': return 'down';
    case 'down': case 'd': return 'up';
    default: return null;
  }
}

/**
 * Normalize direction to canonical long form for comparison.
 */
function normalizeDirection(dir: string): string {
  const d = dir.toLowerCase();
  switch (d) {
    case 'n': return 'north';
    case 's': return 'south';
    case 'e': return 'east';
    case 'w': return 'west';
    case 'ne': return 'northeast';
    case 'nw': return 'northwest';
    case 'se': return 'southeast';
    case 'sw': return 'southwest';
    case 'u': return 'up';
    case 'd': return 'down';
    default: return d;
  }
}

/**
 * MapRenderer class for rendering the map as SVG.
 */
export class MapRenderer {
  private svg: SVGSVGElement;
  private roomsGroup: SVGGElement;
  private connectionsGroup: SVGGElement;
  private markersGroup: SVGGElement;
  private labelsGroup: SVGGElement;
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

    // Add SVG defs for glow filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'terrain-glow');
    filter.setAttribute('x', '-30%');
    filter.setAttribute('y', '-30%');
    filter.setAttribute('width', '160%');
    filter.setAttribute('height', '160%');
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('in', 'SourceGraphic');
    feGaussianBlur.setAttribute('stdDeviation', '1.5');
    feGaussianBlur.setAttribute('result', 'blur');
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'blur');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feMerge);
    defs.appendChild(filter);

    // Arrowhead marker for one-way exits
    const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    arrowMarker.setAttribute('id', 'oneway-arrow');
    arrowMarker.setAttribute('viewBox', '0 0 6 6');
    arrowMarker.setAttribute('refX', '3');
    arrowMarker.setAttribute('refY', '3');
    arrowMarker.setAttribute('markerWidth', '6');
    arrowMarker.setAttribute('markerHeight', '6');
    arrowMarker.setAttribute('orient', 'auto');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M0,0 L6,3 L0,6 Z');
    arrowPath.setAttribute('fill', '#cc4444');
    arrowMarker.appendChild(arrowPath);
    defs.appendChild(arrowMarker);

    this.svg.appendChild(defs);

    // Create groups for layering
    this.connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.connectionsGroup.setAttribute('class', 'map-connections');

    this.roomsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.roomsGroup.setAttribute('class', 'map-rooms');

    this.markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.markersGroup.setAttribute('class', 'map-markers');

    this.labelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.labelsGroup.setAttribute('class', 'map-labels');

    this.svg.appendChild(this.connectionsGroup);
    this.svg.appendChild(this.roomsGroup);
    this.svg.appendChild(this.markersGroup);
    this.svg.appendChild(this.labelsGroup);

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
   * Get visible terrain types on the current Z level for the legend.
   */
  getVisibleTerrains(): TerrainLegendEntry[] {
    const seen = new Set<TerrainType>();
    const entries: TerrainLegendEntry[] = [];

    for (const room of this.rooms.values()) {
      if (room.z !== this.currentZ) continue;
      if (room.state === 'unknown') continue;
      if (seen.has(room.terrain)) continue;
      seen.add(room.terrain);

      const visual = TERRAIN_VISUALS[room.terrain];
      if (visual && room.terrain !== 'void') {
        entries.push({
          terrain: room.terrain,
          color: visual.color,
          block: visual.block,
          label: visual.label,
        });
      }
    }

    // Sort alphabetically by label
    entries.sort((a, b) => a.label.localeCompare(b.label));
    return entries;
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
      // Extra bottom padding for room labels at zoom 3+
      const labelPadding = this.zoomLevel >= 3 ? cellSize * 0.5 : 0;
      const pxMaxY = (maxY + 1) * cellSize + padding + labelPadding;

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
    this.labelsGroup.innerHTML = '';

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

    // Wrap room elements in a group for click detection
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-path', room.path);
    group.setAttribute('data-name', room.name);

    // Create room rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(cellSize));
    rect.setAttribute('height', String(cellSize));
    rect.setAttribute('rx', '2');
    rect.setAttribute('ry', '2');
    rect.setAttribute('fill', fillColor);
    rect.setAttribute('opacity', opacity);

    // Terrain-specific border (white for current room)
    if (room.current) {
      rect.setAttribute('stroke', '#ffffff');
      rect.setAttribute('stroke-width', '2');
    } else {
      rect.setAttribute('stroke', visual.border);
      rect.setAttribute('stroke-width', '1');
    }

    // Apply glow filter for glow terrains at zoom 2+ on explored rooms
    if (visual.glow && this.zoomLevel >= 2 && room.state === 'explored') {
      rect.setAttribute('filter', 'url(#terrain-glow)');
    }

    // Add tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = room.state === 'explored' ? room.name : '???';
    rect.appendChild(title);

    group.appendChild(rect);

    // Render terrain block character at zoom 2+ (subtle background glyph)
    if (this.zoomLevel >= 2 && visual.block.trim()) {
      this.renderTerrainBlock(group, x, y, cellSize, visual.block, room.state);
    }

    this.roomsGroup.appendChild(group);

    // Render vertical exit indicators at zoom 2+
    if (this.zoomLevel >= 2) {
      this.renderVerticalExitIndicators(room, x, y, cellSize);
    }

    // Render marker or player position
    if (room.current) {
      this.renderMarker(x, y, cellSize, '@', '#ffffff', true);
    } else if (room.icon && room.state === 'explored') {
      this.renderMarker(x, y, cellSize, room.icon, '#ffd700', false);
    } else if (room.state === 'hinted') {
      this.renderMarker(x, y, cellSize, '?', '#666666', false);
    }

    // Render room label at zoom 3+
    if (this.zoomLevel >= 3 && room.state === 'explored') {
      this.renderRoomLabel(room, x, y, cellSize);
    }
  }

  /**
   * Render a terrain block character inside the room cell.
   */
  private renderTerrainBlock(
    group: SVGGElement,
    x: number,
    y: number,
    cellSize: number,
    block: string,
    state: RoomState,
  ): void {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x + cellSize / 2));
    text.setAttribute('y', String(y + cellSize / 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', state === 'explored' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)');
    text.setAttribute('font-family', 'monospace');
    text.setAttribute('font-size', String(cellSize * 0.5));
    text.setAttribute('pointer-events', 'none');
    text.textContent = block;
    group.appendChild(text);
  }

  /**
   * Render up/down arrows in the corners of rooms with vertical exits.
   */
  private renderVerticalExitIndicators(
    room: ClientRoomData,
    x: number,
    y: number,
    cellSize: number,
  ): void {
    const exits = room.exits.map(normalizeDirection);
    const hasUp = exits.includes('up');
    const hasDown = exits.includes('down');
    if (!hasUp && !hasDown) return;

    const fontSize = Math.max(4, cellSize * 0.3);
    const pad = cellSize * 0.15;

    if (hasUp) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(x + cellSize - pad));
      text.setAttribute('y', String(y + pad + fontSize * 0.3));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', 'rgba(200, 220, 255, 0.8)');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', String(fontSize));
      text.setAttribute('pointer-events', 'none');
      text.textContent = '\u2191'; // ↑
      this.markersGroup.appendChild(text);
    }

    if (hasDown) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(x + cellSize - pad));
      text.setAttribute('y', String(y + cellSize - pad));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', 'rgba(255, 200, 200, 0.8)');
      text.setAttribute('font-family', 'sans-serif');
      text.setAttribute('font-size', String(fontSize));
      text.setAttribute('pointer-events', 'none');
      text.textContent = '\u2193'; // ↓
      this.markersGroup.appendChild(text);
    }
  }

  /**
   * Render a room name label below the room cell.
   */
  private renderRoomLabel(room: ClientRoomData, x: number, y: number, cellSize: number): void {
    const maxChars = this.zoomLevel >= 4 ? 18 : 10;
    const fontSize = this.zoomLevel >= 4 ? 7 : 5;

    let label = room.name;
    if (label.length > maxChars) {
      label = label.substring(0, maxChars - 1) + '\u2026'; // ellipsis
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x + cellSize / 2));
    text.setAttribute('y', String(y + cellSize + fontSize + 1));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'hanging');
    text.setAttribute('fill', 'rgba(180, 180, 180, 0.7)');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('font-size', String(fontSize));
    text.setAttribute('pointer-events', 'none');
    text.textContent = label;

    this.labelsGroup.appendChild(text);
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
    // Track drawn connections: "path1::path2" for bidirectional, "path1->path2" for one-way
    const drawnBidirectional = new Set<string>();
    const drawnOneway = new Set<string>();

    for (const room of this.rooms.values()) {
      if (room.z !== this.currentZ) continue;
      if (room.state === 'unknown') continue;

      const fromX = room.x * cellSize + halfCell;
      const fromY = room.y * cellSize + halfCell;

      for (const exit of room.exits) {
        const delta = this.getDirectionDelta(exit);
        if (!delta) continue;

        // Only draw same-Z connections as lines
        if (delta[2] !== 0) continue;

        const toPath = this.findRoomAt(room.x + delta[0], room.y + delta[1], room.z + delta[2]);
        if (!toPath) continue;

        const destRoom = this.rooms.get(toPath);
        if (!destRoom || destRoom.state === 'unknown') continue;

        // Check if destination has a reverse exit back
        const reverseDir = getReverseDirection(exit);
        const isBidirectional = reverseDir !== null &&
          destRoom.exits.some(e => normalizeDirection(e) === normalizeDirection(reverseDir));

        if (isBidirectional) {
          // Avoid drawing bidirectional connection twice
          const connKey = [room.path, toPath].sort().join('::');
          if (drawnBidirectional.has(connKey)) continue;
          drawnBidirectional.add(connKey);

          const toX = destRoom.x * cellSize + halfCell;
          const toY = destRoom.y * cellSize + halfCell;

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', String(fromX));
          line.setAttribute('y1', String(fromY));
          line.setAttribute('x2', String(toX));
          line.setAttribute('y2', String(toY));
          line.setAttribute('stroke', 'rgba(120, 120, 120, 0.5)');
          line.setAttribute('stroke-width', '2');
          this.connectionsGroup.appendChild(line);
        } else {
          // One-way exit: dashed line with arrowhead
          const onewayKey = `${room.path}->${toPath}`;
          if (drawnOneway.has(onewayKey)) continue;
          drawnOneway.add(onewayKey);

          const toX = destRoom.x * cellSize + halfCell;
          const toY = destRoom.y * cellSize + halfCell;

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', String(fromX));
          line.setAttribute('y1', String(fromY));
          // Place arrowhead at 70% of the way
          const arrowX = fromX + (toX - fromX) * 0.7;
          const arrowY = fromY + (toY - fromY) * 0.7;
          line.setAttribute('x2', String(arrowX));
          line.setAttribute('y2', String(arrowY));
          line.setAttribute('stroke', 'rgba(200, 80, 80, 0.6)');
          line.setAttribute('stroke-width', '2');
          line.setAttribute('stroke-dasharray', '4 2');
          line.setAttribute('marker-end', 'url(#oneway-arrow)');
          this.connectionsGroup.appendChild(line);

          // Draw remaining line segment (arrow to destination) without arrowhead
          const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line2.setAttribute('x1', String(arrowX));
          line2.setAttribute('y1', String(arrowY));
          line2.setAttribute('x2', String(toX));
          line2.setAttribute('y2', String(toY));
          line2.setAttribute('stroke', 'rgba(200, 80, 80, 0.6)');
          line2.setAttribute('stroke-width', '2');
          line2.setAttribute('stroke-dasharray', '4 2');
          this.connectionsGroup.appendChild(line2);
        }
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
   * Walks up the DOM (max 3 levels) to find nearest element with data-path.
   */
  getRoomAtPosition(event: MouseEvent): ClientRoomData | null {
    let target = event.target as SVGElement | null;
    for (let i = 0; i < 4 && target; i++) {
      const path = target.getAttribute?.('data-path');
      if (path) {
        return this.rooms.get(path) || null;
      }
      target = target.parentElement as SVGElement | null;
    }
    return null;
  }
}

export default MapRenderer;
