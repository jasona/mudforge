# Mapping System Design

## Overview

Design and implement a visual mapping system for the MUD that leverages the web client's capabilities beyond traditional ASCII maps.

## Current State

- **Client**: Vanilla TypeScript, WebSocket communication, terminal emulator
- **Rooms**: Graph-based connections via string paths (e.g., `/areas/town/center`)
- **Exits**: Direction → destination mappings, no coordinates
- **Protocol**: Text-based messages, special `\x00[IDE]` prefix for structured data

## Goals

1. Players can see a visual map of explored areas
2. Map updates in real-time as player moves
3. Clickable navigation (click room to walk there)
4. Support for multi-level areas (Z axis)
5. Fog of war - only show visited rooms
6. Minimal impact on existing room/exit system
7. **Terrain-based rendering** - rooms displayed as colored blocks based on terrain type
8. **Zoom levels** - scale from world view to local detail
9. **Terrain affects gameplay** - movement speed, combat modifiers, environmental effects

---

## Design Decisions

### Data Architecture: Hybrid Graph + Coordinates

Use a **graph-first** approach with **optional coordinate hints**:

```typescript
// Room can optionally specify its map position
interface MapCoordinates {
  x: number;
  y: number;
  z?: number;        // Floor/level (default 0)
  area?: string;     // Area grouping for separate maps
}

// Stored on room as property
room.setProperty('mapCoords', { x: 5, y: 3, z: 0, area: 'town' });
```

**Why hybrid?**
- Doesn't force all rooms onto a grid
- Existing rooms work without modification
- Areas can gradually add coordinates
- Auto-layout algorithm for unpositioned rooms

### Client Architecture: Dedicated Map Panel

Add a **collapsible map panel** to the client UI:

```
┌─────────────────────────────────────────────────────┐
│ [Terminal Output]                      │ [MAP]      │
│                                        │            │
│ You are in the Town Square...          │   ┌─┐      │
│ Obvious exits: n, e, w, s              │ ┌─┤@├─┐    │
│                                        │ │ └─┘ │    │
│ > _                                    │ └─────┘    │
└─────────────────────────────────────────────────────┘
```

- SVG-based rendering for clean scaling
- Toggleable with keyboard shortcut (e.g., `Tab` or `M`)
- Resizable panel width
- Can be popped out to separate window

### Communication Protocol

Extend the special message protocol:

```typescript
// Server sends map updates
\x00[MAP]{"type":"update","data":{...}}

// Message types:
// - "update": Full map state for current area
// - "move": Player moved to new room
// - "discover": New room discovered
// - "area_change": Switched to different area map
```

---

## Terrain System

### Overview

Every room has a **terrain type** that determines:
1. How it appears on the map (colored block)
2. Gameplay effects (movement, combat, environment)
3. Thematic descriptions and ambient messages

### Terrain Types

| Terrain | Block | Color | Description |
|---------|-------|-------|-------------|
| `town` | `▒` | Light Gray | Settlements, buildings, safe zones |
| `indoor` | `░` | Tan/Beige | Inside buildings, dungeons |
| `road` | `═` | Brown | Paths and roads (fast travel) |
| `grassland` | `░` | Green | Open plains, meadows |
| `forest` | `▓` | Dark Green | Woods, reduced visibility |
| `dense_forest` | `█` | Darker Green | Thick woods, very limited visibility |
| `mountain` | `▲` | Gray/Brown | Rocky terrain, slow movement |
| `hills` | `∩` | Tan | Rolling hills, slightly slow |
| `water_shallow` | `≈` | Light Blue | Wadeable water, slow movement |
| `water_deep` | `≈` | Dark Blue | Requires swim or boat |
| `river` | `~` | Blue | Flowing water, may have current |
| `swamp` | `~` | Murky Green | Difficult terrain, poison risk |
| `desert` | `∙` | Yellow | Hot, thirst/fatigue mechanics |
| `snow` | `*` | White | Cold, slow movement |
| `ice` | `#` | Cyan | Slippery, very cold |
| `cave` | `█` | Dark Gray | Underground, needs light |
| `dungeon` | `█` | Dark Red | Dangerous underground |
| `void` | ` ` | Black | The void, special areas |

