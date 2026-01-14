/**
 * Quest GUI - Build and display quest log modal.
 *
 * Creates a GUI modal showing all active quests with their objectives and progress.
 * Players can view quest details and abandon quests from this interface.
 */

import type { GUIOpenMessage, GUIClientMessage, LayoutContainer, DisplayElement } from './gui-types.js';
import type { QuestPlayer, PlayerQuestState, QuestDefinition, QuestObjective } from '../std/quest/types.js';
import type { QuestDaemon } from '../daemons/quest.js';

/**
 * Open the quest log GUI modal for a player.
 */
export function openQuestLogModal(
  player: QuestPlayer,
  questDaemon: QuestDaemon
): void {
  const data = questDaemon.getPlayerQuestData(player);

  // Sort quests: completed first (ready to turn in), then by acceptedAt
  const sortedQuests = [...data.active].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (a.status !== 'completed' && b.status === 'completed') return 1;
    return b.acceptedAt - a.acceptedAt;
  });

  // Build quest entries
  const questEntries: LayoutContainer[] = [];

  if (sortedQuests.length === 0) {
    questEntries.push({
      type: 'vertical',
      children: [
        {
          type: 'paragraph',
          id: 'no-quests',
          content: 'You have no active quests. Visit NPCs with quest markers (!) to find new quests.',
          style: { color: '#888', textAlign: 'center', padding: '32px' },
        } as DisplayElement,
      ],
    });
  } else {
    for (const state of sortedQuests) {
      const quest = questDaemon.getQuest(state.questId);
      if (!quest) continue;

      const questEntry = buildQuestEntry(state, quest, questDaemon);
      questEntries.push(questEntry);
    }
  }

  // Build the full modal
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'quest-log',
      title: 'Quest Log',
      subtitle: `${data.active.length} active quest${data.active.length !== 1 ? 's' : ''} | ${data.questPoints} Quest Points`,
      size: 'large',
      closable: true,
      escapable: true,
    },
    layout: {
      type: 'vertical',
      gap: '16px',
      style: { maxHeight: '500px', overflowY: 'auto' },
      children: questEntries,
    },
    buttons: [
      {
        id: 'close',
        label: 'Close',
        style: 'secondary',
        action: 'close',
      },
    ],
  };

  // Send the GUI message
  if (typeof efuns !== 'undefined' && efuns.guiSend) {
    efuns.guiSend(message);

    // Set up response handler
    const playerWithHandler = player as QuestPlayer & {
      onGUIResponse?: (msg: GUIClientMessage) => void;
    };

    playerWithHandler.onGUIResponse = (response: GUIClientMessage) => {
      handleQuestLogResponse(player, questDaemon, response);
    };
  }
}

/**
 * Build a single quest entry for the modal.
 */
function buildQuestEntry(
  state: PlayerQuestState,
  quest: QuestDefinition,
  questDaemon: QuestDaemon
): LayoutContainer {
  const isComplete = state.status === 'completed';
  const statusColor = isComplete ? '#4ade80' : '#fbbf24';
  const statusText = isComplete ? 'Ready to Turn In' : 'In Progress';

  // Build objectives list
  const objectiveElements: LayoutContainer[] = [];
  for (let i = 0; i < quest.objectives.length; i++) {
    const obj = quest.objectives[i];
    const progress = state.objectives[i];
    const objComplete = progress.complete;
    const checkmark = objComplete ? '[X]' : '[ ]';
    const objColor = objComplete ? '#4ade80' : '#f5f5f5';

    objectiveElements.push({
      type: 'horizontal',
      gap: '8px',
      children: [
        {
          type: 'text',
          id: `obj-check-${state.questId}-${i}`,
          content: checkmark,
          style: { color: objColor, fontFamily: 'monospace', width: '24px' },
        } as DisplayElement,
        {
          type: 'text',
          id: `obj-desc-${state.questId}-${i}`,
          content: `${getObjectiveDescription(obj)}: ${progress.current}/${progress.required}`,
          style: { color: objColor, flex: '1' },
        } as DisplayElement,
      ],
    });
  }

  // Calculate overall progress
  let totalRequired = 0;
  let totalCurrent = 0;
  for (const obj of state.objectives) {
    totalRequired += obj.required;
    totalCurrent += obj.current;
  }
  const progressPercent = totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 0;

  return {
    type: 'vertical',
    gap: '8px',
    style: {
      padding: '12px',
      backgroundColor: '#1a1a1f',
      borderRadius: '6px',
      border: isComplete ? '1px solid #4ade80' : '1px solid #2a2a30',
    },
    children: [
      // Header row with name and status
      {
        type: 'horizontal',
        gap: '8px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'heading',
            id: `quest-name-${state.questId}`,
            content: quest.name,
            level: 4,
            style: { flex: '1', margin: '0', color: statusColor },
          } as DisplayElement,
          {
            type: 'text',
            id: `quest-status-${state.questId}`,
            content: statusText,
            style: {
              color: statusColor,
              fontSize: '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            },
          } as DisplayElement,
        ],
      },
      // Description
      {
        type: 'paragraph',
        id: `quest-desc-${state.questId}`,
        content: quest.description,
        style: { color: '#888', fontSize: '13px', margin: '4px 0' },
      } as DisplayElement,
      // Progress bar
      {
        type: 'progress',
        id: `quest-progress-${state.questId}`,
        value: progressPercent,
        max: 100,
        label: `${progressPercent}%`,
        style: { height: '8px' },
      } as DisplayElement,
      // Objectives
      {
        type: 'vertical',
        gap: '4px',
        style: { marginTop: '8px' },
        children: objectiveElements,
      },
      // Rewards preview
      {
        type: 'horizontal',
        gap: '16px',
        style: { marginTop: '8px', fontSize: '12px' },
        children: buildRewardsPreviews(quest, state.questId),
      },
      // Abandon button
      {
        type: 'horizontal',
        gap: '8px',
        style: { marginTop: '8px', justifyContent: 'flex-end' },
        children: [
          {
            type: 'button',
            id: `abandon-${state.questId}`,
            label: 'Abandon Quest',
            style: {
              backgroundColor: '#3a1a1a',
              color: '#f87171',
              border: '1px solid #5a2a2a',
              fontSize: '11px',
              padding: '4px 8px',
            },
          } as DisplayElement,
        ],
      },
    ],
  };
}

