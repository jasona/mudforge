/**
 * Engage command - Open WoW-style NPC dialogue overlay.
 *
 * Usage:
 *   engage <npc>
 */

import type { MudObject } from '../../lib/std.js';
import { NPC } from '../../lib/std.js';
import { findItem, parseItemInput, countMatching } from '../../lib/item-utils.js';
import { getDefaultEngageGreeting } from '../../lib/engage-defaults.js';
import { getPortraitDaemon } from '../../daemons/portrait.js';
import { getQuestDaemon } from '../../daemons/quest.js';
import { getTutorialDaemon } from '../../daemons/tutorial.js';
import { colorize, stripColors } from '../../lib/colors.js';
import type { Living } from '../../std/living.js';
import type { QuestPlayer } from '../../std/quest/types.js';
import type { EngageMessage, EngageOption, EngageQuestDetails } from '../../std/player.js';
import type { QuestDefinition, QuestObjective } from '../../std/quest/types.js';

const MAX_ENGAGE_PORTRAIT_CHARS = 2_400_000;

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

interface PlayerWithEngage extends MudObject {
  sendEngage?: (message: EngageMessage) => void;
}

interface MerchantLike extends MudObject {
  shopName?: string;
  openShop?: unknown;
}

interface PlayerWithTutorialState extends MudObject {
  getProperty?: (key: string) => unknown;
  getConfig?: <T>(key: string) => T;
}

function isMerchantLike(npc: NPC): npc is NPC & MerchantLike {
  return 'openShop' in npc && typeof (npc as MerchantLike).openShop === 'function';
}

export const name = ['engage'];
export const description = 'Engage with an NPC dialogue bubble';
export const usage = 'engage <npc>';

function formatRewardPreview(quest: QuestDefinition): string {
  const parts: string[] = [];
  const rewards = quest.rewards;

  if (rewards.experience && rewards.experience > 0) {
    parts.push(`+${rewards.experience} XP`);
  }
  if (rewards.gold && rewards.gold > 0) {
    parts.push(`+${rewards.gold} Gold`);
  }
  if (rewards.questPoints && rewards.questPoints > 0) {
    parts.push(`+${rewards.questPoints} QP`);
  }
  if (rewards.items && rewards.items.length > 0) {
    const count = rewards.items.length;
    parts.push(count === 1 ? '+1 Item' : `+${count} Items`);
  }
  if (rewards.guildXP && Object.keys(rewards.guildXP).length > 0) {
    parts.push('+Guild XP');
  }

  return parts.join('  |  ');
}

function getObjectiveDescription(obj: QuestObjective): string {
  switch (obj.type) {
    case 'kill':
      return `Defeat ${obj.required} ${obj.targetName}`;
    case 'fetch':
      return `Collect ${obj.required} ${obj.itemName}`;
    case 'deliver':
      return `Deliver ${obj.itemName} to ${obj.targetName}`;
    case 'escort':
      return `Escort ${obj.npcName} to ${obj.destinationName}`;
    case 'explore':
      return `Explore ${obj.locationName}`;
    case 'talk':
      return obj.keyword
        ? `Speak to ${obj.npcName} about "${obj.keyword}"`
        : `Speak to ${obj.npcName}`;
    case 'custom':
      return obj.description;
    default:
      return 'Complete objective';
  }
}

