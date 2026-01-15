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
import { getLoreDaemon } from '../daemons/lore.js';

// =============================================================================
// Types
// =============================================================================

/** Player interface for GUI operations */
export interface GUIPlayer {
  name: string;
  receive(message: string): void;
  onGUIResponse?: (msg: GUIClientMessage) => void;
  connection?: { send: (msg: string) => void };
  _connection?: { send: (msg: string) => void };
}

/**
 * Send a GUI message directly to a player.
 * This bypasses efuns.guiSend which requires a player context.
 */
function sendGUIToPlayer(player: GUIPlayer, message: GUIUpdateMessage | GUICloseMessage): void {
  const connection = player.connection || player._connection;
  if (connection?.send) {
    const jsonStr = JSON.stringify(message);
    connection.send(`\x00[GUI]${jsonStr}\n`);
  }
}

/**
 * Show save status indicator for an editor.
 * @param player - The player to send the update to
 * @param statusId - The ID of the status element (e.g., 'room-save-status')
 * @param saved - Whether to show saved (true) or clear (false)
 */
function showSaveStatus(player: GUIPlayer, statusId: string, saved: boolean): void {
  const message: GUIUpdateMessage = {
    action: 'update',
    modalId: 'area-editor',
    updates: {
      elements: {
        [statusId]: {
          content: saved ? '✓ Saved' : '',
        },
      },
    },
  };
  sendGUIToPlayer(player, message);
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
            type: 'button',
            id: 'btn-ai-layout',
            name: 'btn-ai-layout',
            label: '🤖 AI Generate Layout',
            action: 'custom',
            customAction: 'ai-generate-layout',
            variant: 'secondary',
            disabled: area.rooms.length > 0,
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
        type: 'horizontal',
        gap: '8px',
        style: { width: '100%' },
        children: [
          {
            type: 'button',
            id: 'btn-add-room-list',
            name: 'btn-add-room-list',
            label: '+ Add',
            action: 'custom',
            customAction: 'add-room',
            variant: 'primary',
            style: { flex: '1' },
          } as InputElement,
          {
            type: 'button',
            id: 'btn-ai-describe-all-rooms',
            name: 'btn-ai-describe-all-rooms',
            label: '🤖 AI All',
            action: 'custom',
            customAction: 'ai-describe-all-rooms',
            variant: 'secondary',
            style: { flex: '1' },
          } as InputElement,
        ],
      } as LayoutContainer,
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
      // NPCs in this room
      ...(area.npcs.length > 0 ? [
        {
          type: 'heading',
          id: 'npcs-header',
          content: 'NPCs',
          level: 5,
          style: { color: '#f5f5f5', margin: '8px 0 0 0' },
        } as DisplayElement,
        {
          type: 'vertical',
          gap: '4px',
          style: { maxHeight: '120px', overflow: 'auto' },
          children: area.npcs.map(npc => ({
            type: 'checkbox',
            id: `room-npc-${npc.id}`,
            name: `roomNpc_${npc.id}`,
            label: `${npc.name} (Lvl ${npc.level})`,
            value: room.npcs.includes(npc.id),
          } as InputElement)),
        } as LayoutContainer,
      ] : []),
      // Items in this room
      ...(area.items.length > 0 ? [
        {
          type: 'heading',
          id: 'items-header',
          content: 'Items',
          level: 5,
          style: { color: '#f5f5f5', margin: '8px 0 0 0' },
        } as DisplayElement,
        {
          type: 'vertical',
          gap: '4px',
          style: { maxHeight: '120px', overflow: 'auto' },
          children: area.items.map(item => ({
            type: 'checkbox',
            id: `room-item-${item.id}`,
            name: `roomItem_${item.id}`,
            label: `${item.name} (${item.type})`,
            value: room.items.includes(item.id),
          } as InputElement)),
        } as LayoutContainer,
      ] : []),
      // Save room button and AI button
      {
        type: 'horizontal',
        gap: '8px',
        style: { marginTop: '8px', alignItems: 'center' },
        children: [
          {
            type: 'button',
            id: 'btn-ai-describe-room',
            name: 'btn-ai-describe-room',
            label: '🤖 AI Describe',
            action: 'custom',
            customAction: `ai-describe-room:${room.id}`,
            variant: 'secondary',
          } as InputElement,
          {
            type: 'button',
            id: 'btn-save-room',
            name: 'btn-save-room',
            label: 'Save Room',
            action: 'custom',
            customAction: 'save-room',
            variant: 'primary',
          } as InputElement,
          {
            type: 'html',
            id: 'room-save-status',
            content: '',
            style: {
              color: '#22c55e',
              fontSize: '14px',
              fontWeight: 'bold',
              margin: '0',
              padding: '4px 8px',
              minWidth: '60px',
            },
          } as DisplayElement,
        ],
      },
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
    id: `npc-item-${npc.id}`,
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
        type: 'horizontal',
        gap: '8px',
        style: { width: '100%' },
        children: [
          {
            type: 'button',
            id: 'btn-add-npc',
            name: 'btn-add-npc',
            label: '+ Add',
            action: 'custom',
            customAction: 'add-npc',
            variant: 'primary',
            style: { flex: '1' },
          } as InputElement,
          {
            type: 'button',
            id: 'btn-ai-describe-all-npcs',
            name: 'btn-ai-describe-all-npcs',
            label: '🤖 AI All',
            action: 'custom',
            customAction: 'ai-describe-all-npcs',
            variant: 'secondary',
            style: { flex: '1' },
          } as InputElement,
        ],
      } as LayoutContainer,
      ...npcItems,
    ],
  };
}

/**
 * Build the NPC editor panel.
 */
