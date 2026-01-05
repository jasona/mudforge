# Player Features

This document covers the features available to players in MudForge.

## Custom Display Names

Players can create colorful, personalized display names that appear when other players look at them or view the who list.

### Setting a Display Name

Use the `displayname` command:

```
displayname Sir {blue}$N{/} the {green}Bold{/}
```

This would display as: Sir **Hero** the **Bold** (with colors)

### Placeholder

Use `$N` as a placeholder for your actual name. The system will replace it with your character's name.

```
displayname {red}$N{/} the Destroyer
```

For a player named "Hero", this displays as: **Hero** the Destroyer

### Color Codes

Available color codes:

| Code | Color |
|------|-------|
| `{red}` | Red |
| `{green}` | Green |
| `{blue}` | Blue |
| `{yellow}` | Yellow |
| `{cyan}` | Cyan |
| `{magenta}` | Magenta |
| `{white}` | White |
| `{black}` | Black |

Formatting codes:

| Code | Effect |
|------|--------|
| `{bold}` | Bold text |
| `{dim}` | Dimmed text |
| `{italic}` | Italic text |
| `{underline}` | Underlined |
| `{/}` | Reset formatting |

### Managing Your Display Name

```
displayname              # View current display name
displayname clear        # Remove custom display name
displayname <template>   # Set new display name
```

### Rules

- Maximum 100 characters
- Must contain either `$N` or your actual name
- This ensures players can be identified

## Session Reconnection

MudForge maintains your game session even if you disconnect unexpectedly.

### How It Works

1. When you disconnect (network issue, browser close), your character remains in the game world
2. Other players see you as disconnected but still present
3. When you reconnect and log in with the same name, you resume your existing session
4. Your location, inventory, and state are preserved

### Reconnecting

1. Open the web client
2. Enter your character name
3. Enter your password
4. You'll be back where you left off

### Quitting Properly

To fully exit the game and remove your character from the world:

```
quit
```

This saves your character and removes them from the game world.

## Who List

View all connected players with the `who` command.

### Display

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ███╗   ███╗██╗   ██╗██████╗ ███████╗ ██████╗ ██████╗  ██████╗ ███████╗     ║
║  ████╗ ████║██║   ██║██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝     ║
║  ██╔████╔██║██║   ██║██║  ██║█████╗  ██║   ██║██████╔╝██║  ███╗█████╗       ║
║  ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝       ║
║  ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗     ║
║  ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝     ║
║                                                                              ║
║                    A Modern MUD Experience - Est. 2024                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Player                                                  Rank                ║
║  ────────────────────────────────────────────────────  ──────────────────   ║
║  Sir Hero the Bold                                      Administrator        ║
║  Adventurer                                             Level 5              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                              2 players online                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Ranks Shown

- **Administrator** - Full game access
- **Senior Builder** - Cross-domain builder
- **Builder** - Content creator
- **Level X** - Regular players show their level

Players are sorted with admins first, then by level.

## Finger Command

Look up detailed information about any player with the `finger` command:

```
finger Hero
```

### Information Displayed

```
╔══════════════════════════════════════════════════════════════╗
║                        Player Info                           ║
╠══════════════════════════════════════════════════════════════╣
║  Name:          Hero
║  Display Name:  Sir Hero the Bold
║  Level:         15
║  Role:          Builder
╠══════════════════════════════════════════════════════════════╣
║  Account Age:   45 days, 3 hours
║  Created:       Wed, Nov 20, 2024, 10:30 AM
║  Status:        Online
║  Logged In:     2 hours, 15 minutes ago
║  Play Time:     72 hours, 30 minutes
╚══════════════════════════════════════════════════════════════╝
```

### Features

- Works for **online** or **offline** players
- Shows last login time for offline players
- For **builders and above**, displays their plan file if one exists at `/users/<name>/user.plan`

### Plan Files

Builders can create a `user.plan` file in their user directory to share information:

```
/users/hero/user.plan
```

This file's contents are displayed when someone fingers them, similar to the classic Unix finger command.

## Communication Channels

MudForge includes several communication channels.

### Available Channels

| Channel | Command | Description |
|---------|---------|-------------|
| Say | `say` or `'` | Local room chat |
| Shout | `shout` | Server-wide broadcast |
| OOC | `ooc` | Out-of-character chat |
| Builder | `btalk` | Builder discussion (builders+) |
| Admin | `atalk` | Admin communication (admins) |

### Channel Commands

```
say Hello!                # Say to room
'Hello!                   # Shorthand for say
shout The dragon is dead! # Broadcast to all
ooc Anyone want to group? # OOC channel
```

### Managing Channels

```
channels                  # List channels and status
channels join ooc         # Join channel
channels leave ooc        # Leave channel
```

## Character Stats

View your character with the `score` command.

### Full Score Display

```
score
```

Shows:
- Name, title, gender
- Level and experience
- Stats (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)
- Health and mana
- Equipment slots

### Quick Views

```
score stats    # Just statistics
score brief    # Condensed overview
```

## Vitals Monitor

Toggle an HP/MP display with the `mon` command.

```
mon on         # Enable monitor
mon off        # Disable monitor
mon            # Check status
```

When enabled, your vitals are shown periodically during combat or when they change.

## In-Game Help

Access comprehensive help with the `help` command.

```
help                      # Help index
help basics               # Specific topic
help player               # Category listing
help search combat        # Search topics
help commands             # Command list
```

### Help Categories

- **player** - Basic gameplay
- **builder** - Content creation
- **admin** - Administration
- **classes** - Character classes
- **skills** - Skills and abilities

## Inventory Management

### Viewing Inventory

```
inventory
i
inv
```

### Item Interactions

```
look sword           # Examine an item
get sword            # Pick up an item
drop sword           # Drop an item
```

## Movement

### Basic Movement

```
north (n)           # Go north
south (s)           # Go south
east (e)            # Go east
west (w)            # Go west
up (u)              # Go up
down (d)            # Go down
```

### Go Command

```
go north
go tavern           # Named exits
```

### Looking at Exits

When you `look` at a room, available exits are shown at the bottom of the description.

## Persistence

Your character is automatically saved:
- When you `quit`
- Periodically during play
- When the server shuts down

Saved data includes:
- Location
- Inventory
- Stats and level
- Display name
- Channel subscriptions
- Custom properties

## Tips for New Players

1. **Look around** - Use `look` to see room descriptions and find exits
2. **Read help** - The `help` command has extensive documentation
3. **Check who's online** - Use `who` to see other players
4. **Customize your name** - Set a fun display name with `displayname`
5. **Use channels** - `ooc` is great for asking questions
6. **Explore** - Move around and discover the world
7. **Quit properly** - Use `quit` to save and exit cleanly
