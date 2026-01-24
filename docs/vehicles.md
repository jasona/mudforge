# Vehicles

Vehicles are mobile rooms that can transport players between locations. They include boats, ferries, airships, and other conveyances. Players board vehicles and travel inside them as passengers.

## Overview

```
mudlib/std/
├── vehicle.ts     # Base Vehicle class (extends Room)
└── ferry.ts       # Automated Ferry class (extends Vehicle)

mudlib/daemons/
└── vehicle.ts     # Vehicle registry daemon

mudlib/cmds/player/
├── _board.ts      # Board a vehicle command
└── _disembark.ts  # Leave a vehicle command
```

## Core Concepts

### Vehicle as Room

Vehicles extend the `Room` class, meaning:
- Players "enter" vehicles - their `environment` becomes the Vehicle
- Vehicles have `inventory` containing passengers and cargo
- Vehicles can `broadcast()` announcements to all passengers
- Vehicles can have exits, items, and NPCs like any room

### Docking System

Vehicles track their world position via docking:
- `_currentLocation` - The room where the vehicle is currently docked
- `_docked` - Boolean indicating if passengers can board/disembark
- When docked, the vehicle appears in the dock room's inventory

### Terrain Integration

The `_go.ts` command checks `player.hasBoat()` for water terrain:
- Players aboard boat-type vehicles bypass `requiresSwim` terrain restrictions
- Allows sailing across deep water that would otherwise require swimming

## Vehicle Class

### Location

`/mudlib/std/vehicle.ts`

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `_currentLocation` | `Room \| null` | The room where vehicle is docked |
| `_docked` | `boolean` | Whether passengers can board/disembark |
| `_vehicleType` | `VehicleType` | Type: 'boat', 'ferry', 'airship', etc. |
| `_capacity` | `number` | Maximum passenger count |
| `_captain` | `Living \| null` | Who controls the vehicle (for player boats) |

### Getters

```typescript
vehicleType: VehicleType      // Get/set vehicle type
capacity: number              // Get/set passenger capacity
isDocked: boolean             // Check if docked
currentLocation: Room | null  // Get current dock location
captain: Living | null        // Get/set captain
passengerCount: number        // Current number of passengers
hasCapacity: boolean          // Check if room for more passengers
```

### Methods

#### Docking

```typescript
// Dock the vehicle at a room
async dock(room: Room): Promise<boolean>

// Undock from current location
async undock(): Promise<void>
```

#### Movement

```typescript
// Move vehicle to a new destination with announcements
async moveVehicle(
  destination: Room,
  options?: {
    departureMessage?: string;
    travelMessage?: string;
    arrivalMessage?: string;
  }
): Promise<boolean>
```

#### Passenger Management

```typescript
// Board a passenger onto the vehicle
async boardPassenger(who: Living): Promise<boolean>

// Disembark a passenger from the vehicle
async disembarkPassenger(who: Living): Promise<boolean>
```

### Example: Simple Boat

```typescript
import { Vehicle } from '../../../std/vehicle.js';

export class FishingBoat extends Vehicle {
  constructor() {
    super();
    this.shortDesc = 'a small fishing boat';
    this.longDesc = 'A weathered wooden boat with oars and fishing nets.';

    this.addId('boat');
    this.addId('fishing boat');

    this._vehicleType = 'boat';
    this._capacity = 4;
  }

  async onCreate(): Promise<void> {
    await super.onCreate();

    // Dock at the harbor on creation
    const harbor = await efuns.loadBlueprint('/areas/harbor/dock');
    if (harbor) {
      await this.dock(harbor);
    }
  }
}
```

## Ferry Class

Ferries are automated vehicles that follow scheduled routes between stops.

### Location

`/mudlib/std/ferry.ts`

### State Machine

```
┌────────┐
│ DOCKED │◄─────────────────────────────┐
└────┬───┘                              │
     │ (warnings at configured times)   │
     ▼                                  │
┌───────────┐                           │
│ DEPARTING │                           │
└─────┬─────┘                           │
      │ (undock, start travel)          │
      ▼                                 │
┌───────────┐                           │
│ TRAVELING │                           │
└─────┬─────┘                           │
      │ (ambient messages during trip)  │
      ▼                                 │
┌───────────┐                           │
│ ARRIVING  │───────────────────────────┘
└───────────┘  (dock at next stop)
```

### FerryStop Interface

```typescript
interface FerryStop {
  roomPath: string;  // Path to the dock room
  name: string;      // Display name for announcements
}
```

### FerrySchedule Interface

```typescript
interface FerrySchedule {
  travelTime: number;     // Time between stops (milliseconds)
  dockTime: number;       // Time at each stop (milliseconds)
  warningTimes: number[]; // Warnings before departure (ms before departure)
}
```

