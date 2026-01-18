# Intermud 3 Implementation Plan

## Overview

Implement Intermud 3 (I3) protocol support to enable cross-MUD chat channels. Players will be able to communicate with players on other MUDs through shared channels like `intermud`, `imud_code`, etc.

## Architecture

```
Player → ChannelDaemon → IntermudDaemon → I3Client (TCP) → I3 Router
                ↑              ↓
         Local channels   Remote messages
```

**Key Components:**
1. **LPC Codec** (`src/network/lpc-codec.ts`) - Encode/decode LPC wire format
2. **I3 Client** (`src/network/i3-client.ts`) - TCP connection to routers
3. **Intermud Daemon** (`mudlib/daemons/intermud.ts`) - Protocol state management
4. **Channel Integration** - Extend existing ChannelDaemon for I3 channels

## Implementation Phases

### Phase 1: LPC Codec and TCP Client

**New Files:**
- `src/network/lpc-codec.ts` - LPC encoding/decoding
- `src/network/i3-client.ts` - TCP client with MudMode framing

**LPC Wire Format:**
- Strings: `"escaped content"`
- Arrays: `({ elem1, elem2, })`
- Mappings: `([ "key": value, ])`
- MudMode frame: 4-byte big-endian length + null-terminated LPC string

**I3Client Features:**
- Persistent TCP connection with auto-reconnect
- Event emitter: `connect`, `disconnect`, `packet`, `error`
- MudMode framing (length prefix handling)

### Phase 2: Configuration

**Modify:** `src/driver/config.ts`

Add to DriverConfig interface:
```typescript
i3Enabled: boolean;
i3MudName: string;
i3AdminEmail: string;
i3RouterHost: string;
i3RouterPort: number;
```

Environment variables:
- `I3_ENABLED` (default: false)
- `I3_MUD_NAME` (default: "MudForge")
- `I3_ADMIN_EMAIL` (required if enabled)
- `I3_ROUTER_HOST` (default: "97.107.133.86" - *dalet)
- `I3_ROUTER_PORT` (default: 8787)

### Phase 3: Efun Bridge

**Modify:** `src/driver/efun-bridge.ts`

Add new efuns:
```typescript
i3Connect(): Promise<void>
i3Disconnect(): Promise<void>
i3Send(packet: unknown[]): void
i3IsConnected(): boolean
i3OnPacket(callback: (packet: unknown[]) => void): void
```

**Modify:** `mudlib/efuns.d.ts` - Add type declarations

### Phase 4: Intermud Daemon

**New File:** `mudlib/daemons/intermud.ts`

**Responsibilities:**
- Startup handshake (`startup-req-3` → `startup-reply`)
- Manage mudlist and chanlist
- Channel operations (`channel-m`, `channel-e`, `channel-listen`)
- Service handlers (`tell`, `who-req/reply`, `finger-req/reply`, `locate-req/reply`)
- Persist password and subscription state

**Startup Packet Structure:**
```typescript
[
  'startup-req-3', 5, mudName, 0, routerName, 0,
  password,        // 0 for new MUD, saved value for reconnect
  mudlistId,       // 0 initially
  chanlistId,      // 0 initially
  playerPort,      // game port
  0, 0,            // imud tcp/udp ports (unused)
  'MudForge',      // mudlib
  'MudForge',      // base mudlib
  'MudForge',      // driver
  'LP',            // mud type
  'mudlib development', // status
  adminEmail,
  { tell: 1, who: 1, finger: 1, locate: 1, channel: 1 }, // services
  {}               // other data
]
```

### Phase 5: Channel Integration

**Modify:** `mudlib/daemons/channels.ts`

1. Add `'intermud'` to `ChannelAccessType`
2. Add fields to `ChannelConfig`:
   ```typescript
   source?: 'local' | 'intermud';
   i3ChannelName?: string;
   ```
3. Add methods:
   - `registerI3Channel(name, hostMud)`
   - `unregisterI3Channel(name)`
   - `receiveI3Message(channel, mud, user, message)`
   - `sendI3Message(player, channel, message)`

### Phase 6: Player Commands

**New Files:**
- `mudlib/cmds/player/_i3tell.ts` - Send message to player on another MUD
- `mudlib/cmds/player/_i3who.ts` - Query online players on another MUD
- `mudlib/cmds/player/_i3finger.ts` - Get player info from another MUD
- `mudlib/cmds/player/_i3locate.ts` - Find player across all MUDs
- `mudlib/cmds/player/_i3muds.ts` - List MUDs on the network
- `mudlib/cmds/admin/_i3admin.ts` - Connect/disconnect, status

**Modify:** `mudlib/cmds/player/_channels.ts` - Show I3 channels with `[I3]` marker

### Phase 7: Driver Integration

**Modify:** `src/driver/driver.ts`
- Initialize I3Client if enabled
- Wire packet events to efun callbacks
- Handle graceful shutdown

## File Summary

### New Files (7)
| File | Purpose |
|------|---------|
| `src/network/lpc-codec.ts` | LPC encoding/decoding |
| `src/network/i3-client.ts` | TCP client for I3 routers |
| `mudlib/daemons/intermud.ts` | I3 protocol daemon |
| `mudlib/cmds/player/_i3tell.ts` | Cross-MUD tell |
| `mudlib/cmds/player/_i3who.ts` | Cross-MUD who |
| `mudlib/cmds/player/_i3muds.ts` | List I3 MUDs |
| `mudlib/cmds/admin/_i3admin.ts` | Admin I3 controls |

### Modified Files (5)
| File | Changes |
|------|---------|
| `src/driver/config.ts` | Add I3 config options |
| `src/driver/efun-bridge.ts` | Add I3 efuns |
| `src/driver/driver.ts` | Initialize I3 client |
| `mudlib/daemons/channels.ts` | I3 channel support |
| `mudlib/cmds/player/_channels.ts` | Show I3 channels |

## Message Flow

**Outgoing (player sends on I3 channel):**
```
Player "intermud hi" → ChannelDaemon.send()
  → IntermudDaemon.sendChannelMessage()
  → efuns.i3Send([channel-m packet])
  → I3Client.send() → TCP to router
```

**Incoming (remote player sends):**
```
Router → TCP → I3Client.emit('packet')
  → efun callback → IntermudDaemon.handlePacket()
  → ChannelDaemon.receiveI3Message()
  → broadcast to subscribed players
```

## Verification

1. **Unit tests for LPC codec:**
   - `npm test -- tests/network/lpc-codec.test.ts`
   - Test all LPC types: strings, integers, arrays, mappings
   - Test MudMode framing

2. **Integration test:**
   - Start MudForge with I3 enabled
   - Verify connection to router (check logs for `startup-reply`)
   - Use `i3muds` command to verify mudlist received

3. **Channel test:**
   - Toggle I3 channel: `channels intermud on`
   - Send message: `intermud Hello from MudForge!`
   - Verify message appears on other connected MUDs

4. **Service tests:**
   - `i3who <mudname>` - Should show online players
   - `i3tell player@mudname message` - Should deliver tell

## Configuration Example

```bash
# .env
I3_ENABLED=true
I3_MUD_NAME=MudForge
I3_ADMIN_EMAIL=admin@example.com
I3_ROUTER_HOST=97.107.133.86
I3_ROUTER_PORT=8787
```

## Notes

- I3 routers available: *dalet (97.107.133.86:8787), *i4 (204.209.44.3:8080)
- Password assigned by router on first connect - must persist for reconnection
- Channel subscriptions sent via `channel-listen` packet after startup
- All I3 communication is unencrypted (protocol limitation)
