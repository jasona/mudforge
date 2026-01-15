/**
 * Area Builder GUI - Modal interfaces for the area building system.
 *
 * Provides GUI modals for:
 * - Area Selector: List and manage areas
 * - New Area Wizard: Create areas with AI generation (Phase 4)
 * - Multi-Tab Editor: Edit rooms, NPCs, items (Phase 3)
 */

import type {
  GUIOpenMessage,
  GUIUpdateMessage,
  GUICloseMessage,
  GUIClientMessage,
  LayoutContainer,
  DisplayElement,
  InputElement,
  ModalButton,
} from './gui-types.js';
import type {
  AreaDefinition,
  AreaStatus,
  AreaListEntry,
  DraftRoom,
  DraftNPC,
  DraftItem,
} from './area-types.js';
import type { AreaDaemon } from '../daemons/area.js';
import { TERRAINS, type TerrainType } from './terrain.js';

// =============================================================================
// Types
// =============================================================================

/** Player interface for GUI operations */
export interface GUIPlayer {
  name: string;
  receive(message: string): void;
  onGUIResponse?: (msg: GUIClientMessage) => void;
}

/** Callback function type for area selection */
export type AreaSelectedCallback = (areaId: string) => void;

/** Editor state tracking */
export interface EditorState {
  areaId: string;
  selectedRoomId?: string;
  selectedNpcId?: string;
  selectedItemId?: string;
  currentFloor: number;
  activeTab?: 'layout' | 'rooms' | 'npcs' | 'items' | 'settings';
}

/** Terrain type options for select elements */
const TERRAIN_OPTIONS: Array<{ value: TerrainType; label: string }> = [
  { value: 'town', label: 'Town' },
  { value: 'indoor', label: 'Indoor' },
  { value: 'road', label: 'Road' },
  { value: 'grassland', label: 'Grassland' },
  { value: 'forest', label: 'Forest' },
  { value: 'dense_forest', label: 'Dense Forest' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'hills', label: 'Hills' },
  { value: 'water_shallow', label: 'Shallow Water' },
  { value: 'water_deep', label: 'Deep Water' },
  { value: 'river', label: 'River' },
  { value: 'swamp', label: 'Swamp' },
  { value: 'desert', label: 'Desert' },
  { value: 'snow', label: 'Snow' },
  { value: 'ice', label: 'Ice' },
  { value: 'cave', label: 'Cave' },
  { value: 'dungeon', label: 'Dungeon' },
  { value: 'void', label: 'Void' },
];

/** Direction options */
const DIRECTION_OPTIONS = [
  { value: 'north', label: 'North' },
  { value: 'south', label: 'South' },
  { value: 'east', label: 'East' },
  { value: 'west', label: 'West' },
  { value: 'northeast', label: 'Northeast' },
  { value: 'northwest', label: 'Northwest' },
  { value: 'southeast', label: 'Southeast' },
  { value: 'southwest', label: 'Southwest' },
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
];

// =============================================================================
// Area Selector Modal
// =============================================================================

/**
 * Build the area selector modal showing all areas for a builder.
 */
export function buildAreaSelectorModal(
  areas: AreaListEntry[],
  playerName: string
): GUIOpenMessage {
  // Build area list entries
  const areaEntries: LayoutContainer[] = [];

  if (areas.length === 0) {
    // Empty state
    areaEntries.push({
      type: 'vertical',
      style: { padding: '32px', textAlign: 'center' },
      children: [
        {
          type: 'paragraph',
          id: 'empty-message',
          content: 'You have no areas yet.',
          style: { color: '#888', fontSize: '16px', marginBottom: '16px' },
        } as DisplayElement,
        {
          type: 'paragraph',
          id: 'empty-hint',
          content: 'Click "New Area" to create your first area!',
          style: { color: '#666', fontSize: '14px' },
        } as DisplayElement,
      ],
    });
  } else {
    // Area list grid
    for (const area of areas) {
      areaEntries.push(buildAreaListEntry(area));
    }
  }

  return {
    action: 'open',
    modal: {
      id: 'area-selector',
      title: 'Area Builder',
      subtitle: `${areas.length} area${areas.length !== 1 ? 's' : ''} | ${playerName}`,
      size: 'large',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'vertical',
      gap: '16px',
      children: [
        // Area list
        {
          type: 'vertical',
          id: 'area-list',
          gap: '8px',
          style: {
            maxHeight: '400px',
            overflow: 'auto',
            padding: '4px',
          },
          children: areaEntries,
        },
        // Hint text
        {
          type: 'paragraph',
          id: 'hint-text',
          content: 'Use CLI commands: areas info <id>, areas edit <id>, areas delete <id>',
          style: { color: '#666', fontSize: '12px', textAlign: 'center' },
        } as DisplayElement,
      ],
    },
    buttons: [
      {
        id: 'close',
        label: 'Close',
        action: 'cancel',
        variant: 'secondary',
      },
      {
        id: 'refresh',
        label: 'Refresh',
        action: 'custom',
        customAction: 'refresh',
        variant: 'secondary',
      },
      {
        id: 'new-area',
        label: '+ New Area',
        action: 'custom',
        customAction: 'new-area',
        variant: 'primary',
      },
    ],
  };
}

/**
 * Build a single area list entry.
 */
function buildAreaListEntry(area: AreaListEntry): LayoutContainer {
  const statusColors: Record<AreaStatus, string> = {
    draft: '#fbbf24',
    review: '#22d3ee',
    published: '#4ade80',
  };

  const statusColor = statusColors[area.status] || '#888';
  const ownerBadge = area.isOwner ? '' : ' (collaborator)';

  // Format date
  const updatedDate = new Date(area.updatedAt);
  const formattedDate = updatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return {
    type: 'horizontal',
    gap: '12px',
    style: {
      padding: '12px',
      backgroundColor: '#1a1a1f',
      borderRadius: '6px',
      border: '1px solid #2a2a30',
    },
    children: [
      // Main info column
      {
        type: 'vertical',
        gap: '4px',
        style: { flex: '1' },
        children: [
          // Name row
          {
            type: 'horizontal',
            gap: '8px',
            children: [
              {
                type: 'heading',
                id: `area-name-${area.id}`,
                content: area.name,
                level: 4,
                style: { margin: '0', color: '#f5f5f5' },
              } as DisplayElement,
              {
                type: 'text',
                id: `area-status-${area.id}`,
                content: area.status.toUpperCase(),
                style: {
                  color: statusColor,
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  backgroundColor: `${statusColor}20`,
                  borderRadius: '4px',
                },
              } as DisplayElement,
            ],
          },
          // ID and metadata row
          {
            type: 'horizontal',
            gap: '16px',
            children: [
              {
                type: 'text',
                id: `area-id-${area.id}`,
                content: area.id,
                style: { color: '#666', fontSize: '12px' },
              } as DisplayElement,
              {
                type: 'text',
                id: `area-rooms-${area.id}`,
                content: `${area.roomCount} rooms`,
                style: { color: '#888', fontSize: '12px' },
              } as DisplayElement,
              {
                type: 'text',
                id: `area-updated-${area.id}`,
                content: formattedDate + ownerBadge,
                style: { color: '#666', fontSize: '12px' },
              } as DisplayElement,
            ],
          },
        ],
      },
      // Action buttons column
      {
        type: 'horizontal',
        gap: '8px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'button',
            id: `btn-edit-${area.id}`,
            name: `btn-edit-${area.id}`,
            label: 'Edit',
            action: 'custom',
            customAction: `edit:${area.id}`,
            variant: 'secondary',
          } as InputElement,
          {
            type: 'button',
            id: `btn-delete-${area.id}`,
            name: `btn-delete-${area.id}`,
            label: 'Delete',
            action: 'custom',
            customAction: `delete:${area.id}`,
            variant: 'danger',
            disabled: !area.isOwner,
          } as InputElement,
        ],
      },
    ],
  };
}

// =============================================================================
// Delete Confirmation Modal
// =============================================================================

/**
 * Build a delete confirmation modal.
 */
export function buildDeleteConfirmModal(area: AreaListEntry): GUIOpenMessage {
  return {
    action: 'open',
    modal: {
      id: 'area-delete-confirm',
      title: 'Delete Area',
      size: 'small',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'vertical',
      gap: '16px',
      style: { padding: '16px' },
      children: [
        {
          type: 'paragraph',
          id: 'delete-message',
          content: `Are you sure you want to delete "${area.name}"?`,
          style: { color: '#f5f5f5', fontSize: '14px' },
        } as DisplayElement,
        {
          type: 'paragraph',
          id: 'delete-warning',
          content: 'This action cannot be undone. All rooms, NPCs, and items will be permanently deleted.',
          style: { color: '#f87171', fontSize: '12px' },
        } as DisplayElement,
        {
          type: 'hidden',
          id: 'delete-area-id',
          name: 'areaId',
          value: area.id,
        } as InputElement,
      ],
    },
    buttons: [
      {
        id: 'cancel',
        label: 'Cancel',
        action: 'cancel',
        variant: 'secondary',
      },
      {
        id: 'confirm-delete',
        label: 'Delete Area',
        action: 'custom',
        customAction: 'confirm-delete',
        variant: 'danger',
      },
    ],
  };
}

// =============================================================================
// New Area Quick Create Modal (Simple version for Phase 2)
// =============================================================================

/**
 * Build a simple new area creation modal.
 * The full AI-powered wizard comes in Phase 4.
 */
export function buildNewAreaModal(): GUIOpenMessage {
  return {
    action: 'open',
    modal: {
      id: 'area-new',
      title: 'Create New Area',
      subtitle: 'Enter basic area information',
      size: 'medium',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'form',
      gap: '16px',
      style: { padding: '16px' },
      children: [
        // Area Name
        {
          type: 'text',
          id: 'area-name',
          name: 'name',
          label: 'Area Name',
          placeholder: 'e.g., The Dark Caves',
          validation: [{ type: 'required', message: 'Name is required' }],
          style: { width: '100%' },
        } as InputElement,
        // Region
        {
          type: 'text',
          id: 'area-region',
          name: 'region',
          label: 'Region',
          placeholder: 'e.g., valdoria (lowercase, underscores ok)',
          validation: [
            { type: 'required', message: 'Region is required' },
            { type: 'pattern', value: '^[a-z0-9_]+$', message: 'Lowercase letters, numbers, underscores only' },
          ],
          style: { width: '100%' },
        } as InputElement,
        // Subregion
        {
          type: 'text',
          id: 'area-subregion',
          name: 'subregion',
          label: 'Subregion',
          placeholder: 'e.g., dark_caves (lowercase, underscores ok)',
          validation: [
            { type: 'required', message: 'Subregion is required' },
            { type: 'pattern', value: '^[a-z0-9_]+$', message: 'Lowercase letters, numbers, underscores only' },
          ],
          style: { width: '100%' },
        } as InputElement,
        // Description
        {
          type: 'textarea',
          id: 'area-description',
          name: 'description',
          label: 'Description (optional)',
          placeholder: 'Brief description of this area...',
          rows: 3,
          style: { width: '100%' },
        } as InputElement,
        // Theme
        {
          type: 'text',
          id: 'area-theme',
          name: 'theme',
          label: 'Theme Keywords (optional)',
          placeholder: 'e.g., dark, mysterious, underground, ancient',
          style: { width: '100%' },
        } as InputElement,
        // Grid size row
        {
          type: 'horizontal',
          gap: '16px',
          children: [
            {
              type: 'number',
              id: 'grid-width',
              name: 'gridWidth',
              label: 'Grid Width',
              value: 10,
              min: 3,
              max: 50,
              style: { width: '100px' },
            } as InputElement,
            {
              type: 'number',
              id: 'grid-height',
              name: 'gridHeight',
              label: 'Grid Height',
              value: 10,
              min: 3,
              max: 50,
              style: { width: '100px' },
            } as InputElement,
            {
              type: 'number',
              id: 'grid-depth',
              name: 'gridDepth',
              label: 'Floors',
              value: 1,
              min: 1,
              max: 10,
              style: { width: '100px' },
            } as InputElement,
          ],
        },
      ],
    },
    buttons: [
      {
        id: 'cancel',
        label: 'Cancel',
        action: 'cancel',
        variant: 'secondary',
      },
      {
        id: 'create',
        label: 'Create Area',
        action: 'submit',
        variant: 'primary',
      },
    ],
  };
}

