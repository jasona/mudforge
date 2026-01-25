# Campfires

Campfires are craftable items that provide warmth and light, boosting healing when resting nearby.

## Overview

Campfires:
- Provide light in dark areas
- Boost healing when sitting or sleeping nearby
- Consume fuel over time
- Eventually burn out

## Using Campfires

### Light a Campfire

Campfires are typically created through the crafting system or found as items.

```
light campfire       # Light an unlit campfire
```

### Rest by the Fire

To benefit from the campfire's warmth:

```
sit                  # Sit down near the campfire
sleep                # Sleep near the campfire
```

The warmth bonus increases healing regeneration while resting.

### Add Fuel

```
add wood to campfire # Add fuel to extend burn time
fuel campfire        # Alternative syntax
```

### Extinguish

```
extinguish campfire  # Put out the fire
douse campfire       # Alternative syntax
```

## Fuel System

### Default Duration

- Full fuel: 30 minutes of burn time
- Low fuel warning: 5 minutes remaining

### Fuel Consumption

The campfire consumes fuel every 2 seconds while lit. When fuel runs out:
1. The fire dies down
2. Light source is removed
3. Warmth bonus ends

### Monitoring Fuel

```
look campfire        # Shows fuel status in description
```

The description indicates:
- "crackling merrily" - Plenty of fuel
- "burning low" - Running low on fuel
- "smoldering embers" - Nearly out
- "cold ashes" - Burned out

## Campfire Properties

| Property | Value |
|----------|-------|
| Light radius | 40 |
| Default fuel | 30 minutes |
| Low fuel warning | 5 minutes |
| Moveable | No |
| Takeable | No |

## Warmth Bonus

When resting (sitting or sleeping) near a lit campfire:
- Health regeneration increased
- Mana regeneration increased
- Environmental cold damage reduced

The bonus applies to all living beings in the same room.

## Creating Campfires (Builders)

### Basic Campfire

```typescript
import { Campfire } from '../../../std/campfire.js';

export class ForestCampfire extends Campfire {
  constructor() {
    super();
    // Campfire comes with default settings
  }
}
```

### Custom Fuel Duration

```typescript
export class LongBurningCampfire extends Campfire {
  constructor() {
    super();
    this.setMaxFuel(3600);  // 1 hour
    this.setFuel(3600);     // Start full
  }
}
```

### Pre-existing Campfire in Room

```typescript
// In room's onCreate method
const campfire = new Campfire();
await campfire.moveTo(this);
```

## Crafting

Campfires can typically be crafted with:
- Wood or logs
- Tinder (optional, reduces difficulty)
- Fire-starting tool (flint, matches)

See [Professions](professions.md) for crafting details.

## Tips

1. **Carry fuel**: Keep wood in your inventory for refueling
2. **Plan rest stops**: Build campfires before sleeping in wilderness
3. **Cave exploration**: Campfires provide light in dark caves
4. **Cold terrain**: Essential in snow and ice terrain to reduce cold damage
5. **Party camping**: One campfire benefits everyone in the room
