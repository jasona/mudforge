import type { Living } from '../std/living.js';

type LeaderCombatHandler = (attacker: Living, defender: Living) => void;

const leaderCombatHandlers = new Set<LeaderCombatHandler>();

/**
 * Subscribe to leader-combat events.
 * Returns an unsubscribe function.
 */
export function onLeaderCombatInitiated(handler: LeaderCombatHandler): () => void {
  leaderCombatHandlers.add(handler);
  return () => {
    leaderCombatHandlers.delete(handler);
  };
}

/**
 * Publish leader-combat events to subscribers.
 */
export function emitLeaderCombatInitiated(attacker: Living, defender: Living): void {
  for (const handler of leaderCombatHandlers) {
    try {
      handler(attacker, defender);
    } catch (error) {
      console.error('[combat-events] handler failed:', error);
    }
  }
}

/**
 * Reset event listeners (for tests).
 */
export function resetCombatEvents(): void {
  leaderCombatHandlers.clear();
}
