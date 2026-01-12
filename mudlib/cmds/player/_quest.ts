/**
 * quest - View and manage quests.
 *
 * Usage:
 *   quest                    - Show active quests summary
 *   quest log                - Show full quest log with progress
 *   quest info <name>        - Detailed quest info
 *   quest accept <name>      - Accept quest from nearby NPC
 *   quest abandon <name>     - Abandon active quest
 *   quest turn-in <name>     - Turn in completed quest
 *   quest history            - Show completed quests
 *   quest points             - Show quest points balance
 */

import type { MudObject } from '../../lib/std.js';
import { getQuestDaemon } from '../../daemons/quest.js';
import type { QuestPlayer, QuestDefinition, PlayerQuestState } from '../../std/quest/types.js';
import type { NPC } from '../../std/npc.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['quest', 'quests', 'journal'];
export const description = 'View and manage your quests';
export const usage = 'quest [log|info|accept|abandon|turn-in|history|points] [quest name]';

export async function execute(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  const parts = args.split(/\s+/);
  const subcommand = parts[0]?.toLowerCase() || '';
  const questArg = parts.slice(1).join(' ');

  const questDaemon = getQuestDaemon();
  const player = ctx.player as unknown as QuestPlayer;

  switch (subcommand) {
    case '':
    case 'log':
      showQuestLog(ctx, player, questDaemon);
      break;
    case 'info':
    case 'show':
      showQuestInfo(ctx, player, questDaemon, questArg);
      break;
    case 'accept':
      await handleAcceptQuest(ctx, player, questDaemon, questArg);
      break;
    case 'abandon':
    case 'drop':
      handleAbandonQuest(ctx, player, questDaemon, questArg);
      break;
    case 'turn-in':
    case 'turnin':
    case 'complete':
      await handleTurnInQuest(ctx, player, questDaemon, questArg);
      break;
    case 'history':
    case 'completed':
      showQuestHistory(ctx, player, questDaemon);
      break;
    case 'points':
    case 'qp':
      showQuestPoints(ctx, player, questDaemon);
      break;
    case 'help':
      showHelp(ctx);
      break;
    default:
      // Try to find quest by name
      if (args) {
        showQuestInfo(ctx, player, questDaemon, args);
      } else {
        showQuestLog(ctx, player, questDaemon);
      }
      break;
  }
}

/**
 * Show the quest log with active quests.
 */
function showQuestLog(
  ctx: CommandContext,
  player: QuestPlayer,
  questDaemon: ReturnType<typeof getQuestDaemon>
): void {
  const log = questDaemon.getFullQuestLog(player);
  ctx.sendLine('');
  ctx.sendLine(log);
  ctx.sendLine('');
  ctx.sendLine("{dim}Use 'quest info <name>' for details, 'quest help' for commands.{/}");
}

/**
 * Show detailed info about a specific quest.
 */
