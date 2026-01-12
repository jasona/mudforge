/**
 * Quest Definitions Index
 *
 * Exports all quest definitions for registration with the quest daemon.
 */

import type { QuestDefinition } from '../types.js';
import { ALDRIC_QUESTS } from './aldric_quests.js';

/**
 * Get all quest definitions.
 */
export function getAllQuestDefinitions(): QuestDefinition[] {
  return [
    ...ALDRIC_QUESTS,
    // Add more area quests here as they are created
  ];
}

// Re-export individual quest arrays
export { ALDRIC_QUESTS } from './aldric_quests.js';
