/**
 * Engage command - Open WoW-style NPC dialogue overlay.
 *
 * Usage:
 *   engage <npc>
 */

import type { MudObject } from '../../lib/std.js';
import { NPC } from '../../lib/std.js';
import { findItem, parseItemInput, countMatching } from '../../lib/item-utils.js';
import { getPortraitDaemon } from '../../daemons/portrait.js';
import { getQuestDaemon } from '../../daemons/quest.js';
import type { QuestPlayer } from '../../std/quest/types.js';
import type { EngageMessage, EngageOption } from '../../std/player.js';
import type { QuestDefinition } from '../../std/quest/types.js';

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

export async function execute(ctx: CommandContext): Promise<void> {
  try {
    const args = ctx.args.trim();
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
    const portraitDaemon = getPortraitDaemon();
    const questDaemon = getQuestDaemon();

    // Fetch portrait for dialogue overlay, but never fail command on portrait issues.
    let portrait = portraitDaemon.getFallbackPortrait();
    try {
      portrait = await portraitDaemon.getPortrait(npc);
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

    // Intro sound defaults to engageSound, then lookSound.
    const introSound = npc.engageSound || npc.lookSound;
    if (introSound && typeof efuns !== 'undefined' && efuns.playSound) {
      efuns.playSound(ctx.player, 'ambient', introSound);
    }

    const text =
      npc.engageGreeting ||
      (questOffers.length > 0
        ? `Greetings. I have ${questOffers.length === 1 ? 'a task' : 'tasks'} for you.`
        : questTurnIns.length > 0
          ? 'You return with news. Let us settle your task.'
          : 'Greetings, traveler.');

    player.sendEngage({
      type: 'open',
      npcName: npc.name,
      npcPath: npc.objectPath || npc.name,
      portrait,
      alignment: npc.engageAlignment,
      text,
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