function buildNPCEditor(npc: DraftNPC | undefined, area: AreaDefinition): LayoutContainer {
  // Find which rooms have this NPC
  const npcRooms = npc ? area.rooms.filter(r => r.npcs.includes(npc.id)) : [];
  // Get items that spawn on this NPC
  const npcItems = npc?.items ?? [];

  // Always render the form structure so we can update via form data
  // When no NPC selected, show placeholder message
  const hasSelection = !!npc;

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
      // Placeholder shown when no NPC selected
      {
        type: 'vertical',
        id: 'npc-placeholder',
        style: {
          display: hasSelection ? 'none' : 'flex',
          flex: '1',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        },
        children: [
          {
            type: 'paragraph',
            id: 'no-npc-selected',
            content: 'Select an NPC to edit its properties',
            style: { color: '#666', fontSize: '16px' },
          } as DisplayElement,
        ],
      },
      // Form container shown when NPC is selected
      {
        type: 'vertical',
        id: 'npc-form-container',
        gap: '12px',
        style: {
          display: hasSelection ? 'flex' : 'none',
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
                content: npc ? `Edit NPC: ${npc.id}` : 'No NPC Selected',
                level: 4,
                style: { color: '#f5f5f5', margin: '0', flex: '1' },
              } as DisplayElement,
              {
                type: 'button',
                id: 'btn-delete-npc',
                name: 'btn-delete-npc',
                label: 'Delete NPC',
                action: 'custom',
                customAction: npc ? `delete-npc:${npc.id}` : 'delete-npc:',
                variant: 'danger',
              } as InputElement,
            ],
          },
          // Hidden field for NPC ID
          {
            type: 'hidden',
            id: 'edit-npc-id',
            name: 'npcId',
            value: npc?.id ?? '',
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
                value: npc?.name ?? '',
                placeholder: 'Grizzled Warrior',
                style: { flex: '1' },
              } as InputElement,
              {
                type: 'select',
                id: 'npc-gender',
                name: 'npcGender',
                label: 'Gender',
                value: npc?.gender ?? 'neutral',
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
            value: npc?.shortDesc ?? '',
            placeholder: 'A grizzled warrior stands here',
            style: { width: '100%' },
          } as InputElement,
          // Long description
          {
            type: 'textarea',
            id: 'npc-long-desc',
            name: 'npcLongDesc',
            label: 'Long Description',
            value: npc?.longDesc ?? '',
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
                value: npc?.level ?? 1,
                min: 1,
                max: 100,
                style: { width: '100px' },
              } as InputElement,
              {
                type: 'number',
                id: 'npc-health',
                name: 'npcMaxHealth',
                label: 'Max Health',
                value: npc?.maxHealth ?? 100,
                min: 1,
                style: { width: '100px' },
              } as InputElement,
            ],
          },
          // Spawn Rooms section
          ...(area.rooms.length > 0 ? [
            {
              type: 'heading',
              id: 'npc-rooms-header',
              content: 'Spawn Rooms',
              level: 5,
              style: { color: '#f5f5f5', margin: '8px 0 0 0' },
            } as DisplayElement,
            {
              type: 'vertical',
              gap: '4px',
              style: { maxHeight: '120px', overflow: 'auto' },
              children: area.rooms.map(room => ({
                type: 'checkbox',
                id: `npc-room-${room.id}`,
                name: `npcRoom_${room.id}`,
                label: `${room.shortDesc} (${room.id})`,
                value: npcRooms.some(r => r.id === room.id),
              } as InputElement)),
            } as LayoutContainer,
          ] : []),
          // Items section (items that spawn on this NPC)
          ...(area.items.length > 0 ? [
            {
              type: 'heading',
              id: 'npc-items-header',
              content: 'Items',
              level: 5,
              style: { color: '#f5f5f5', margin: '8px 0 0 0' },
            } as DisplayElement,
            {
              type: 'vertical',
              gap: '4px',
              style: { maxHeight: '120px', overflow: 'auto' },
              children: area.items.map(item => ({
                type: 'checkbox',
                id: `npc-item-${item.id}`,
                name: `npcItem_${item.id}`,
                label: `${item.name} (${item.type})`,
                value: npcItems.includes(item.id),
              } as InputElement)),
            } as LayoutContainer,
          ] : []),
          // Keywords
          {
            type: 'text',
            id: 'npc-keywords',
            name: 'npcKeywords',
            label: 'Keywords (comma-separated)',
            value: npc ? (npc.keywords ?? []).join(', ') : '',
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
                value: npc?.wandering ?? false,
              } as InputElement,
              {
                type: 'number',
                id: 'npc-respawn',
                name: 'npcRespawnTime',
                label: 'Respawn (sec)',
                value: npc?.respawnTime ?? 0,
                min: 0,
                style: { width: '120px' },
              } as InputElement,
            ],
          },
          // Save NPC button and AI button
          {
            type: 'horizontal',
            gap: '8px',
            style: { marginTop: '8px', alignItems: 'center' },
            children: [
              {
                type: 'button',
                id: 'btn-ai-describe-npc',
                name: 'btn-ai-describe-npc',
                label: '🤖 AI Describe',
                action: 'custom',
                customAction: npc ? `ai-describe-npc:${npc.id}` : 'ai-describe-npc:',
                variant: 'secondary',
              } as InputElement,
              {
                type: 'button',
                id: 'btn-save-npc',
                name: 'btn-save-npc',
                label: 'Save NPC',
                action: 'custom',
                customAction: 'save-npc',
                variant: 'primary',
              } as InputElement,
              {
                type: 'html',
                id: 'npc-save-status',
                content: '',
                style: {
                  color: '#22c55e',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  margin: '0',
                  padding: '4px 8px',
                  minWidth: '60px',
                },
              } as DisplayElement,
            ],
          },
        ],
      },
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
    id: `item-entry-${item.id}`,
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
        type: 'horizontal',
        gap: '8px',
        style: { width: '100%' },
        children: [
          {
            type: 'button',
            id: 'btn-add-item',
            name: 'btn-add-item',
            label: '+ Add',
            action: 'custom',
            customAction: 'add-item',
            variant: 'primary',
            style: { flex: '1' },
          } as InputElement,
          {
            type: 'button',
            id: 'btn-ai-describe-all-items',
            name: 'btn-ai-describe-all-items',
            label: '🤖 AI All',
            action: 'custom',
            customAction: 'ai-describe-all-items',
            variant: 'secondary',
            style: { flex: '1' },
          } as InputElement,
        ],
      } as LayoutContainer,
      ...itemEntries,
    ],
  };
}

/**
 * Build the item editor panel.
 */
