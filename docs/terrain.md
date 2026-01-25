# Terrain System

The Terrain System defines environmental types that affect gameplay mechanics including movement speed, combat effectiveness, visibility range, and environmental hazards.

## Overview

Each room has a terrain type set via `setTerrain()`. Terrain affects:
- **Movement Cost**: How quickly players traverse the area
- **Combat Modifier**: Effectiveness in combat
- **Visibility Range**: How far players can see
- **Requirements**: Skills or items needed to enter
- **Environmental Effects**: Periodic damage from hazards

## Terrain Types

### Urban Terrain

| Type | Movement | Combat | Visibility | Notes |
|------|----------|--------|------------|-------|
| `town` | 1.0x | 1.0x | 5 rooms | Urban settlements |
| `indoor` | 1.0x | 1.0x | 3 rooms | Buildings, interiors |
| `road` | **0.8x** | 1.0x | 6 rooms | Faster travel |

### Natural Terrain

| Type | Movement | Combat | Visibility | Notes |
|------|----------|--------|------------|-------|
| `grassland` | 1.0x | 1.0x | 5 rooms | Open plains |
| `forest` | 1.2x | 0.9x | 2 rooms | Light woods |
| `dense_forest` | 1.5x | 0.8x | 1 room | Thick canopy |
| `hills` | 1.3x | 0.95x | 4 rooms | Rolling terrain |
| `mountain` | 2.0x | 0.85x | **8 rooms** | Requires climb |
| `desert` | 1.4x | 0.9x | 7 rooms | Heat hazard |

### Water Terrain

| Type | Movement | Combat | Visibility | Notes |
|------|----------|--------|------------|-------|
| `water_shallow` | 1.5x | 0.8x | 4 rooms | Wading depth |
| `water_deep` | 3.0x | 0.5x | 3 rooms | Requires swim/boat, drowning |
| `river` | 2.0x | 0.7x | 4 rooms | Requires swim |

### Hazardous Terrain

| Type | Movement | Combat | Visibility | Notes |
|------|----------|--------|------------|-------|
| `swamp` | 1.8x | 0.75x | 2 rooms | Poison damage |
| `snow` | 1.6x | 0.85x | 4 rooms | Cold damage |
| `ice` | 1.3x | 0.7x | 5 rooms | Cold damage, slippery |

### Underground Terrain

| Type | Movement | Combat | Visibility | Notes |
|------|----------|--------|------------|-------|
| `cave` | 1.1x | 0.95x | 1 room | Requires light |
| `dungeon` | 1.0x | 1.0x | 2 rooms | Requires light |

### Special

| Type | Movement | Combat | Visibility | Notes |
|------|----------|--------|------------|-------|
| `void` | 1.0x | 1.0x | 0 rooms | Empty space |

## Movement Costs

Movement cost affects travel speed. Lower values mean faster travel.

**Fastest:**
- Road (0.8x) - Well-maintained paths

**Normal:**
- Town, Indoor, Grassland, Dungeon (1.0x)

**Slow:**
- Cave (1.1x), Forest (1.2x), Hills (1.3x), Ice (1.3x), Desert (1.4x)

**Very Slow:**
- Dense Forest (1.5x), Water Shallow (1.5x), Snow (1.6x), Swamp (1.8x)

**Extremely Slow:**
- Mountain (2.0x), River (2.0x), Water Deep (3.0x)

## Combat Modifiers

Combat modifiers affect damage dealt and combat effectiveness.

**No Penalty:**
- Town, Indoor, Road, Grassland, Dungeon (1.0x)

**Minor Penalty:**
- Hills (0.95x), Cave (0.95x), Forest (0.9x), Desert (0.9x)

**Moderate Penalty:**
- Mountain (0.85x), Snow (0.85x), Dense Forest (0.8x), Water Shallow (0.8x)

**Severe Penalty:**
- Swamp (0.75x), River (0.7x), Ice (0.7x)

**Extreme Penalty:**
- Water Deep (0.5x) - Combat nearly impossible

## Visibility Range

How far players can perceive other entities.

**Excellent (6-8 rooms):**
- Mountain (8) - Height advantage
- Road (6), Desert (7) - Open terrain

**Good (5 rooms):**
- Town, Grassland, Ice

**Normal (4 rooms):**
- River, Water Shallow, Hills, Snow

**Limited (3 rooms):**
- Indoor, Water Deep

**Poor (2 rooms):**
- Forest, Swamp, Dungeon

**Very Poor (1 room):**
- Dense Forest, Cave

**None (0 rooms):**
- Void

## Terrain Requirements

Some terrains require specific abilities or items to enter.

### Swimming Requirement

**Terrains:** `water_deep`, `river`

Players must have swimming skill OR a boat to enter. Without either:
```
You can't enter that water - you need to know how to swim or have a boat.
```

