# Server -> Client GUI Message Reference

This document catalogs protocol messages the server sends to update the browser client UI.
It focuses on message type, trigger source, cadence/frequency, payload syntax, and transport constraints.

## Transport And Framing

- Framing: protocol lines are sent as `\x00[TYPE]{json}` (or `\x00[TIME_PONG]{timestamp}` for non-JSON).
- Parser registry: `src/client/protocol-parser.ts`.
- Main sender methods: `src/network/connection.ts` (`sendMap`, `sendStats`, `sendGUI`, etc.).
- General protocol send path: `Connection.sendProtocolMessage()`.

### Buffer/Backpressure Rules (Important)

- Warning threshold: `64KB` (`BACKPRESSURE_THRESHOLD`).
- Protocol drop threshold: if socket buffer > `256KB`, protocol messages are skipped (`MAX_BUFFER_SIZE`).
- Hard protocol frame cap: `512KB` (`MAX_PROTOCOL_MESSAGE_SIZE`) - oversized frames are dropped and logged.
- Critical buffer threshold: `1MB` (`CRITICAL_BUFFER_SIZE`) marks connection as critically backpressured.
- Hidden-tab filtering: when tab is hidden, only `COMM` and `TIME` protocol messages are sent; all others are skipped.
- Hidden-tab queueing: raw `send()` traffic is queued and drained when tab becomes visible.

## Message Matrix

| Protocol Prefix | Payload Type | Client Event | Primary UI Target | Fired By / Source | Cadence / Frequency |
| --- | --- | --- | --- | --- | --- |
| `\x00[IDE]` | `IdeMessage` | `ide-message` | IDE editor modal | `efuns.ideOpen()` in `src/driver/efun-bridge.ts` and builder/player cmds | On demand (open/save/errors), user action driven |
| `\x00[MAP]` | `MapMessage` | `map-message` | Map panel / world map modal | `player.sendMapUpdate()` (`mudlib/std/player.ts`), world map requests | On movement, teleport/login refresh, world-map open |
| `\x00[STATS]` | `StatsUpdate` (`update` or `delta`) | `stats-message` | Stats panel + equipment text data | `player.sendStatsUpdate()` (`mudlib/std/player.ts`) | Heartbeat-driven (2s heartbeat), adaptive throttling when idle |
| `\x00[EQUIPMENT]` | `EquipmentMessage` | `equipment-message` | Equipment images + profile portrait | `player.sendStatsUpdate()` + image queue/drain (`mudlib/std/player.ts`) | On equipment/portrait changes; queued images drain 1 per heartbeat |
| `\x00[GUI]` | `GUIMessage` | `gui-message` | Generic GUI modals | `efuns.guiSend()` and modal helpers | On demand, action driven |
| `\x00[QUEST]` | `QuestMessage` | `quest-message` | Quest sidebar/panel | `questDaemon.sendQuestPanelUpdate()` via `efuns.sendQuestUpdate()` | On quest accept/abandon/turn-in/objective progress; also login/reconnect |
| `\x00[COMPLETE]` | `CompletionMessage` | `completion-message` | Input completion UI | `Driver.handleCompletionRequest()` | On tab-completion request (builders+) |
| `\x00[COMM]` | `CommMessage` | `comm-message` | Communications panel | `efuns.sendComm()` from say/tell/channel flows | Per communication event |
| `\x00[AUTH]` | `AuthResponseMessage` | `auth-response` | Launcher/auth UI | `connection.sendAuthResponse()` in driver/login paths | On auth request outcomes |
| `\x00[COMBAT]` | `CombatMessage` | `combat-message` | Combat target panel | `player.sendCombatTarget()` via combat daemon | On combat start/round updates/end |
| `\x00[SOUND]` | `SoundMessage` | `sound-message` | Sound subsystem | `efuns.playSound/loopSound/stopSound()` | Event driven (combat/UI/alerts/etc.) |
| `\x00[GIPHY]` | `GiphyMessage` | `giphy-message` | Giphy floating panel | `openGiphyModal()/closeGiphyModal()` | On GIF share/show/hide events |
| `\x00[SESSION]` | `Session*Message` | `session-message` | Session/reconnect state | Driver session resume/token flow | On resume attempts and token issuance |
| `\x00[TIME]` | `TimeMessage` | `time-message` | Clock/debug latency/version checks | `server` heartbeat -> `connection.sendTime()` | Every server heartbeat (default 10s) |
| `\x00[TIME_PONG]` | raw timestamp string | `time-pong` | Latency metric only | `connection.sendTimePong()` in response to client `TIME_ACK` | Per received `TIME`/`TIME_ACK` cycle |
| `\x00[ENGAGE]` | `EngageMessage` | `engage-message` | Engage dialogue panel | `player.sendEngage()` from `_engage.ts` command | On demand (player engages NPC) |
| `\x00[GAMETIME]` | `GameTimeMessage` | `gametime-message` | Sky/day-night UI | `efuns.sendGameTime()` from login + time daemon phase changes | On login/reconnect and phase transitions |