// =============================================================================
// Multi-Tab Area Editor Modal
// =============================================================================

/**
 * Build the multi-tab area editor modal.
 */
export function buildAreaEditorModal(
  area: AreaDefinition,
  state: EditorState
): GUIOpenMessage {
  return {
    action: 'open',
    modal: {
      id: 'area-editor',
      title: `Editing: ${area.name}`,
      subtitle: `${area.id} • ${area.rooms.length} rooms • ${area.npcs.length} NPCs`,
      size: 'fullscreen',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'tabs',
      id: 'editor-tabs',
      style: { height: '100%' },
      defaultTab: state.activeTab ?? 'layout',
      children: [
        buildLayoutTab(area, state),
        buildRoomsTab(area, state),
        buildNPCsTab(area, state),
        buildItemsTab(area, state),
        buildSettingsTab(area),
      ],
    },
    buttons: [
      {
        id: 'close',
        label: 'Close',
        action: 'cancel',
        variant: 'secondary',
      },
      {
        id: 'save',
        label: 'Save Changes',
        action: 'custom',
        customAction: 'save',
        variant: 'primary',
      },
    ],
    data: {
      areaId: area.id,
      selectedRoomId: state.selectedRoomId,
      selectedNpcId: state.selectedNpcId,
      selectedItemId: state.selectedItemId,
      currentFloor: state.currentFloor,
    },
  };
}

// =============================================================================
// Tab 1: Layout (Grid View)
// =============================================================================

/**
 * Build the Layout tab with ASCII grid view.
 */
function buildLayoutTab(area: AreaDefinition, state: EditorState): LayoutContainer {
  const gridHtml = renderAreaGrid(area, state.currentFloor, state.selectedRoomId);
  const floorOptions = Array.from({ length: area.gridSize.depth }, (_, i) => ({
    value: String(i),
    label: `Floor ${i}`,
  }));

  return {
    type: 'vertical',
    tabLabel: '📍 Layout',
    tabId: 'layout',
    gap: '12px',
    style: { padding: '16px', height: '100%' },
    children: [
      // Controls row
      {
        type: 'horizontal',
        gap: '16px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'select',
            id: 'floor-select',
            name: 'currentFloor',
            label: 'Floor',
            value: String(state.currentFloor),
            options: floorOptions,
            style: { width: '120px' },
          } as InputElement,
          {
            type: 'button',
            id: 'btn-add-room',
            name: 'btn-add-room',
            label: '+ Add Room',
            action: 'custom',
            customAction: 'add-room',
            variant: 'primary',
          } as InputElement,
          {
            type: 'text',
            id: 'selected-room-display',
            content: state.selectedRoomId
              ? `Selected: ${state.selectedRoomId}`
              : 'Click a room to select',
            style: { color: '#888', fontSize: '14px', flex: '1' },
          } as DisplayElement,
        ],
      },
      // Grid display
      {
        type: 'html',
        id: 'area-grid',
        content: gridHtml,
        style: {
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.2',
          backgroundColor: '#0a0a0f',
          padding: '16px',
          borderRadius: '8px',
          overflow: 'auto',
          flex: '1',
          minHeight: '300px',
        },
      } as DisplayElement,
      // Legend
      {
        type: 'paragraph',
        id: 'grid-legend',
        content: 'Click empty cell to add room • Click room to select • Drag between exit circles to connect',
        style: { color: '#666', fontSize: '12px' },
      } as DisplayElement,
    ],
  };
}

/**
 * Render the area grid as an interactive graph-paper style HTML grid.
 * - Empty cells look like graph paper
 * - Clicking a cell creates/selects a room at that position
 * - Rooms show exit circles on their edges
 * - Drag from one exit circle to another to connect rooms
 */
function renderAreaGrid(
  area: AreaDefinition,
  floor: number,
  selectedRoomId?: string
): string {
  const { width, height } = area.gridSize;
  const roomsOnFloor = area.rooms.filter(r => r.z === floor);

  // Create a map of coordinates to rooms
  const roomMap = new Map<string, DraftRoom>();
  for (const room of roomsOnFloor) {
    roomMap.set(`${room.x},${room.y}`, room);
  }

  // Cell size in pixels
  const cellSize = 48;
  const circleSize = 10;
  const cellGap = 12; // Gap between cells for connection lines
  const cellStride = cellSize + cellGap; // Total space per cell including gap

  // Build the SVG-based interactive grid
  const gridWidth = width * cellStride;
  const gridHeight = height * cellStride;

  let html = `
<style>
  .area-grid-container {
    position: relative;
    display: inline-block;
    background: #0a0a0f;
    border-radius: 8px;
    padding: 8px;
  }
  .area-grid-svg {
    display: block;
  }
  .grid-cell {
    cursor: pointer;
    transition: opacity 0.15s;
    opacity: 0.85;
  }
  .grid-cell:hover {
    opacity: 1;
  }
  .grid-cell-room:hover {
    opacity: 1;
    filter: brightness(1.2);
  }
  .grid-cell-selected {
    opacity: 1;
  }
  .grid-cell-entrance {
    opacity: 0.9;
  }
  .exit-circle {
    cursor: pointer;
    transition: fill 0.15s, r 0.15s;
  }
  .exit-circle:hover {
    r: 7;
  }
  .exit-circle-connected {
    fill: #4ade80;
  }
  .exit-circle-empty {
    fill: #333;
  }
  .exit-circle-empty:hover {
    fill: #666;
  }
  .exit-line {
    stroke: #4ade80;
    stroke-width: 2;
    pointer-events: none;
  }
  .room-label {
    font-size: 10px;
    fill: #fff;
    pointer-events: none;
    text-anchor: middle;
    dominant-baseline: middle;
  }
  .coord-label {
    font-size: 10px;
    fill: #666;
    pointer-events: none;
    text-anchor: middle;
    dominant-baseline: middle;
  }
</style>

<div class="area-grid-container">
  <svg class="area-grid-svg" width="${gridWidth + 30}" height="${gridHeight + 30}" viewBox="-30 -30 ${gridWidth + 30} ${gridHeight + 30}">
    <!-- Coordinate labels -->
    ${Array.from({ length: width }, (_, x) => `
      <text class="coord-label" x="${x * cellStride + cellSize / 2}" y="-15">${x}</text>
    `).join('')}
    ${Array.from({ length: height }, (_, y) => `
      <text class="coord-label" x="-15" y="${y * cellStride + cellSize / 2}">${y}</text>
    `).join('')}

    <!-- Exit connection lines -->
    ${renderExitLines(area, roomMap, cellSize, cellStride, floor)}

    <!-- Grid cells (clickable) -->
    ${renderGridCells(width, height, roomMap, cellSize, cellStride, selectedRoomId, floor)}

    <!-- Exit circles on rooms -->
    ${renderExitCircles(roomMap, cellSize, cellStride, circleSize)}

    <!-- Room labels -->
    ${Array.from(roomMap.values()).map(room => {
      const cx = room.x * cellStride + cellSize / 2;
      const cy = room.y * cellStride + cellSize / 2;
      const label = room.isEntrance ? '★' : (room.id.length > 6 ? room.id.substring(0, 5) + '..' : room.id);
      return `<text class="room-label" x="${cx}" y="${cy}">${label}</text>`;
    }).join('')}
  </svg>
</div>

<script>
(function() {
  // Track drag state for exit connections
  let dragState = null;

  // Cell click handler
  window.handleCellClick = function(x, y, floor) {
    if (window.guiAction) {
      window.guiAction('grid-cell-click', { x: parseInt(x), y: parseInt(y), z: parseInt(floor) });
    }
  };

  // Cell double-click handler - open room in Rooms tab
  window.handleCellDblClick = function(x, y, floor) {
    if (window.guiAction) {
      window.guiAction('grid-cell-dblclick', { x: parseInt(x), y: parseInt(y), z: parseInt(floor) });
    }
  };

  // Cell right-click handler - delete room
  window.handleCellRightClick = function(event, x, y, floor) {
    event.preventDefault();
    if (window.guiAction) {
      window.guiAction('grid-cell-rightclick', { x: parseInt(x), y: parseInt(y), z: parseInt(floor) });
    }
  };

  // Exit circle mousedown - start drag
  window.handleExitMouseDown = function(roomId, direction, x, y, event) {
    event.preventDefault();
    event.stopPropagation();
    dragState = { roomId, direction, startX: x, startY: y };

    // Add visual feedback
    const circle = event.target;
    circle.setAttribute('fill', '#60a5fa');
  };

  // Exit circle mouseup - end drag and create connection
  window.handleExitMouseUp = function(roomId, direction, event) {
    event.preventDefault();
    event.stopPropagation();

    if (dragState && dragState.roomId !== roomId) {
      // Create bidirectional connection
      if (window.guiAction) {
        window.guiAction('connect-exits', {
          fromRoom: dragState.roomId,
          fromDir: dragState.direction,
          toRoom: roomId,
          toDir: direction
        });
      }
    }
    dragState = null;
  };

  // Exit circle click - toggle connection or show info
  window.handleExitClick = function(roomId, direction, event) {
    event.preventDefault();
    event.stopPropagation();
    if (window.guiAction) {
      window.guiAction('exit-click', { roomId, direction });
    }
  };
})();
</script>`;

  return html;
}

/**
 * Render clickable grid cells.
 */