export async function execute(ctx: CommandContext): Promise<void> {
  try {
    let args = ctx.args.trim();
    let silentRefresh = false;
    if (args.startsWith('--silent ')) {
      silentRefresh = true;
      args = args.slice('--silent '.length).trim();
    }
    if (!args) {
      ctx.sendLine('Engage whom?');
      return;
    }

    const player = ctx.player as PlayerWithEngage;
    if (!player.sendEngage) {
      ctx.sendLine('{red}Your client does not support engage dialogue yet.{/}');
      return;
    }

    const room = ctx.player.environment;
    if (!room) {
      ctx.sendLine('{red}You are nowhere.{/}');
      return;
    }

    const parsed = parseItemInput(args);
    const target = findItem(parsed.name, room.inventory, parsed.index);
    if (!target) {
      if (parsed.index !== undefined) {
        const count = countMatching(parsed.name, room.inventory);
        if (count > 0) {
          ctx.sendLine(count === 1
            ? `You only see 1 "${parsed.name}" here.`
            : `You only see ${count} "${parsed.name}" here.`);
          return;
        }
      }
      ctx.sendLine("You don't see that here.");
      return;
    }

    if (!(target instanceof NPC)) {
      ctx.sendLine("You can only engage with NPCs.");
      return;
    }

    const npc = target;
    const questPlayer = ctx.player as QuestPlayer;
    const tutorialPlayer = ctx.player as PlayerWithTutorialState;
    const portraitDaemon = getPortraitDaemon();
    const questDaemon = getQuestDaemon();

    // Fetch portrait for dialogue overlay, but never fail command on portrait issues.
    let portrait = portraitDaemon.getFallbackPortrait();
    let portraitUrl: string | undefined;
    try {
      portrait = await portraitDaemon.getPortrait(npc);
      const portraitUrlCandidate = await portraitDaemon.getPortraitUrl(npc);
      if (portraitUrlCandidate.startsWith('/api/images/')) {
        portraitUrl = portraitUrlCandidate;
      }
      portrait = portraitDaemon.normalizeDataUri(portrait);
      if (portrait.length > MAX_ENGAGE_PORTRAIT_CHARS) {
        console.warn(
          `[engage] Oversized portrait for ${npc.name} (${portrait.length} chars) - using fallback`
        );
        portrait = portraitDaemon.getFallbackPortrait();
      }
    } catch (error) {
      console.error(`[engage] Failed to load portrait for ${npc.name}:`, error);
    }

    // Build quest action options.
    const questOffers: EngageOption[] = [];
    const available = await npc.getAvailableQuests(questPlayer);
    for (const quest of available) {
      questOffers.push({
        id: `offer-${quest.id}`,
        label: quest.name,
        command: `quest accept ${quest.name}`,
        rewardText: formatRewardPreview(quest),
      });
    }

    const questTurnIns: EngageOption[] = [];
    const completed = npc.getCompletedQuests(questPlayer);
    for (const state of completed) {
      const quest = questDaemon.getQuest(state.questId);
      if (!quest) continue;
      questTurnIns.push({
        id: `turnin-${quest.id}`,
        label: quest.name,
        command: `quest turnin ${quest.name}`,
        rewardText: formatRewardPreview(quest),
      });
    }

    const availableQuestIds = new Set(available.map((quest) => quest.id));
    const readyTurnInIds = new Set(completed.map((state) => state.questId));
    const npcQuestIds = Array.from(new Set([...npc.questsOffered, ...npc.questsTurnedIn]));
    const questLog: EngageOption[] = [];
    const questDetails: EngageQuestDetails[] = [];
    for (const questId of npcQuestIds) {
      const quest = questDaemon.getQuest(questId);
      if (!quest || quest.hidden) continue;

      const activeState = questDaemon.getActiveQuest(questPlayer, questId);
      const isCompleted = questDaemon.hasCompletedQuest(questPlayer, questId);
      const isReadyToTurnIn = readyTurnInIds.has(questId);
      const isAvailableToAccept = availableQuestIds.has(questId);
      const canAccept = await questDaemon.canAcceptQuest(questPlayer, questId);

      let status = canAccept.reason ? `Unavailable: ${canAccept.reason}` : 'Unavailable';
      let command = `quest info ${quest.name}`;
      let tone: EngageOption['tone'] = canAccept.canAccept ? 'positive' : 'negative';
      if (isReadyToTurnIn) {
        status = 'Ready to turn in';
        command = `quest turnin ${quest.name}`;
        tone = 'positive';
      } else if (isAvailableToAccept) {
        status = 'Available';
        command = `quest accept ${quest.name}`;
        tone = 'positive';
      } else if (activeState) {
        status = activeState.status === 'completed' ? 'Ready to turn in' : 'In progress';
        tone = activeState.status === 'completed' ? 'positive' : 'neutral';
      } else if (isCompleted) {
        status = 'Completed';
        tone = 'neutral';
      }

      const objectiveLines = quest.objectives.map((objective, index) => {
        const progress = activeState?.objectives[index];
        if (!progress) {
          return `${getObjectiveDescription(objective)} (0/${'required' in objective ? objective.required : 1})`;
        }
        return `${getObjectiveDescription(objective)} (${progress.current}/${progress.required})`;
      });

      const detail: EngageQuestDetails = {
        id: quest.id,
        name: quest.name,
        description: quest.description,
        storyText: quest.storyText,
        statusText: status,
        objectives: objectiveLines,
      };

      if (isReadyToTurnIn) {
        detail.turnInAction = {
          id: `turnin-${quest.id}`,
          label: 'Turn In',
          command: `quest turnin ${quest.name}`,
        };
      } else if (isAvailableToAccept || canAccept.canAccept) {
        detail.acceptAction = {
          id: `accept-${quest.id}`,
          label: 'Accept',
          command: `quest accept ${quest.name}`,
        };
      }

      questDetails.push(detail);

      questLog.push({
        id: `questlog-${quest.id}`,
        label: quest.name,
        command,
        rewardText: status,
        tone,
      });
    }

    let actions: EngageOption[] = [];
    if (isMerchantLike(npc)) {
      actions.push({
        id: 'trade',
        label: 'Trade',
        command: `shop ${npc.name}`,
        rewardText: npc.shopName || undefined,
      });
    }

    // Intro sound defaults to engageSound, then lookSound.
    // Use discussion category so it plays with default sound settings.
    const introSound = npc.engageSound || npc.lookSound;
    if (!silentRefresh && introSound && typeof efuns !== 'undefined' && efuns.playSound) {
      efuns.playSound(ctx.player, 'discussion', introSound);
    }

    let text = getDefaultEngageGreeting(npc, ctx.player as Living, questOffers, questTurnIns);

    const isTutorialArea = room.objectPath?.startsWith('/areas/tutorial/') ?? false;
    const tutorialComplete = tutorialPlayer.getProperty?.('tutorial_complete') === true;
    const npcPath = npc.objectPath || '';
    const isGeneralIronheart = npcPath.endsWith('/areas/tutorial/general_ironheart');

    if (isTutorialArea && !tutorialComplete && isGeneralIronheart) {
      const tutorialContent = getTutorialDaemon().getEngageContentForGeneral(ctx.player as Living);
      text = tutorialContent.text;
      actions = [...tutorialContent.actions, ...actions];
    }

    const colorEnabled = tutorialPlayer.getConfig?.<boolean>('color') !== false;
    const renderedText = colorEnabled ? colorize(text) : stripColors(text);

    player.sendEngage({
      type: 'open',
      npcName: npc.name,
      npcPath: npc.objectPath || npc.name,
      portrait,
      portraitUrl,
      alignment: npc.engageAlignment,
      text: renderedText,
      actions,
      questLog,
      questDetails,
      questOffers,
      questTurnIns,
    });
  } catch (error) {
    console.error('[engage] Unexpected error:', error);
    ctx.sendLine('{red}The dialogue falters for a moment. Try engaging again.{/}');
  }
}

export default {
  name,
  description,
  usage,
  execute,
};
