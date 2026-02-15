# mudlib/std/combat/ - Combat Type Definitions

## Files

- `types.ts` - All combat-related types and interfaces
- `effects.ts` - Effect implementations
- `index.ts` - Re-exports

## Natural Attack Templates

Predefined: bite, claw, gore, sting, slam, peck, tail, fists
Each has: name, damageType, hitVerb, missVerb, damageBonus?, weight?

## Combat Stats (9 values)

toHit, toCritical, toBlock, toDodge, toParry, toRiposte, attackSpeed, damageBonus, armorBonus

Defaults: all 0 except toCritical=5, attackSpeed=1.0

## Attack Resolution

AttackResult includes: hit/miss/critical/blocked/dodged/parried/glancingBlow/riposteTriggered/circling flags, plus messages for attacker/defender/room (verbose and brief modes).

## Damage Types

slashing, piercing, bludgeoning, fire, ice, lightning, poison, holy, dark, physical

## Loot Types (in attacks)

LootEntry: {itemPath, chance (0-100), minQuantity?, maxQuantity?}
GoldDrop: {min, max}

## Effect Types

See `std/CLAUDE.md` for full effect type list. Key caps: stat_modifier=15, combat_modifier=40, DoT=50, resistance=75%, max stacks=5.