function renderGridCells(
  width: number,
  height: number,
  roomMap: Map<string, DraftRoom>,
  cellSize: number,
  cellStride: number,
  selectedRoomId: string | undefined,
  floor: number
): string {
  const cells: string[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const room = roomMap.get(`${x},${y}`);
      const px = x * cellStride;
      const py = y * cellStride;

      let className = 'grid-cell';
      let fillColor = 'transparent';
      let strokeColor = 'none';
      let strokeWidth = '0';

      if (room) {
        // Get terrain color
        const terrain = TERRAINS[room.terrain as TerrainType];
        const terrainColor = terrain?.color ?? '#4ade80';

        if (room.id === selectedRoomId) {
          className += ' grid-cell-selected';
          fillColor = terrainColor;
          strokeColor = '#60a5fa';
          strokeWidth = '3';
        } else if (room.isEntrance) {
          className += ' grid-cell-entrance';
          fillColor = terrainColor;
          strokeColor = '#fbbf24';
          strokeWidth = '2';
        } else {
          className += ' grid-cell-room';
          fillColor = terrainColor;
        }
      }

      cells.push(`
        <rect
          class="${className}"
          x="${px + 1}" y="${py + 1}"
          width="${cellSize - 2}" height="${cellSize - 2}"
          rx="4" ry="4"
          fill="${fillColor}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          onclick="handleCellClick(${x}, ${y}, ${floor})"
          ondblclick="handleCellDblClick(${x}, ${y}, ${floor})"
          oncontextmenu="handleCellRightClick(event, ${x}, ${y}, ${floor})"
        />
      `);
    }
  }

  return cells.join('');
}

/**
 * Render exit circles on room edges.
 */
function renderExitCircles(
  roomMap: Map<string, DraftRoom>,
  cellSize: number,
  cellStride: number,
  circleSize: number
): string {
  const circles: string[] = [];
  const halfCell = cellSize / 2;

  // Direction to offset mapping
  const dirOffsets: Record<string, { dx: number; dy: number }> = {
    north: { dx: 0, dy: -halfCell + 4 },
    south: { dx: 0, dy: halfCell - 4 },
    east: { dx: halfCell - 4, dy: 0 },
    west: { dx: -halfCell + 4, dy: 0 },
    northeast: { dx: halfCell - 8, dy: -halfCell + 8 },
    northwest: { dx: -halfCell + 8, dy: -halfCell + 8 },
    southeast: { dx: halfCell - 8, dy: halfCell - 8 },
    southwest: { dx: -halfCell + 8, dy: halfCell - 8 },
  };

  for (const room of roomMap.values()) {
    const cx = room.x * cellStride + halfCell;
    const cy = room.y * cellStride + halfCell;

    // Render exit circles for each cardinal and diagonal direction
    for (const [direction, offset] of Object.entries(dirOffsets)) {
      const ex = cx + offset.dx;
      const ey = cy + offset.dy;
      const hasExit = room.exits[direction] !== undefined;
      const circleClass = hasExit ? 'exit-circle exit-circle-connected' : 'exit-circle exit-circle-empty';

      circles.push(`
        <circle
          class="${circleClass}"
          cx="${ex}" cy="${ey}" r="5"
          onmousedown="handleExitMouseDown('${room.id}', '${direction}', ${ex}, ${ey}, event)"
          onmouseup="handleExitMouseUp('${room.id}', '${direction}', event)"
          onclick="handleExitClick('${room.id}', '${direction}', event)"
        />
      `);
    }
  }

  return circles.join('');
}

/**
 * Render lines connecting exits between rooms.
 */
function renderExitLines(
  area: AreaDefinition,
  roomMap: Map<string, DraftRoom>,
  cellSize: number,
  cellStride: number,
  floor: number
): string {
  const lines: string[] = [];
  const halfCell = cellSize / 2;
  const drawnConnections = new Set<string>();

  // Direction to offset mapping (same as circles)
  const dirOffsets: Record<string, { dx: number; dy: number }> = {
    north: { dx: 0, dy: -halfCell + 4 },
    south: { dx: 0, dy: halfCell - 4 },
    east: { dx: halfCell - 4, dy: 0 },
    west: { dx: -halfCell + 4, dy: 0 },
    northeast: { dx: halfCell - 8, dy: -halfCell + 8 },
    northwest: { dx: -halfCell + 8, dy: -halfCell + 8 },
    southeast: { dx: halfCell - 8, dy: halfCell - 8 },
    southwest: { dx: -halfCell + 8, dy: halfCell - 8 },
  };

  for (const room of roomMap.values()) {
    const cx = room.x * cellStride + halfCell;
    const cy = room.y * cellStride + halfCell;

    for (const [direction, targetRoomId] of Object.entries(room.exits)) {
      // Skip up/down for now (different floor)
      if (direction === 'up' || direction === 'down') continue;

      const targetRoom = area.rooms.find(r => r.id === targetRoomId);
      if (!targetRoom || targetRoom.z !== floor) continue;

      // Avoid drawing the same line twice
      const connKey = [room.id, targetRoomId].sort().join(':');
      if (drawnConnections.has(connKey)) continue;
      drawnConnections.add(connKey);

      const offset = dirOffsets[direction];
      if (!offset) continue;

      const x1 = cx + offset.dx;
      const y1 = cy + offset.dy;

      const tcx = targetRoom.x * cellStride + halfCell;
      const tcy = targetRoom.y * cellStride + halfCell;

      // Find the opposite direction offset for the target
      const oppositeDir = getOppositeDirection(direction);
      const targetOffset = dirOffsets[oppositeDir];
      if (!targetOffset) continue;

      const x2 = tcx + targetOffset.dx;
      const y2 = tcy + targetOffset.dy;

      lines.push(`
        <line class="exit-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
      `);
    }
  }

  return lines.join('');
}

/**
 * Get the opposite direction.
 */
function getOppositeDirection(dir: string): string {
  const opposites: Record<string, string> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
    northeast: 'southwest',
    northwest: 'southeast',
    southeast: 'northwest',
    southwest: 'northeast',
    up: 'down',
    down: 'up',
  };
  return opposites[dir] || dir;
}

// =============================================================================
// Tab 2: Rooms
// =============================================================================

/**
 * Build the Rooms tab with room list and editor.
 */
function buildRoomsTab(area: AreaDefinition, state: EditorState): LayoutContainer {
  const selectedRoom = state.selectedRoomId
    ? area.rooms.find(r => r.id === state.selectedRoomId)
    : undefined;

  return {
    type: 'horizontal',
    tabLabel: '🚪 Rooms',
    tabId: 'rooms',
    gap: '16px',
    style: { padding: '16px', height: '100%' },
    children: [
      // Room list (left panel)
      buildRoomList(area.rooms, state.selectedRoomId),
      // Room editor (right panel)
      buildRoomEditor(selectedRoom, area),
    ],
  };
}

/**
 * Build the room list panel.
 */
function buildRoomList(rooms: DraftRoom[], selectedId?: string): LayoutContainer {
  const roomItems: LayoutContainer[] = rooms.map(room => ({
    type: 'horizontal',
    id: `room-item-${room.id}`,
    gap: '8px',
    style: {
      padding: '8px 12px',
      backgroundColor: room.id === selectedId ? '#2563eb40' : '#1a1a1f',
      borderRadius: '4px',
      cursor: 'pointer',
      border: room.id === selectedId ? '1px solid #2563eb' : '1px solid transparent',
    },
    children: [
      {
        type: 'vertical',
        gap: '2px',
        style: { flex: '1' },
        children: [
          {
            type: 'text',
            id: `room-name-${room.id}`,
            content: room.shortDesc || room.id,
            style: { color: '#f5f5f5', fontSize: '14px', fontWeight: 'bold' },
          } as DisplayElement,
          {
            type: 'text',
            id: `room-info-${room.id}`,
            content: `${room.id} (${room.x},${room.y},${room.z})${room.isEntrance ? ' ★' : ''}`,
            style: { color: '#888', fontSize: '11px' },
          } as DisplayElement,
        ],
      },
      {
        type: 'button',
        id: `btn-select-room-${room.id}`,
        name: `btn-select-room-${room.id}`,
        label: 'Edit',
        action: 'custom',
        customAction: `select-room:${room.id}`,
        variant: 'ghost',
      } as InputElement,
    ],
  }));

  if (rooms.length === 0) {
    roomItems.push({
      type: 'vertical',
      style: { padding: '24px', textAlign: 'center' },
      children: [
        {
          type: 'paragraph',
          id: 'no-rooms',
          content: 'No rooms yet',
          style: { color: '#666' },
        } as DisplayElement,
      ],
    });
  }

  return {
    type: 'vertical',
    gap: '8px',
    style: {
      width: '280px',
      backgroundColor: '#12121a',
      borderRadius: '8px',
      padding: '12px',
      overflow: 'auto',
    },
    children: [
      {
        type: 'heading',
        id: 'rooms-header',
        content: `Rooms (${rooms.length})`,
        level: 4,
        style: { color: '#f5f5f5', margin: '0 0 8px 0' },
      } as DisplayElement,
      {
        type: 'button',
        id: 'btn-add-room-list',
        name: 'btn-add-room-list',
        label: '+ Add Room',
        action: 'custom',
        customAction: 'add-room',
        variant: 'primary',
        style: { width: '100%' },
      } as InputElement,
      ...roomItems,
    ],
  };
}

/**
 * Build the room editor panel.
 */
