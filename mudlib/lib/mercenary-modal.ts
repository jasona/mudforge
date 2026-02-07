/**
 * Mercenary Modal - Build and display the mercenary broker GUI.
 *
 * Creates a three-panel modal:
 * - Left: Mercenary types to choose from (Fighter, Mage, Thief, Cleric)
 * - Center: Level selector and cost preview
 * - Right: Current mercenaries with dismiss buttons
 */

import type {
  GUIOpenMessage,
  GUICloseMessage,
  GUIClientMessage,
  LayoutContainer,
  DisplayElement,
  InputElement,
  ModalButton,
} from './gui-types.js';
import type { MudObject } from '../std/object.js';
import type {
  MercenaryType,
  MercenaryTemplate,
} from './mercenary-types.js';
import { MERCENARY_TEMPLATES } from './mercenary-types.js';
import { getMercenaryDaemon } from '../daemons/mercenary.js';

/**
 * Player interface for mercenary operations.
 */
interface MercenaryPlayer extends MudObject {
  name: string;
  gold: number;
  level: number;
  objectId: string;
  receive(message: string): void;
  removeGold(amount: number): boolean;
  onGUIResponse?: (msg: GUIClientMessage) => Promise<void>;
}

const MODAL_ID = 'mercenary-modal';

/**
 * Mercenary selection state for the UI.
 */
interface MercenarySelectionState {
  selectedType: MercenaryType | null;
  selectedLevel: number;
}

// Store selection state per player
const playerSelections = new Map<string, MercenarySelectionState>();

/**
 * Open the mercenary broker modal for a player.
 */
export async function openMercenaryModal(
  player: MercenaryPlayer,
  brokerName: string = 'Mercenary Broker'
): Promise<void> {
  if (typeof efuns === 'undefined') {
    console.error('[MercenaryModal] efuns is undefined');
    return;
  }
  if (!efuns.guiSend) {
    console.error('[MercenaryModal] efuns.guiSend is not available');
    return;
  }

  try {
    // Initialize selection state
    playerSelections.set(player.objectId, {
      selectedType: null,
      selectedLevel: player.level,
    });

    // Set up GUI response handler
    player.onGUIResponse = async (msg: GUIClientMessage) => {
      await handleMercenaryResponse(player, msg);
    };

    const state = playerSelections.get(player.objectId)!;
    const layout = await buildMercenaryLayout(player, state);

    const message: GUIOpenMessage = {
      action: 'open',
      modal: {
        id: MODAL_ID,
        title: brokerName,
        subtitle: 'Hire mercenaries to fight alongside you',
        size: 'large',
        closable: true,
        escapable: true,
      },
      layout,
      buttons: buildButtons(player, state),
    };

    efuns.guiSend(message);
  } catch (error) {
    console.error('[MercenaryModal] Error opening modal:', error);
    throw error;
  }
}

/**
 * Update the mercenary modal with current state.
 */
async function updateMercenaryModal(player: MercenaryPlayer): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const state = playerSelections.get(player.objectId);
  if (!state) return;

  const layout = await buildMercenaryLayout(player, state);

  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: MODAL_ID,
      title: 'Mercenary Broker',
      subtitle: 'Hire mercenaries to fight alongside you',
      size: 'large',
      closable: true,
      escapable: true,
    },
    layout,
    buttons: buildButtons(player, state),
  };

  try {
    efuns.guiSend(message);
  } catch {
    // Modal may have been closed
  }
}

/**
 * Close the mercenary modal.
 */
export function closeMercenaryModal(player: MercenaryPlayer): void {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  // Clean up
  playerSelections.delete(player.objectId);
  player.onGUIResponse = undefined;

  const message: GUICloseMessage = {
    action: 'close',
    modalId: MODAL_ID,
  };

  try {
    efuns.guiSend(message);
  } catch {
    // Modal already closed
  }
}

/**
 * Build the complete mercenary layout.
 */
