# src/client/ - Browser Web Client

## Build System

esbuild bundles two separate entry points:
- `index.ts` → main client bundle (code-split ESM)
- `shared-websocket-worker.ts` → SharedWorker bundle (separate thread)

Build command: `npm run build:client`

## Core Files

- `index.ts` - Entry point, bootstraps client application
- `client.ts` - Main application orchestrator
- `websocket-client.ts` - WebSocket connection handler with reconnection logic. Re-exports shared protocol types.
- `shared-websocket-client.ts` - SharedWorker-based client (survives tab backgrounding). Falls back to regular WebSocketClient on browsers without SharedWorker.
- `shared-websocket-worker.ts` - SharedWorker thread. NOT subject to browser tab throttling.
- `protocol-parser.ts` - Parses `\x00[TYPE]<json>` messages into typed events.
- `terminal.ts` - ANSI parser and terminal renderer.
- `input-handler.ts` - Command input with alias expansion and macro recording.
- `launcher.ts` (~980 lines) - Login/registration UI.

## UI Panels

- `stats-panel.ts` - HP/MP/XP bars with delta compression (full snapshot on login, deltas between)
- `combat-panel.ts` - Combat target with portrait. Full update on target change, health-only updates per round (avoids resending large portrait).
- `map-panel.ts` - Map navigation with area_change/move/zoom messages
- `map-renderer.ts` - SVG terrain rendering with terrain colors and room states (explored/revealed/hinted/unknown)
- `quest-panel.ts` - Quest tracking with progress bars
- `comm-panel.ts` - Chat/tell/channel messages
- `equipment-panel.ts` - Worn items with tooltips
- `giphy-panel.ts` - Floating GIF display
- `clock-panel.ts` - Server time and latency
- `sky-panel.ts` - Day/night cycle visualization
- `sound-panel.ts` - Audio playback controls
- `debug-panel.ts` - Development debugging
- `reconnect-overlay.ts` - Reconnection progress display
- `ide-editor.ts` - Code editor for builders (CodeMirror)
- `world-map-modal.ts` - Full world map in modal

## Static Assets

- `sounds/` - Audio files (ambient, combat, NPC sounds)
- `images/` - UI image assets
- `styles.css` - Client stylesheet
- `index.html` - HTML shell

## Key Patterns

- Stats optimization: full snapshot on login, delta updates between (only changed fields)
- Combat optimization: full target update when combat starts, health-only per round
- SharedWorker: connection persists across tab backgrounding/throttling
- Reconnection: indefinite with exponential backoff up to 5 min max
- `failed` state reserved for auth rejection only

## Subdirectories

- `gui/` - Server-driven modal/form system