function buildRoomEditor(room: DraftRoom | undefined, area: AreaDefinition): LayoutContainer {
  if (!room) {
    return {
      type: 'vertical',
      style: {
        flex: '1',
        backgroundColor: '#12121a',
        borderRadius: '8px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: [
        {
          type: 'paragraph',
          id: 'no-room-selected',
          content: 'Select a room to edit its properties',
          style: { color: '#666', fontSize: '16px' },
        } as DisplayElement,
      ],
    };
  }

  // Build exit options (other rooms in the area)
  const exitOptions = [
    { value: '', label: '(none)' },
    ...area.rooms
      .filter(r => r.id !== room.id)
      .map(r => ({ value: r.id, label: `${r.id} - ${r.shortDesc}` })),
  ];

  return {
    type: 'vertical',
    gap: '16px',
    style: {
      flex: '1',
      backgroundColor: '#12121a',
      borderRadius: '8px',
      padding: '16px',
      overflow: 'auto',
    },
    children: [
      // Header with delete button
      {
        type: 'horizontal',
        gap: '12px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'heading',
            id: 'room-editor-header',
            content: `Edit Room: ${room.id}`,
            level: 4,
            style: { color: '#f5f5f5', margin: '0', flex: '1' },
          } as DisplayElement,
          {
            type: 'button',
            id: 'btn-delete-room',
            name: 'btn-delete-room',
            label: 'Delete Room',
            action: 'custom',
            customAction: `delete-room:${room.id}`,
            variant: 'danger',
          } as InputElement,
        ],
      },
      // Hidden field for room ID
      {
        type: 'hidden',
        id: 'edit-room-id',
        name: 'roomId',
        value: room.id,
      } as InputElement,
      // Basic info row
      {
        type: 'horizontal',
        gap: '12px',
        children: [
          {
            type: 'text',
            id: 'room-short-desc',
            name: 'roomShortDesc',
            label: 'Short Description',
            value: room.shortDesc,
            placeholder: 'A dark corridor',
            style: { flex: '1' },
          } as InputElement,
          {
            type: 'select',
            id: 'room-terrain',
            name: 'roomTerrain',
            label: 'Terrain',
            value: room.terrain,
            options: TERRAIN_OPTIONS,
            style: { width: '150px' },
          } as InputElement,
        ],
      },
      // Long description
      {
        type: 'textarea',
        id: 'room-long-desc',
        name: 'roomLongDesc',
        label: 'Long Description',
        value: room.longDesc,
        placeholder: 'Describe what players see when they look around...',
        rows: 4,
        style: { width: '100%' },
      } as InputElement,
      // Coordinates row
      {
        type: 'horizontal',
        gap: '12px',
        children: [
          {
            type: 'number',
            id: 'room-x',
            name: 'roomX',
            label: 'X',
            value: room.x,
            min: 0,
            max: area.gridSize.width - 1,
            style: { width: '80px' },
          } as InputElement,
          {
            type: 'number',
            id: 'room-y',
            name: 'roomY',
            label: 'Y',
            value: room.y,
            min: 0,
            max: area.gridSize.height - 1,
            style: { width: '80px' },
          } as InputElement,
          {
            type: 'number',
            id: 'room-z',
            name: 'roomZ',
            label: 'Z (Floor)',
            value: room.z,
            min: 0,
            max: area.gridSize.depth - 1,
            style: { width: '80px' },
          } as InputElement,
          {
            type: 'checkbox',
            id: 'room-is-entrance',
            name: 'roomIsEntrance',
            label: 'Area Entrance',
            value: room.isEntrance ?? false,
          } as InputElement,
        ],
      },
      // Exits section
      {
        type: 'heading',
        id: 'exits-header',
        content: 'Exits',
        level: 5,
        style: { color: '#f5f5f5', margin: '8px 0 0 0' },
      } as DisplayElement,
      {
        type: 'grid',
        columns: 2,
        gap: '8px',
        children: DIRECTION_OPTIONS.slice(0, 8).map(dir => ({
          type: 'select',
          id: `room-exit-${dir.value}`,
          name: `roomExit_${dir.value}`,
          label: dir.label,
          value: room.exits[dir.value] ?? '',
          options: exitOptions,
          style: { width: '100%' },
        } as InputElement)),
      },
      // Up/Down exits
      {
        type: 'horizontal',
        gap: '12px',
        children: [
          {
            type: 'select',
            id: 'room-exit-up',
            name: 'roomExit_up',
            label: 'Up',
            value: room.exits['up'] ?? '',
            options: exitOptions,
            style: { flex: '1' },
          } as InputElement,
          {
            type: 'select',
            id: 'room-exit-down',
            name: 'roomExit_down',
            label: 'Down',
            value: room.exits['down'] ?? '',
            options: exitOptions,
            style: { flex: '1' },
          } as InputElement,
        ],
      },
      // Save room button
      {
        type: 'button',
        id: 'btn-save-room',
        name: 'btn-save-room',
        label: 'Save Room',
        action: 'custom',
        customAction: 'save-room',
        variant: 'primary',
        style: { marginTop: '8px' },
      } as InputElement,
    ],
  };
}

// =============================================================================
// Tab 3: NPCs
// =============================================================================

/**
 * Build the NPCs tab.
 */
function buildNPCsTab(area: AreaDefinition, state: EditorState): LayoutContainer {
  const selectedNpc = state.selectedNpcId
    ? area.npcs.find(n => n.id === state.selectedNpcId)
    : undefined;

  return {
    type: 'horizontal',
    tabLabel: '👤 NPCs',
    tabId: 'npcs',
    gap: '16px',
    style: { padding: '16px', height: '100%' },
    children: [
      buildNPCList(area.npcs, state.selectedNpcId),
      buildNPCEditor(selectedNpc, area),
    ],
  };
}

/**
 * Build the NPC list panel.
 */
function buildNPCList(npcs: DraftNPC[], selectedId?: string): LayoutContainer {
  const npcItems: LayoutContainer[] = npcs.map(npc => ({
    type: 'horizontal',
    gap: '8px',
    style: {
      padding: '8px 12px',
      backgroundColor: npc.id === selectedId ? '#2563eb40' : '#1a1a1f',
      borderRadius: '4px',
      cursor: 'pointer',
      border: npc.id === selectedId ? '1px solid #2563eb' : '1px solid transparent',
    },
    children: [
      {
        type: 'vertical',
        gap: '2px',
        style: { flex: '1' },
        children: [
          {
            type: 'text',
            id: `npc-name-${npc.id}`,
            content: npc.name,
            style: { color: '#f5f5f5', fontSize: '14px', fontWeight: 'bold' },
          } as DisplayElement,
          {
            type: 'text',
            id: `npc-info-${npc.id}`,
            content: `Lvl ${npc.level} • HP ${npc.maxHealth}`,
            style: { color: '#888', fontSize: '11px' },
          } as DisplayElement,
        ],
      },
      {
        type: 'button',
        id: `btn-select-npc-${npc.id}`,
        name: `btn-select-npc-${npc.id}`,
        label: 'Edit',
        action: 'custom',
        customAction: `select-npc:${npc.id}`,
        variant: 'ghost',
      } as InputElement,
    ],
  }));

  if (npcs.length === 0) {
    npcItems.push({
      type: 'vertical',
      style: { padding: '24px', textAlign: 'center' },
      children: [
        {
          type: 'paragraph',
          id: 'no-npcs',
          content: 'No NPCs yet',
          style: { color: '#666' },
        } as DisplayElement,
      ],
    });
  }

  return {
    type: 'vertical',
    gap: '8px',
    style: {
      width: '280px',
      backgroundColor: '#12121a',
      borderRadius: '8px',
      padding: '12px',
      overflow: 'auto',
    },
    children: [
      {
        type: 'heading',
        id: 'npcs-header',
        content: `NPCs (${npcs.length})`,
        level: 4,
        style: { color: '#f5f5f5', margin: '0 0 8px 0' },
      } as DisplayElement,
      {
        type: 'button',
        id: 'btn-add-npc',
        name: 'btn-add-npc',
        label: '+ Add NPC',
        action: 'custom',
        customAction: 'add-npc',
        variant: 'primary',
        style: { width: '100%' },
      } as InputElement,
      ...npcItems,
    ],
  };
}

/**
 * Build the NPC editor panel.
 */
function buildNPCEditor(npc: DraftNPC | undefined, area: AreaDefinition): LayoutContainer {
  if (!npc) {
    return {
      type: 'vertical',
      style: {
        flex: '1',
        backgroundColor: '#12121a',
        borderRadius: '8px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: [
        {
          type: 'paragraph',
          id: 'no-npc-selected',
          content: 'Select an NPC to edit its properties',
          style: { color: '#666', fontSize: '16px' },
        } as DisplayElement,
      ],
    };
  }

  // Build room options for NPC placement
  const roomOptions = [
    { value: '', label: '(not assigned)' },
    ...area.rooms.map(r => ({ value: r.id, label: `${r.id} - ${r.shortDesc}` })),
  ];

  // Find which room has this NPC
  const npcRoom = area.rooms.find(r => r.npcs.includes(npc.id));

  return {
    type: 'vertical',
    gap: '12px',
    style: {
      flex: '1',
      backgroundColor: '#12121a',
      borderRadius: '8px',
      padding: '16px',
      overflow: 'auto',
    },
    children: [
      // Header with delete button
      {
        type: 'horizontal',
        gap: '12px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'heading',
            id: 'npc-editor-header',
            content: `Edit NPC: ${npc.id}`,
            level: 4,
            style: { color: '#f5f5f5', margin: '0', flex: '1' },
          } as DisplayElement,
          {
            type: 'button',
            id: 'btn-delete-npc',
            name: 'btn-delete-npc',
            label: 'Delete NPC',
            action: 'custom',
            customAction: `delete-npc:${npc.id}`,
            variant: 'danger',
          } as InputElement,
        ],
      },
      // Hidden field for NPC ID
      {
        type: 'hidden',
        id: 'edit-npc-id',
        name: 'npcId',
        value: npc.id,
      } as InputElement,
      // Name and gender
      {
        type: 'horizontal',
        gap: '12px',
        children: [
          {
            type: 'text',
            id: 'npc-name',
            name: 'npcName',
            label: 'Name',
            value: npc.name,
            placeholder: 'Grizzled Warrior',
            style: { flex: '1' },
          } as InputElement,
          {
            type: 'select',
            id: 'npc-gender',
            name: 'npcGender',
            label: 'Gender',
            value: npc.gender ?? 'neutral',
            options: [
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'neutral', label: 'Neutral' },
            ],
            style: { width: '120px' },
          } as InputElement,
        ],
      },
      // Short description
      {
        type: 'text',
        id: 'npc-short-desc',
        name: 'npcShortDesc',
        label: 'Short Description',
        value: npc.shortDesc,
        placeholder: 'A grizzled warrior stands here',
        style: { width: '100%' },
      } as InputElement,
      // Long description
      {
        type: 'textarea',
        id: 'npc-long-desc',
        name: 'npcLongDesc',
        label: 'Long Description',
        value: npc.longDesc,
        placeholder: 'Describe the NPC in detail...',
        rows: 3,
        style: { width: '100%' },
      } as InputElement,
      // Stats row
      {
        type: 'horizontal',
        gap: '12px',
        children: [
          {
            type: 'number',
            id: 'npc-level',
            name: 'npcLevel',
            label: 'Level',
            value: npc.level,
            min: 1,
            max: 100,
            style: { width: '100px' },
          } as InputElement,
          {
            type: 'number',
            id: 'npc-health',
            name: 'npcMaxHealth',
            label: 'Max Health',
            value: npc.maxHealth,
            min: 1,
            style: { width: '100px' },
          } as InputElement,
          {
            type: 'select',
            id: 'npc-room',
            name: 'npcRoom',
            label: 'Spawn Room',
            value: npcRoom?.id ?? '',
            options: roomOptions,
            style: { flex: '1' },
          } as InputElement,
        ],
      },
      // Keywords
      {
        type: 'text',
        id: 'npc-keywords',
        name: 'npcKeywords',
        label: 'Keywords (comma-separated)',
        value: (npc.keywords ?? []).join(', '),
        placeholder: 'warrior, guard, soldier',
        style: { width: '100%' },
      } as InputElement,
      // Behavior
      {
        type: 'horizontal',
        gap: '12px',
        children: [
          {
            type: 'checkbox',
            id: 'npc-wandering',
            name: 'npcWandering',
            label: 'Wanders',
            value: npc.wandering ?? false,
          } as InputElement,
          {
            type: 'number',
            id: 'npc-respawn',
            name: 'npcRespawnTime',
            label: 'Respawn (sec)',
            value: npc.respawnTime ?? 0,
            min: 0,
            style: { width: '120px' },
          } as InputElement,
        ],
      },
      // Save NPC button
      {
        type: 'button',
        id: 'btn-save-npc',
        name: 'btn-save-npc',
        label: 'Save NPC',
        action: 'custom',
        customAction: 'save-npc',
        variant: 'primary',
        style: { marginTop: '8px' },
      } as InputElement,
    ],
  };
}

