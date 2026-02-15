# mudlib/areas/ - Game World Content

## Directory Structure

```
areas/
├── void/              - Starting nexus room
├── tutorial/          - New player tutorial (7 files)
│   └── items/         - Tutorial-specific items
├── valdoria/          - Main game world
│   ├── aldric/        - Town hub (~31 rooms + NPCs)
│   │   └── items/     - Town equipment/consumables
│   ├── aldric_depths/ - Castle dungeon (dark rooms)
│   ├── forest/        - Southern forest (~20 rooms)
│   ├── harbor/        - Harbor area
│   └── west_road/     - Western caravan route
├── guilds/            - Guild halls (2 files each)
│   ├── fighter/, cleric/, mage/, thief/
├── isle_of_dreams/    - Dream realm (2 rooms)
└── examples/behavior/ - NPC behavior examples
```

## Room File Pattern

```typescript
import { Room } from '../../lib/std.js';

export class MyRoom extends Room {
  constructor() {
    super();
    this.shortDesc = 'Room Name';
    this.longDesc = `Description with {bold}color{/} tags.`;
    this.setMapCoordinates({ x: 5, y: 3, z: 0, area: '/areas/valdoria/aldric' });
    this.setTerrain('town');  // town, forest, dungeon, grassland, etc.
    this.mapIcon = '*';
    this.setupRoom();
  }

  private setupRoom(): void {
    this.addExit('north', '/areas/valdoria/aldric/room_5_2_0');
    this.setNpcs(['/areas/valdoria/aldric/blacksmith']);
    this.setItems(['/areas/valdoria/aldric/items/iron_sword']);
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();
    await this.spawnMissingNpcs();
    await this.spawnMissingItems();
  }
}
export default MyRoom;
```

## NPC File Pattern

```typescript
import { NPC } from '../../lib/std.js';

export class MyNPC extends NPC {
  constructor() {
    super();
    this.setNPC({
      name: 'npc name', shortDesc: 'a guard', longDesc: 'Description.',
      gender: 'male', respawnTime: 150, chatChance: 12,
    });
    this.name = 'Guard';  // MUST set name explicitly
    this.setLevel(5, 'normal');
    this.addChat('patrols the area.', 'emote');
    this.addResponse(/hello/i, 'Greetings, citizen!', 'say');
  }
}
export default MyNPC;
```

## Naming Conventions

- Rooms: descriptive (`tavern.ts`) or coordinate-based (`room_5_3_0.ts`)
- NPCs: descriptive (`blacksmith.ts`, `town_crier.ts`)
- Items: descriptive (`iron_sword.ts`, `healing_potion.ts`)

## Map Coordinates

- `{ x, y, z, area }` - y decreases going north, z decreases going down
- Keep consistent within an area

## Exit Types

- `addExit(dir, dest)` - bidirectional (auto-adds reverse)
- `addOneWayExit(dir, dest)` - no reverse
- `addConditionalExit(dir, dest, canPass)` - gated by function
- `addSkillGatedExit(dir, dest, config)` - requires profession skill

## Terrain Types

town, indoor, road, grassland, forest, dense_forest, mountain, hills, water_shallow, water_deep, river, swamp, desert, snow, ice, cave, dungeon, void

## Dark Rooms (Dungeons)

```typescript
import { LightLevel } from '../../std/visibility/types.js';
this.lightLevel = LightLevel.PITCH_BLACK;  // or VERY_DARK, DARK, etc.
```

## Important: NPC Name vs ShortDesc

Setting `this.shortDesc` does NOT update `this.name`. NPCs MUST explicitly call `this.name = '...'` for proper identification. The name auto-generates IDs for targeting.
