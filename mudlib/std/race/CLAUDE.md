# mudlib/std/race/ - Race System

## Files

- `types.ts` - Race types, latent abilities, appearance
- `definitions.ts` - All race definitions
- `abilities.ts` - Latent ability implementations
- `index.ts` - Re-exports

## Playable Races

human, elf, dwarf, orc, halfling, gnome, tiefling, dragonborn

## Race Components

- **Stat Bonuses** - All 7 stats, can be negative (e.g., orc: +3 STR, -2 INT)
- **Latent Abilities** - Auto-applied on login: nightVision, infravision, poisonResistance, magicResistance, fireResistance, coldResistance, naturalArmor, fastHealing, naturalStealth, keenSenses
- **Appearance** - skinTones, hairColors, eyeColors, distinctiveFeatures, heightRange (for portrait generation)
- **Guild Restrictions** - forbiddenGuilds list

## Key Types

- `RaceDefinition` - id, name, statBonuses, latentAbilities[], appearance, forbiddenGuilds?
- `LatentAbilityEffect` - ability, type (perception/resistance/combat/passive), magnitude
