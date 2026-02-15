# mudlib/std/guild/ - Guild System

## Files

- `types.ts` - Guild types, skill definitions, membership data
- `definitions.ts` (~998 lines) - All guild and skill definitions for fighter, mage, thief, cleric
- `guild-master.ts` - GuildMaster NPC class (handles join/leave/train interactions)
- `shadows/werewolf-shadow.ts` - Example shadow transformation

## Guild IDs

fighter, mage, thief, cleric

## Skill Types

combat, passive, utility, crafting, buff, debuff

## Skill ID Format

`<guild>:<skillname>` (e.g., `fighter:bash`, `cleric:heal`, `mage:fireball`)

## Key Types

- `GuildDefinition` - id, name, primaryStats, statRequirements, opposingGuilds, skillTree, allowedRaces, forbiddenRaces
- `SkillDefinition` - id, name, type, target, manaCost, cooldown, maxLevel (1-100), effect
- `PlayerGuildMembership` - guildId, guildLevel (1-20), guildXP
- `PlayerSkill` - skillId, level (1-100), xpInvested, usageXP
- `PlayerGuildData` - guilds[], skills[], cooldowns[]

## Guild-to-Role Mapping

fighter → tank, mage → dps_ranged, thief → dps_melee, cleric → healer

## Opposing Guilds

Some guilds cannot be joined together (e.g., opposing alignments). Check `opposingGuilds` in definition.
