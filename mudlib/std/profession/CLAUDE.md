# mudlib/std/profession/ - Crafting & Gathering System

## Files

- `types.ts` - All profession types and interfaces
- `definitions.ts` - Profession definitions
- `materials.ts` - Material definitions (ores, herbs, wood, etc.)
- `recipes.ts` - Crafting recipe definitions
- `tool.ts` - Tool item class (pickaxe, herbalism kit, etc.)
- `station.ts` - Crafting station class (forge, alchemy table, etc.)
- `resource-node.ts` - Gathering node class (ore vein, herb patch, etc.)
- `resource-nodes.ts` - Node type definitions
- `material-item.ts` - Material item class
- `index.ts` - Re-exports

## Profession Categories

- **Crafting**: alchemy, blacksmithing, woodworking, leatherworking, cooking, jeweling
- **Gathering**: mining, herbalism, logging, fishing, skinning
- **Movement**: swimming, climbing, flying

## Material Quality Tiers

poor, common, fine, superior, exceptional, legendary

## Key Types

- `ProfessionSkill` - professionId, level (1-100), experience, totalUses
- `RecipeDefinition` - ingredients[], toolRequired?, stationRequired?, craftTime, resultType
- `MaterialDefinition` - id, type, quality, tier (1-10), gatherProfession, stackable

## Skill-Gated Exits

Rooms can use `addSkillGatedExit(dir, dest, {profession, level, cost, failMessage, failDamage})` to require profession skills for passage (swimming, climbing, flying).