function buildItemEditor(item: DraftItem | undefined, area: AreaDefinition): LayoutContainer {
  // Find which rooms have this item (items can spawn in multiple rooms)
  const itemRooms = item ? area.rooms.filter(r => r.items.includes(item.id)) : [];
  // Find which NPCs have this item
  const itemNpcs = item ? area.npcs.filter(n => (n.items ?? []).includes(item.id)) : [];

  // Always render the form structure so we can update via form data
  const hasSelection = !!item;

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
      // Placeholder shown when no item selected
      {
        type: 'vertical',
        id: 'item-placeholder',
        style: {
          display: hasSelection ? 'none' : 'flex',
          flex: '1',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        },
        children: [
          {
            type: 'paragraph',
            id: 'no-item-selected',
            content: 'Select an item to edit its properties',
            style: { color: '#666', fontSize: '16px' },
          } as DisplayElement,
        ],
      },
      // Form container shown when item is selected
      {
        type: 'vertical',
        id: 'item-form-container',
        gap: '12px',
        style: {
          display: hasSelection ? 'flex' : 'none',
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
                content: item ? `Edit Item: ${item.id}` : 'No Item Selected',
                level: 4,
                style: { color: '#f5f5f5', margin: '0', flex: '1' },
              } as DisplayElement,
              {
                type: 'button',
                id: 'btn-delete-item',
                name: 'btn-delete-item',
                label: 'Delete Item',
                action: 'custom',
                customAction: item ? `delete-item:${item.id}` : 'delete-item:',
                variant: 'danger',
              } as InputElement,
            ],
          },
          // Hidden field for item ID
          {
            type: 'hidden',
            id: 'edit-item-id',
            name: 'itemId',
            value: item?.id ?? '',
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
                value: item?.name ?? '',
                placeholder: 'Iron Sword',
                style: { flex: '1' },
              } as InputElement,
              {
                type: 'select',
                id: 'item-type',
                name: 'itemType',
                label: 'Type',
                value: item?.type ?? 'misc',
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
            value: item?.shortDesc ?? '',
            placeholder: 'A sturdy iron sword',
            style: { width: '100%' },
          } as InputElement,
          // Long description
          {
            type: 'textarea',
            id: 'item-long-desc',
            name: 'itemLongDesc',
            label: 'Long Description',
            value: item?.longDesc ?? '',
            placeholder: 'Describe the item in detail...',
            rows: 3,
            style: { width: '100%' },
          } as InputElement,
          // Value and weight
          {
            type: 'horizontal',
            gap: '12px',
            children: [
              {
                type: 'number',
                id: 'item-value',
                name: 'itemValue',
                label: 'Value (gold)',
                value: item?.value ?? 0,
                min: 0,
                style: { width: '120px' },
              } as InputElement,
              {
                type: 'number',
                id: 'item-weight',
                name: 'itemWeight',
                label: 'Weight',
                value: item?.weight ?? 1,
                min: 0,
                style: { width: '120px' },
              } as InputElement,
            ],
          },
          // Keywords
          {
            type: 'text',
            id: 'item-keywords',
            name: 'itemKeywords',
            label: 'Keywords (comma-separated)',
            value: item ? (item.keywords ?? []).join(', ') : '',
            placeholder: 'sword, iron, weapon',
            style: { width: '100%' },
          } as InputElement,
          // Weapon properties (shown only for weapon type)
          {
            type: 'vertical',
            id: 'weapon-properties',
            gap: '12px',
            style: {
              display: item?.type === 'weapon' ? 'flex' : 'none',
              backgroundColor: '#1a1a24',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '8px',
            },
            children: [
              {
                type: 'heading',
                id: 'weapon-props-header',
                content: 'Weapon Properties',
                level: 5,
                style: { color: '#f5f5f5', margin: '0 0 8px 0' },
              } as DisplayElement,
              {
                type: 'horizontal',
                gap: '12px',
                children: [
                  {
                    type: 'number',
                    id: 'weapon-min-damage',
                    name: 'weaponMinDamage',
                    label: 'Min Damage',
                    value: (item?.properties?.minDamage as number) ?? 1,
                    min: 0,
                    style: { width: '100px' },
                  } as InputElement,
                  {
                    type: 'number',
                    id: 'weapon-max-damage',
                    name: 'weaponMaxDamage',
                    label: 'Max Damage',
                    value: (item?.properties?.maxDamage as number) ?? 3,
                    min: 0,
                    style: { width: '100px' },
                  } as InputElement,
                  {
                    type: 'number',
                    id: 'weapon-attack-speed',
                    name: 'weaponAttackSpeed',
                    label: 'Attack Speed',
                    value: (item?.properties?.attackSpeed as number) ?? 0,
                    min: -0.5,
                    max: 0.5,
                    step: 0.1,
                    style: { width: '110px' },
                  } as InputElement,
                ],
              },
              {
                type: 'horizontal',
                gap: '12px',
                children: [
                  {
                    type: 'select',
                    id: 'weapon-damage-type',
                    name: 'weaponDamageType',
                    label: 'Damage Type',
                    value: (item?.properties?.damageType as string) ?? 'slashing',
                    options: [
                      { value: 'slashing', label: 'Slashing' },
                      { value: 'piercing', label: 'Piercing' },
                      { value: 'bludgeoning', label: 'Bludgeoning' },
                      { value: 'fire', label: 'Fire' },
                      { value: 'ice', label: 'Ice' },
                      { value: 'lightning', label: 'Lightning' },
                      { value: 'poison', label: 'Poison' },
                      { value: 'holy', label: 'Holy' },
                      { value: 'dark', label: 'Dark' },
                    ],
                    style: { width: '140px' },
                  } as InputElement,
                  {
                    type: 'select',
                    id: 'weapon-handedness',
                    name: 'weaponHandedness',
                    label: 'Handedness',
                    value: (item?.properties?.handedness as string) ?? 'one_handed',
                    options: [
                      { value: 'one_handed', label: 'One-Handed' },
                      { value: 'two_handed', label: 'Two-Handed' },
                    ],
                    style: { width: '140px' },
                  } as InputElement,
                ],
              },
            ],
          } as LayoutContainer,
          // Armor properties (shown only for armor type)
          {
            type: 'vertical',
            id: 'armor-properties',
            gap: '12px',
            style: {
              display: item?.type === 'armor' ? 'flex' : 'none',
              backgroundColor: '#1a1a24',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '8px',
            },
            children: [
              {
                type: 'heading',
                id: 'armor-props-header',
                content: 'Armor Properties',
                level: 5,
                style: { color: '#f5f5f5', margin: '0 0 8px 0' },
              } as DisplayElement,
              {
                type: 'horizontal',
                gap: '12px',
                children: [
                  {
                    type: 'number',
                    id: 'armor-value',
                    name: 'armorValue',
                    label: 'Armor Value',
                    value: (item?.properties?.armor as number) ?? 1,
                    min: 0,
                    style: { width: '120px' },
                  } as InputElement,
                  {
                    type: 'select',
                    id: 'armor-slot',
                    name: 'armorSlot',
                    label: 'Slot',
                    value: (item?.properties?.slot as string) ?? 'chest',
                    options: [
                      { value: 'head', label: 'Head' },
                      { value: 'chest', label: 'Chest' },
                      { value: 'hands', label: 'Hands' },
                      { value: 'legs', label: 'Legs' },
                      { value: 'feet', label: 'Feet' },
                      { value: 'cloak', label: 'Cloak' },
                      { value: 'shield', label: 'Shield' },
                    ],
                    style: { width: '140px' },
                  } as InputElement,
                ],
              },
            ],
          } as LayoutContainer,
          // Spawn Rooms section
          ...(area.rooms.length > 0 ? [
            {
              type: 'heading',
              id: 'item-rooms-header',
              content: 'Spawn Rooms',
              level: 5,
              style: { color: '#f5f5f5', margin: '8px 0 0 0' },
            } as DisplayElement,
            {
              type: 'vertical',
              gap: '4px',
              style: { maxHeight: '120px', overflow: 'auto' },
              children: area.rooms.map(room => ({
                type: 'checkbox',
                id: `item-room-${room.id}`,
                name: `itemRoom_${room.id}`,
                label: `${room.shortDesc} (${room.id})`,
                value: itemRooms.some(r => r.id === room.id),
              } as InputElement)),
            } as LayoutContainer,
          ] : []),
          // Spawn NPCs section (items can also spawn on NPCs)
          ...(area.npcs.length > 0 ? [
            {
              type: 'heading',
              id: 'item-npcs-header',
              content: 'Spawn on NPCs',
              level: 5,
              style: { color: '#f5f5f5', margin: '8px 0 0 0' },
            } as DisplayElement,
            {
              type: 'vertical',
              gap: '4px',
              style: { maxHeight: '120px', overflow: 'auto' },
              children: area.npcs.map(npc => ({
                type: 'checkbox',
                id: `item-npc-${npc.id}`,
                name: `itemNpc_${npc.id}`,
                label: `${npc.name} (Lvl ${npc.level})`,
                value: itemNpcs.some(n => n.id === npc.id),
              } as InputElement)),
            } as LayoutContainer,
          ] : []),
          // Save item button and AI button
          {
            type: 'horizontal',
            gap: '8px',
            style: { marginTop: '8px', alignItems: 'center' },
            children: [
              {
                type: 'button',
                id: 'btn-ai-describe-item',
                name: 'btn-ai-describe-item',
                label: '🤖 AI Describe',
                action: 'custom',
                customAction: item ? `ai-describe-item:${item.id}` : 'ai-describe-item:',
                variant: 'secondary',
              } as InputElement,
              {
                type: 'button',
                id: 'btn-save-item',
                name: 'btn-save-item',
                label: 'Save Item',
                action: 'custom',
                customAction: 'save-item',
                variant: 'primary',
              } as InputElement,
              {
                type: 'html',
                id: 'item-save-status',
                content: '',
                style: {
                  color: '#22c55e',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  margin: '0',
                  padding: '4px 8px',
                  minWidth: '60px',
                },
              } as DisplayElement,
            ],
          },
        ],
      },
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
            label: area.status === 'published' ? 'Republish Area' : 'Publish Area',
            action: 'custom',
            customAction: 'publish',
            variant: 'success',
          } as InputElement,
          {
            type: 'button',
            id: 'btn-force-republish',
            name: 'btn-force-republish',
            label: 'Force Republish All',
            action: 'custom',
            customAction: 'force-republish',
            variant: 'danger',
          } as InputElement,
        ],
      },
      // Validation result display
      {
        type: 'html',
        id: 'validation-result',
        content: '',
        style: { marginTop: '12px' },
      } as DisplayElement,
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
export async function openAreaSelector(
  player: GUIPlayer,
  areaDaemon: AreaDaemon
): Promise<void> {
  // Ensure areas are loaded before proceeding
  if (!areaDaemon.isLoaded) {
    player.receive('{dim}Loading area data...{/}\n');
    await areaDaemon.ensureLoaded();
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
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const area = areaDaemon.getArea(state.areaId);
  if (!area) return;

  const gridHtml = renderAreaGrid(area, state.currentFloor, state.selectedRoomId);
  const selectedText = state.selectedRoomId
    ? `Selected: ${state.selectedRoomId}`
    : 'Click a cell to add/select a room';

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
  sendGUIToPlayer(player, updateMessage);
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
  const area = areaDaemon.getArea(areaId);
  if (!area) return;

  const exits: Record<string, string> = {};
  for (const dir of ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down']) {
    const targetRoom = data[`roomExit_${dir}`] as string;
    if (targetRoom) {
      exits[dir] = targetRoom;
    }
  }

  // Process NPC assignments from checkboxes
  // NPCs can spawn in multiple rooms, so we don't remove from other rooms
  const npcs: string[] = [];
  for (const npc of area.npcs) {
    const isChecked = data[`roomNpc_${npc.id}`] as boolean;
    if (isChecked) {
      npcs.push(npc.id);
    }
  }

  // Process Item assignments from checkboxes
  // Items can spawn in multiple rooms, so we don't remove from other rooms
  const items: string[] = [];
  for (const item of area.items) {
    const isChecked = data[`roomItem_${item.id}`] as boolean;
    if (isChecked) {
      items.push(item.id);
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
    npcs,
    items,
  });
}

/**
 * Update just the room editor form without refreshing the entire modal.
 */
function updateRoomEditorOnly(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const area = areaDaemon.getArea(state.areaId);
  if (!area || !state.selectedRoomId) return;

  const room = area.rooms.find(r => r.id === state.selectedRoomId);
  if (!room) return;

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

    // Add NPC checkbox values
    for (const npc of area.npcs) {
      formData[`roomNpc_${npc.id}`] = room.npcs.includes(npc.id);
    }

    // Add Item checkbox values
    for (const item of area.items) {
      formData[`roomItem_${item.id}`] = room.items.includes(item.id);
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
  sendGUIToPlayer(player, updateMessage);
}

/**
 * Update only the NPC editor form values and list selection without refreshing the whole modal.
 */
function updateNPCEditorOnly(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const area = areaDaemon.getArea(state.areaId);
  if (!area || !state.selectedNpcId) return;

  const npc = area.npcs.find(n => n.id === state.selectedNpcId);
  if (!npc) return;

  // Build form data for the NPC
  const formData: Record<string, unknown> = {
    npcId: npc.id,
    npcName: npc.name,
    npcGender: npc.gender ?? 'neutral',
    npcShortDesc: npc.shortDesc,
    npcLongDesc: npc.longDesc,
    npcLevel: npc.level,
    npcMaxHealth: npc.maxHealth,
    npcKeywords: (npc.keywords ?? []).join(', '),
    npcWandering: npc.wandering ?? false,
    npcRespawnTime: npc.respawnTime ?? 0,
  };

  // Add room checkbox values
  for (const room of area.rooms) {
    formData[`npcRoom_${room.id}`] = room.npcs.includes(npc.id);
  }

  // Add item checkbox values
  for (const item of area.items) {
    formData[`npcItem_${item.id}`] = (npc.items ?? []).includes(item.id);
  }

  // Build element updates for NPC list selection styling and visibility
  const elementUpdates: Record<string, Record<string, unknown>> = {};

  // Update list item selection styling
  for (const n of area.npcs) {
    const isSelected = n.id === state.selectedNpcId;
    elementUpdates[`npc-item-${n.id}`] = {
      style: {
        backgroundColor: isSelected ? '#2563eb40' : '#1a1a1f',
        border: isSelected ? '1px solid #2563eb' : '1px solid transparent',
      },
    };
  }

  // Hide placeholder, show form
  elementUpdates['npc-placeholder'] = {
    style: { display: 'none' },
  };
  elementUpdates['npc-form-container'] = {
    style: { display: 'flex' },
  };

  // Update header and button actions
  elementUpdates['npc-editor-header'] = {
    content: `Edit NPC: ${npc.id}`,
  };
  elementUpdates['btn-delete-npc'] = {
    customAction: `delete-npc:${npc.id}`,
  };
  elementUpdates['btn-ai-describe-npc'] = {
    customAction: `ai-describe-npc:${npc.id}`,
  };

  const updateMessage: GUIUpdateMessage = {
    action: 'update',
    modalId: 'area-editor',
    updates: {
      data: formData,
      elements: elementUpdates,
    },
  };
  sendGUIToPlayer(player, updateMessage);
}

/**
 * Update only the Item editor form values and list selection without refreshing the whole modal.
 */
function updateItemEditorOnly(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState
): void {
  const area = areaDaemon.getArea(state.areaId);
  if (!area || !state.selectedItemId) return;

  const item = area.items.find(i => i.id === state.selectedItemId);
  if (!item) return;

  // Build form data for the item
  const props = item.properties ?? {};
  const formData: Record<string, unknown> = {
    itemId: item.id,
    itemName: item.name,
    itemType: item.type,
    itemShortDesc: item.shortDesc,
    itemLongDesc: item.longDesc,
    itemValue: item.value ?? 0,
    itemWeight: item.weight ?? 1,
    itemKeywords: (item.keywords ?? []).join(', '),
    // Weapon properties
    weaponMinDamage: (props.minDamage as number) ?? 1,
    weaponMaxDamage: (props.maxDamage as number) ?? 3,
    weaponDamageType: (props.damageType as string) ?? 'slashing',
    weaponHandedness: (props.handedness as string) ?? 'one_handed',
    weaponAttackSpeed: (props.attackSpeed as number) ?? 0,
    // Armor properties
    armorValue: (props.armor as number) ?? 1,
    armorSlot: (props.slot as string) ?? 'chest',
  };

  // Add room checkbox values
  for (const room of area.rooms) {
    formData[`itemRoom_${room.id}`] = room.items.includes(item.id);
  }

  // Add NPC checkbox values
  for (const npc of area.npcs) {
    formData[`itemNpc_${npc.id}`] = (npc.items ?? []).includes(item.id);
  }

  // Build element updates for item list selection styling and visibility
  const elementUpdates: Record<string, Record<string, unknown>> = {};

  // Update list item selection styling
  for (const i of area.items) {
    const isSelected = i.id === state.selectedItemId;
    elementUpdates[`item-entry-${i.id}`] = {
      style: {
        backgroundColor: isSelected ? '#2563eb40' : '#1a1a1f',
        border: isSelected ? '1px solid #2563eb' : '1px solid transparent',
      },
    };
  }

  // Hide placeholder, show form
  elementUpdates['item-placeholder'] = {
    style: { display: 'none' },
  };
  elementUpdates['item-form-container'] = {
    style: { display: 'flex' },
  };

  // Update header and button actions
  elementUpdates['item-editor-header'] = {
    content: `Edit Item: ${item.id}`,
  };
  elementUpdates['btn-delete-item'] = {
    customAction: `delete-item:${item.id}`,
  };
  elementUpdates['btn-ai-describe-item'] = {
    customAction: `ai-describe-item:${item.id}`,
  };

  // Show/hide weapon and armor property sections based on item type
  elementUpdates['weapon-properties'] = {
    style: { display: item.type === 'weapon' ? 'flex' : 'none' },
  };
  elementUpdates['armor-properties'] = {
    style: { display: item.type === 'armor' ? 'flex' : 'none' },
  };

  const updateMessage: GUIUpdateMessage = {
    action: 'update',
    modalId: 'area-editor',
    updates: {
      data: formData,
      elements: elementUpdates,
    },
  };
  sendGUIToPlayer(player, updateMessage);
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

        updateGridOnly(player, areaDaemon, state);
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
        updateGridOnly(player, areaDaemon, state);
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
          updateGridOnly(player, areaDaemon, state);
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
        updateGridOnly(player, areaDaemon, state);
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

        updateGridOnly(player, areaDaemon, state);
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

      // Clear save status when selecting new room
      showSaveStatus(player, 'room-save-status', false);

      // If no room was previously selected, we need to refresh to show the editor form
      // Otherwise just update the form values
      if (hadPreviousSelection) {
        updateRoomEditorOnly(player, areaDaemon, state);
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
        updateGridOnly(player, areaDaemon, state);
        // Show saved status
        showSaveStatus(player, 'room-save-status', true);
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
      state.activeTab = 'npcs';
      // Clear save status when selecting new NPC
      showSaveStatus(player, 'npc-save-status', false);
      // Always use update since form fields always exist
      updateNPCEditorOnly(player, areaDaemon, state);
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

        // Update NPC room assignments from checkboxes
        for (const room of area.rooms) {
          const isChecked = data[`npcRoom_${room.id}`] as boolean;
          const hasNpc = room.npcs.includes(npcId);

          if (isChecked && !hasNpc) {
            // Add NPC to this room
            room.npcs.push(npcId);
          } else if (!isChecked && hasNpc) {
            // Remove NPC from this room
            room.npcs = room.npcs.filter(n => n !== npcId);
          }
        }

        // Build items array from checkboxes
        const items: string[] = [];
        for (const item of area.items) {
          const isChecked = data[`npcItem_${item.id}`] as boolean;
          if (isChecked) {
            items.push(item.id);
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
          items,
        });

        await areaDaemon.save();
        // Show saved status
        showSaveStatus(player, 'npc-save-status', true);
        player.receive(`{green}NPC "${npcId}" saved.{/}\n`);
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
      state.activeTab = 'items';
      // Clear save status when selecting new Item
      showSaveStatus(player, 'item-save-status', false);
      // Always use update since form fields always exist
      updateItemEditorOnly(player, areaDaemon, state);
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

        // Update Item room assignments from checkboxes
        for (const room of area.rooms) {
          const isChecked = data[`itemRoom_${room.id}`] as boolean;
          const hasItem = room.items.includes(itemId);

          if (isChecked && !hasItem) {
            // Add item to this room
            room.items.push(itemId);
          } else if (!isChecked && hasItem) {
            // Remove item from this room
            room.items = room.items.filter(i => i !== itemId);
          }
        }

        // Update Item NPC assignments from checkboxes
        for (const npc of area.npcs) {
          const isChecked = data[`itemNpc_${npc.id}`] as boolean;
          const npcItems = npc.items ?? [];
          const hasItem = npcItems.includes(itemId);

          if (isChecked && !hasItem) {
            // Add item to this NPC
            areaDaemon.updateNPC(state.areaId, npc.id, {
              items: [...npcItems, itemId],
            });
          } else if (!isChecked && hasItem) {
            // Remove item from this NPC
            areaDaemon.updateNPC(state.areaId, npc.id, {
              items: npcItems.filter(i => i !== itemId),
            });
          }
        }

        // Build type-specific properties
        const itemType = data.itemType as string;
        let properties: Record<string, unknown> = {};

        if (itemType === 'weapon') {
          properties = {
            minDamage: data.weaponMinDamage as number,
            maxDamage: data.weaponMaxDamage as number,
            damageType: data.weaponDamageType as string,
            handedness: data.weaponHandedness as string,
            attackSpeed: data.weaponAttackSpeed as number,
          };
        } else if (itemType === 'armor') {
          properties = {
            armor: data.armorValue as number,
            slot: data.armorSlot as string,
          };
        }

        areaDaemon.updateItem(state.areaId, itemId, {
          name: data.itemName as string,
          shortDesc: data.itemShortDesc as string,
          longDesc: data.itemLongDesc as string,
          type: itemType,
          value: data.itemValue as number,
          weight: data.itemWeight as number,
          keywords,
          properties,
        });

        await areaDaemon.save();
        // Show saved status and update property section visibility
        const updateMessage: GUIUpdateMessage = {
          action: 'update',
          modalId: 'area-editor',
          updates: {
            elements: {
              'item-save-status': {
                content: '✓ Saved',
              },
              'weapon-properties': {
                style: { display: itemType === 'weapon' ? 'flex' : 'none' },
              },
              'armor-properties': {
                style: { display: itemType === 'armor' ? 'flex' : 'none' },
              },
            },
          },
        };
        sendGUIToPlayer(player, updateMessage);
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

    // =======================================================================
    // AI Generation Handlers
    // =======================================================================

    // AI Generate Layout
    if (customAction === 'ai-generate-layout') {
      if (area.rooms.length > 0) {
        player.receive('{yellow}Cannot generate layout - area already has rooms.{/}\n');
        return;
      }
      await handleAIGenerateLayout(player, areaDaemon, state, area);
      return;
    }

    // AI Describe All Rooms
    if (customAction === 'ai-describe-all-rooms') {
      if (area.rooms.length === 0) {
        player.receive('{yellow}No rooms to describe.{/}\n');
        return;
      }
      await handleAIDescribeAllRooms(player, areaDaemon, state, area);
      return;
    }

    // AI Describe Single Room
    if (customAction?.startsWith('ai-describe-room:')) {
      const roomId = customAction.replace('ai-describe-room:', '');
      const room = area.rooms.find(r => r.id === roomId);
      if (room) {
        await handleAIDescribeRoom(player, areaDaemon, state, area, room);
      }
      return;
    }

    // AI Describe All NPCs
    if (customAction === 'ai-describe-all-npcs') {
      if (area.npcs.length === 0) {
        player.receive('{yellow}No NPCs to describe.{/}\n');
        return;
      }
      await handleAIDescribeAllNPCs(player, areaDaemon, state, area);
      return;
    }

    // AI Describe Single NPC
    if (customAction?.startsWith('ai-describe-npc:')) {
      const npcId = customAction.replace('ai-describe-npc:', '');
      const npc = area.npcs.find(n => n.id === npcId);
      if (npc) {
        await handleAIDescribeNPC(player, areaDaemon, state, area, npc);
      }
      return;
    }

    // AI Describe All Items
    if (customAction === 'ai-describe-all-items') {
      if (area.items.length === 0) {
        player.receive('{yellow}No items to describe.{/}\n');
        return;
      }
      await handleAIDescribeAllItems(player, areaDaemon, state, area);
      return;
    }

    // AI Describe Single Item
    if (customAction?.startsWith('ai-describe-item:')) {
      const itemId = customAction.replace('ai-describe-item:', '');
      const item = area.items.find(i => i.id === itemId);
      if (item) {
        await handleAIDescribeItem(player, areaDaemon, state, area, item);
      }
      return;
    }

    // =======================================================================
    // End AI Generation Handlers
    // =======================================================================

    // Validate Area
    if (customAction === 'validate') {
      const result = areaDaemon.validateArea(state.areaId);

      // Build HTML for validation result
      let html = '';
      if (result.valid) {
        html = '<div style="color: #4ade80; font-weight: bold;">&#x2713; Area is valid for publishing!</div>';
      } else {
        html = '<div style="color: #f87171; font-weight: bold;">&#x2717; Validation errors:</div><ul style="margin: 4px 0; padding-left: 20px; color: #f87171;">';
        for (const error of result.errors) {
          html += `<li>${escapeHtml(error)}</li>`;
        }
        html += '</ul>';
      }
      if (result.warnings.length > 0) {
        html += '<div style="color: #fbbf24; font-weight: bold; margin-top: 8px;">Warnings:</div><ul style="margin: 4px 0; padding-left: 20px; color: #fbbf24;">';
        for (const warning of result.warnings) {
          html += `<li>${escapeHtml(warning)}</li>`;
        }
        html += '</ul>';
      }

      // Update the validation result element in the modal
      const updateMessage: GUIUpdateMessage = {
        action: 'update',
        modalId: 'area-editor',
        updates: {
          elements: {
            'validation-result': { content: html },
          },
        },
      };
      sendGUIToPlayer(player, updateMessage);
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

        // Show file statistics
        const created = result.filesCreated?.length ?? 0;
        const updated = result.filesUpdated?.length ?? 0;
        const skipped = result.filesSkipped ?? 0;
        const deleted = result.filesDeleted?.length ?? 0;

        if (created > 0) player.receive(`  Files created: ${created}\n`);
        if (updated > 0) player.receive(`  Files updated: ${updated}\n`);
        if (skipped > 0) player.receive(`  Files skipped: ${skipped} (unchanged)\n`);
        if (deleted > 0) player.receive(`  Files deleted: ${deleted}\n`);

        player.receive('{dim}Restart the server to load the new rooms.{/}\n');
      } else {
        player.receive(`{red}✗ Failed to publish: ${result.error}{/}\n`);
      }
      return;
    }

    // Force Republish Area (republish all files regardless of changes)
    if (customAction === 'force-republish') {
      closeModal(player, 'area-editor');
      player.receive('{cyan}Force republishing all files...{/}\n');
      const result = await areaDaemon.publishArea(state.areaId, true);
      if (result.success) {
        player.receive('{green}✓ Area force republished successfully!{/}\n');
        player.receive(`  Path: ${result.path}\n`);

        // Show file statistics
        const created = result.filesCreated?.length ?? 0;
        const updated = result.filesUpdated?.length ?? 0;
        const deleted = result.filesDeleted?.length ?? 0;

        if (created > 0) player.receive(`  Files created: ${created}\n`);
        if (updated > 0) player.receive(`  Files updated: ${updated}\n`);
        if (deleted > 0) player.receive(`  Files deleted: ${deleted}\n`);

        player.receive('{dim}Restart the server to load the new rooms.{/}\n');
      } else {
        player.receive(`{red}✗ Failed to force republish: ${result.error}{/}\n`);
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

      // Set the newly added room as selected and switch to Rooms tab
      state.selectedRoomId = roomId;
      state.activeTab = 'rooms';

      // Close add-room modal and reopen editor BEFORE async save
      closeModal(player, 'add-room');
      openAreaEditor(player, areaDaemon, state.areaId);
      player.receive(`{green}Room "${roomId}" added.{/}\n`);

      // Save in background (efuns context will be gone after this)
      await areaDaemon.save();
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

      // Set the newly added NPC as selected and switch to NPCs tab
      state.selectedNpcId = npcId;
      state.activeTab = 'npcs';

      // Close add-npc modal and reopen editor BEFORE async save
      closeModal(player, 'add-npc');
      openAreaEditor(player, areaDaemon, state.areaId);
      player.receive(`{green}NPC "${npcId}" added.{/}\n`);

      // Save in background (efuns context will be gone after this)
      await areaDaemon.save();
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

      // Set the newly added item as selected and switch to Items tab
      state.selectedItemId = itemId;
      state.activeTab = 'items';

      // Close add-item modal and reopen editor BEFORE async save
      closeModal(player, 'add-item');
      openAreaEditor(player, areaDaemon, state.areaId);
      player.receive(`{green}Item "${itemId}" added.{/}\n`);

      // Save in background (efuns context will be gone after this)
      await areaDaemon.save();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      player.receive(`{red}Failed to add item: ${message}{/}\n`);
    }
    return;
  }
}

// =============================================================================
// AI Generation Functions
// =============================================================================

/**
 * Get lore context for AI generation.
 */
function getLoreContext(keywords: string[], maxLength: number = 1500): string {
  const loreDaemon = getLoreDaemon();
  const allLore = loreDaemon.getAllLore();

  if (allLore.length === 0) {
    return '';
  }

  // Find lore entries that match any keywords
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const relevantLore = allLore.filter(entry => {
    const searchText = `${entry.title} ${entry.content} ${entry.tags?.join(' ') || ''}`.toLowerCase();
    return lowerKeywords.some(kw => searchText.includes(kw));
  });

  // If no keyword matches, include high-priority world lore
  const loreToUse = relevantLore.length > 0
    ? relevantLore.slice(0, 5)
    : allLore.filter(e => e.category === 'world' || (e.priority && e.priority >= 7)).slice(0, 3);

  if (loreToUse.length === 0) {
    return '';
  }

  return loreDaemon.buildContext(loreToUse.map(e => e.id), maxLength);
}

/**
 * Check if AI is available.
 */
function isAIAvailable(): boolean {
  return typeof efuns !== 'undefined' && efuns.aiAvailable?.();
}

/**
 * Handle AI Generate Layout.
 */
async function handleAIGenerateLayout(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  area: AreaDefinition
): Promise<void> {
  if (!isAIAvailable()) {
    player.receive('{red}AI is not configured or unavailable.{/}\n');
    player.receive('{dim}Set CLAUDE_API_KEY in your .env file to enable AI features.{/}\n');
    return;
  }

  player.receive('{cyan}Generating area layout with AI...{/}\n');
  player.receive('{dim}This may take a moment.{/}\n');

  const keywords = (area.theme || area.name).split(/[,\s]+/).filter(k => k.length > 2);
  keywords.push(area.name, area.region, area.subregion);
  const loreContext = getLoreContext(keywords);

  const { width, height, depth } = area.gridSize;

  const prompt = `Generate a room layout for a MUD game area as JSON.

AREA DETAILS:
- Name: "${area.name}"
- Region: ${area.region}/${area.subregion}
- Description: ${area.description || 'No description provided'}
- Theme: ${area.theme || 'fantasy'}
- Grid Size: ${width}x${height} (${depth} floor(s))

${loreContext ? `WORLD LORE (for consistency):
${loreContext}

` : ''}REQUIREMENTS:
1. Generate 5-15 rooms that form a connected layout
2. Rooms should be placed on valid grid coordinates (x: 0-${width - 1}, y: 0-${height - 1}, z: 0-${depth - 1})
3. Rooms should be connected via exits (north/south/east/west/up/down)
4. One room should be marked as the entrance
5. Choose appropriate terrain types for each room
6. Room IDs should be lowercase with underscores

Valid terrain types: town, indoor, road, grassland, forest, dense_forest, mountain, hills, water_shallow, water_deep, river, swamp, desert, snow, ice, cave, dungeon, void

Respond with ONLY a JSON array of rooms:
[
  {
    "id": "entrance",
    "shortDesc": "Dark Cave Entrance",
    "terrain": "cave",
    "x": 5, "y": 9, "z": 0,
    "isEntrance": true,
    "exits": { "north": "tunnel_01" }
  },
  ...
]`;

  try {
    const result = await efuns.aiGenerate(prompt, undefined, { maxTokens: 2000, useContinuation: true });

    if (!result.success || !result.text) {
      player.receive(`{red}AI generation failed: ${result.error || 'Unknown error'}{/}\n`);
      return;
    }

    // Parse JSON response
    let rooms: Array<{
      id: string;
      shortDesc: string;
      terrain: string;
      x: number;
      y: number;
      z: number;
      isEntrance?: boolean;
      exits?: Record<string, string>;
    }>;

    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      rooms = JSON.parse(jsonMatch[0]);
    } catch {
      player.receive('{red}Failed to parse AI response.{/}\n');
      player.receive('{dim}Please try again.{/}\n');
      return;
    }

    // Add rooms to the area
    let addedCount = 0;
    for (const roomData of rooms) {
      // Validate coordinates
      if (roomData.x < 0 || roomData.x >= width ||
          roomData.y < 0 || roomData.y >= height ||
          roomData.z < 0 || roomData.z >= depth) {
        continue;
      }

      // Check for duplicate position
      if (area.rooms.some(r => r.x === roomData.x && r.y === roomData.y && r.z === roomData.z)) {
        continue;
      }

      try {
        areaDaemon.addRoom(state.areaId, {
          id: roomData.id,
          shortDesc: roomData.shortDesc || roomData.id,
          longDesc: '',
          terrain: roomData.terrain || 'indoor',
          x: roomData.x,
          y: roomData.y,
          z: roomData.z,
          isEntrance: roomData.isEntrance ?? false,
          exits: roomData.exits || {},
          npcs: [],
          items: [],
        });
        addedCount++;
      } catch (error) {
        // Skip duplicates or invalid rooms
      }
    }

    await areaDaemon.save();
    player.receive(`{green}Generated ${addedCount} rooms!{/}\n`);
    player.receive('{dim}Use "areas gui" and click Edit to see the changes.{/}\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    player.receive(`{red}AI generation error: ${message}{/}\n`);
  }
}

/**
 * Handle AI Describe All Rooms.
 */
async function handleAIDescribeAllRooms(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  area: AreaDefinition
): Promise<void> {
  if (!isAIAvailable()) {
    player.receive('{red}AI is not configured or unavailable.{/}\n');
    return;
  }

  player.receive(`{cyan}Generating descriptions for ${area.rooms.length} rooms...{/}\n`);

  let updatedCount = 0;
  for (const room of area.rooms) {
    // Skip rooms that already have descriptions
    if (room.longDesc && room.longDesc.length > 20) {
      continue;
    }

    player.receive(`{dim}  Generating for ${room.id}...{/}\n`);
    await generateRoomDescription(areaDaemon, area, room);
    updatedCount++;
  }

  await areaDaemon.save();
  player.receive(`{green}Generated descriptions for ${updatedCount} rooms.{/}\n`);
  player.receive('{dim}Use "areas gui" and click Edit to see the changes.{/}\n');
}

/**
 * Handle AI Describe Single Room.
 */
async function handleAIDescribeRoom(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  area: AreaDefinition,
  room: DraftRoom
): Promise<void> {
  if (!isAIAvailable()) {
    player.receive('{red}AI is not configured or unavailable.{/}\n');
    return;
  }

  player.receive(`{cyan}Generating description for ${room.id}...{/}\n`);
  await generateRoomDescription(areaDaemon, area, room);
  await areaDaemon.save();
  player.receive('{green}Description generated!{/}\n');
  player.receive('{dim}Use "areas gui" and click Edit to see the changes.{/}\n');
}

/**
 * Generate a room description using AI.
 */
async function generateRoomDescription(
  areaDaemon: AreaDaemon,
  area: AreaDefinition,
  room: DraftRoom
): Promise<void> {
  const keywords = [area.name, area.theme, room.terrain, room.shortDesc].filter(Boolean) as string[];
  const loreContext = getLoreContext(keywords);

  // Get neighboring rooms for context
  const neighbors = Object.entries(room.exits)
    .map(([dir, targetId]) => {
      const target = area.rooms.find(r => r.id === targetId);
      return target ? `${dir}: ${target.shortDesc}` : null;
    })
    .filter(Boolean);

  const prompt = `Generate a room description for a fantasy MUD game.

ROOM: "${room.shortDesc || room.id}"
TERRAIN: ${room.terrain}
AREA: ${area.name} (${area.theme || 'fantasy'})
${neighbors.length > 0 ? `EXITS: ${neighbors.join(', ')}` : ''}
${room.isEntrance ? 'This is the area entrance.' : ''}

${loreContext ? `WORLD LORE:
${loreContext}

` : ''}Generate a JSON object with:
{
  "shortDesc": "Brief 3-8 word description",
  "longDesc": "2-4 atmospheric sentences describing what players see"
}

Requirements:
- Match the terrain type and area theme
- Be immersive and evocative
- longDesc should be second person ("You see...", "The air smells...")

Respond with ONLY the JSON object.`;

  try {
    const result = await efuns.aiGenerate(prompt, undefined, { maxTokens: 400 });

    if (!result.success || !result.text) {
      return;
    }

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const desc = JSON.parse(jsonMatch[0]) as { shortDesc?: string; longDesc?: string };

    areaDaemon.updateRoom(area.id, room.id, {
      shortDesc: desc.shortDesc || room.shortDesc,
      longDesc: desc.longDesc || room.longDesc,
    });
  } catch {
    // Silently fail for individual rooms
  }
}

/**
 * Handle AI Describe All NPCs.
 */
async function handleAIDescribeAllNPCs(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  area: AreaDefinition
): Promise<void> {
  if (!isAIAvailable()) {
    player.receive('{red}AI is not configured or unavailable.{/}\n');
    return;
  }

  player.receive(`{cyan}Generating descriptions for ${area.npcs.length} NPCs...{/}\n`);

  let updatedCount = 0;
  for (const npc of area.npcs) {
    if (npc.longDesc && npc.longDesc.length > 20) {
      continue;
    }

    player.receive(`{dim}  Generating for ${npc.name}...{/}\n`);
    await generateNPCDescription(areaDaemon, area, npc);
    updatedCount++;
  }

  await areaDaemon.save();
  player.receive(`{green}Generated descriptions for ${updatedCount} NPCs.{/}\n`);
  player.receive('{dim}Use "areas gui" and click Edit to see the changes.{/}\n');
}

/**
 * Handle AI Describe Single NPC.
 */
async function handleAIDescribeNPC(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  area: AreaDefinition,
  npc: DraftNPC
): Promise<void> {
  if (!isAIAvailable()) {
    player.receive('{red}AI is not configured or unavailable.{/}\n');
    return;
  }

  player.receive(`{cyan}Generating description for ${npc.name}...{/}\n`);
  await generateNPCDescription(areaDaemon, area, npc);
  await areaDaemon.save();
  player.receive('{green}Description generated!{/}\n');
  player.receive('{dim}Use "areas gui" and click Edit to see the changes.{/}\n');
}

/**
 * Generate an NPC description using AI.
 */
async function generateNPCDescription(
  areaDaemon: AreaDaemon,
  area: AreaDefinition,
  npc: DraftNPC
): Promise<void> {
  const keywords = [area.name, area.theme, npc.name, ...(npc.keywords || [])].filter(Boolean);
  const loreContext = getLoreContext(keywords);

  const prompt = `Generate an NPC description for a fantasy MUD game.

NPC: "${npc.name}"
LEVEL: ${npc.level}
GENDER: ${npc.gender || 'neutral'}
AREA: ${area.name} (${area.theme || 'fantasy'})

${loreContext ? `WORLD LORE:
${loreContext}

` : ''}Generate a JSON object with:
{
  "shortDesc": "A brief phrase starting lowercase (e.g., 'a grizzled old warrior')",
  "longDesc": "2-3 sentences describing the NPC's appearance and demeanor"
}

Requirements:
- shortDesc starts lowercase, suitable for "You see [shortDesc] standing here"
- longDesc is detailed and atmospheric
- Match the NPC's level and area theme

Respond with ONLY the JSON object.`;

  try {
    const result = await efuns.aiGenerate(prompt, undefined, { maxTokens: 400 });

    if (!result.success || !result.text) {
      return;
    }

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const desc = JSON.parse(jsonMatch[0]) as { shortDesc?: string; longDesc?: string };

    areaDaemon.updateNPC(area.id, npc.id, {
      shortDesc: desc.shortDesc || npc.shortDesc,
      longDesc: desc.longDesc || npc.longDesc,
    });
  } catch {
    // Silently fail
  }
}

/**
 * Handle AI Describe All Items.
 */
async function handleAIDescribeAllItems(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  area: AreaDefinition
): Promise<void> {
  if (!isAIAvailable()) {
    player.receive('{red}AI is not configured or unavailable.{/}\n');
    return;
  }

  player.receive(`{cyan}Generating descriptions for ${area.items.length} items...{/}\n`);

  let updatedCount = 0;
  for (const item of area.items) {
    if (item.longDesc && item.longDesc.length > 20) {
      continue;
    }

    player.receive(`{dim}  Generating for ${item.name}...{/}\n`);
    await generateItemDescription(areaDaemon, area, item);
    updatedCount++;
  }

  await areaDaemon.save();
  player.receive(`{green}Generated descriptions for ${updatedCount} items.{/}\n`);
  player.receive('{dim}Use "areas gui" and click Edit to see the changes.{/}\n');
}

/**
 * Handle AI Describe Single Item.
 */
async function handleAIDescribeItem(
  player: GUIPlayer,
  areaDaemon: AreaDaemon,
  state: EditorState,
  area: AreaDefinition,
  item: DraftItem
): Promise<void> {
  if (!isAIAvailable()) {
    player.receive('{red}AI is not configured or unavailable.{/}\n');
    return;
  }

  player.receive(`{cyan}Generating description for ${item.name}...{/}\n`);
  await generateItemDescription(areaDaemon, area, item);
  await areaDaemon.save();
  player.receive('{green}Description generated!{/}\n');
  player.receive('{dim}Use "areas gui" and click Edit to see the changes.{/}\n');
}

/**
 * Generate an item description using AI.
 */
async function generateItemDescription(
  areaDaemon: AreaDaemon,
  area: AreaDefinition,
  item: DraftItem
): Promise<void> {
  const keywords = [area.name, area.theme, item.name, item.type, ...(item.keywords || [])].filter(Boolean);
  const loreContext = getLoreContext(keywords);

  const prompt = `Generate an item description for a fantasy MUD game.

ITEM: "${item.name}"
TYPE: ${item.type}
VALUE: ${item.value || 0} gold
AREA: ${area.name} (${area.theme || 'fantasy'})

${loreContext ? `WORLD LORE:
${loreContext}

` : ''}Generate a JSON object with:
{
  "shortDesc": "A brief description (e.g., 'a rusty iron sword')",
  "longDesc": "2-3 sentences describing the item when examined"
}

Requirements:
- shortDesc starts lowercase
- longDesc is detailed and atmospheric
- Match the item type and area theme

Respond with ONLY the JSON object.`;

  try {
    const result = await efuns.aiGenerate(prompt, undefined, { maxTokens: 400 });

    if (!result.success || !result.text) {
      return;
    }

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const desc = JSON.parse(jsonMatch[0]) as { shortDesc?: string; longDesc?: string };

    areaDaemon.updateItem(area.id, item.id, {
      shortDesc: desc.shortDesc || item.shortDesc,
      longDesc: desc.longDesc || item.longDesc,
    });
  } catch {
    // Silently fail
  }
}
