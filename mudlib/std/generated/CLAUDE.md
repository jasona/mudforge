# mudlib/std/generated/ - Random Loot Item Templates

## Files

- `weapon.ts` - Template for randomly generated weapons
- `armor.ts` - Template for randomly generated armor
- `bauble.ts` - Template for randomly generated baubles (rings, amulets, trinkets)

## Purpose

These classes serve as templates instantiated by the loot generation system (`std/loot/generator.ts`). The LootDaemon configures them with random stats, affixes, and abilities based on NPC level and quality tier.

## Persistence

Generated items are saved as `GeneratedItemData` in player save data, allowing recreation from seed values.