### Terrain Definition

```typescript
// mudlib/lib/terrain.ts
export type TerrainType =
  | 'town' | 'indoor' | 'road'
  | 'grassland' | 'forest' | 'dense_forest'
  | 'mountain' | 'hills'
  | 'water_shallow' | 'water_deep' | 'river'
  | 'swamp' | 'desert' | 'snow' | 'ice'
  | 'cave' | 'dungeon' | 'void';

export interface TerrainDefinition {
  id: TerrainType;
  name: string;
  block: string;              // ASCII character for map
  color: string;              // Hex color or color name
  colorDim: string;           // Dimmed version for unexplored

  // Gameplay effects
  movementCost: number;       // 1.0 = normal, 2.0 = half speed
  combatModifier: number;     // Multiplier for combat effectiveness
  visibilityRange: number;    // How far you can see (rooms)

  // Requirements
  requiresSwim?: boolean;     // Need swim ability
  requiresClimb?: boolean;    // Need climb ability
  requiresLight?: boolean;    // Need light source
  requiresBoat?: boolean;     // Need a boat

  // Environmental effects
  environmental?: {
    damage?: number;          // Periodic damage (heat, cold, poison)
    damageType?: string;      // Type of damage
    interval?: number;        // Seconds between damage ticks
    message?: string;         // Message when taking damage
  };

  // Ambient
  ambientMessages?: string[]; // Random atmospheric messages
}

// Example terrain definitions
export const TERRAINS: Record<TerrainType, TerrainDefinition> = {
  grassland: {
    id: 'grassland',
    name: 'Grassland',
    block: '░',
    color: '#4a7c23',
    colorDim: '#2d4d16',
    movementCost: 1.0,
    combatModifier: 1.0,
    visibilityRange: 5,
    ambientMessages: [
      'A gentle breeze rustles the grass.',
      'Insects buzz lazily in the warm air.',
      'The grass sways gently in the wind.',
    ],
  },

  forest: {
    id: 'forest',
    name: 'Forest',
    block: '▓',
    color: '#228b22',
    colorDim: '#145214',
    movementCost: 1.2,
    combatModifier: 0.9,  // Harder to fight in trees
    visibilityRange: 2,
    ambientMessages: [
      'Birds chirp in the canopy above.',
      'Leaves rustle as something moves nearby.',
      'Dappled sunlight filters through the branches.',
    ],
  },

  water_deep: {
    id: 'water_deep',
    name: 'Deep Water',
    block: '≈',
    color: '#1e90ff',
    colorDim: '#0f4880',
    movementCost: 3.0,
    combatModifier: 0.5,
    visibilityRange: 3,
    requiresSwim: true,
    requiresBoat: true,  // Or swim
    environmental: {
      damage: 5,
      damageType: 'drowning',
      interval: 10,
      message: 'You struggle to stay afloat!',
    },
  },

  cave: {
    id: 'cave',
    name: 'Cave',
    block: '█',
    color: '#404040',
    colorDim: '#202020',
    movementCost: 1.1,
    combatModifier: 0.95,
    visibilityRange: 1,
    requiresLight: true,
    ambientMessages: [
      'Water drips somewhere in the darkness.',
      'Your footsteps echo off the stone walls.',
      'A cold draft whispers through the cavern.',
    ],
  },
  // ... etc for all terrain types
};
```

### Setting Room Terrain

```typescript
// In room constructor
this.setTerrain('forest');

// Or with full map data
this.setMapData({
  terrain: 'forest',
  coords: { x: 5, y: 3 },
  area: 'darkwood',
});
```

### Gameplay Integration