function showQuestInfo(
  ctx: CommandContext,
  player: QuestPlayer,
  questDaemon: ReturnType<typeof getQuestDaemon>,
  questName: string
): void {
  if (!questName) {
    ctx.sendLine("{yellow}Usage: quest info <quest name>{/}");
    return;
  }

  // Find the quest by name (search active quests first, then all quests)
  const activeQuests = questDaemon.getActiveQuests(player);
  let quest: QuestDefinition | undefined;
  let state: PlayerQuestState | undefined;

  // Check active quests
  for (const s of activeQuests) {
    const q = questDaemon.getQuest(s.questId);
    if (q && q.name.toLowerCase().includes(questName.toLowerCase())) {
      quest = q;
      state = s;
      break;
    }
  }

  // If not found in active, search all quests
  if (!quest) {
    const allQuests = questDaemon.getAllQuests();
    quest = allQuests.find((q) => q.name.toLowerCase().includes(questName.toLowerCase()));
  }

  if (!quest) {
    ctx.sendLine(`{red}Quest not found: ${questName}{/}`);
    return;
  }

  // Display quest info
  ctx.sendLine('');
  ctx.sendLine(`{bold}{cyan}=== ${quest.name} ==={/}`);
  ctx.sendLine(`{dim}Area: ${quest.area} | Recommended Level: ${quest.recommendedLevel || '?'}{/}`);
  ctx.sendLine('');
  ctx.sendLine(`{cyan}${quest.storyText}{/}`);
  ctx.sendLine('');

  // Show objectives
  ctx.sendLine('{bold}Objectives:{/}');
  for (let i = 0; i < quest.objectives.length; i++) {
    const obj = quest.objectives[i];
    let progress = '0/1';
    let complete = false;

    if (state) {
      const objProgress = state.objectives[i];
      progress = `${objProgress.current}/${objProgress.required}`;
      complete = objProgress.complete;
    }

    const status = complete ? '{green}[COMPLETE]{/}' : `{yellow}${progress}{/}`;
    const desc = getObjectiveDescription(obj);
    ctx.sendLine(`  ${complete ? '{green}' : ''}${desc}{/} - ${status}`);
  }

  // Show rewards
  ctx.sendLine('');
  ctx.sendLine('{bold}Rewards:{/}');
  if (quest.rewards.experience) {
    ctx.sendLine(`  {cyan}${quest.rewards.experience} XP{/}`);
  }
  if (quest.rewards.questPoints) {
    ctx.sendLine(`  {magenta}${quest.rewards.questPoints} Quest Points{/}`);
  }
  if (quest.rewards.gold) {
    ctx.sendLine(`  {yellow}${quest.rewards.gold} gold{/}`);
  }
  if (quest.rewards.items && quest.rewards.items.length > 0) {
    ctx.sendLine(`  {green}${quest.rewards.items.length} item(s){/}`);
  }

  // Show status
  ctx.sendLine('');
  if (state) {
    const statusColor = state.status === 'completed' ? 'green' : 'yellow';
    const statusText = state.status === 'completed' ? 'Ready to Turn In' : 'In Progress';
    ctx.sendLine(`{bold}Status:{/} {${statusColor}}${statusText}{/}`);
  } else if (questDaemon.hasCompletedQuest(player, quest.id)) {
    ctx.sendLine('{bold}Status:{/} {dim}Already Completed{/}');
  } else {
    const canAccept = questDaemon.canAcceptQuest(player, quest.id);
    if (canAccept.canAccept) {
      ctx.sendLine("{bold}Status:{/} {green}Available{/} - Use 'quest accept' near the quest giver");
    } else {
      ctx.sendLine(`{bold}Status:{/} {red}Unavailable{/} - ${canAccept.reason}`);
    }
  }
  ctx.sendLine('');
}

/**
 * Handle accepting a quest.
 */
