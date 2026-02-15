# mudlib/std/visibility/ - Visibility & Perception System

## Files

- `types.ts` - Visibility levels, light levels, perception types
- `index.ts` - Visibility checking functions

## Visibility Levels (Enum)

- NORMAL (0) - fully visible
- OBSCURED (10) - partial cover
- SNEAKING (30) - thief sneak (moving)
- HIDDEN (50) - thief hide (stationary)
- INVISIBLE (70) - mage invisibility
- STAFF_VANISHED (100) - staff-only visibility

## Light Levels (Enum)

- PITCH_BLACK (0), VERY_DARK (20), DIM (40)
- NORMAL (60) - default
- BRIGHT (80), BLINDING (100)

## Light Perception Bonuses

PITCH_BLACK: -20, VERY_DARK: -10, DIM: -5, NORMAL: 0, BRIGHT: +5, BLINDING: +10

## Perception Types

NORMAL (base wisdom), ALERT, DETECT_HIDDEN, SEE_INVISIBLE, STAFF_SIGHT

## Key Functions

- `canSee(viewer, target)` - full visibility check considering light, effects, staff hierarchy
- Rooms with low light require light sources for full visibility
- Staff hierarchy: higher rank can see lower rank's vanished state