// =============================================================================
// Tab 4: Items
// =============================================================================

/**
 * Build the Items tab.
 */
function buildItemsTab(area: AreaDefinition, state: EditorState): LayoutContainer {
  const selectedItem = state.selectedItemId
    ? area.items.find(i => i.id === state.selectedItemId)
    : undefined;

  return {
    type: 'horizontal',
    tabLabel: '📦 Items',
    tabId: 'items',
    gap: '16px',
    style: { padding: '16px', height: '100%' },
    children: [
      buildItemList(area.items, state.selectedItemId),
      buildItemEditor(selectedItem, area),
    ],
  };
}

/**
 * Build the item list panel.
 */
function buildItemList(items: DraftItem[], selectedId?: string): LayoutContainer {
  const itemEntries: LayoutContainer[] = items.map(item => ({
    type: 'horizontal',
    gap: '8px',
    style: {
      padding: '8px 12px',
      backgroundColor: item.id === selectedId ? '#2563eb40' : '#1a1a1f',
      borderRadius: '4px',
      cursor: 'pointer',
      border: item.id === selectedId ? '1px solid #2563eb' : '1px solid transparent',
    },
    children: [
      {
        type: 'vertical',
        gap: '2px',
        style: { flex: '1' },
        children: [
          {
            type: 'text',
            id: `item-name-${item.id}`,
            content: item.name,
            style: { color: '#f5f5f5', fontSize: '14px', fontWeight: 'bold' },
          } as DisplayElement,
          {
            type: 'text',
            id: `item-info-${item.id}`,
            content: `${item.type} • ${item.value ?? 0}g`,
            style: { color: '#888', fontSize: '11px' },
          } as DisplayElement,
        ],
      },
      {
        type: 'button',
        id: `btn-select-item-${item.id}`,
        name: `btn-select-item-${item.id}`,
        label: 'Edit',
        action: 'custom',
        customAction: `select-item:${item.id}`,
        variant: 'ghost',
      } as InputElement,
    ],
  }));

  if (items.length === 0) {
    itemEntries.push({
      type: 'vertical',
      style: { padding: '24px', textAlign: 'center' },
      children: [
        {
          type: 'paragraph',
          id: 'no-items',
          content: 'No items yet',
          style: { color: '#666' },
        } as DisplayElement,
      ],
    });
  }

  return {
    type: 'vertical',
    gap: '8px',
    style: {
      width: '280px',
      backgroundColor: '#12121a',
      borderRadius: '8px',
      padding: '12px',
      overflow: 'auto',
    },
    children: [
      {
        type: 'heading',
        id: 'items-header',
        content: `Items (${items.length})`,
        level: 4,
        style: { color: '#f5f5f5', margin: '0 0 8px 0' },
      } as DisplayElement,
      {
        type: 'button',
        id: 'btn-add-item',
        name: 'btn-add-item',
        label: '+ Add Item',
        action: 'custom',
        customAction: 'add-item',
        variant: 'primary',
        style: { width: '100%' },
      } as InputElement,
      ...itemEntries,
    ],
  };
}

/**
 * Build the item editor panel.
 */
function buildItemEditor(item: DraftItem | undefined, area: AreaDefinition): LayoutContainer {
  if (!item) {
    return {
      type: 'vertical',
      style: {
        flex: '1',
        backgroundColor: '#12121a',
        borderRadius: '8px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: [
        {
          type: 'paragraph',
          id: 'no-item-selected',
          content: 'Select an item to edit its properties',
          style: { color: '#666', fontSize: '16px' },
        } as DisplayElement,
      ],
    };
  }

  // Build room options for item placement
  const roomOptions = [
    { value: '', label: '(not assigned)' },
    ...area.rooms.map(r => ({ value: r.id, label: `${r.id} - ${r.shortDesc}` })),
  ];

  // Find which room has this item
  const itemRoom = area.rooms.find(r => r.items.includes(item.id));

  return {
    type: 'vertical',
    gap: '12px',
    style: {
      flex: '1',
      backgroundColor: '#12121a',
      borderRadius: '8px',
      padding: '16px',
      overflow: 'auto',
    },
    children: [
      // Header with delete button
      {
        type: 'horizontal',
        gap: '12px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'heading',
            id: 'item-editor-header',
            content: `Edit Item: ${item.id}`,
            level: 4,
            style: { color: '#f5f5f5', margin: '0', flex: '1' },
          } as DisplayElement,
          {
            type: 'button',
            id: 'btn-delete-item',
            name: 'btn-delete-item',
            label: 'Delete Item',
            action: 'custom',
            customAction: `delete-item:${item.id}`,
            variant: 'danger',
          } as InputElement,
        ],
      },
      // Hidden field for item ID
      {
        type: 'hidden',
        id: 'edit-item-id',
        name: 'itemId',
        value: item.id,
      } as InputElement,
      // Name and type
      {
        type: 'horizontal',
        gap: '12px',
        children: [
          {
            type: 'text',
            id: 'item-name',
            name: 'itemName',
            label: 'Name',
            value: item.name,
            placeholder: 'Iron Sword',
            style: { flex: '1' },
          } as InputElement,
          {
            type: 'select',
            id: 'item-type',
            name: 'itemType',
            label: 'Type',
            value: item.type,
            options: [
              { value: 'weapon', label: 'Weapon' },
              { value: 'armor', label: 'Armor' },
              { value: 'consumable', label: 'Consumable' },
              { value: 'container', label: 'Container' },
              { value: 'key', label: 'Key' },
              { value: 'quest', label: 'Quest Item' },
              { value: 'misc', label: 'Misc' },
            ],
            style: { width: '140px' },
          } as InputElement,
        ],
      },
      // Short description
      {
        type: 'text',
        id: 'item-short-desc',
        name: 'itemShortDesc',
        label: 'Short Description',
        value: item.shortDesc,
        placeholder: 'A sturdy iron sword',
        style: { width: '100%' },
      } as InputElement,
      // Long description
      {
        type: 'textarea',
        id: 'item-long-desc',
        name: 'itemLongDesc',
        label: 'Long Description',
        value: item.longDesc,
        placeholder: 'Describe the item in detail...',
        rows: 3,
        style: { width: '100%' },
      } as InputElement,
      // Value, weight, room
      {
        type: 'horizontal',
        gap: '12px',
        children: [
          {
            type: 'number',
            id: 'item-value',
            name: 'itemValue',
            label: 'Value (gold)',
            value: item.value ?? 0,
            min: 0,
            style: { width: '100px' },
          } as InputElement,
          {
            type: 'number',
            id: 'item-weight',
            name: 'itemWeight',
            label: 'Weight',
            value: item.weight ?? 1,
            min: 0,
            style: { width: '100px' },
          } as InputElement,
          {
            type: 'select',
            id: 'item-room',
            name: 'itemRoom',
            label: 'Spawn Room',
            value: itemRoom?.id ?? '',
            options: roomOptions,
            style: { flex: '1' },
          } as InputElement,
        ],
      },
      // Keywords
      {
        type: 'text',
        id: 'item-keywords',
        name: 'itemKeywords',
        label: 'Keywords (comma-separated)',
        value: (item.keywords ?? []).join(', '),
        placeholder: 'sword, iron, weapon',
        style: { width: '100%' },
      } as InputElement,
      // Save item button
      {
        type: 'button',
        id: 'btn-save-item',
        name: 'btn-save-item',
        label: 'Save Item',
        action: 'custom',
        customAction: 'save-item',
        variant: 'primary',
        style: { marginTop: '8px' },
      } as InputElement,
    ],
  };
}

// =============================================================================
// Tab 5: Settings
// =============================================================================

/**
 * Build the Settings tab.
 */
function buildSettingsTab(area: AreaDefinition): LayoutContainer {
  return {
    type: 'vertical',
    tabLabel: '⚙️ Settings',
    tabId: 'settings',
    gap: '16px',
    style: { padding: '16px', maxWidth: '600px' },
    children: [
      {
        type: 'heading',
        id: 'settings-header',
        content: 'Area Settings',
        level: 3,
        style: { color: '#f5f5f5', margin: '0' },
      } as DisplayElement,
      // Name
      {
        type: 'text',
        id: 'area-name-setting',
        name: 'areaName',
        label: 'Area Name',
        value: area.name,
        style: { width: '100%' },
      } as InputElement,
      // Description
      {
        type: 'textarea',
        id: 'area-description-setting',
        name: 'areaDescription',
        label: 'Description',
        value: area.description,
        rows: 3,
        style: { width: '100%' },
      } as InputElement,
      // Theme
      {
        type: 'text',
        id: 'area-theme-setting',
        name: 'areaTheme',
        label: 'Theme Keywords',
        value: area.theme,
        placeholder: 'dark, mysterious, underground',
        style: { width: '100%' },
      } as InputElement,
      // Grid size (read-only display)
      {
        type: 'paragraph',
        id: 'grid-size-display',
        content: `Grid Size: ${area.gridSize.width} × ${area.gridSize.height} × ${area.gridSize.depth} floors`,
        style: { color: '#888' },
      } as DisplayElement,
      // Status
      {
        type: 'paragraph',
        id: 'area-status-display',
        content: `Status: ${area.status.toUpperCase()} • Version ${area.version}`,
        style: { color: area.status === 'published' ? '#4ade80' : '#fbbf24' },
      } as DisplayElement,
      // Actions
      {
        type: 'horizontal',
        gap: '12px',
        style: { marginTop: '16px' },
        children: [
          {
            type: 'button',
            id: 'btn-validate',
            name: 'btn-validate',
            label: 'Validate Area',
            action: 'custom',
            customAction: 'validate',
            variant: 'secondary',
          } as InputElement,
          {
            type: 'button',
            id: 'btn-publish',
            name: 'btn-publish',
            label: 'Publish Area',
            action: 'custom',
            customAction: 'publish',
            variant: 'success',
            disabled: area.status === 'published',
          } as InputElement,
        ],
      },
    ],
  };
}

// =============================================================================
// Add Room/NPC/Item Modals
// =============================================================================

/**
 * Build the Add Room modal.
 */