## Detailed Notes By Message

### `MAP`

- Primary sender: `Player.sendMapUpdate(fromRoom?)`.
- Movement path: `_go` command calls `sendMapUpdate(room)` after successful move.
- Behavior:
  - Sends biome area payload for current location.
  - Also sends legacy move payload when moving within same area.
- Full refresh path: `sendFullStateRefresh()` sends map update after stats.

### `STATS`

- Sender: `Player.sendStatsUpdate(force)`.
- Frequency logic (`shouldSendStats()`):
  - In combat: every heartbeat.
  - Idle < 60s: every heartbeat (2s).
  - Idle 1-5m: every 10s.
  - Idle 5-30m: every 30s.
  - Idle 30m+: every 60s.
- Compression behavior:
  - Sends full snapshot every 10th stats send (or forced/first send).
  - Sends deltas otherwise; skips entirely if no changes.
- Equipment images are intentionally excluded from STATS payload (handled by EQUIPMENT).

### `EQUIPMENT`

- Sender: `Player.sendEquipmentBatched()` and `drainEquipmentImageQueue()`.
- Trigger: image or portrait hash changes, and `notifyEquipmentImageReady()` callbacks.
- Cadence:
  - Non-image slot clears/empty updates: immediate.
  - Profile portrait update: immediate.
  - Image data: queued and drained one slot per heartbeat for smoother load.
- Chunking:
  - Large image strings are chunked by `EQUIPMENT_IMAGE_CHUNK_CHARS = 60000`.
  - Chunk payload shape:
    - `imageChunk: { slot, name, index, total, data }`.
- Combat portrait safeguard (related): combat portrait payload is capped/fallbacked (`MAX_COMBAT_PORTRAIT_CHARS = 300000`) before COMBAT send.

### `COMBAT`

- Sender chain: combat daemon -> `sendCombatTargetUpdate()` -> `player.sendCombatTarget()`.
- Types:
  - `target_update`: full target payload including portrait for new/forced target.
  - `health_update`: lightweight HP-only updates when target unchanged.
  - `target_clear`: clear panel on combat end/interrupt.
- Trigger points:
  - Combat start.
  - After each round (while target alive).
  - On combat end, flee, separation, death cleanup.

### `QUEST`

- Sender: `QuestDaemon.sendQuestPanelUpdate(player)`.
- Payload: `type: 'update'` and up to 3 most-recent active quests.
- Trigger points include:
  - `acceptQuest`, `abandonQuest`, `turnInQuest`.
  - Objective progress methods: kill/fetch/explore/talk/deliver/escort.
  - Login/reconnect initialization.

### `COMM`

- Sender: `efuns.sendComm(targetPlayer, commMessage)` from channels/say/tell flows.
- Typical events:
  - Say/tell commands.
  - Channel posts, channel emotes, notifications with comm metadata.
  - GIF-share posts include `gifId` for click-through behavior.
- High-value note: COMM is one of only two protocol types sent while tab is hidden.

### `GUI`

- Sender: `efuns.guiSend()` and modal libraries.
- Used for modal open/update/close flows (inventory, score, quest, shop, look, etc.).
- Frequency: purely action/state-event driven.

### `IDE`

- Sender: `efuns.ideOpen()`.
- Used by builder tools and bug/editor flows to open/edit files in browser IDE pane.