```typescript
// Movement cost check (in go command or movement handler)
const terrain = room.getTerrain();
const terrainDef = TERRAINS[terrain];

// Check requirements
if (terrainDef.requiresSwim && !player.canSwim()) {
  player.receive("You can't swim! You need to learn or find a boat.");
  return false;
}

if (terrainDef.requiresLight && !player.hasLight()) {
  player.receive("It's too dark to see where you're going.");
  return false;
}

// Apply movement cost (for stamina/fatigue systems)
const moveCost = baseMoveCost * terrainDef.movementCost;

// Combat modifier applied in combat system
const combatEffectiveness = baseDamage * terrainDef.combatModifier;
```

---

## Zoom Levels

The map supports multiple zoom levels for different scales of exploration:

### Zoom Level Definitions

| Level | Name | Scale | Use Case |
|-------|------|-------|----------|
| 1 | World | 1 block = area/zone | Viewing entire world |
| 2 | Region | 1 block = 5x5 rooms | Viewing large area |
| 3 | Local | 1 block = 1 room | Default exploration |
| 4 | Detail | Larger blocks + labels | Indoor/dungeon detail |

### Visual Examples

**World View (Zoom 1)**
```
The Known World
░░░▓▓▓▓██░░░░░░░
░░▓▓▓▓████░░░░░░   ░ Plains
░▓▓▓▓████░░░░░░░   ▓ Forest
░░░░░▒▒░░░░░░░░░   █ Mountains
░░░≈≈▒@▒░░░░░░░░   ▒ Town (you are here)
░░≈≈≈≈≈≈≈░░░░░░░   ≈ Ocean
░░░≈≈≈≈≈≈≈░░░░░░
```

**Region View (Zoom 2)**
```
Northern Territory
▓▓▓▓▓▓▓███
▓▓▓▓▓▓████
▓▓▓░░░░███
░░░░▒▒░░██
░░░░▒@▒░░░
░░░░░░░░░░
```

**Local View (Zoom 3) - Default**
```
Town of Aldric
░░░░░░░░░░░
░░▒▒▒▒▒░░░░
░▒▒▒▒▒▒▒░░░
░▒▒▒@▒▒▒░░░   @ = You
░░▒▒$▒▒░░░░   $ = Shop
░░░▒!▒░░░░░   ! = Quest
░░░░═══░░░░   ═ = Road
```

**Detail View (Zoom 4)**
```
┌─────────────────────┐
│ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ │
│ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ │
│ ▒ ▒ ▒ @ ▒ ▒ ▒ ▒ ▒ │  Town Square
│ ▒ ▒ ▒ ▒ $ ▒ ▒ ▒ ▒ │  Blacksmith
│ ▒ ▒ ▒ ▒ ▒ ! ▒ ▒ ▒ │  Tavern
└─────────────────────┘
```

### Zoom Controls

- Mouse wheel to zoom in/out
- `+` / `-` keys
- Pinch gesture on touch devices
- `map zoom <level>` command
- Auto-zoom based on area type (dungeons default to detail view)

---

## Map Markers & Overlays

Markers are displayed on top of terrain blocks:

### Player & Entity Markers

| Marker | Meaning |
|--------|---------|
| `@` | Your current position |
| `A-Z` | Other players (first letter of name) |
| `*` | NPC / Monster |
| `?` | Unexplored room (known exit) |

### Point of Interest Markers

| Marker | Meaning |
|--------|---------|
| `$` | Shop / Merchant |
| `!` | Quest giver / Important NPC |
| `†` | Danger / Boss |
| `♦` | Treasure / Loot |
| `↑` | Stairs up |
| `↓` | Stairs down |
| `◊` | Portal / Teleporter |
| `⚑` | Landmark / Waypoint |
| `T` | Trainer |
| `♥` | Healing / Rest area |

### Room States

