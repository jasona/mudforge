import type { Living } from '../std/living.js';
import type { EngageKind, NPC } from '../std/npc.js';
import type { EngageOption } from '../std/player.js';

const HOSTILE_CREATURE_GREETINGS = [
  '*growls menacingly*',
  '*snarls at you*',
  '*bares its teeth*',
  '*watches you with hostile eyes*',
] as const;

const NEUTRAL_CREATURE_GREETINGS = [
  '*regards you warily*',
  '*sniffs the air*',
] as const;

const HOSTILE_HUMANOID_GREETINGS = [
  'What do you want?',
  'State your business.',
] as const;

function pickRandom<T>(choices: readonly T[]): T {
  if (choices.length === 1) {
    return choices[0] as T;
  }
  if (typeof efuns !== 'undefined' && efuns.random) {
    return choices[efuns.random(choices.length)] as T;
  }
  return choices[Math.floor(Math.random() * choices.length)] as T;
}

export function getEngageKind(npc: NPC): EngageKind {
  return npc.engageKind;
}

export function getDefaultEngageGreeting(
  npc: NPC,
  player: Living,
  questOffers: EngageOption[],
  questTurnIns: EngageOption[]
): string {
  if (npc.engageGreeting) {
    return npc.engageGreeting;
  }

  if (questOffers.length > 0) {
    return `Greetings. I have ${questOffers.length === 1 ? 'a task' : 'tasks'} for you.`;
  }

  if (questTurnIns.length > 0) {
    return 'You return with news. Let us settle your task.';
  }

  const engageKind = getEngageKind(npc);
  const isAggressive = npc.isAggressiveTo(player);

  if (engageKind === 'creature') {
    return isAggressive
      ? pickRandom(HOSTILE_CREATURE_GREETINGS)
      : pickRandom(NEUTRAL_CREATURE_GREETINGS);
  }

  if (isAggressive) {
    return pickRandom(HOSTILE_HUMANOID_GREETINGS);
  }

  return 'Greetings, traveler.';
}
