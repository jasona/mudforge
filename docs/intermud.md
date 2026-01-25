# Inter-MUD Communication

MudForge supports three complementary inter-MUD communication systems, allowing players to chat with players on other MUDs across the internet.

## Overview

| System | Protocol | Architecture | Primary Use |
|--------|----------|--------------|-------------|
| Intermud 3 (I3) | TCP | Central router | Traditional MUD networks |
| Intermud 2 (I2) | UDP | Peer-to-peer | Legacy MUD networks |
| Grapevine | WebSocket | Hub & spoke | Modern MUD chat |

All three can run simultaneously.

## Intermud 3 (I3)

### What is I3?

Intermud 3 is a TCP-based protocol connecting MUDs through central routers. It provides:
- Shared chat channels across MUDs
- Private tells to players on other MUDs
- Player queries (who, finger, locate)
- MUD discovery and listing

### Configuration

Add to your `.env` file:

```
I3_ENABLED=true
I3_MUD_NAME=YourMudName
I3_ADMIN_EMAIL=admin@yourmud.com
I3_ROUTER_HOST=97.107.133.86
I3_ROUTER_PORT=8787
```

### Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| `i3muds` | `i3muds [pattern] [-a]` | List MUDs on network |
| `i3who` | `i3who <mudname>` | Query who list from another MUD |
| `i3tell` | `i3tell <player>@<mud> <message>` | Send private message |

**Examples:**

```
i3muds                    # List all online MUDs
i3muds deep               # Search for MUDs containing "deep"
i3muds -a                 # Include offline MUDs
i3who DeepMUD             # See who's on DeepMUD
i3tell bob@DeepMUD Hello! # Send tell to Bob on DeepMUD
```

### I3 Channels

Join I3 network channels through the channel system:

```
channels intermud on      # Join the intermud channel
intermud Hello everyone!  # Send to all MUDs on channel
```

Default I3 channels: `intermud`, `imud_code`

### Message Format

**Receiving tells:**
```
[I3 Tell] Bob@DeepMUD tells you: Hello there!
```

**Channel messages:**
```
[intermud] Bob@DeepMUD: Anyone know how to code a combat system?
```

## Intermud 2 (I2)

### What is I2?

Intermud 2 is a UDP-based peer-to-peer protocol. MUDs broadcast messages to all known peers without a central router.

### Configuration

Add to your `.env` file:

```
I2_ENABLED=true
I2_MUD_NAME=YourMudName
I2_HOST=0.0.0.0
I2_UDP_PORT=3004
```

### Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| `i2muds` | `i2muds [pattern] [-o] [-seed]` | List known I2 MUDs |
| `i2who` | `i2who <mudname>` | Query who list |
| `i2tell` | `i2tell <player>@<mud> <message>` | Send private message |

**Examples:**

```
i2muds                    # List all known MUDs
i2muds -o                 # Online only (seen within 1 hour)
i2muds -seed              # Populate list from I3 network
i2who Avalon              # See who's on Avalon
i2tell hero@Avalon Hi!    # Send tell via I2
```

### Seeding the MUD List

If your I2 mudlist is empty, populate it from I3:

```
i2muds -seed
```

This imports all known I3 MUDs into your I2 peer list.

## Grapevine

### What is Grapevine?

Grapevine is a modern WebSocket-based chat network designed for contemporary MUDs. It uses JSON messages over secure WebSocket connections.

### Registration

1. Visit https://grapevine.haus
2. Register your game
3. Obtain your Client ID and Client Secret

### Configuration

Add to your `.env` file:

```
GRAPEVINE_ENABLED=true
GRAPEVINE_CLIENT_ID=your-client-id-here
GRAPEVINE_CLIENT_SECRET=your-secret-here
GRAPEVINE_GAME_NAME=YourMudName
GRAPEVINE_CHANNELS=gossip,testing,moo
```

### Commands

Grapevine channels have dedicated commands:

| Command | Alias | Description |
|---------|-------|-------------|
| `gossip <message>` | `gos` | General chat channel |
| `testing <message>` | `test` | Development/testing channel |
| `moo <message>` | - | Code discussion channel |

**Examples:**

```
gossip Hello from MudForge!
gos Anyone around?
testing Need help with a bug
```

### Default Channels

- **gossip**: General game chat
- **testing**: Help with development and testing
- **moo**: Code discussion and library sharing

Additional channels can be requested through the Grapevine web panel.

## Comparison

| Feature | I3 | I2 | Grapevine |
|---------|----|----|-----------|
| Private Tells | Yes | Yes | No |
| Who Query | Yes | Yes | No |
| Player Locate | Yes | Yes | No |
| Shared Channels | Yes | Yes | Yes |
| Encryption | No | No | Yes (TLS) |
| Reliability | TCP (guaranteed) | UDP (best-effort) | TCP (guaranteed) |
| Setup | Automatic | Manual seed | Registration |
| Activity | Medium | Low | Growing |

## Running All Three

You can enable all systems simultaneously:

```
# .env
I3_ENABLED=true
I2_ENABLED=true
GRAPEVINE_ENABLED=true
```

This allows:
- I3 channels and tells
- I2 channels and tells
- Grapevine chat
- Cross-network MUD discovery via seeding

## Troubleshooting

### I3 Issues

**Not connecting:**
- Verify `I3_ENABLED=true`
- Check firewall allows TCP to router host:port
- Ensure MUD name is unique on network
- Verify admin email is valid

**Can't send tells:**
- Verify target MUD is online (`i3muds`)
- Check exact spelling of player name and MUD name
- Target MUD must support the `tell` service

### I2 Issues

**No MUDs in list:**
- Use `i2muds -seed` to populate from I3
- Check firewall allows UDP on configured port

**Messages not delivered:**
- UDP is unreliable; some packets may be lost
- Target MUD must be online and listening

### Grapevine Issues

**Authentication failing:**
- Verify Client ID and Secret are exact (copy/paste)
- Check registration at grapevine.haus is complete
- Ensure network allows outbound WebSocket

**Channel messages not appearing:**
- Verify you're subscribed to the channel
- Check `GRAPEVINE_CHANNELS` in config

## Technical Details

### File Locations

**Daemons:**
- `/mudlib/daemons/intermud.ts` - I3 management
- `/mudlib/daemons/intermud2.ts` - I2 management
- `/mudlib/daemons/grapevine.ts` - Grapevine management

**Commands:**
- `/mudlib/cmds/player/_i3tell.ts`, `_i3who.ts`, `_i3muds.ts`
- `/mudlib/cmds/player/_i2tell.ts`, `_i2who.ts`, `_i2muds.ts`
- `/mudlib/cmds/player/_gvchat.ts`

**Network Clients:**
- `/src/network/i3-client.ts` - TCP client
- `/src/network/i2-client.ts` - UDP client
- `/src/network/grapevine-client.ts` - WebSocket client

### State Persistence

Connection state is saved to:
- `/mudlib/data/intermud-state.json` - I3 password, subscriptions
- `/mudlib/data/intermud2-state.json` - Known MUDs
- `/mudlib/data/grapevine-state.json` - Channel subscriptions

### I3 Services Advertised

MudForge advertises these capabilities to the I3 network:
- `tell` - Can receive private messages
- `who` - Can respond to who queries
- `finger` - Can respond to finger queries
- `locate` - Can respond to locate queries
- `channel` - Can participate in channels
