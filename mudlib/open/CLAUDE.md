# mudlib/open/ - Shared NPC Behavior Templates

## behaviors/

Template classes for area builders to clone and customize:

- `tank.ts` - Defensive tank (high HP, armor focus, taunts)
- `healer.ts` - Support healer (healing spells, buffs)
- `melee_dps.ts` - Offensive melee damage dealer
- `ranged_dps.ts` - Ranged damage dealer (bows, magic)
- `wimpy.ts` - Weak/cowardly NPC behavior
- `index.ts` - Barrel export

Each template defines combat strategies, spell usage, stat priorities, and flee thresholds appropriate to the archetype.
