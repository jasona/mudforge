# Map and Navigation

MudForge features an interactive map system that tracks player exploration and visualizes areas in the web client.

## Overview

The map system provides:
- **Visual Map**: Interactive area map in the client
- **Exploration Tracking**: Records which rooms you've visited
- **POI Markers**: Highlights important locations (shops, trainers, quest givers)
- **Multi-floor Support**: Handles areas with multiple levels
- **Persistent Progress**: Exploration state saved between sessions

## Map Commands

### Player Commands

| Command | Description |
|---------|-------------|
| `where` | Show your current area and region |
| `look` | See room description and exits |
| `go <direction>` | Move in a direction |

### Builder Commands

| Command | Description |
|---------|-------------|
| `whereami` | Show exact room path and coordinates |

## Exploration States

Rooms have four visibility states on your map:

### Explored

Rooms you have personally visited.
- Full room name displayed
- Terrain color shown
- All details visible

### Revealed

Rooms shown on your map but not yet visited (e.g., from treasure maps).
- Room appears on map
- Shows "???" instead of name
- Dimmed terrain color

### Hinted

Rooms connected to explored areas.
- Shows "?" marker
- Very dimmed appearance
- Indicates unexplored adjacent rooms

### Unknown

Rooms you haven't discovered at all.
- Not shown on map

## Coordinate System

Rooms use a 3D coordinate system:

```
X: East (+) / West (-)
Y: South (+) / North (-)
Z: Up (+) / Down (-)
```

Each room belongs to an area (e.g., `/areas/valdoria/forest`).

### Setting Coordinates (Builders)

```typescript
this.setMapCoordinates({
  x: 5,
  y: 3,
  z: 0,
  area: '/areas/valdoria/forest'
});
```

### Auto-Layout

If rooms don't have explicit coordinates, the system calculates them automatically using exit directions:
- North/south affects Y
- East/west affects X
- Up/down affects Z

## POI Markers

Points of Interest are marked with special icons:

| Marker | Meaning |
|--------|---------|
| `$` | Shop / Merchant |
| `!` | Quest Giver / Important NPC |
| `†` | Danger / Boss |
| `♦` | Treasure / Loot |
| `↑` | Stairs Up |
| `↓` | Stairs Down |
| `◊` | Portal / Teleporter |
| `⚑` | Landmark / Waypoint |
| `T` | Trainer |
| `♥` | Healing / Rest Area |

### Setting POI Markers (Builders)

```typescript
this.setMapIcon('$');  // Mark as shop
this.setMapIcon('!');  // Mark as quest giver
this.setMapIcon('T');  // Mark as trainer
```

## Zoom Levels

The map supports four zoom levels:

| Level | View | Cell Size |
|-------|------|-----------|
| 1 | World | 8px |
| 2 | Region | 12px |
| 3 | Local (default) | 20px |
| 4 | Detail | 32px |

At zoom level 4, room labels are visible.

## Terrain on Maps

Each terrain type has distinct visual properties:

| Terrain | Character | Color |
|---------|-----------|-------|
| Town | ▒ | Gray |
| Indoor | ░ | Tan |
| Road | ═ | Brown |
| Forest | ▓ | Green |
| Mountain | ▲ | Gray |
| Water | ≈ | Blue |
| Cave | █ | Dark Gray |
| Dungeon | █ | Dark Red |

See [Terrain](terrain.md) for the complete list.

## Map Updates

The map updates automatically when you:
- Enter a new room (room becomes explored)
- Move between rooms in the same area
- Change areas (full map refresh)
- Receive room reveals (treasure maps, etc.)

## Hidden Exits

Some exits may be hidden and require discovery:
- Use perception or search abilities
- Detected hidden exits are remembered
- Hidden exits show on map once detected

### Checking Hidden Exits (Code)

```typescript
player.hasDetectedHiddenExit('/path/to/room', 'north')
player.markHiddenExitDetected('/path/to/room', 'north')
```

## Area Information

### Area Properties

Areas have metadata affecting the map:

```typescript
interface AreaDefinition {
  name: string;           // Display name
  region: string;         // Region category
  subregion: string;      // Specific area
  defaultZoom: number;    // Initial zoom level (1-4)
  gridSize: {
    width: number;
    height: number;
    depth: number;        // Number of floors
  };
}
```

### Registering Areas (Code)

```typescript
mapDaemon.registerArea({
  id: '/areas/valdoria/forest',
  name: 'Eastern Forest',
  defaultZoom: 3,
  defaultZ: 0
});
```

## Client Map Protocol

The server sends map data to the client via these message types:

### Area Change

Sent when entering a new area:
```typescript
{
  type: 'area_change',
  area: { id: string, name: string },
  rooms: ClientRoomData[],
  current: string,
  zoom: number
}
```

### Move

Sent when moving within an area:
```typescript
{
  type: 'move',
  from: string,
  to: string,
  discovered?: ClientRoomData  // Only on first visit
}
```

### Reveal

Sent when rooms are revealed (treasure maps, etc.):
```typescript
{
  type: 'reveal',
  rooms: ClientRoomData[]
}
```

## Persistence

Exploration data is saved with your character:
- Explored rooms list
- Revealed rooms list
- Detected hidden exits

This data persists across sessions, so your map progress is never lost.

## Building Areas with Maps

### Room Setup

```typescript
import { Room } from '../../../lib/std.js';

export class ForestClearing extends Room {
  constructor() {
    super();
    this.shortDesc = 'A Forest Clearing';
    this.longDesc = 'Sunlight streams into this peaceful clearing...';

    // Set terrain (affects map color and gameplay)
    this.setTerrain('forest');

    // Set coordinates
    this.setMapCoordinates({
      x: 2,
      y: 2,
      z: 0,
      area: '/areas/valdoria/forest'
    });

    // Optional: Set POI marker
    this.setMapIcon('♥');  // Healing area

    // Set up exits
    this.addExit('north', '/areas/valdoria/forest/path');
    this.addExit('east', '/areas/valdoria/forest/stream');
  }
}
```

### Using the Area Builder

The Area Builder GUI (`areas gui`) provides visual tools for:
- Placing rooms on a grid
- Setting coordinates automatically
- Connecting rooms with exits
- Assigning terrain and POI markers

See [Area Builder](area-builder.md) for details.

## Tips

1. **Explore systematically**: The map shows hinted rooms adjacent to explored areas
2. **Watch for POI markers**: They highlight important locations
3. **Check terrain colors**: Different terrain affects movement and combat
4. **Use zoom**: Zoom out to see area layout, zoom in for details
5. **Return to corpse**: Your map remembers where you died