### Climbing Requirement

**Terrain:** `mountain`

Players must have climbing skill or equipment:
```
The terrain is too steep - you need climbing equipment or skill.
```

### Light Requirement

**Terrains:** `cave`, `dungeon`

A light source is recommended (warning, non-blocking):
```
It's very dark ahead. You may want a light source.
```

### Boat Requirement

**Terrain:** `water_deep`

Can substitute for swimming requirement.

## Environmental Effects

Some terrains deal periodic damage to occupants.

### Drowning (Water Deep)

- **Damage:** 5 per tick
- **Interval:** 10 seconds
- **Message:** "You struggle to stay afloat!"
- **Bypass:** Swimming skill or boat

### Poison (Swamp)

- **Damage:** 2 per tick
- **Interval:** 30 seconds
- **Message:** "The swamp air burns your lungs."
- **Bypass:** None

### Heat (Desert)

- **Damage:** 3 per tick
- **Interval:** 60 seconds
- **Message:** "The scorching sun saps your strength."
- **Bypass:** None

### Cold (Snow)

- **Damage:** 2 per tick
- **Interval:** 45 seconds
- **Message:** "The bitter cold seeps into your bones."
- **Bypass:** None

### Intense Cold (Ice)

- **Damage:** 3 per tick
- **Interval:** 30 seconds
- **Message:** "The intense cold bites at exposed skin."
- **Bypass:** None

## Map Visualization

Each terrain has distinct visual properties for the map.

| Terrain | Character | Color | Dim Color |
|---------|-----------|-------|-----------|
| town | ▒ | #a0a0a0 | #505050 |
| indoor | ░ | #c4a882 | #625441 |
| road | ═ | #8b7355 | #453a2b |
| grassland | ░ | #4a7c23 | #2d4d16 |
| forest | ▓ | #228b22 | #145214 |
| dense_forest | █ | #006400 | #003200 |
| mountain | ▲ | #696969 | #353535 |
| hills | ∩ | #9b8b6e | #4e4637 |
| water_shallow | ≈ | #87ceeb | #446676 |
| water_deep | ≈ | #1e90ff | #0f4880 |
| river | ~ | #4169e1 | #213471 |
| swamp | ~ | #556b2f | #2b3618 |
| desert | ∙ | #edc967 | #776534 |
| snow | * | #fffafa | #808080 |
| ice | # | #b0e0e6 | #586f73 |
| cave | █ | #404040 | #202020 |
| dungeon | █ | #8b0000 | #460000 |
| void | (space) | #000000 | #000000 |

- **Color**: Used for explored rooms
- **Dim Color**: Used for revealed but unexplored rooms

## Ambient Messages

Each terrain has atmospheric flavor text that can be displayed periodically.

**Town:**
- "The bustle of town life surrounds you."
- "Merchants call out their wares in the distance."
- "A cart rumbles past on the cobblestones."

**Forest:**
- "Birds chirp in the canopy above."
- "Leaves rustle as something moves nearby."
- "Dappled sunlight filters through the branches."

**Cave:**
- "Water drips somewhere in the darkness."
- "Your footsteps echo off the stone walls."
- "A cold draft whispers through the cavern."

**Mountain:**
- "The wind howls around the rocky peaks."
- "Loose stones clatter underfoot."
- "The air is thin and cold."

**Desert:**
- "Heat shimmers off the endless sand."
- "A hot wind blows across the dunes."
- "Your mouth feels parched."

**Swamp:**
- "Bubbles rise from the murky water."
- "Something slithers through the reeds."
- "Mosquitoes buzz incessantly."

## Usage in Code

### Setting Terrain

```typescript
// In a room constructor
this.setTerrain('forest');
```

### Getting Terrain

```typescript
const terrain = room.getTerrain();
const definition = room.getTerrainDefinition();
```

### Checking Valid Terrain

```typescript
import { isValidTerrain } from '../lib/terrain.js';

if (isValidTerrain(userInput)) {
  room.setTerrain(userInput);
}
```

### Getting All Terrain Types

```typescript
import { getAllTerrainTypes } from '../lib/terrain.js';

const types = getAllTerrainTypes();
// ['town', 'indoor', 'road', 'grassland', ...]
```

## Integration Points

### Movement Command

The `go` command checks terrain requirements:
- Validates swimming for water terrain
- Validates climbing for mountain terrain
- Warns about light for cave/dungeon terrain

### Profession System

- Swimming skill gates water terrain
- Climbing skill gates mountain terrain
- Fishing requires water terrain
- Mining may have terrain restrictions

### Area Builder

- Terrain selection dropdown in room editor
- Validation ensures terrain is set on all rooms
- Code generation includes `setTerrain()` calls

### Map System

- Terrain type included in room data
- Map uses terrain character and color
- POI markers overlay terrain display