/**
 * Build reward preview elements.
 */
function buildRewardsPreviews(quest: QuestDefinition, questId: string): DisplayElement[] {
  const rewards: DisplayElement[] = [];
  const r = quest.rewards;

  if (r.experience) {
    rewards.push({
      type: 'text',
      id: `reward-xp-${questId}`,
      content: `+${r.experience} XP`,
      style: { color: '#22d3ee' },
    } as DisplayElement);
  }

  if (r.questPoints) {
    rewards.push({
      type: 'text',
      id: `reward-qp-${questId}`,
      content: `+${r.questPoints} QP`,
      style: { color: '#c084fc' },
    } as DisplayElement);
  }

  if (r.gold) {
    rewards.push({
      type: 'text',
      id: `reward-gold-${questId}`,
      content: `+${r.gold} gold`,
      style: { color: '#fbbf24' },
    } as DisplayElement);
  }

  if (r.items && r.items.length > 0) {
    rewards.push({
      type: 'text',
      id: `reward-items-${questId}`,
      content: `+${r.items.length} item${r.items.length !== 1 ? 's' : ''}`,
      style: { color: '#4ade80' },
    } as DisplayElement);
  }

  return rewards;
}

/**
 * Get human-readable objective description.
 */
function getObjectiveDescription(obj: QuestObjective): string {
  switch (obj.type) {
    case 'kill':
      return `Kill ${obj.targetName}`;
    case 'fetch':
      return `Collect ${obj.itemName}`;
    case 'deliver':
      return `Deliver ${obj.itemName} to ${obj.targetName}`;
    case 'escort':
      return `Escort ${obj.npcName} to ${obj.destinationName}`;
    case 'explore':
      return `Explore ${obj.locationName}`;
    case 'talk':
      return `Talk to ${obj.npcName}`;
    case 'custom':
      return obj.description;
    default:
      return 'Complete objective';
  }
}

/**
 * Handle responses from the quest log modal.
 */
function handleQuestLogResponse(
  player: QuestPlayer,
  questDaemon: QuestDaemon,
  response: GUIClientMessage
): void {
  if (response.action === 'closed') {
    // Modal was closed - clean up handler
    const playerWithHandler = player as QuestPlayer & {
      onGUIResponse?: (msg: GUIClientMessage) => void;
    };
    delete playerWithHandler.onGUIResponse;
    return;
  }

  if (response.action === 'button') {
    const buttonId = response.buttonId;

    if (buttonId === 'close') {
      // Close the modal
      if (typeof efuns !== 'undefined' && efuns.guiSend) {
        efuns.guiSend({
          action: 'close',
          modalId: 'quest-log',
        });
      }
      return;
    }

    // Check for abandon button
    if (buttonId?.startsWith('abandon-')) {
      const questId = buttonId.replace('abandon-', '');
      const result = questDaemon.abandonQuest(player, questId);

      if (result.success) {
        // Refresh the modal
        openQuestLogModal(player, questDaemon);
      } else {
        // Show error
        player.receive(`{red}${result.message}{/}\n`);
      }
    }
  }
}
