# mudlib/items/ - Standalone Item Definitions

## Subdirectories

### quest/
Quest items used by the quest system:
- `sealed_letter.ts` - Non-droppable delivery quest item
- `wolf_pelt.ts` - Collection quest item

Pattern: extends Item, sets `dropable = false`, `savable = true`, adds multiple IDs for targeting.

### tools/
- `basic-tools.ts` - Factory functions for profession gathering tools:
  - `createPickaxe(tier)` - Mining
  - `createHerbalismKit(tier)` - Herbalism
  - `createFishingRod(tier)` - Fishing
  - `createLoggingAxe(tier)` - Woodcutting

Tier-based quality system with dynamic descriptions.
