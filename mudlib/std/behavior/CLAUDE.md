# mudlib/std/behavior/ - NPC Combat AI

## Files

- `types.ts` - Behavior config, combat context, action types
- `evaluator.ts` - AI evaluator that scores and selects actions
- `index.ts` - Re-exports

## Behavior Modes

- aggressive - risk-taker, never flees
- defensive - balanced, flees at 10% HP
- wimpy - coward, flees at 20% HP

## Combat Roles

- tank - mitigates damage, taunts
- healer - restores HP, buffs allies
- dps_melee - close-range damage
- dps_ranged - distance damage
- generic - fallback behavior

## BehaviorConfig

mode, role, guild?, wimpyThreshold (20), healSelfThreshold (50), healAllyThreshold (40), willTaunt, willHealAllies, willBuffAllies, willDebuffEnemies

## Action Selection

Evaluator scores candidates (0-100) based on:
- Self health/mana state
- Ally health (critical allies get priority healing)
- Available skills and cooldowns
- Role-appropriate actions
- Missing buffs on allies

Returns best-scoring ActionCandidate: {type, skillId?, targetId?, score, reason}