### Configuration Methods

```typescript
// Set the ferry route (minimum 2 stops)
setRoute(stops: FerryStop[]): void

// Set the schedule timing
setSchedule(schedule: Partial<FerrySchedule>): void
```

### Schedule Control

```typescript
// Start the automated schedule
async startSchedule(): Promise<void>

// Stop the automated schedule
stopSchedule(): void
```

### Default Announcements

**Departure Warnings:**
- 5 minutes: "The ferry will depart in 5 minutes."
- 1 minute: "The ferry will depart in 1 minute."
- 10 seconds: "The ferry is departing in 10 seconds!"

**Departing:**
- "The ferry lurches as it pulls away from the dock."
- "You feel the vessel begin to move."

**Traveling (ambient):**
- "The ferry rocks gently as it crosses the water."
- "Seagulls circle overhead as you travel."
- "Waves lap against the hull."

**Arriving:**
- "The ferry slows as land comes into view."
- "The ferry has arrived at {stopName}. You may now disembark."

### Example: Scheduled Ferry

```typescript
import { Ferry, type FerryStop } from '../../../std/ferry.js';

export class HarborFerry extends Ferry {
  constructor() {
    super();
    this.shortDesc = 'The Sea Sprite';
    this.longDesc = 'A comfortable passenger ferry with bench seating.';

    this.addId('ferry');
    this.addId('sea sprite');

    this._vehicleType = 'ferry';
    this._capacity = 20;

    // Define the route
    this.setRoute([
      { roomPath: '/areas/mainland/harbor', name: 'Mainland Harbor' },
      { roomPath: '/areas/island/dock', name: 'Tropical Island' },
    ]);

    // Configure timing
    this.setSchedule({
      travelTime: 120000,           // 2 minutes travel
      dockTime: 300000,             // 5 minutes at dock
      warningTimes: [60000, 10000], // 1 min, 10 sec warnings
    });
  }

  async onCreate(): Promise<void> {
    await super.onCreate();
    await this.startSchedule();
  }
}
```

## Vehicle Daemon

The vehicle daemon maintains a registry of all active vehicles.

### Location

`/mudlib/daemons/vehicle.ts`

### Methods

```typescript
// Register a vehicle
registerVehicle(vehicle: Vehicle): void

// Unregister a vehicle
unregisterVehicle(vehicle: Vehicle): void

// Find vehicle by name (partial match)
findVehicleByName(name: string): Vehicle | null

// Get all vehicles at a location
getVehiclesAtLocation(room: Room): Vehicle[]

// Get all registered vehicles
getAllVehicles(): Vehicle[]

// Get vehicles of a specific type
getVehiclesByType(type: string): Vehicle[]

// Get count of registered vehicles
vehicleCount: number
```

### Usage

```typescript
import { getVehicleDaemon } from '../daemons/vehicle.js';

const daemon = getVehicleDaemon();

// Find a ferry
const ferry = daemon.findVehicleByName('dawn treader');

// Get all boats at harbor
const harbor = efuns.findObject('/areas/harbor/dock');
const dockedBoats = daemon.getVehiclesAtLocation(harbor);

// Get all ferries in the game
const ferries = daemon.getVehiclesByType('ferry');
```

## Player Commands

### Board Command

**Usage:** `board <vehicle>`

Boards a docked vehicle in the current room.

**Checks:**
- Vehicle must be in the room
- Vehicle must be docked
- Vehicle must have capacity

**Example:**
```
> board ferry
You board The Dawn Treader.

The Dawn Treader
You are aboard The Dawn Treader, a sturdy wooden ferry...

Currently docked at: Valdoria Harbor
Passengers: 1/20
```

### Disembark Command

**Usage:** `disembark` (aliases: `leave`, `exit`)

Leaves the vehicle you're currently on.

**Checks:**
- Player must be on a vehicle
- Vehicle must be docked

**Example:**
```
> disembark
You disembark from The Dawn Treader.

Valdoria Harbor
You stand on a weathered wooden dock...
```

## Player.hasBoat()

The `hasBoat()` method on Player enables terrain bypass.

### Location

`/mudlib/std/player.ts`

### Implementation

```typescript
hasBoat(): boolean {
  if (this.environment && 'vehicleType' in this.environment) {
    const vehicle = this.environment as { vehicleType?: string };
    const vehicleType = vehicle.vehicleType;
    return vehicleType === 'boat' || vehicleType === 'ferry' || vehicleType === 'ship';
  }
  return false;
}
```

### Terrain Integration

In `_go.ts`, water terrain checks this method:

