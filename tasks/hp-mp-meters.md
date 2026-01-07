# HP/MP Meters Implementation Plan

## Overview
Add graphical HP/MP/XP meters to the client in a **right-side panel** (like the map panel) that updates automatically from the server on each heartbeat tick (every 2 seconds).

**Display:** HP bar, MP bar, XP bar, gold amount, and level

## Architecture

### Protocol Design
Similar to the existing MAP protocol (`\x00[MAP]`), create a STATS protocol:
- Prefix: `\x00[STATS]`
- JSON payload with player vitals

```typescript
interface StatsMessage {
  type: 'update';
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  xpToLevel: number;
  gold: number;
  bankedGold: number;
}
```

### Server-Side Changes

**1. Connection class (`src/network/connection.ts`)**
- Add `sendStats(message: StatsMessage)` method
- Similar to existing `sendMap()` method

**2. Player heartbeat (`mudlib/std/player.ts`)**
- Modify heartbeat to send stats via `sendStats()`
- Send on every tick (2 seconds) when connected
- Also send immediately when HP/MP changes significantly (combat, healing)

### Client-Side Changes

**1. WebSocket client (`src/client/websocket-client.ts`)**
- Add detection for `\x00[STATS]` prefix
- Emit `'stats-message'` event

**2. New StatsPanel (`src/client/stats-panel.ts`)**
- Create panel similar to MapPanel structure
- Render HP bar (red/yellow/green based on %)
- Render MP bar (blue gradient)
- Optional: XP bar, gold display, level

**3. HTML (`src/client/index.html`)**
- Add stats container in header or as separate panel

**4. CSS (`src/client/styles.css`)**
- Style HP/MP bars with gradients and animations
- Smooth transitions for bar changes

## Files to Modify

### Server
- `src/network/connection.ts` - Add sendStats() method
- `mudlib/std/player.ts` - Send stats on heartbeat

### Client
- `src/client/websocket-client.ts` - Parse STATS messages
- `src/client/client.ts` - Wire up StatsPanel
- `src/client/index.html` - Add container element
- `src/client/styles.css` - Bar styling

### New Files
- `src/client/stats-panel.ts` - Stats panel component

## UI Design: Right Panel

Layout the stats panel on the LEFT side (map is on right):
```
┌─────────────────────────────────────────────────────────┐
│  MudForge                              ● Connected      │
├──────────┬───────────────────────────────┬──────────────┤
│  STATS   │                               │     MAP      │
│          │        TERMINAL               │              │
│ Lv 5     │                               │   ┌───┐      │
│          │                               │   │ @ │      │
│ HP ████░ │                               │   └───┘      │
│ 80/100   │                               │              │
│          │                               │              │
│ MP ██░░░ │                               │              │
│ 40/100   │                               │              │
│          │                               │              │
│ XP █████ │                               │              │
│ 250/400  │                               │              │
│          │                               │              │
│ Gold     │                               │              │
│ 💰 156   │                               │              │
│ 🏦 500   │                               │              │
├──────────┴───────────────────────────────┴──────────────┤
│ > command input                                         │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

1. **Server: Add STATS protocol**
   - Add `sendStats()` to Connection class
   - Create StatsMessage interface in shared types

2. **Server: Player heartbeat updates**
   - Send stats on every heartbeat tick
   - Include HP, MP, XP, level, gold

3. **Client: Parse STATS messages**
   - Add `\x00[STATS]` detection to websocket-client.ts
   - Emit `'stats-message'` event

4. **Client: Create stats-panel.ts**
   - Panel structure similar to map-panel.ts
   - Render bars with CSS
   - Smooth transitions on updates

5. **Client: HTML/CSS**
   - Add `#stats-container` div in index.html
   - CSS for bars, colors, animations

6. **Client: Wire up in client.ts**
   - Create StatsPanel instance
   - Listen for stats-message events

## Visual Design

### HP Bar Colors
- `> 75%`: Green (`#22c55e`)
- `50-75%`: Yellow (`#eab308`)
- `25-50%`: Orange (`#f97316`)
- `< 25%`: Red (`#ef4444`) with pulse animation

### MP Bar Colors
- `> 50%`: Blue (`#3b82f6`)
- `≤ 50%`: Cyan (`#06b6d4`)

### XP Bar Colors
- Yellow/gold (`#eab308`)

### Bar Style
```css
.stat-bar {
  height: 16px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}
```