| Visual | State | Description |
|--------|-------|-------------|
| Full color | Explored | Player has visited |
| Dim color | Revealed | From treasure map, not visited |
| `?` on black | Hinted | Connected to explored, not visited |
| No display | Unknown | Never seen or connected |

---

## Data Structures

### Server-Side

```typescript
// MapDaemon - Central map registry
interface MapRegistry {
  // Area definitions
  areas: Map<string, AreaDefinition>;

  // Room coordinate cache
  roomCoords: Map<string, MapCoordinates>;

  // Player exploration data (per-player)
  explored: Map<string, Set<string>>; // playerName → room paths
}

interface AreaDefinition {
  name: string;
  id: string;
  defaultZ: number;
  bounds?: { minX, maxX, minY, maxY }; // For fixed-size areas
}

// Per-room map data (optional property)
interface RoomMapData {
  coords?: MapCoordinates;
  terrain: TerrainType;    // Required - determines block and color
  icon?: string;           // POI marker overlay ($, !, T, etc.)
  hidden?: boolean;        // Don't show on map (secret room)
  label?: string;          // Short label for detail view
}
```

### Client-Side

```typescript
interface MapState {
  currentArea: string;
  currentRoom: string;
  rooms: Map<string, ClientRoomData>;
  connections: MapConnection[];
  playerPosition: { x: number; y: number; z: number };
  viewLevel: number;       // Which Z level to display
}

interface ClientRoomData {
  path: string;
  name: string;
  x: number;
  y: number;
  z: number;
  terrain: TerrainType;    // Determines block character and color
  state: 'explored' | 'revealed' | 'hinted' | 'unknown';
  current: boolean;
  exits: string[];         // Direction names
  icon?: string;           // POI marker
}

interface MapConnection {
  from: string;            // Room path
  to: string;              // Room path
  direction: string;
  bidirectional: boolean;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Server)

**Files to create:**
- `mudlib/daemons/map.ts` - MapDaemon for registry and coordination
- `mudlib/lib/map-types.ts` - Shared type definitions
- `mudlib/lib/terrain.ts` - Terrain type definitions and gameplay effects

**Files to modify:**
- `mudlib/std/room.ts` - Add `setTerrain()`, `getTerrain()`, `getMapData()`, enforce euclidean exits
- `mudlib/std/player.ts` - Track explored rooms, revealed rooms
- `src/driver/efun-bridge.ts` - Expose map efuns

**Tasks:**
1. Create terrain type system with all terrain definitions
2. Add `setTerrain()` and `getTerrain()` to Room class
3. Create MapDaemon singleton
4. Add room coordinate property support
5. Track player exploration (which rooms visited)
6. Track player revealed rooms (from treasure maps)
7. Persist exploration data with player saves
8. Implement auto-reverse exit creation in `addExit()`
9. Add `addOneWayExit()` for portals/falls
10. Add euclidean coordinate validation
11. Integrate terrain movement costs into go command
12. Integrate terrain requirements (swim, light, etc.)

### Phase 2: Protocol (Server → Client)

**Files to modify:**
- `src/network/connection.ts` - Add `sendMap()` method
- `mudlib/std/player.ts` - Send map updates on movement

**Tasks:**
1. Define MAP message protocol
2. Send map update when player moves
3. Send area data when player enters new area
4. Include only explored rooms in updates

### Phase 3: Client Map Panel

**Files to create:**
- `src/client/map-panel.ts` - Map panel component
- `src/client/map-renderer.ts` - SVG rendering logic

**Files to modify:**
- `src/client/index.html` - Add map panel container
- `src/client/styles.css` - Map panel styling
- `src/client/client.ts` - Wire up map panel
- `src/client/websocket-client.ts` - Handle MAP messages

**Tasks:**
1. Create collapsible side panel
2. Parse MAP messages
3. Render terrain blocks (colored squares based on terrain type)
4. Apply terrain colors (full color = explored, dim = revealed, dark = hinted)
5. Overlay player marker `@` on current room
6. Overlay POI markers ($, !, T, etc.) on rooms
7. Implement zoom level switching (world → region → local → detail)
8. Show terrain legend

### Phase 4: Interactivity

**Tasks:**
1. Click room to auto-walk (pathfinding)
2. Hover for room name tooltip
3. Zoom and pan controls
4. Level selector for multi-Z areas
5. Keyboard toggle (Tab or M key)
6. Resize handle for panel width

### Phase 5: Polish & Features

**Files to create:**
- `mudlib/std/treasure-map.ts` - TreasureMap item class

**Tasks:**
1. Room icons (shop, trainer, danger, etc.)
2. Area-specific theming/colors
3. Mini-map mode (smaller, always visible)
4. Full-screen map mode
5. Player command: `map` to toggle, `map full` for full view
6. Builder commands: `setcoord`, `setarea`, `mapinfo`, `mapreset`
7. Builder command: `validatemap` to check euclidean consistency
8. TreasureMap item class - reveals rooms when read
9. Visual distinction for revealed vs explored vs hinted rooms

### Phase 6: Content

**Tasks:**
1. Add terrain types to all existing rooms
2. Add coordinates to existing town rooms
3. Create area definition for town
4. Document room positioning for builders
5. Document terrain types for builders
6. Add POI icons for special rooms (trainer, shop, etc.)
7. Create sample wilderness areas showcasing different terrains

---

## Room Positioning Strategy

### For Grid-like Areas (towns, dungeons)

Manually assign terrain, coordinates, and optional POI icons:

```typescript
// Town Center at origin
this.setTerrain('town');
this.setMapData({
  coords: { x: 0, y: 0, area: 'town' },
});

