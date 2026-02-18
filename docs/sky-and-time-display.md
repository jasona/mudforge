# Sky and Time Display

MudForge includes visual day/night cycle and time display panels that give players an ambient sense of the in-game world clock.

## Overview

Two client-side panels work together with the server's time daemon:

- **Sky Panel** - An animated SVG scene showing sun/moon arcs, gradient sky colors, and stars
- **Clock Panel** - A text display showing the current server time with fantasy period names

Both panels update from the `GAMETIME` protocol message sent on login and phase transitions.

## Sky Panel

The sky panel (`src/client/sky-panel.ts`) renders an animated day/night cycle as a collapsible SVG widget.

### Visual Elements

- **Sky gradient**: Smoothly interpolated background colors across 9 keyframes (hours 0, 5, 6, 7, 17, 18, 19, 20, 24)
- **Sun arc**: Visible hours 5-20, travels left-to-right in a semicircular path
- **Moon arc**: Visible hours 20-5 (next day), travels left-to-right
- **Stars**: 20 fixed-position stars that fade in at dusk (18-20), full opacity at night (20-5), and fade out at dawn (5-7)

### Gradient Keyframes

Each keyframe defines RGB colors for three sky zones (top, mid, horizon):

| Hour | Phase | Sky Character |
|------|-------|---------------|
| 0 | Night | Deep dark blue/black |
| 5 | Pre-dawn | Dark blue, horizon warming |
| 6 | Dawn | Orange-pink horizon glow |
| 7 | Morning | Brightening blue sky |
| 17 | Late afternoon | Warm sky tones |
| 18 | Dusk | Orange-red horizon |
| 19 | Twilight | Deep purple-blue |
| 20 | Night | Stars fully visible |
| 24 | Midnight | Same as hour 0 |

Colors interpolate smoothly between keyframes using linear RGB lerp.

### Update Loop

The sky panel runs a 1-second update tick that:

1. Interpolates the current game time from the last server sync using `cycleDurationMs`
2. Calculates sun/moon positions on their arcs
3. Updates the sky gradient colors
4. Adjusts star opacity
5. Updates the CSS phase class (`dawn`, `day`, `dusk`, `night`)

### Controls

- **Collapsible**: Click to expand/collapse the panel
- **Auto-hide**: Hidden when disconnected

## Clock Panel

The clock panel (`src/client/clock-panel.ts`) shows the current server time with fantasy-themed period names.

### Display Format

```
Morning  9:30 AM EST
```

The panel shows:
- Fantasy period name (color-coded)
- 12-hour formatted time with AM/PM
- Server timezone abbreviation

### Fantasy Period Names

| Hours | Period | Color |
|-------|--------|-------|
| 0 | Midnight | Blue |
| 1-4 | Night | Blue |
| 5-6 | Dawn | Yellow |
| 7-11 | Morning | Yellow |
| 12 | Midday | Yellow |
| 13-16 | Afternoon | Yellow |
| 17-18 | Dusk | Orange |
| 19-21 | Evening | Magenta |
| 22-23 | Night | Blue |

### Time Sync

The clock syncs with the server timestamp from `TIME` protocol messages (sent every 10 seconds). Between syncs, a local 1-second update loop keeps the display current.

## Time Daemon

The server-side time daemon (`mudlib/daemons/time.ts`) manages the in-game day/night cycle.

### Time Phases

| Phase | Hours | Light Modifier |
|-------|-------|----------------|
| Dawn | 5:00-7:00 | -20 |
| Day | 7:00-18:00 | 0 |
| Dusk | 18:00-20:00 | -20 |
| Night | 20:00-5:00 | -40 |

Light modifiers affect outdoor room visibility.

### Configuration

- `time.cycleDurationMinutes`: Real-time minutes for one full 24-hour game cycle (default: 60 minutes)
- Configurable via the `config` admin command or `efuns.setMudConfig()`

### Daemon API

```typescript
import { getTimeDaemon } from '../daemons/time.js';

const time = getTimeDaemon();

time.getGameTime();       // { hour: number, minute: number }
time.getPhase();          // 'dawn' | 'day' | 'dusk' | 'night'
time.isDaytime();         // boolean
time.isNighttime();       // boolean
time.getLightModifier();  // number (0, -20, or -40)
time.getCycleDurationMs(); // full cycle in milliseconds
time.isEnabled();         // whether time system is enabled
```

## GAMETIME Protocol Message

The `\x00[GAMETIME]` message is sent:

- On player login/reconnect
- On phase transitions (dawn, day, dusk, night)

### Payload

```typescript
{
  hour: number,           // 0-23
  minute: number,         // 0-59
  phase: 'dawn' | 'day' | 'dusk' | 'night',
  cycleDurationMs: number // for client-side interpolation
}
```

The client uses `cycleDurationMs` to smoothly interpolate the game time between server updates, keeping the sky animation fluid.

## Key Source Files

- `src/client/sky-panel.ts` - Sky panel UI (`SkyPanel` class)
- `src/client/clock-panel.ts` - Clock panel UI (`ClockPanel` class)
- `mudlib/daemons/time.ts` - Time daemon (server-side)

## Related Docs

- [Client](client.md) - Web client overview
- [Protocol Messages](client-gui-protocol-messages.md) - GAMETIME message details
- [Visibility](visibility.md) - Light modifiers and room visibility
