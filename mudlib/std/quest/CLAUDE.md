# mudlib/std/quest/ - Quest System

## Files

- `types.ts` - Quest types and interfaces
- `definitions/aldric_quests.ts` - Quest definitions for Aldric area
- `definitions/index.ts` - Re-exports

## Quest ID Format

`area:quest_name` (e.g., `aldric:rat_problem`)

## Objective Types

kill, fetch, deliver, escort, explore, talk, custom

## Quest Status Flow

available → active → completed → turned_in (or failed)

## Key Types

- `QuestDefinition` - id, name, description, objectives[], rewards, prerequisites?, giverNpc, turnInNpc?
- `QuestRewards` - experience, questPoints, gold, items[], guildXP
- `QuestPrerequisites` - level?, quests?[], guilds?, items?, customHandler?

## Quest Integration Points

- `Item.onTake()` → tracks fetch objectives
- `Living.moveDirection()` → tracks explore objectives
- `NPC.hearSay()` → tracks talk objectives
- Kill objectives tracked by combat daemon on death

## Adding New Quests

1. Create quest definition in `definitions/` directory
2. Add quest to NPC via `npc.addQuest(questId)` for offering
3. Add turn-in NPC via `npc.addTurnInQuest(questId)`
4. Register with quest daemon