```typescript
if (terrainDef.requiresSwim) {
  const canSwim = player.canSwim?.() ?? false;
  const hasBoat = player.hasBoat?.() ?? false;
  if (!canSwim && !hasBoat) {
    ctx.sendLine("You can't enter that water - you need to swim or have a boat.");
    return false;
  }
}
```

## Creating a Vehicle Area

### Step 1: Create Dock Rooms

```typescript
// /areas/myarea/harbor/dock.ts
import { Room } from '../../../lib/std.js';

export class HarborDock extends Room {
  constructor() {
    super();
    this.shortDesc = 'Harbor Dock';
    this.longDesc = 'A wooden dock extends into the water...';
    this.setTerrain('town');

    this.addExit('north', '/areas/myarea/town/center');
  }
}
```

### Step 2: Create the Vehicle

```typescript
// /areas/myarea/harbor/ferry.ts
import { Ferry } from '../../../std/ferry.js';

export class MyFerry extends Ferry {
  constructor() {
    super();
    this.shortDesc = 'The Wave Runner';
    this.longDesc = 'A sleek ferry built for speed.';

    this.addId('ferry');
    this.addId('wave runner');

    this._capacity = 15;

    this.setRoute([
      { roomPath: '/areas/myarea/harbor/dock', name: 'My Harbor' },
      { roomPath: '/areas/destination/dock', name: 'Destination Port' },
    ]);

    this.setSchedule({
      travelTime: 60000,  // 1 minute
      dockTime: 180000,   // 3 minutes
      warningTimes: [30000, 10000],
    });
  }

  async onCreate(): Promise<void> {
    await super.onCreate();
    await this.startSchedule();
  }
}
```

### Step 3: Spawn the Vehicle

The ferry should be loaded when the area initializes. This can be done in the dock room:

```typescript
async onCreate(): Promise<void> {
  await super.onCreate();

  // Load the ferry (it will dock here automatically)
  await efuns.loadBlueprint('/areas/myarea/harbor/ferry');
}
```

Or in a master area controller.

## Advanced Topics

### Player-Controlled Boats

For boats that players can pilot:

```typescript
class PlayerBoat extends Vehicle {
  async sail(captain: Living, direction: string): Promise<boolean> {
    if (this._captain !== captain) {
      return false; // Not the captain
    }

    if (!this._docked) {
      return false; // Already moving
    }

    // Find destination based on direction and current location
    const destination = await this.findDestination(direction);
    if (!destination) {
      return false;
    }

    await this.moveVehicle(destination, {
      departureMessage: 'The boat sets sail!',
      arrivalMessage: 'The boat reaches its destination.',
    });

    return true;
  }
}
```

### Multi-Stop Routes

Ferries automatically reverse direction at route endpoints:

```typescript
// Route: A -> B -> C -> B -> A -> B -> ...
this.setRoute([
  { roomPath: '/areas/port_a/dock', name: 'Port A' },
  { roomPath: '/areas/port_b/dock', name: 'Port B' },
  { roomPath: '/areas/port_c/dock', name: 'Port C' },
]);
```

### Custom Announcements

Override ferry methods for custom messages:

```typescript
class CustomFerry extends Ferry {
  private sendWarning(index: number): void {
    const warningTime = this._warningTimes[index];
    let message: string;

    switch (warningTime) {
      case 60000:
        message = 'A bell rings - one minute to departure!';
        break;
      case 10000:
        message = 'The captain shouts: "All aboard! Last call!"';
        break;
      default:
        message = 'The ferry will depart soon.';
    }

    this.broadcast(message);
  }
}
```

### Vehicle Types

The `vehicleType` property affects terrain bypass:

| Type | Bypasses Water | Notes |
|------|---------------|-------|
| `boat` | Yes | Small watercraft |
| `ferry` | Yes | Passenger transport |
| `ship` | Yes | Large vessels |
| `airship` | No* | Flying vehicles |
| `cart` | No | Land transport |

*Airships could bypass mountain terrain with additional implementation.

## Debugging

### Check Vehicle Status

```typescript
const ferry = daemon.findVehicleByName('dawn treader');
console.log('Docked:', ferry.isDocked);
console.log('Location:', ferry.currentLocation?.shortDesc);
console.log('Passengers:', ferry.passengerCount);
console.log('State:', ferry.state);
```

### Common Issues

**Ferry not starting:**
- Ensure route has at least 2 stops
- Check that dock rooms can be loaded
- Verify `startSchedule()` is called in `onCreate()`

**Players can't board:**
- Vehicle must be docked (`isDocked === true`)
- Vehicle must be in the room's inventory
- Vehicle must have capacity

**Terrain bypass not working:**
- Check `vehicleType` is 'boat', 'ferry', or 'ship'
- Ensure player's `environment` is the vehicle
- Verify terrain has `requiresSwim: true`