export function buildAddRoomModal(area: AreaDefinition): GUIOpenMessage {
  return {
    action: 'open',
    modal: {
      id: 'add-room',
      title: 'Add New Room',
      size: 'medium',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'form',
      gap: '12px',
      style: { padding: '16px' },
      children: [
        {
          type: 'text',
          id: 'new-room-id',
          name: 'newRoomId',
          label: 'Room ID',
          placeholder: 'entrance, corridor_01, boss_room',
          validation: [
            { type: 'required', message: 'Room ID is required' },
            { type: 'pattern', value: '^[a-z0-9_]+$', message: 'Lowercase letters, numbers, underscores only' },
          ],
        } as InputElement,
        {
          type: 'text',
          id: 'new-room-short',
          name: 'newRoomShort',
          label: 'Short Description',
          placeholder: 'A dark corridor',
        } as InputElement,
        {
          type: 'horizontal',
          gap: '12px',
          children: [
            {
              type: 'number',
              id: 'new-room-x',
              name: 'newRoomX',
              label: 'X',
              value: 0,
              min: 0,
              max: area.gridSize.width - 1,
              style: { width: '80px' },
            } as InputElement,
            {
              type: 'number',
              id: 'new-room-y',
              name: 'newRoomY',
              label: 'Y',
              value: 0,
              min: 0,
              max: area.gridSize.height - 1,
              style: { width: '80px' },
            } as InputElement,
            {
              type: 'number',
              id: 'new-room-z',
              name: 'newRoomZ',
              label: 'Floor',
              value: 0,
              min: 0,
              max: area.gridSize.depth - 1,
              style: { width: '80px' },
            } as InputElement,
          ],
        },
        {
          type: 'select',
          id: 'new-room-terrain',
          name: 'newRoomTerrain',
          label: 'Terrain',
          value: 'indoor',
          options: TERRAIN_OPTIONS,
        } as InputElement,
        {
          type: 'checkbox',
          id: 'new-room-entrance',
          name: 'newRoomIsEntrance',
          label: 'This is the area entrance',
          value: area.rooms.length === 0, // Default to true if first room
        } as InputElement,
      ],
    },
    buttons: [
      { id: 'cancel', label: 'Cancel', action: 'cancel', variant: 'secondary' },
      { id: 'add', label: 'Add Room', action: 'submit', variant: 'primary' },
    ],
  };
}

/**
 * Build the Add NPC modal.
 */
export function buildAddNPCModal(): GUIOpenMessage {
  return {
    action: 'open',
    modal: {
      id: 'add-npc',
      title: 'Add New NPC',
      size: 'medium',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'form',
      gap: '12px',
      style: { padding: '16px' },
      children: [
        {
          type: 'text',
          id: 'new-npc-id',
          name: 'newNpcId',
          label: 'NPC ID',
          placeholder: 'guard_01, shopkeeper, boss',
          validation: [
            { type: 'required', message: 'NPC ID is required' },
            { type: 'pattern', value: '^[a-z0-9_]+$', message: 'Lowercase letters, numbers, underscores only' },
          ],
        } as InputElement,
        {
          type: 'text',
          id: 'new-npc-name',
          name: 'newNpcName',
          label: 'Name',
          placeholder: 'Grizzled Guard',
          validation: [{ type: 'required', message: 'Name is required' }],
        } as InputElement,
        {
          type: 'horizontal',
          gap: '12px',
          children: [
            {
              type: 'number',
              id: 'new-npc-level',
              name: 'newNpcLevel',
              label: 'Level',
              value: 1,
              min: 1,
              max: 100,
              style: { width: '100px' },
            } as InputElement,
            {
              type: 'number',
              id: 'new-npc-health',
              name: 'newNpcHealth',
              label: 'Max Health',
              value: 50,
              min: 1,
              style: { width: '100px' },
            } as InputElement,
          ],
        },
      ],
    },
    buttons: [
      { id: 'cancel', label: 'Cancel', action: 'cancel', variant: 'secondary' },
      { id: 'add', label: 'Add NPC', action: 'submit', variant: 'primary' },
    ],
  };
}

/**
 * Build the Add Item modal.
 */
export function buildAddItemModal(): GUIOpenMessage {
  return {
    action: 'open',
    modal: {
      id: 'add-item',
      title: 'Add New Item',
      size: 'medium',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'form',
      gap: '12px',
      style: { padding: '16px' },
      children: [
        {
          type: 'text',
          id: 'new-item-id',
          name: 'newItemId',
          label: 'Item ID',
          placeholder: 'iron_sword, health_potion',
          validation: [
            { type: 'required', message: 'Item ID is required' },
            { type: 'pattern', value: '^[a-z0-9_]+$', message: 'Lowercase letters, numbers, underscores only' },
          ],
        } as InputElement,
        {
          type: 'text',
          id: 'new-item-name',
          name: 'newItemName',
          label: 'Name',
          placeholder: 'Iron Sword',
          validation: [{ type: 'required', message: 'Name is required' }],
        } as InputElement,
        {
          type: 'select',
          id: 'new-item-type',
          name: 'newItemType',
          label: 'Type',
          value: 'misc',
          options: [
            { value: 'weapon', label: 'Weapon' },
            { value: 'armor', label: 'Armor' },
            { value: 'consumable', label: 'Consumable' },
            { value: 'container', label: 'Container' },
            { value: 'key', label: 'Key' },
            { value: 'quest', label: 'Quest Item' },
            { value: 'misc', label: 'Misc' },
          ],
        } as InputElement,
      ],
    },
    buttons: [
      { id: 'cancel', label: 'Cancel', action: 'cancel', variant: 'secondary' },
      { id: 'add', label: 'Add Item', action: 'submit', variant: 'primary' },
    ],
  };
}

// =============================================================================
// GUI Response Handlers
// =============================================================================

/**
 * Open the area selector modal for a player.
 */
export function openAreaSelector(
  player: GUIPlayer,
  areaDaemon: AreaDaemon
): void {
  // Check if areas are loaded - if not, show message (load happens in background on first access)
  if (!areaDaemon.isLoaded) {
    player.receive('{yellow}Area data is still loading. Please try again in a moment.{/}\n');
    return;
  }

  const playerName = player.name.toLowerCase();
  const areas = areaDaemon.getAreasForBuilder(playerName);

  // Convert to list entries
  const listEntries: AreaListEntry[] = areas.map((area) => ({
    id: area.id,
    name: area.name,
    status: area.status,
    roomCount: area.rooms.length,
    updatedAt: area.updatedAt,
    isOwner: area.owner === playerName,
  }));

  // Sort: drafts first, then by updated date
  listEntries.sort((a, b) => {
    if (a.status !== b.status) {
      const order: Record<AreaStatus, number> = { draft: 0, review: 1, published: 2 };
      return order[a.status] - order[b.status];
    }
    return b.updatedAt - a.updatedAt;
  });

  const message = buildAreaSelectorModal(listEntries, efuns.capitalize(playerName));

  // Send the GUI message
  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    efuns.guiSend(message);

    // Set up response handler
    player.onGUIResponse = (response: GUIClientMessage) => {
      handleAreaSelectorResponse(player, areaDaemon, response);
    };
  }
}

/**
 * Handle responses from the area selector modal.
 */
function handleAreaSelectorResponse(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  response: GUIClientMessage
): void {
  if (response.action === 'closed') {
    // Modal was closed - clean up handler
    delete player.onGUIResponse;
    return;
  }

  if (response.action === 'button') {
    const customAction = response.customAction;

    // Handle footer buttons
    if (customAction === 'new-area') {
      openNewAreaModal(player, areaDaemon);
      return;
    }

    if (customAction === 'refresh') {
      openAreaSelector(player, areaDaemon);
      return;
    }

    // Handle area-specific actions
    if (customAction?.startsWith('edit:')) {
      const areaId = customAction.replace('edit:', '');
      const area = areaDaemon.getArea(areaId);
      if (area) {
        openAreaEditor(player, areaDaemon, areaId);
      } else {
        player.receive(`{red}Area not found: ${areaId}{/}\n`);
      }
      return;
    }

    if (customAction?.startsWith('delete:')) {
      const areaId = customAction.replace('delete:', '');
      const area = areaDaemon.getArea(areaId);
      if (area) {
        const entry: AreaListEntry = {
          id: area.id,
          name: area.name,
          status: area.status,
          roomCount: area.rooms.length,
          updatedAt: area.updatedAt,
          isOwner: area.owner === player.name.toLowerCase(),
        };
        openDeleteConfirmModal(player, areaDaemon, entry);
      }
      return;
    }
  }
}

/**
 * Open the new area creation modal.
 */
function openNewAreaModal(player: GUIPlayer, areaDaemon: AreaDaemon): void {
  const message = buildNewAreaModal();

  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    efuns.guiSend(message);

    player.onGUIResponse = (response: GUIClientMessage) => {
      handleNewAreaResponse(player, areaDaemon, response);
    };
  }
}

/**
 * Handle responses from the new area modal.
 */
async function handleNewAreaResponse(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  response: GUIClientMessage
): Promise<void> {
  if (response.action === 'closed') {
    // Reopen selector
    openAreaSelector(player, areaDaemon);
    return;
  }

  if (response.action === 'submit') {
    const data = response.data as {
      name?: string;
      region?: string;
      subregion?: string;
      description?: string;
      theme?: string;
      gridWidth?: number;
      gridHeight?: number;
      gridDepth?: number;
    };

    // Validate required fields
    if (!data.name || !data.region || !data.subregion) {
      player.receive('{red}Name, region, and subregion are required.{/}\n');
      return;
    }

    // Validate format
    if (!/^[a-z0-9_]+$/.test(data.region)) {
      player.receive('{red}Region must be lowercase letters, numbers, and underscores only.{/}\n');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(data.subregion)) {
      player.receive('{red}Subregion must be lowercase letters, numbers, and underscores only.{/}\n');
      return;
    }

    try {
      const area = areaDaemon.createArea(player.name.toLowerCase(), {
        name: data.name,
        region: data.region,
        subregion: data.subregion,
        description: data.description,
        theme: data.theme,
        gridSize: {
          width: data.gridWidth || 10,
          height: data.gridHeight || 10,
          depth: data.gridDepth || 1,
        },
      });

      // Save is async and clears efuns context, so do GUI operations first
      // Close the new area modal before saving
      closeModal(player, 'area-new');

      // Now save (this may clear efuns context)
      await areaDaemon.save();

      // Use player.receive which doesn't need efuns context
      player.receive('{green}Area created successfully!{/}\n');
      player.receive(`  ID: {cyan}${area.id}{/}\n`);
      player.receive(`  Path: /areas/${area.region}/${area.subregion}/\n`);
      player.receive('{dim}Use "areas gui" to see your new area.{/}\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      player.receive(`{red}Failed to create area: ${message}{/}\n`);
    }
    return;
  }

  if (response.action === 'button' && response.buttonId === 'cancel') {
    closeModal(player, 'area-new');
    // User can reopen with "areas gui" command
    return;
  }
}

/**
 * Open the delete confirmation modal.
 */
function openDeleteConfirmModal(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  area: AreaListEntry
): void {
  const message = buildDeleteConfirmModal(area);

  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    efuns.guiSend(message);

    player.onGUIResponse = (response: GUIClientMessage) => {
      handleDeleteConfirmResponse(player, areaDaemon, area, response);
    };
  }
}

/**
 * Handle responses from the delete confirmation modal.
 */
