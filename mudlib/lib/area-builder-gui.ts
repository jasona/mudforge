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
import type { AreaDefinition, AreaStatus, AreaListEntry } from './area-types.js';
import type { AreaDaemon } from '../daemons/area.js';

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
      // For now, show info via text (full editor in Phase 3)
      player.receive(`{cyan}Opening editor for area: ${areaId}{/}\n`);
      player.receive('{dim}(Full multi-tab editor coming in Phase 3){/}\n');
      // Close selector
      closeModal(player, 'area-selector');
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