// Castle to the north
this.setTerrain('indoor');
this.setMapData({
  coords: { x: 0, y: -1, area: 'town' },
  icon: '!',  // Important location
});

// Tavern to the east
this.setTerrain('indoor');
this.setMapData({
  coords: { x: 1, y: 0, area: 'town' },
  icon: '♥',  // Rest/healing
});

// Training Hall
this.setTerrain('indoor');
this.setMapData({
  coords: { x: 1, y: -1, area: 'town' },
  icon: 'T',  // Trainer
});
```

### For Irregular Areas (caves, forests)

Use terrain with auto-layout:

```typescript
// Forest room - terrain determines visuals, auto-layout positions
this.setTerrain('forest');
this.setMapData({ area: 'darkwood' });

// Cave room with coordinates
this.setTerrain('cave');
this.setMapData({
  coords: { x: 3, y: 2, z: -1, area: 'mines' },
});
```

### Auto-Layout Algorithm

For rooms without explicit coordinates:
1. Start from a positioned room
2. BFS traverse exits
3. Assign coordinates based on direction:
   - north: y - 1
   - south: y + 1
   - east: x + 1
   - west: x - 1
   - northeast: x + 1, y - 1
   - etc.
4. Handle collisions by offsetting

---

## Wire Protocol Examples

### Player enters new area

```json
{
  "type": "area_change",
  "area": {
    "id": "town",
    "name": "Town of Aldric"
  },
  "rooms": [
    {
      "path": "/areas/town/center",
      "name": "Town Square",
      "x": 0, "y": 0, "z": 0,
      "terrain": "town",
      "state": "explored",
      "exits": ["n","e","w","s","ne"]
    },
    {
      "path": "/areas/town/castle",
      "name": "Castle Gates",
      "x": 0, "y": -1, "z": 0,
      "terrain": "indoor",
      "state": "explored",
      "exits": ["s"],
      "icon": "!"
    },
    {
      "path": "/areas/town/tavern",
      "name": "Tavern",
      "x": 1, "y": 0, "z": 0,
      "terrain": "indoor",
      "state": "hinted",
      "exits": ["w"],
      "icon": "♥"
    }
  ],
  "current": "/areas/town/center",
  "zoom": 3
}
```

### Player moves

```json
{
  "type": "move",
  "from": "/areas/town/center",
  "to": "/areas/town/tavern",
  "discovered": {
    "path": "/areas/town/tavern",
    "name": "The Foaming Flagon",
    "terrain": "indoor",
    "icon": "♥"
  }
}
```

### Zoom level change

```json
{
  "type": "zoom",
  "level": 2,
  "rooms": [...]
}
```

---

## Visual Design

### Terrain Block Rendering

Each room is a single colored block. The terrain type determines the block character and color:

```
Town of Aldric (Local View)
─────────────────────────────
░░░░░░░░░░░   LEGEND:
░░▒▒▒▒▒░░░░   ░ = grassland (green)
░▒▒▒!▒▒▒░░░   ▒ = town (gray)
░▒▒▒@▒▒▒░░░   @ = you are here
░░▒▒$▒T░░░░   $ = shop
░░░▒▒▒░░░░░   ! = quest
░░░░═══░░░░   T = trainer
░░░░░░░░░░░   ═ = road (brown)
```

### Room State Rendering

| State | Rendering | Description |
|-------|-----------|-------------|
| Explored | Full color terrain block | Player has visited |
| Revealed | Dim/faded terrain block | From treasure map |
| Hinted | `?` on dark background | Connected but not visited |
| Hidden | Dotted `?` | Secret exit detected |
| Unknown | Not rendered | Never seen |

```
Exploration States Example:
░░░▓▓▓???      ░▓ = explored (full color)
░░▓▓▓▓???      ? = hinted (you know it's there)
░▓▓@▓▓▓▓?      ░ = revealed (from map, dimmed)
░░▓▓▓▓▓░░
```

### Player & Marker Overlays

Markers are rendered ON TOP of terrain blocks:

```
░░░░░░░░░░░
░░▒▒▒▒▒░░░░
░▒A▒▒▒▒▒░░░   A = Player "Acer"
░▒▒▒@▒B▒░░░   @ = You
░░▒▒$▒▒░░░░   B = Player "Bob"
░░░▒!▒░░░░░   $ = Shop marker
░░░░═══░░░░   ! = Quest marker
```

### Zoom Level Visuals

**World (Zoom 1)** - Large areas as single blocks:
```
░░▓▓██░░
░▓▓▓██░░   Each block = entire zone
░░▒@▒░░░   Shows biome/region type
░≈≈≈≈░░░
```

**Region (Zoom 2)** - Clustered rooms:
```
░░░▓▓▓███
░░▓▓▓▓███   Each block = 5x5 room cluster
░▓▓░░░███   Shows dominant terrain
░░░▒@▒░██
```

**Local (Zoom 3)** - Individual rooms (default):
```
░░░░░░░░░░░
░░▒▒▒▒▒░░░░   Each block = 1 room
░▒▒▒@▒▒▒░░░   Full detail with markers
░░▒▒$▒▒░░░░
```

**Detail (Zoom 4)** - Large blocks with labels:
```
┌─────────────────────────┐
│ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ ▒ │
│     Town    @           │  Shows room names
│    Square               │  on hover or always
│ ▒ ▒ ▒ ▒ $ ▒ ▒ ▒ ▒ ▒ ▒ │
│        Shop             │
└─────────────────────────┘
```

---

## Commands

### Player Commands

| Command | Description |
|---------|-------------|
| `map` | Toggle map panel visibility |
| `map full` | Full-screen map view |
| `map mini` | Compact mini-map mode |
| `map zoom <1-4>` | Set zoom level (world/region/local/detail) |
| `map +` / `map -` | Zoom in / out |
| `map area` | Show current area name |
| `map legend` | Show terrain type legend |

### Builder Commands

| Command | Description |
|---------|-------------|
| `setterrain <type>` | Set current room's terrain type |
| `setcoord <x> <y> [z]` | Set current room's map coordinates |
| `setarea <area_id>` | Set current room's area grouping |
| `seticon <icon>` | Set current room's POI marker |
| `mapinfo` | Show current room's full map data |
| `mapreset` | Clear room's map data |
| `validatemap` | Check area for euclidean violations |
| `validatemap --fix` | Attempt to auto-fix violations |
| `terrains` | List all available terrain types |

---

## Future Enhancements

- **World map**: Zoomed out view showing areas as single nodes
- **Player markers**: See other players on map (optional)
- **Path highlighting**: Show route to destination
- **Map notes**: Player annotations on rooms
- **Procedural maps**: Generated dungeon instances
- **Map export**: Save/share maps as images
- **Mobile**: Touch-friendly map controls

---

## Finalized Design Decisions

### 1. Exploration Storage: Per-Player (Character)

Each character tracks their own explored rooms independently. Exploration data is saved with the player's JSON file.

```typescript
// In player save data
{
  "exploredRooms": [
    "/areas/town/center",
    "/areas/town/tavern",
    "/areas/town/market"
  ]
}
```

### 2. Map Sharing: Treasure Maps Only

Players cannot directly share or trade their exploration data. However, **treasure maps** are special items that can reveal unexplored areas:

```typescript
// Treasure map item reveals rooms when read
interface TreasureMap extends Item {
  revealsRooms: string[];      // Room paths to reveal on map
  revealsArea?: string;        // Or reveal entire area
  consumed: boolean;           // One-time use
}

// Usage: "read map" → marks rooms as "revealed" (different from "explored")
// Revealed rooms show on map with special indicator but player hasn't been there
```

**Map states for a room:**
- **Unknown**: Not on map at all
- **Hinted**: Connected to explored room (shown as `?`)
- **Revealed**: Shown via treasure map (shown with `~` border, name visible)
- **Explored**: Player has visited (full details)

### 3. Hidden Rooms: Mystery Indicator

Hidden exits/rooms appear as a visual hint that "something is here" without revealing details:

```
┌───┐
│ ? │  ← You can see an exit leads here, but haven't explored it
└───┘

┌╌╌╌┐
╎ ? ╎  ← Hidden exit detected (search skill, special item, etc.)
└╌╌╌┘
```

- Player knows a connection exists to an unexplored room
- Room name, exits, and contents hidden until visited
- Hidden exits (secret doors) show only if player has detected them
- Detection methods: `search` command, special items, high perception, etc.

### 4. Euclidean Geometry: Enforced

The world **must** follow euclidean spatial rules. If room A has an exit east to room B, then room B must have an exit west back to room A at the same coordinates.

**Enforcement:**
- `addExit()` automatically creates the reverse exit (unless explicitly one-way)
- Coordinate validation: exits must lead to spatially consistent locations
- Build-time warnings for violations
- Runtime check prevents saving invalid room configurations

```typescript
// When adding an exit, auto-create reverse
room.addExit('east', '/areas/town/tavern');
// Automatically creates: tavern.addExit('west', '/areas/town/center');

// For intentionally one-way exits (portals, falls, etc.)
room.addOneWayExit('down', '/areas/dungeon/pit');  // No reverse created
```

**Coordinate consistency rules:**
- North/South: same X, Y differs by 1
- East/West: same Y, X differs by 1
- Diagonals: both X and Y differ by 1
- Up/Down: same X and Y, Z differs by 1

**Builder command to validate:**
```
validatemap           - Check current area for euclidean violations
validatemap --fix     - Attempt to auto-fix minor violations
```

---

## Estimated Scope

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1: Foundation | Medium | None |
| Phase 2: Protocol | Small | Phase 1 |
| Phase 3: Client Panel | Large | Phase 2 |
| Phase 4: Interactivity | Medium | Phase 3 |
| Phase 5: Polish | Medium | Phase 4 |
| Phase 6: Content | Ongoing | Phase 1 |

**Recommended start**: Phase 1 + 2 together, then Phase 3 as the main effort.