async function handleDeleteConfirmResponse(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  area: AreaListEntry,
  response: GUIClientMessage
): Promise<void> {
  if (response.action === 'closed' || (response.action === 'button' && response.buttonId === 'cancel')) {
    // Reopen selector
    closeModal(player, 'area-delete-confirm');
    openAreaSelector(player, areaDaemon);
    return;
  }

  if (response.action === 'button' && response.customAction === 'confirm-delete') {
    try {
      areaDaemon.deleteArea(area.id);

      // Do GUI operations before async save (which clears efuns context)
      closeModal(player, 'area-delete-confirm');

      await areaDaemon.save();

      // Use player.receive which doesn't need efuns context
      player.receive(`{green}Area "${area.name}" deleted.{/}\n`);

      // Reopen selector - note: this needs efuns context, so we just tell user to reopen
      player.receive('{dim}Use "areas gui" to refresh the list.{/}\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      player.receive(`{red}Failed to delete area: ${message}{/}\n`);
    }
    return;
  }
}

/**
 * Close a modal by ID.
 */
function closeModal(_player: GUIPlayer, modalId: string): void {
  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    const closeMessage: GUICloseMessage = {
      action: 'close',
      modalId,
    };
    efuns.guiSend(closeMessage);
  }
}

// =============================================================================
// Area Editor
// =============================================================================

/** Track editor state per player */
const editorStates = new Map<string, EditorState>();

/**
 * Open the area editor modal for a player.
 */
export function openAreaEditor(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  areaId: string
): void {
  const area = areaDaemon.getArea(areaId);
  if (!area) {
    player.receive(`{red}Area not found: ${areaId}{/}\n`);
    return;
  }

  // Initialize or get editor state
  let state = editorStates.get(player.name);
  if (!state || state.areaId !== areaId) {
    state = {
      areaId,
      currentFloor: 0,
      selectedRoomId: undefined,
      selectedNpcId: undefined,
      selectedItemId: undefined,
    };
    editorStates.set(player.name, state);
  }

  const message = buildAreaEditorModal(area, state);

  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    efuns.guiSend(message);

    player.onGUIResponse = (response: GUIClientMessage) => {
      handleEditorResponse(player, areaDaemon, state!, response);
    };
  }
}

/**
 * Refresh the editor modal with updated data.
 */
function refreshEditor(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const area = areaDaemon.getArea(state.areaId);
  if (!area) return;

  // Close and reopen to refresh
  closeModal(player, 'area-editor');
  openAreaEditor(player, areaDaemon, state.areaId);
}

/**
 * Update just the grid display without refreshing the entire modal.
 * This prevents flickering when clicking cells or connecting exits.
 */
function updateGridOnly(
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const area = areaDaemon.getArea(state.areaId);
  if (!area) return;

  const gridHtml = renderAreaGrid(area, state.currentFloor, state.selectedRoomId);
  const selectedText = state.selectedRoomId
    ? `Selected: ${state.selectedRoomId}`
    : 'Click a cell to add/select a room';

  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    const updateMessage: GUIUpdateMessage = {
      action: 'update',
      modalId: 'area-editor',
      updates: {
        elements: {
          'area-grid': { content: gridHtml },
          'selected-room-display': { content: selectedText },
        },
      },
    };
    efuns.guiSend(updateMessage);
  }
}

/**
 * Save room data from form fields.
 */
function saveRoomFromFormData(
  areaDaemon: AreaDaemon,
  areaId: string,
  roomId: string,
  data: Record<string, unknown>
): void {
  const exits: Record<string, string> = {};
  for (const dir of ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down']) {
    const targetRoom = data[`roomExit_${dir}`] as string;
    if (targetRoom) {
      exits[dir] = targetRoom;
    }
  }

  areaDaemon.updateRoom(areaId, roomId, {
    shortDesc: data.roomShortDesc as string,
    longDesc: data.roomLongDesc as string,
    terrain: data.roomTerrain as string,
    x: data.roomX as number,
    y: data.roomY as number,
    z: data.roomZ as number,
    isEntrance: data.roomIsEntrance as boolean,
    exits,
  });
}

/**
 * Update just the room editor form without refreshing the entire modal.
 */
function updateRoomEditorOnly(
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const area = areaDaemon.getArea(state.areaId);
  if (!area || !state.selectedRoomId) return;

  const room = area.rooms.find(r => r.id === state.selectedRoomId);
  if (!room) return;

  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    // Build form data for the room
    const formData: Record<string, unknown> = {
      roomId: room.id,
      roomShortDesc: room.shortDesc,
      roomLongDesc: room.longDesc,
      roomTerrain: room.terrain,
      roomX: room.x,
      roomY: room.y,
      roomZ: room.z,
      roomIsEntrance: room.isEntrance ?? false,
    };

    // Add exit values
    const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down'];
    for (const dir of directions) {
      formData[`roomExit_${dir}`] = room.exits[dir] ?? '';
    }

    // Build element updates for room list selection styling
    const elementUpdates: Record<string, { style: Record<string, string> }> = {};
    for (const r of area.rooms) {
      const isSelected = r.id === state.selectedRoomId;
      elementUpdates[`room-item-${r.id}`] = {
        style: {
          backgroundColor: isSelected ? '#2563eb40' : '#1a1a1f',
          border: isSelected ? '1px solid #2563eb' : '1px solid transparent',
        },
      };
    }

    const updateMessage: GUIUpdateMessage = {
      action: 'update',
      modalId: 'area-editor',
      updates: {
        data: formData,
        elements: elementUpdates,
      },
    };
    efuns.guiSend(updateMessage);
  }
}

/**
 * Handle responses from the area editor modal.
 */