### `AUTH` and `SESSION`

- `AUTH`:
  - Used by launcher login/register flow.
  - Sent from driver/login validation paths.
- `SESSION`:
  - Used for reconnect/session recovery.
  - Messages include `session_resume`, `session_invalid`, `session_token`.
  - On successful resume, server can replay buffered text messages.

### `TIME` and `TIME_PONG`

- `TIME`:
  - Sent on server heartbeat (default 10s) along with WebSocket ping.
  - Carries server timestamp, timezone, optional game version.
  - Client emits `time-message`, updates clock/debug/version checks, then sends `TIME_ACK`.
- `TIME_PONG`:
  - Sent by server when it receives `TIME_ACK`.
  - Raw echoed timestamp used by client to compute latency.

### `GAMETIME`

- Sender: `efuns.sendGameTime()`.
- Sent:
  - On login/reconnect initialization.
  - On day-phase transitions in time daemon tick logic.
- Payload includes hour/minute/phase/cycle duration.

### `SOUND`

- Sender: `efuns.playSound`, `efuns.loopSound`, `efuns.stopSound`.
- UI target: client sound manager/panel.
- Fired by combat systems, alerts, ambient changes, and modal/UI events.

### `GIPHY`

- Sender: `openGiphyModal()` / `closeGiphyModal()`.
- Payload types:
  - `show` with gif metadata (`gifUrl`, sender/channel/search, `autoCloseMs`).
  - `hide`.
- Triggered by channel GIF-sharing flows and explicit close events.

### `ENGAGE`

- Sender: `player.sendEngage(message)` from `_engage.ts` command.
- Message subtypes:
  - `open`: Full NPC dialogue payload with portrait, greeting text, quest data, and action buttons.
  - `close`: Close the dialogue panel.
  - `loading`: Show/hide loading overlay with optional message and progress.
- Payload fields (open):
  - `npcName`, `npcPath`: NPC identity.
  - `portrait`: Data URI (base64 image or SVG) or avatar ID.
  - `portraitUrl`: Optional HTTP URL for lazy-loading (`/api/images/portrait/<hash>`).
  - `alignment`: Panel positioning (`{vertical, horizontal}` or `'centered'`).
  - `text`: Greeting text with color codes rendered.
  - `actions`, `questLog`, `questDetails`, `questOffers`, `questTurnIns`: Structured quest and action data.
- Size considerations:
  - Portrait data can be large (up to `MAX_ENGAGE_PORTRAIT_CHARS = 2,400,000` chars).
  - Oversized portraits are replaced with fallback SVG silhouette before sending.
  - When `portraitUrl` is available, client can lazy-load portrait via HTTP instead of inline data.
- Client routing: `engage-message` -> `engagePanel`.
- Keyboard: Escape closes the panel.

See [Engage System](engage-system.md) for full documentation.

## Client Routing Summary

`src/client/client.ts` binds protocol events to UI handlers:

- `map-message` -> `mapPanel` / `worldMapModal`
- `stats-message` -> `statsPanel` + `equipmentPanel` (text/stats)
- `equipment-message` -> `equipmentPanel.handleEquipmentUpdate()` (+ stats portrait update)
- `gui-message` -> `guiModal`
- `quest-message` -> `questPanel`
- `comm-message` -> `commPanel`
- `combat-message` -> `combatPanel`
- `engage-message` -> `engagePanel`
- `sound-message` -> `soundPanel`
- `giphy-message` -> `giphyPanel`
- `time-message` -> `clockPanel` (+ debug latency/version checks)
- `gametime-message` -> `skyPanel`
- `completion-message` -> input tab-completion cache

## Known High-Risk Payloads

For disconnect/buffer investigations, these are the biggest offenders:

- `EQUIPMENT` with large base64 images (especially multiple slots at once).
- `COMBAT target_update` when portrait payload is large.
- `GUI` payloads can also spike if large modal data blobs are included.

Current mitigations in code:

- Protocol frame max size cap: `512KB`.
- Equipment image queue + chunking.
- Combat portrait size fallback.
- Hidden-tab protocol suppression (except `COMM` and `TIME`).
- Adaptive STATS cadence + delta compression.