async function handleAcceptQuest(
  ctx: CommandContext,
  player: QuestPlayer,
  questDaemon: ReturnType<typeof getQuestDaemon>,
  questName: string
): Promise<void> {
  if (!questName) {
    // Show available quests from nearby NPCs
    const room = (player as MudObject).environment;
    if (!room) {
      ctx.sendLine('{red}You are nowhere!{/}');
      return;
    }

    // Find quest-giving NPCs in the room
    const npcs = (room.inventory || []).filter(
      (obj: MudObject) => 'questsOffered' in obj &&
        Array.isArray((obj as unknown as NPC).questsOffered) &&
        (obj as unknown as NPC).questsOffered.length > 0
    ) as unknown as NPC[];

    if (npcs.length === 0) {
      ctx.sendLine("{yellow}There are no quest givers here. Use 'quest accept <name>' when near one.{/}");
      return;
    }

    // Show available quests (use daemon directly instead of NPC method)
    let hasQuests = false;
    let hasUnavailable = false;
    const unavailableQuests: Array<{ quest: QuestDefinition; reason: string; npcName: string }> = [];

    for (const npc of npcs) {
      const availableQuests: QuestDefinition[] = [];

      // Check each quest this NPC offers
      for (const questId of npc.questsOffered) {
        const quest = questDaemon.getQuest(questId);
        if (!quest) continue;

        const canAccept = questDaemon.canAcceptQuest(player, questId);
        if (canAccept.canAccept) {
          availableQuests.push(quest);
        } else if (canAccept.reason) {
          // Track unavailable quests to show as locked
          unavailableQuests.push({ quest, reason: canAccept.reason, npcName: npc.name });
        }
      }

      if (availableQuests.length > 0) {
        if (!hasQuests) {
          ctx.sendLine('');
          ctx.sendLine('{bold}{cyan}Available Quests:{/}');
          hasQuests = true;
        }
        ctx.sendLine(`\n{bold}${npc.name}:{/}`);
        for (const q of availableQuests) {
          ctx.sendLine(`  {yellow}!{/} ${q.name} - ${q.description}`);
        }
      }
    }

    // Show unavailable quests with reasons
    if (unavailableQuests.length > 0) {
      hasUnavailable = true;
      ctx.sendLine('');
      ctx.sendLine('{dim}Locked Quests:{/}');
      for (const { quest, reason, npcName } of unavailableQuests) {
        ctx.sendLine(`  {dim}[X] ${quest.name} (${npcName}) - ${reason}{/}`);
      }
    }

    if (!hasQuests && !hasUnavailable) {
      ctx.sendLine('{yellow}No quests available from NPCs here.{/}');
    } else if (!hasQuests && hasUnavailable) {
      ctx.sendLine("\n{dim}No quests available yet. Complete prerequisites to unlock them.{/}");
    } else {
      ctx.sendLine("\n{dim}Use 'quest accept <quest name>' to accept a quest.{/}");
    }
    return;
  }

  // Find the quest
  const allQuests = questDaemon.getAllQuests();
  const quest = allQuests.find((q) => q.name.toLowerCase().includes(questName.toLowerCase()));

  if (!quest) {
    ctx.sendLine(`{red}Quest not found: ${questName}{/}`);
    return;
  }

  // Check if player is near the quest giver
  const room = (player as MudObject).environment;
  const npcs = (room?.inventory || []).filter(
    (obj: MudObject) => 'questsOffered' in obj &&
      ((obj as unknown as NPC).questsOffered || []).includes(quest.id)
  ) as unknown as NPC[];

  if (npcs.length === 0) {
    ctx.sendLine(`{yellow}You need to be near ${quest.giverNpc.split('/').pop()} to accept this quest.{/}`);
    return;
  }

  // Accept the quest
  const result = questDaemon.acceptQuest(player, quest.id);
  if (!result.success) {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
  // Success message is already shown by the daemon
}

/**
 * Handle abandoning a quest.
 */
function handleAbandonQuest(
  ctx: CommandContext,
  player: QuestPlayer,
  questDaemon: ReturnType<typeof getQuestDaemon>,
  questName: string
): void {
  if (!questName) {
    ctx.sendLine("{yellow}Usage: quest abandon <quest name>{/}");
    return;
  }

  // Find the active quest
  const activeQuests = questDaemon.getActiveQuests(player);
  let foundQuest: PlayerQuestState | undefined;
  let questDef: QuestDefinition | undefined;

  for (const state of activeQuests) {
    const q = questDaemon.getQuest(state.questId);
    if (q && q.name.toLowerCase().includes(questName.toLowerCase())) {
      foundQuest = state;
      questDef = q;
      break;
    }
  }

  if (!foundQuest || !questDef) {
    ctx.sendLine(`{red}You don't have an active quest matching: ${questName}{/}`);
    return;
  }

  const result = questDaemon.abandonQuest(player, foundQuest.questId);
  if (!result.success) {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
  // Success message is already shown by the daemon
}

/**
 * Handle turning in a quest.
 */
async function handleTurnInQuest(
  ctx: CommandContext,
  player: QuestPlayer,
  questDaemon: ReturnType<typeof getQuestDaemon>,
  questName: string
): Promise<void> {
  // Get completed quests
  const activeQuests = questDaemon.getActiveQuests(player);
  const completedQuests = activeQuests.filter((s) => s.status === 'completed');

  if (completedQuests.length === 0) {
    ctx.sendLine('{yellow}You have no quests ready to turn in.{/}');
    return;
  }

  // If no name specified and only one completed quest, turn it in
  if (!questName && completedQuests.length === 1) {
    const state = completedQuests[0];
    const quest = questDaemon.getQuest(state.questId);
    if (quest) {
      questName = quest.name;
    }
  }

  if (!questName) {
    ctx.sendLine('{bold}Quests ready to turn in:{/}');
    for (const state of completedQuests) {
      const q = questDaemon.getQuest(state.questId);
      if (q) {
        ctx.sendLine(`  {green}?{/} ${q.name}`);
      }
    }
    ctx.sendLine("\n{dim}Use 'quest turn-in <quest name>' near the turn-in NPC.{/}");
    return;
  }

  // Find the completed quest
  let foundQuest: PlayerQuestState | undefined;
  let questDef: QuestDefinition | undefined;

  for (const state of completedQuests) {
    const q = questDaemon.getQuest(state.questId);
    if (q && q.name.toLowerCase().includes(questName.toLowerCase())) {
      foundQuest = state;
      questDef = q;
      break;
    }
  }

  if (!foundQuest || !questDef) {
    ctx.sendLine(`{red}No completed quest matching: ${questName}{/}`);
    return;
  }

  // Check if player is near the turn-in NPC
  const turnInNpc = questDef.turnInNpc || questDef.giverNpc;
  const room = (player as MudObject).environment;
  const npcs = (room?.inventory || []).filter(
    (obj: MudObject) => 'questsTurnedIn' in obj &&
      ((obj as unknown as NPC).questsTurnedIn || []).includes(questDef!.id)
  ) as unknown as NPC[];

  if (npcs.length === 0) {
    ctx.sendLine(`{yellow}You need to be near ${turnInNpc.split('/').pop()} to turn in this quest.{/}`);
    return;
  }

  // Turn in the quest
  const result = questDaemon.turnInQuest(player, foundQuest.questId);
  if (!result.success) {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
  // Success message and rewards are shown by the daemon
}

/**
 * Show quest history.
 */
function showQuestHistory(
  ctx: CommandContext,
  player: QuestPlayer,
  questDaemon: ReturnType<typeof getQuestDaemon>
): void {
  const data = questDaemon.getPlayerQuestData(player);
  const completedIds = Object.keys(data.completed);

  if (completedIds.length === 0) {
    ctx.sendLine("{dim}You haven't completed any quests yet.{/}");
    return;
  }

  ctx.sendLine('');
  ctx.sendLine('{bold}{cyan}=== Completed Quests ==={/}');
  ctx.sendLine('');

  for (const questId of completedIds.slice(-20)) { // Show last 20
    const quest = questDaemon.getQuest(questId);
    const timestamp = data.completed[questId];
    const date = new Date(timestamp).toLocaleDateString();

    if (quest) {
      ctx.sendLine(`  {green}[X]{/} ${quest.name} {dim}(${date}){/}`);
    } else {
      ctx.sendLine(`  {green}[X]{/} ${questId} {dim}(${date}){/}`);
    }
  }

  ctx.sendLine('');
  ctx.sendLine(`{dim}${completedIds.length} quest${completedIds.length !== 1 ? 's' : ''} completed total{/}`);
}

/**
 * Show quest points.
 */
function showQuestPoints(
  ctx: CommandContext,
  player: QuestPlayer,
  questDaemon: ReturnType<typeof getQuestDaemon>
): void {
  const points = questDaemon.getQuestPoints(player);
  ctx.sendLine('');
  ctx.sendLine(`{bold}Quest Points:{/} {magenta}${points}{/}`);
  ctx.sendLine('');
}

/**
 * Show help.
 */
function showHelp(ctx: CommandContext): void {
  ctx.sendLine('');
  ctx.sendLine('{bold}{cyan}Quest Commands:{/}');
  ctx.sendLine('');
  ctx.sendLine('  {yellow}quest{/}              - Show your quest log');
  ctx.sendLine('  {yellow}quest log{/}          - Show full quest log with progress');
  ctx.sendLine('  {yellow}quest info <name>{/}  - Show detailed quest information');
  ctx.sendLine('  {yellow}quest accept{/}       - Show available quests from nearby NPCs');
  ctx.sendLine('  {yellow}quest accept <name>{/} - Accept a quest');
  ctx.sendLine('  {yellow}quest abandon <name>{/} - Abandon an active quest');
  ctx.sendLine('  {yellow}quest turn-in{/}      - Show quests ready to turn in');
  ctx.sendLine('  {yellow}quest turn-in <name>{/} - Turn in a completed quest');
  ctx.sendLine('  {yellow}quest history{/}      - Show completed quests');
  ctx.sendLine('  {yellow}quest points{/}       - Show your quest point balance');
  ctx.sendLine('');
}

/**
 * Get human-readable objective description.
 */
function getObjectiveDescription(obj: QuestDefinition['objectives'][0]): string {
  switch (obj.type) {
    case 'kill':
      return `Kill ${obj.required} ${obj.targetName}`;
    case 'fetch':
      return `Collect ${obj.required} ${obj.itemName}`;
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

export default { name, description, usage, execute };