async function handleEditorResponse(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  response: GUIClientMessage
): Promise<void> {
  const area = areaDaemon.getArea(state.areaId);
  if (!area) {
    player.receive('{red}Area no longer exists.{/}\n');
    return;
  }

  if (response.action === 'closed') {
    editorStates.delete(player.name);
    delete player.onGUIResponse;
    return;
  }

  if (response.action === 'button') {
    const customAction = response.customAction;
    const data = response.data as Record<string, unknown>;

    // Grid Cell Right-Click - delete room
    if (customAction === 'grid-cell-rightclick') {
      const x = data.x as number;
      const y = data.y as number;
      const z = data.z as number;

      // Find room at this position
      const room = area.rooms.find(r => r.x === x && r.y === y && r.z === z);
      if (room) {
        // Remove exits from other rooms that point to this room
        for (const otherRoom of area.rooms) {
          if (otherRoom.id === room.id) continue;
          for (const [dir, targetId] of Object.entries(otherRoom.exits)) {
            if (targetId === room.id) {
              delete otherRoom.exits[dir];
            }
          }
        }

        // Delete the room
        areaDaemon.deleteRoom(state.areaId, room.id);

        // Clear selection if this room was selected
        if (state.selectedRoomId === room.id) {
          state.selectedRoomId = undefined;
        }

        updateGridOnly(areaDaemon, state);
      }
      return;
    }

    // Grid Cell Double-Click - open room in Rooms tab for editing
    if (customAction === 'grid-cell-dblclick') {
      const x = data.x as number;
      const y = data.y as number;
      const z = data.z as number;

      // Find room at this position
      const room = area.rooms.find(r => r.x === x && r.y === y && r.z === z);
      if (room) {
        state.selectedRoomId = room.id;
        state.activeTab = 'rooms';
        refreshEditor(player, areaDaemon, state);
      }
      return;
    }

    // Grid Cell Click - create or select room at position
    if (customAction === 'grid-cell-click') {
      const x = data.x as number;
      const y = data.y as number;
      const z = data.z as number;

      // Check if room exists at this position
      const existingRoom = area.rooms.find(r => r.x === x && r.y === y && r.z === z);
      if (existingRoom) {
        // Select the existing room
        state.selectedRoomId = existingRoom.id;
        updateGridOnly(areaDaemon, state);
      } else {
        // Create a new room at this position
        const roomId = `room_${x}_${y}_${z}`;
        try {
          areaDaemon.addRoom(state.areaId, {
            id: roomId,
            shortDesc: `Room at (${x},${y})`,
            longDesc: '',
            terrain: 'indoor',
            x,
            y,
            z,
            exits: {},
            npcs: [],
            items: [],
            isEntrance: area.rooms.length === 0,
          });
          state.selectedRoomId = roomId;
          state.currentFloor = z;
          updateGridOnly(areaDaemon, state);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          player.receive(`{red}Failed to add room: ${message}{/}\n`);
        }
      }
      return;
    }

    // Connect Exits - create bidirectional exit between rooms
    if (customAction === 'connect-exits') {
      const fromRoom = data.fromRoom as string;
      const fromDir = data.fromDir as string;
      const toRoom = data.toRoom as string;
      const toDir = data.toDir as string;

      try {
        // Create bidirectional connection
        areaDaemon.connectRooms(state.areaId, fromRoom, fromDir, toRoom);
        areaDaemon.connectRooms(state.areaId, toRoom, toDir, fromRoom);
        updateGridOnly(areaDaemon, state);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        player.receive(`{red}Failed to connect rooms: ${message}{/}\n`);
      }
      return;
    }

    // Exit Click - toggle/remove exit
    if (customAction === 'exit-click') {
      const roomId = data.roomId as string;
      const direction = data.direction as string;

      const room = area.rooms.find(r => r.id === roomId);
      if (room && room.exits[direction]) {
        // Remove the exit (and the reverse exit)
        const targetRoomId = room.exits[direction];
        const targetRoom = area.rooms.find(r => r.id === targetRoomId);
        const oppositeDir = getOppositeDirection(direction);

        delete room.exits[direction];
        if (targetRoom && targetRoom.exits[oppositeDir] === roomId) {
          delete targetRoom.exits[oppositeDir];
        }

        updateGridOnly(areaDaemon, state);
      }
      return;
    }

    // Add Room
    if (customAction === 'add-room') {
      openAddRoomModal(player, areaDaemon, state);
      return;
    }

    // Select Room
    if (customAction?.startsWith('select-room:')) {
      const newRoomId = customAction.replace('select-room:', '');

      // Auto-save current room if one was being edited
      const currentRoomId = data.roomId as string;
      if (currentRoomId && currentRoomId !== newRoomId) {
        saveRoomFromFormData(areaDaemon, state.areaId, currentRoomId, data);
      }

      const hadPreviousSelection = !!state.selectedRoomId;
      state.selectedRoomId = newRoomId;
      state.activeTab = 'rooms';

      // If no room was previously selected, we need to refresh to show the editor form
      // Otherwise just update the form values
      if (hadPreviousSelection) {
        updateRoomEditorOnly(areaDaemon, state);
      } else {
        refreshEditor(player, areaDaemon, state);
      }
      return;
    }

    // Save Room
    if (customAction === 'save-room') {
      const roomId = data.roomId as string;
      if (roomId) {
        saveRoomFromFormData(areaDaemon, state.areaId, roomId, data);
        await areaDaemon.save();
        // Update the grid to reflect any terrain/position changes
        updateGridOnly(areaDaemon, state);
        player.receive(`{green}Room "${roomId}" saved.{/}\n`);
      }
      return;
    }

    // Delete Room
    if (customAction?.startsWith('delete-room:')) {
      const roomId = customAction.replace('delete-room:', '');
      areaDaemon.deleteRoom(state.areaId, roomId);
      state.selectedRoomId = undefined;
      closeModal(player, 'area-editor');
      await areaDaemon.save();
      player.receive(`{yellow}Room "${roomId}" deleted.{/}\n`);
      player.receive('{dim}Use "areas gui" and click Edit to continue editing.{/}\n');
      return;
    }

    // Add NPC
    if (customAction === 'add-npc') {
      openAddNPCModal(player, areaDaemon, state);
      return;
    }

    // Select NPC
    if (customAction?.startsWith('select-npc:')) {
      const npcId = customAction.replace('select-npc:', '');
      state.selectedNpcId = npcId;
      refreshEditor(player, areaDaemon, state);
      return;
    }

    // Save NPC
    if (customAction === 'save-npc') {
      const npcId = data.npcId as string;
      if (npcId) {
        const keywords = (data.npcKeywords as string || '')
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);

        // Update NPC room assignment
        const newRoomId = data.npcRoom as string;
        const oldRoom = area.rooms.find(r => r.npcs.includes(npcId));
        if (oldRoom && oldRoom.id !== newRoomId) {
          oldRoom.npcs = oldRoom.npcs.filter(n => n !== npcId);
        }
        if (newRoomId) {
          const newRoom = area.rooms.find(r => r.id === newRoomId);
          if (newRoom && !newRoom.npcs.includes(npcId)) {
            newRoom.npcs.push(npcId);
          }
        }

        areaDaemon.updateNPC(state.areaId, npcId, {
          name: data.npcName as string,
          shortDesc: data.npcShortDesc as string,
          longDesc: data.npcLongDesc as string,
          gender: data.npcGender as 'male' | 'female' | 'neutral',
          level: data.npcLevel as number,
          maxHealth: data.npcMaxHealth as number,
          keywords,
          wandering: data.npcWandering as boolean,
          respawnTime: data.npcRespawnTime as number,
        });

        closeModal(player, 'area-editor');
        await areaDaemon.save();
        player.receive(`{green}NPC "${npcId}" saved.{/}\n`);
        player.receive('{dim}Use "areas gui" and click Edit to continue editing.{/}\n');
      }
      return;
    }

    // Delete NPC
    if (customAction?.startsWith('delete-npc:')) {
      const npcId = customAction.replace('delete-npc:', '');
      areaDaemon.deleteNPC(state.areaId, npcId);
      state.selectedNpcId = undefined;
      closeModal(player, 'area-editor');
      await areaDaemon.save();
      player.receive(`{yellow}NPC "${npcId}" deleted.{/}\n`);
      player.receive('{dim}Use "areas gui" and click Edit to continue editing.{/}\n');
      return;
    }

    // Add Item
    if (customAction === 'add-item') {
      openAddItemModal(player, areaDaemon, state);
      return;
    }

    // Select Item
    if (customAction?.startsWith('select-item:')) {
      const itemId = customAction.replace('select-item:', '');
      state.selectedItemId = itemId;
      refreshEditor(player, areaDaemon, state);
      return;
    }

    // Save Item
    if (customAction === 'save-item') {
      const itemId = data.itemId as string;
      if (itemId) {
        const keywords = (data.itemKeywords as string || '')
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);

        // Update Item room assignment
        const newRoomId = data.itemRoom as string;
        const oldRoom = area.rooms.find(r => r.items.includes(itemId));
        if (oldRoom && oldRoom.id !== newRoomId) {
          oldRoom.items = oldRoom.items.filter(i => i !== itemId);
        }
        if (newRoomId) {
          const newRoom = area.rooms.find(r => r.id === newRoomId);
          if (newRoom && !newRoom.items.includes(itemId)) {
            newRoom.items.push(itemId);
          }
        }

        areaDaemon.updateItem(state.areaId, itemId, {
          name: data.itemName as string,
          shortDesc: data.itemShortDesc as string,
          longDesc: data.itemLongDesc as string,
          type: data.itemType as string,
          value: data.itemValue as number,
          weight: data.itemWeight as number,
          keywords,
        });

        closeModal(player, 'area-editor');
        await areaDaemon.save();
        player.receive(`{green}Item "${itemId}" saved.{/}\n`);
        player.receive('{dim}Use "areas gui" and click Edit to continue editing.{/}\n');
      }
      return;
    }

    // Delete Item
    if (customAction?.startsWith('delete-item:')) {
      const itemId = customAction.replace('delete-item:', '');
      areaDaemon.deleteItem(state.areaId, itemId);
      state.selectedItemId = undefined;
      closeModal(player, 'area-editor');
      await areaDaemon.save();
      player.receive(`{yellow}Item "${itemId}" deleted.{/}\n`);
      player.receive('{dim}Use "areas gui" and click Edit to continue editing.{/}\n');
      return;
    }

    // Validate Area
    if (customAction === 'validate') {
      const result = areaDaemon.validateArea(state.areaId);
      if (result.valid) {
        player.receive('{green}✓ Area is valid for publishing!{/}\n');
      } else {
        player.receive('{red}✗ Area has validation errors:{/}\n');
        for (const error of result.errors) {
          player.receive(`  {red}• ${error}{/}\n`);
        }
      }
      if (result.warnings.length > 0) {
        player.receive('{yellow}Warnings:{/}\n');
        for (const warning of result.warnings) {
          player.receive(`  {yellow}• ${warning}{/}\n`);
        }
      }
      return;
    }

    // Publish Area
    if (customAction === 'publish') {
      closeModal(player, 'area-editor');
      player.receive('{cyan}Publishing area...{/}\n');
      const result = await areaDaemon.publishArea(state.areaId);
      if (result.success) {
        player.receive('{green}✓ Area published successfully!{/}\n');
        player.receive(`  Path: ${result.path}\n`);
        player.receive(`  Files: ${result.filesCreated?.length ?? 0} created\n`);
        player.receive('{dim}Restart the server to load the new rooms.{/}\n');
      } else {
        player.receive(`{red}✗ Failed to publish: ${result.error}{/}\n`);
      }
      return;
    }

    // Save (global save button)
    if (customAction === 'save') {
      closeModal(player, 'area-editor');
      await areaDaemon.save();
      player.receive('{green}Changes saved.{/}\n');
      player.receive('{dim}Use "areas gui" to continue editing.{/}\n');
      return;
    }
  }
}

/**
 * Open the Add Room modal.
 */
function openAddRoomModal(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const area = areaDaemon.getArea(state.areaId);
  if (!area) return;

  const message = buildAddRoomModal(area);

  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    efuns.guiSend(message);

    player.onGUIResponse = (response: GUIClientMessage) => {
      handleAddRoomResponse(player, areaDaemon, state, response);
    };
  }
}

/**
 * Handle Add Room modal response.
 */
async function handleAddRoomResponse(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  response: GUIClientMessage
): Promise<void> {
  if (response.action === 'closed') {
    openAreaEditor(player, areaDaemon, state.areaId);
    return;
  }

  if (response.action === 'submit') {
    const data = response.data as Record<string, unknown>;
    const roomId = data.newRoomId as string;

    if (!roomId || !/^[a-z0-9_]+$/.test(roomId)) {
      player.receive('{red}Invalid room ID.{/}\n');
      return;
    }

    try {
      areaDaemon.addRoom(state.areaId, {
        id: roomId,
        shortDesc: (data.newRoomShort as string) || roomId,
        longDesc: '',
        terrain: (data.newRoomTerrain as string) || 'indoor',
        x: (data.newRoomX as number) ?? 0,
        y: (data.newRoomY as number) ?? 0,
        z: (data.newRoomZ as number) ?? 0,
        exits: {},
        npcs: [],
        items: [],
        isEntrance: data.newRoomIsEntrance as boolean,
      });

      state.selectedRoomId = roomId;
      closeModal(player, 'add-room');
      await areaDaemon.save();
      player.receive(`{green}Room "${roomId}" added.{/}\n`);
      player.receive('{dim}Use "areas gui" and click Edit to continue editing.{/}\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      player.receive(`{red}Failed to add room: ${message}{/}\n`);
    }
    return;
  }
}

/**
 * Open the Add NPC modal.
 */
function openAddNPCModal(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const message = buildAddNPCModal();

  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    efuns.guiSend(message);

    player.onGUIResponse = (response: GUIClientMessage) => {
      handleAddNPCResponse(player, areaDaemon, state, response);
    };
  }
}

/**
 * Handle Add NPC modal response.
 */
async function handleAddNPCResponse(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  response: GUIClientMessage
): Promise<void> {
  if (response.action === 'closed') {
    openAreaEditor(player, areaDaemon, state.areaId);
    return;
  }

  if (response.action === 'submit') {
    const data = response.data as Record<string, unknown>;
    const npcId = data.newNpcId as string;

    if (!npcId || !/^[a-z0-9_]+$/.test(npcId)) {
      player.receive('{red}Invalid NPC ID.{/}\n');
      return;
    }

    try {
      areaDaemon.addNPC(state.areaId, {
        id: npcId,
        name: (data.newNpcName as string) || npcId,
        shortDesc: `${data.newNpcName || npcId} is here.`,
        longDesc: '',
        level: (data.newNpcLevel as number) ?? 1,
        maxHealth: (data.newNpcHealth as number) ?? 50,
      });

      state.selectedNpcId = npcId;
      closeModal(player, 'add-npc');
      await areaDaemon.save();
      player.receive(`{green}NPC "${npcId}" added.{/}\n`);
      player.receive('{dim}Use "areas gui" and click Edit to continue editing.{/}\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      player.receive(`{red}Failed to add NPC: ${message}{/}\n`);
    }
    return;
  }
}

/**
 * Open the Add Item modal.
 */
function openAddItemModal(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const message = buildAddItemModal();

  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    efuns.guiSend(message);

    player.onGUIResponse = (response: GUIClientMessage) => {
      handleAddItemResponse(player, areaDaemon, state, response);
    };
  }
}

/**
 * Handle Add Item modal response.
 */
async function handleAddItemResponse(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  response: GUIClientMessage
): Promise<void> {
  if (response.action === 'closed') {
    openAreaEditor(player, areaDaemon, state.areaId);
    return;
  }

  if (response.action === 'submit') {
    const data = response.data as Record<string, unknown>;
    const itemId = data.newItemId as string;

    if (!itemId || !/^[a-z0-9_]+$/.test(itemId)) {
      player.receive('{red}Invalid Item ID.{/}\n');
      return;
    }

    try {
      areaDaemon.addItem(state.areaId, {
        id: itemId,
        name: (data.newItemName as string) || itemId,
        shortDesc: `A ${data.newItemName || itemId}.`,
        longDesc: '',
        type: (data.newItemType as string) || 'misc',
      });

      state.selectedItemId = itemId;
      closeModal(player, 'add-item');
      await areaDaemon.save();
      player.receive(`{green}Item "${itemId}" added.{/}\n`);
      player.receive('{dim}Use "areas gui" and click Edit to continue editing.{/}\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      player.receive(`{red}Failed to add item: ${message}{/}\n`);
    }
    return;
  }
}