async function buildMercenaryLayout(
  player: MercenaryPlayer,
  state: MercenarySelectionState
): Promise<LayoutContainer> {
  const typesPanel = buildTypesPanel(state);
  const detailsPanel = buildDetailsPanel(player, state);
  const currentMercsPanel = await buildCurrentMercsPanel(player);

  return {
    type: 'vertical',
    gap: '12px',
    style: { padding: '4px' },
    children: [
      // Gold display
      {
        type: 'horizontal',
        gap: '8px',
        style: {
          justifyContent: 'flex-end',
          padding: '4px 8px',
          backgroundColor: '#1a1a2e',
          borderRadius: '4px',
        },
        children: [
          {
            type: 'text',
            id: 'gold-label',
            content: 'Your Gold:',
            style: { color: '#888', fontSize: '14px' },
          } as DisplayElement,
          {
            type: 'text',
            id: 'gold-amount',
            content: `${player.gold.toLocaleString()}`,
            style: { color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' },
          } as DisplayElement,
        ],
      },
      // Main three-panel layout
      {
        type: 'horizontal',
        gap: '12px',
        style: { flex: '1', minHeight: '400px' },
        children: [typesPanel, detailsPanel, currentMercsPanel],
      },
    ],
  };
}

/**
 * Build the mercenary types panel (left).
 */
function buildTypesPanel(state: MercenarySelectionState): LayoutContainer {
  const types = Object.keys(MERCENARY_TEMPLATES) as MercenaryType[];

  const children: Array<LayoutContainer | DisplayElement | InputElement> = [
    {
      type: 'heading',
      id: 'types-heading',
      content: 'Mercenary Types',
      level: 4,
      style: { color: '#60a5fa', margin: '0 0 8px 0' },
    } as DisplayElement,
  ];

  // Role descriptions for each type
  const roleDescriptions: Record<MercenaryType, { role: string; color: string }> = {
    fighter: { role: 'Tank - Draws enemy attention, protects allies', color: '#ef4444' },
    mage: { role: 'DPS - Powerful ranged magical attacks', color: '#8b5cf6' },
    thief: { role: 'DPS - Stealthy melee damage, debuffs', color: '#22c55e' },
    cleric: { role: 'Healer - Keeps party alive, buffs allies', color: '#fbbf24' },
  };

  for (const type of types) {
    const template = MERCENARY_TEMPLATES[type];
    const isSelected = state.selectedType === type;
    const roleInfo = roleDescriptions[type];

    children.push({
      type: 'vertical',
      gap: '4px',
      style: {
        padding: '12px',
        backgroundColor: isSelected ? '#3b82f6' : '#252530',
        borderRadius: '6px',
        cursor: 'pointer',
        marginBottom: '8px',
        border: isSelected ? '2px solid #60a5fa' : '2px solid transparent',
      },
      children: [
        {
          type: 'button',
          id: `select-${type}`,
          name: `select-${type}`,
          label: efuns.capitalize(type),
          action: 'custom' as const,
          customAction: `select-type-${type}`,
          variant: isSelected ? 'primary' : 'secondary',
          style: {
            width: '100%',
            justifyContent: 'flex-start',
            textAlign: 'left',
            fontWeight: 'bold',
            fontSize: '15px',
          },
        } as InputElement,
        {
          type: 'text',
          id: `role-${type}`,
          content: roleInfo.role,
          style: {
            color: roleInfo.color,
            fontSize: '11px',
            marginTop: '4px',
          },
        } as DisplayElement,
      ],
    });
  }

  return {
    type: 'vertical',
    style: {
      flex: '1',
      padding: '8px',
      backgroundColor: '#1a1a2e',
      borderRadius: '4px',
      minWidth: '200px',
    },
    children,
  };
}

/**
 * Build the details/level selector panel (center).
 */
function buildDetailsPanel(
  player: MercenaryPlayer,
  state: MercenarySelectionState
): LayoutContainer {
  const mercDaemon = getMercenaryDaemon();

  const children: Array<LayoutContainer | DisplayElement | InputElement> = [
    {
      type: 'heading',
      id: 'details-heading',
      content: 'Hiring Details',
      level: 4,
      style: { color: '#a78bfa', margin: '0 0 8px 0' },
    } as DisplayElement,
  ];

  if (!state.selectedType) {
    children.push({
      type: 'text',
      id: 'select-prompt',
      content: 'Select a mercenary type to see details.',
      style: { color: '#888', fontStyle: 'italic', padding: '20px' },
    } as DisplayElement);
  } else {
    const template = MERCENARY_TEMPLATES[state.selectedType];

    // Description
    children.push({
      type: 'text',
      id: 'merc-desc',
      content: template.longDesc.split('\n')[0].trim(),
      style: {
        color: '#ccc',
        fontSize: '12px',
        lineHeight: '1.4',
        marginBottom: '16px',
      },
    } as DisplayElement);

    // Skills section
    children.push({
      type: 'text',
      id: 'skills-label',
      content: 'Skills:',
      style: { color: '#fbbf24', fontSize: '12px', fontWeight: 'bold' },
    } as DisplayElement);

    const skillNames = template.skills.map(s => {
      const parts = s.split(':');
      return parts[1] ? efuns.capitalize(parts[1].replace(/_/g, ' ')) : s;
    });

    children.push({
      type: 'text',
      id: 'skills-list',
      content: skillNames.slice(0, 4).join(', '),
      style: { color: '#888', fontSize: '11px', marginBottom: '16px' },
    } as DisplayElement);

    // Level selector
    children.push({
      type: 'divider',
      id: 'level-divider',
      style: { margin: '12px 0' },
    } as DisplayElement);

    children.push({
      type: 'text',
      id: 'level-label',
      content: 'Mercenary Level:',
      style: { color: '#ddd', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' },
    } as DisplayElement);

    // Level buttons (5 level increments up to player level)
    const levelButtons: InputElement[] = [];
    const maxLevel = player.level;
    const levels = [];

    // Generate level options (5, 10, 15... up to player level, always include player level)
    for (let l = 5; l <= maxLevel; l += 5) {
      levels.push(l);
    }
    if (!levels.includes(maxLevel)) {
      levels.push(maxLevel);
    }
    // Also allow level 1-4 for low level players
    if (maxLevel < 5) {
      levels.length = 0;
      for (let l = 1; l <= maxLevel; l++) {
        levels.push(l);
      }
    }

    children.push({
      type: 'horizontal',
      gap: '6px',
      style: { flexWrap: 'wrap', marginBottom: '12px' },
      children: levels.slice(0, 8).map(lvl => ({
        type: 'button',
        id: `level-${lvl}`,
        name: `level-${lvl}`,
        label: `${lvl}`,
        action: 'custom' as const,
        customAction: `select-level-${lvl}`,
        variant: state.selectedLevel === lvl ? 'primary' : 'secondary',
        style: { minWidth: '40px' },
      } as InputElement)),
    });

    // Cost display
    const cost = mercDaemon.calculateCost(state.selectedLevel, player.level);
    const canAfford = player.gold >= cost;

    children.push({
      type: 'horizontal',
      gap: '8px',
      style: {
        padding: '12px',
        backgroundColor: '#252530',
        borderRadius: '6px',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [
        {
          type: 'text',
          id: 'cost-label',
          content: 'Hiring Cost:',
          style: { color: '#888', fontSize: '14px' },
        } as DisplayElement,
        {
          type: 'text',
          id: 'cost-value',
          content: `${cost.toLocaleString()} gold`,
          style: {
            color: canAfford ? '#fbbf24' : '#f87171',
            fontSize: '16px',
            fontWeight: 'bold',
          },
        } as DisplayElement,
      ],
    });

    if (!canAfford) {
      children.push({
        type: 'text',
        id: 'cannot-afford',
        content: 'You cannot afford this mercenary!',
        style: {
          color: '#f87171',
          fontSize: '12px',
          marginTop: '8px',
          textAlign: 'center',
        },
      } as DisplayElement);
    }

    // Max mercenaries info
    const currentMercs = mercDaemon.getPlayerMercenaries(player.name);
    const maxMercs = mercDaemon.getMaxMercenaries(player.level);

    children.push({
      type: 'text',
      id: 'merc-count',
      content: `Mercenaries: ${currentMercs.length}/${maxMercs}`,
      style: {
        color: currentMercs.length >= maxMercs ? '#f87171' : '#888',
        fontSize: '12px',
        marginTop: '12px',
        textAlign: 'center',
      },
    } as DisplayElement);

    if (player.level < 30) {
      children.push({
        type: 'text',
        id: 'unlock-hint',
        content: '(Unlock 2nd slot at level 30)',
        style: { color: '#666', fontSize: '10px', textAlign: 'center' },
      } as DisplayElement);
    }
  }

  return {
    type: 'vertical',
    style: {
      flex: '1',
      padding: '8px',
      backgroundColor: '#1a1a2e',
      borderRadius: '4px',
      minWidth: '220px',
    },
    children,
  };
}

/**
 * Build the current mercenaries panel (right).
 */
async function buildCurrentMercsPanel(player: MercenaryPlayer): Promise<LayoutContainer> {
  const mercDaemon = getMercenaryDaemon();
  const mercs = mercDaemon.getPlayerMercenaries(player.name);

  const children: Array<LayoutContainer | DisplayElement | InputElement> = [
    {
      type: 'heading',
      id: 'current-heading',
      content: 'Your Mercenaries',
      level: 4,
      style: { color: '#fbbf24', margin: '0 0 8px 0' },
    } as DisplayElement,
  ];

  if (mercs.length === 0) {
    children.push({
      type: 'text',
      id: 'no-mercs',
      content: 'You have no mercenaries.',
      style: { color: '#666', fontStyle: 'italic', padding: '20px' },
    } as DisplayElement);
  } else {
    for (const merc of mercs) {
      const healthPct = merc.healthPercent;
      let healthColor = '#4ade80';
      if (healthPct <= 25) healthColor = '#f87171';
      else if (healthPct <= 50) healthColor = '#fbbf24';

      children.push({
        type: 'vertical',
        gap: '4px',
        style: {
          padding: '10px',
          backgroundColor: '#252530',
          borderRadius: '6px',
          marginBottom: '8px',
        },
        children: [
          {
            type: 'horizontal',
            gap: '8px',
            style: { justifyContent: 'space-between', alignItems: 'center' },
            children: [
              {
                type: 'text',
                id: `merc-name-${merc.mercId}`,
                content: merc.mercName || efuns.capitalize(merc.mercType),
                style: { color: '#ddd', fontSize: '14px', fontWeight: 'bold' },
              } as DisplayElement,
              {
                type: 'text',
                id: `merc-level-${merc.mercId}`,
                content: `Lvl ${merc.level}`,
                style: { color: '#888', fontSize: '12px' },
              } as DisplayElement,
            ],
          },
          {
            type: 'text',
            id: `merc-type-${merc.mercId}`,
            content: `${efuns.capitalize(merc.mercType)} (${merc.getBehaviorConfig()?.role || 'generic'})`,
            style: { color: '#60a5fa', fontSize: '11px' },
          } as DisplayElement,
          {
            type: 'horizontal',
            gap: '4px',
            style: { alignItems: 'center', marginTop: '4px' },
            children: [
              {
                type: 'text',
                id: `merc-hp-label-${merc.mercId}`,
                content: 'HP:',
                style: { color: '#888', fontSize: '11px' },
              } as DisplayElement,
              {
                type: 'text',
                id: `merc-hp-${merc.mercId}`,
                content: `${merc.health}/${merc.maxHealth}`,
                style: { color: healthColor, fontSize: '11px' },
              } as DisplayElement,
            ],
          },
          {
            type: 'horizontal',
            gap: '8px',
            style: { marginTop: '8px' },
            children: [
              {
                type: 'button',
                id: `dismiss-${merc.mercId}`,
                name: `dismiss-${merc.mercId}`,
                label: 'Dismiss',
                action: 'custom' as const,
                customAction: `dismiss-${merc.mercId}`,
                variant: 'secondary',
                style: { flex: '1', fontSize: '11px' },
              } as InputElement,
            ],
          },
        ],
      });
    }
  }

  return {
    type: 'vertical',
    style: {
      flex: '1',
      padding: '8px',
      backgroundColor: '#1a1a2e',
      borderRadius: '4px',
      minWidth: '180px',
    },
    children,
  };
}

/**
 * Build the footer buttons.
 */
function buildButtons(
  player: MercenaryPlayer,
  state: MercenarySelectionState
): ModalButton[] {
  const mercDaemon = getMercenaryDaemon();

  let canHire = false;
  if (state.selectedType) {
    const cost = mercDaemon.calculateCost(state.selectedLevel, player.level);
    const currentMercs = mercDaemon.getPlayerMercenaries(player.name);
    const maxMercs = mercDaemon.getMaxMercenaries(player.level);

    canHire = player.gold >= cost && currentMercs.length < maxMercs;
  }

  return [
    {
      id: 'hire',
      label: 'Hire Mercenary',
      action: 'custom',
      customAction: 'hire-mercenary',
      variant: 'primary',
      disabled: !canHire,
    },
    {
      id: 'close',
      label: 'Leave',
      action: 'cancel',
      variant: 'ghost',
    },
  ];
}

/**
 * Handle GUI responses from the client.
 */
async function handleMercenaryResponse(
  player: MercenaryPlayer,
  msg: GUIClientMessage
): Promise<void> {
  if (msg.modalId !== MODAL_ID) return;

  if (msg.action === 'closed') {
    playerSelections.delete(player.objectId);
    player.onGUIResponse = undefined;
    return;
  }

  const state = playerSelections.get(player.objectId);
  if (!state) return;

  if (msg.action === 'button') {
    const customAction = msg.customAction || msg.buttonId;

    // Handle type selection
    if (customAction.startsWith('select-type-')) {
      const type = customAction.slice('select-type-'.length) as MercenaryType;
      state.selectedType = type;
      await updateMercenaryModal(player);
      return;
    }

    // Handle level selection
    if (customAction.startsWith('select-level-')) {
      const level = parseInt(customAction.slice('select-level-'.length), 10);
      if (!isNaN(level) && level > 0) {
        state.selectedLevel = level;
        await updateMercenaryModal(player);
      }
      return;
    }

    // Handle dismiss
    if (customAction.startsWith('dismiss-')) {
      const mercId = customAction.slice('dismiss-'.length);
      const mercDaemon = getMercenaryDaemon();
      const merc = mercDaemon.getMercenaryById(mercId);

      if (merc && merc.ownerName?.toLowerCase() === player.name.toLowerCase()) {
        mercDaemon.dismissMercenary(merc);
        player.receive(`{yellow}You dismiss ${merc.getDisplayName()}.{/}\n`);
        await updateMercenaryModal(player);
      }
      return;
    }

    // Handle hire
    if (customAction === 'hire-mercenary') {
      if (!state.selectedType) {
        player.receive('{red}Select a mercenary type first.{/}\n');
        return;
      }

      const mercDaemon = getMercenaryDaemon();
      const cost = mercDaemon.calculateCost(state.selectedLevel, player.level);

      // Check limits
      const currentMercs = mercDaemon.getPlayerMercenaries(player.name);
      const maxMercs = mercDaemon.getMaxMercenaries(player.level);

      if (currentMercs.length >= maxMercs) {
        player.receive(`{red}You already have the maximum number of mercenaries (${maxMercs}).{/}\n`);
        return;
      }

      if (player.gold < cost) {
        player.receive(`{red}You need ${cost} gold to hire this mercenary.{/}\n`);
        return;
      }

      // Hire the mercenary
      const merc = await mercDaemon.hireMercenary(player, state.selectedType, state.selectedLevel);

      if (merc) {
        player.receive(`{green}You hire ${merc.getDisplayName()} for ${cost} gold!{/}\n`);
        player.receive(`{cyan}${efuns.capitalize(merc.mercType)} ready to fight by your side.{/}\n`);

        // Announce to room
        const room = player.environment;
        if (room && 'broadcast' in room) {
          (room as MudObject & { broadcast: (msg: string, opts?: { exclude?: MudObject[] }) => void })
            .broadcast(`{dim}${merc.getDisplayName()} joins ${player.name}.{/}`, { exclude: [player] });
        }

        await updateMercenaryModal(player);
      } else {
        player.receive('{red}Failed to hire mercenary.{/}\n');
      }
      return;
    }
  }
}

