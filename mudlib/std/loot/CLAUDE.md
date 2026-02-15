# mudlib/std/loot/ - Random Loot Generation

## Files

- `types.ts` - Loot types, quality tiers, weapon/armor/bauble types, generated item data
- `generator.ts` - Random generation logic
- `quality.ts` - Quality tier definitions and probability
- `tables.ts` - Loot tables for different NPC types
- `abilities.ts` - Generated item abilities (on_hit, on_equip, on_use)

## Quality Tiers

common, uncommon, rare, epic, legendary, unique

## Generated Item Types

- **Weapons**: sword, longsword, dagger, axe, mace, bow, staff, etc. (one_handed, light, two_handed)
- **Armor**: helm, plate, chainmail, leather, gauntlets, boots, cloak, shield, etc.
- **Baubles**: ring, amulet, necklace, gem, trinket, charm, etc.

## Key Type: GeneratedItemData

Used for persistence. Includes: generatedType, seed (reproducibility), baseName, fullName, stats, abilities, affixes. Stored in player save data.

## Loot Daemon Integration

`LootDaemon` in `daemons/loot.ts` manages NPC loot config and calls generator on death. Items can be recreated from saved GeneratedItemData.
