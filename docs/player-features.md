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

## Player Settings

Players can customize their game experience with the `settings` command.

### Viewing Settings

```
settings                    # List all settings by category
settings <setting>          # View details for a specific setting
```

### Changing Settings

```
settings <setting> <value>  # Change a setting
settings reset <setting>    # Reset a setting to default
settings reset all          # Reset all settings to defaults
```

### Available Settings

Settings are organized by category:

| Category | Settings |
|----------|----------|
| Display | `brief` - Show brief room descriptions |
| Communication | Channel preferences |
| Gameplay | `compact` - Compact inventory display, `autoloot` - Auto-loot defeated enemies |

### Example Usage

```
settings brief on           # Enable brief room descriptions
settings autoloot true      # Enable auto-looting
settings reset brief        # Reset brief to default
```

Your settings are automatically saved with your character.

## Session Reconnection & Link-Dead Handling

MudForge maintains your game session even if you disconnect unexpectedly, with graceful handling of "link-dead" players.

### How It Works

**When You Disconnect** (network issue, browser close, etc.):

1. Your character's form "flickers and slowly fades from view" (other players see this message)
2. Your character is moved to a holding area (the void)
3. A disconnect timer starts (default: 15 minutes, configurable by admins)
4. You remain in the active players list (visible in `who`)

**When You Reconnect** (within the timeout):

1. Open the web client
2. Enter your character name and password
3. Your disconnect timer is cancelled
4. You "shimmer back into existence" at your original location
5. Other players in the room see your return
6. Your inventory and state are fully preserved

**If You Don't Reconnect** (timeout expires):

1. Your character is automatically saved
2. You are removed from the active players list
3. Other players see a notification of your disconnection

### Disconnect Timeout

The default disconnect timeout is 15 minutes. Administrators can adjust this using the `config` command:

```
config disconnect.timeoutMinutes 30    # Set to 30 minutes
```

### Quitting Properly

To fully exit the game and remove your character from the world immediately:

```
quit
```

This saves your character and removes them from the game world without any timeout period.

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

Shows what you're carrying with equipment indicators:
```
You are carrying:
  a steel longsword (wielded)
  a wooden shield (worn - shield)
  leather armor (worn)
  50 gold coins
  a health potion
```

### Item Interactions

```
look sword           # Examine an item
get sword            # Pick up an item
get all              # Pick up all items
drop sword           # Drop an item
drop all             # Drop all items
```

## Containers

Containers like chests and bags can hold items.

### Using Containers

```
open chest           # Open a container
close chest          # Close a container
look in chest        # See what's inside
get sword from chest # Take an item out
drop sword in chest  # Put an item in
```

### Locked Containers

Some containers are locked and require a key:

```
unlock chest         # Unlock with matching key in inventory
lock chest           # Lock the container
```

You must have the appropriate key in your inventory to unlock.

## Equipment System

MudForge includes a complete equipment system with weapons and armor.

### Equipment Slots

| Category | Slots |
|----------|-------|
| Armor | Head, Chest, Cloak, Hands, Legs, Feet |
| Weapons | Main Hand, Off Hand |
| Shield | Uses Off Hand slot |

### Wielding Weapons

```
wield sword              # Wield in main hand
wield dagger in left     # Dual-wield in off-hand
wield dagger in right    # Wield in main hand (explicit)
unwield                  # Unwield all weapons
unwield sword            # Unwield specific weapon
```

### Weapon Types

| Type | Description |
|------|-------------|
| One-Handed | Standard weapon, can use shield in off-hand |
| Light | Can be wielded in main or off-hand (for dual-wielding) |
| Two-Handed | Uses both hands, cannot use shield |

### Wearing Armor

```
wear armor           # Wear an armor piece
wear helmet          # Automatically goes to head slot
remove armor         # Remove worn armor
remove all           # Remove all worn items
```

### Viewing Equipment

```
equipment            # Show all equipment slots
eq                   # Shorthand
equipped             # Alias
```

Example output:
```
=== Equipment ===

  Head         iron helmet
  Chest        chainmail armor
  Cloak        empty
  Hands        leather gloves
  Legs         empty
  Feet         leather boots
  Main Hand    steel longsword
  Off Hand     wooden shield
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

## Combat System

MudForge features a real-time combat system with NPCs.

### Starting Combat

```
kill goblin              # Attack an NPC
consider goblin          # Assess NPC difficulty before attacking
```

### During Combat

Combat happens automatically in rounds while you're engaged:
- Attack and defense rolls determine hits
- Equipped weapons affect damage
- Armor reduces incoming damage

### Combat Commands

| Command | Description |
|---------|-------------|
| `kill <target>` | Start attacking an NPC |
| `flee` | Attempt to escape combat |
| `consider <target>` | Assess enemy difficulty |
| `wimpy <percent>` | Auto-flee when HP falls below percent |
| `wimpycmd <command>` | Custom command to run when wimpy triggers |

### Death and Resurrection

When you die:
1. You become a ghost
2. A corpse is created at your death location containing your gold
3. Use `resurrect` to respawn at the resurrection point
4. Return to your corpse to `get gold from corpse`

### Combat Tips

- Use `consider` before fighting unknown enemies
- Set `wimpy 20` to auto-flee at 20% health
- Corpses decay over time - recover your gold quickly!
- Carry healing potions for emergencies

## Gold Economy

MudForge includes a complete currency system.

### Viewing Your Gold

```
score                    # Shows carried and banked gold
inventory                # Shows gold you're carrying
```

### Earning Gold

- Loot corpses of defeated enemies (`get gold from corpse`)
- Find gold piles in the world (`get gold`)
- Receive gold from other players (`give` command)
- Complete quests and achievements

### Managing Gold

```
drop gold                # Drop all your gold
drop 50 gold             # Drop a specific amount
get gold                 # Pick up gold from the ground
get gold from corpse     # Loot gold from a corpse
```

### Giving Gold

```
give gold to bob         # Give all your gold to someone
give 100 gold to bob     # Give specific amount to someone
```

### Gold Piles

When gold is dropped, it creates a pile on the ground:
- Multiple drops in the same room merge into one pile
- Pile descriptions are approximate ("a few coins", "a pile of coins")
- Exact amounts are revealed when you pick them up

### Banking

Some locations have banks where you can:
- Deposit gold for safekeeping
- Banked gold is not lost on death
- Withdraw gold when needed

## Giving Items

Transfer items between players and NPCs with the `give` command.

### Basic Usage

```
give sword to bob        # Give an item to someone
give all to bob          # Give all inventory items
give gold to bob         # Give all your gold
give 50 gold to bob      # Give specific gold amount
```

### Requirements

- The item must be in your inventory
- The target must be in the same room
- Works with both players and NPCs

## Private Messaging

Send private messages to other players.

### Tell Command

```
tell bob Hello there!           # Send private message to bob
tell "Dark Knight" Hey!         # Use quotes for names with spaces
```

### Reply Command

```
reply Thanks for the help!      # Reply to the last person who messaged you
```

### Features

- Messages are private (only you and recipient see them)
- `reply` remembers who last messaged you
- Works across the entire game world

## Persistence
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
