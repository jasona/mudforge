# Commands Reference

MudForge provides a comprehensive set of commands organized by permission level. Commands are loaded from the `/mudlib/cmds/` directory.

## Command Organization

```
mudlib/cmds/
├── player/     # Commands available to all players
├── builder/    # Commands for builders and above
└── admin/      # Commands for administrators only
```

## Player Commands

Available to all connected players.

### Movement

#### go, north, south, east, west, up, down
Move in a direction.

```
go north
north
n
```

Aliases: `n`, `s`, `e`, `w`, `u`, `d` for cardinal directions.

### Communication

#### say (')
Speak to others in your current room.

```
say Hello everyone!
'Hello everyone!
```

Everyone in the room will see: `Hero says: Hello everyone!`

#### shout
Broadcast a message to all players in the game.

```
shout The dragon has been slain!
```

All players will see: `Hero shouts: The dragon has been slain!`

#### ooc
Send an out-of-character message to the OOC channel.

```
ooc Anyone want to group up?
```

#### tell
Send a private message to another player.

```
tell hero Hey, want to group up?
```

#### reply
Reply to the last player who sent you a tell.

```
reply Sure, where are you?
```

#### remote (;)
Perform an emote directed at a specific player.

```
remote hero waves
; hero smiles warmly
```

Others see: "YourName waves at Hero."

#### channels
List and manage communication channels.

```
channels              # List all channels and status
channels join ooc     # Join the OOC channel
channels leave ooc    # Leave the OOC channel
```

### Item Interaction

#### get (take)
Pick up items from the room or from containers.

```
get sword                # Pick up an item from the room
get sword 2              # Pick up the 2nd sword (when duplicates exist)
get all                  # Pick up all items in the room
get all sword            # Pick up all swords from the room
get sword from chest     # Get an item from a container
get sword 2 from chest   # Get the 2nd sword from a container
get all from chest       # Get all items from a container
get all sword from chest # Get all swords from a container
get gold                 # Pick up gold coins from the floor
get gold from corpse     # Loot gold from a corpse
```

When multiple items share the same name, append a number to select a specific one. The index is 1-based (first item is 1, second is 2, etc.). Use "all <item>" to pick up all matching items at once.

#### drop (put)
Drop items or put them in containers.

```
drop sword               # Drop an item on the floor
drop sword 2             # Drop the 2nd sword (when duplicates exist)
drop all                 # Drop all items
drop all sword           # Drop all swords
drop sword in chest      # Put an item in a container
drop sword 2 in chest    # Put the 2nd sword in a container
drop all sword in chest  # Put all swords in a container
put sword in chest       # Same as drop ... in
drop gold                # Drop all your gold
drop 50 gold             # Drop a specific amount of gold
```

When multiple items share the same name, append a number to select a specific one. The index is 1-based. Use "all <item>" to drop all matching items at once.

#### give
Give items or gold to another player or NPC.

```
give sword to bob        # Give an item
give sword 2 to bob      # Give the 2nd sword (when duplicates exist)
give all to bob          # Give all non-equipped items
give all sword to bob    # Give all swords
give 100 gold to bob     # Give specific amount of gold
give gold to bob         # Give all your gold
```

When multiple items share the same name, append a number to select a specific one. The "give all" command transfers all non-equipped, droppable items. Use "give all <item> to <target>" to give all matching items at once.

#### open / close
Open or close containers and doors.

```
open chest               # Open a container
close chest              # Close a container
open door                # Open a door
```

#### unlock / lock
Unlock or lock containers and doors (requires appropriate key).

```
unlock chest             # Unlock with matching key in inventory
lock chest               # Lock with matching key
```

### Shopping

#### shop (browse, trade)
Open a merchant's shop interface.

```
shop                     # Open shop with merchant in the room
shop grond               # Open shop with specific merchant
shop blacksmith          # Use any merchant identifier
```

Opens a GUI modal with three panels:
- **Merchant Wares**: Items available for purchase, grouped by category
- **Transaction Ledger**: Running totals of items to buy and sell
- **Your Items**: Your inventory with sell prices

The shop uses a merged transaction flow where you can select items to buy AND sell, then finalize everything in a single transaction. Charisma affects prices - higher charisma means better deals.

See [Merchant System](merchants.md) for details on how merchants work.

### Equipment

#### wield
Wield a weapon from your inventory.

```
wield sword              # Wield in main hand
wield sword in right     # Wield in main hand (explicit)
wield dagger in left     # Wield in off-hand (dual-wield)
```

#### unwield (sheathe)
Stop wielding a weapon.

```
unwield                  # Unwield all weapons
unwield sword            # Unwield specific weapon
```

#### wear (don)
Wear armor or equipment.

```
wear armor               # Wear an armor piece
wear helmet              # Wear on appropriate slot
```

#### remove (doff)
Remove worn armor or equipment.

```
remove armor             # Remove armor
remove all               # Remove all worn items
```

#### equipment (eq, equipped)
View all equipped items.

```
equipment
eq
equipped
```

Shows all equipment slots:
- Head, Chest, Cloak, Hands, Legs, Feet (armor)
- Main Hand, Off Hand (weapons/shields)

### Combat

#### kill (attack, k)
Attack a target NPC or player (if PvP enabled).

```
kill goblin              # Attack an NPC
k goblin                 # Alias
attack troll             # Alias
```

Once in combat, attacks continue automatically until one combatant dies or flees.

#### flee (escape)
Attempt to flee from combat.

```
flee                     # Try to escape through a random exit
```

Success depends on your stats vs opponent. Failed attempts keep you in combat.

#### consider (con)
Assess an NPC's difficulty relative to your level.

```
consider goblin          # Check difficulty
con dragon               # Alias
```

Shows ratings from "trivial" to "impossible" based on level comparison.

#### wimpy
Set automatic flee threshold as a percentage of max HP.

```
wimpy                    # Show current wimpy setting
wimpy 20                 # Auto-flee at 20% HP
wimpy 0                  # Disable auto-flee
```

#### wimpycmd
Set a custom command to execute when wimpy triggers.

```
wimpycmd                 # Show current wimpy command
wimpycmd flee            # Use 'flee' (default)
wimpycmd recall          # Use a different escape command
```

#### resurrect (res)
Resurrect after death (when you're a ghost).

```
resurrect                # Return to life at resurrection point
res                      # Alias
```

Your corpse remains at the death location with your carried gold.

### Information

#### look (l)
Examine your surroundings, objects, or containers.

```
look              # Look at the room
look sword        # Look at an object
look in chest     # Look inside a container
l                 # Alias for look
```

Room display shows content sorted: players first, NPCs (in red), then items.

#### glance (gl)
Quick look at the room showing only exits and people.

```
glance            # Brief room overview
gl                # Alias
```

#### inventory (i, inv)
See what you are carrying.

```
inventory
i
inv
```

Shows equipped items with indicators:
```
You are carrying:
  a steel longsword (wielded)
  a wooden shield (worn - shield)
  leather armor (worn)
  50 gold coins
```

#### score
View your character's statistics.

```
score             # Full character sheet
score stats       # Only stats
score brief       # Condensed info
```

#### who (players)
Display all connected players with ASCII art banner.

```
who
players
```

Shows:
- Colorful MUDFORGE ASCII art header
- Player list with display names and levels/ranks
- Total player count

#### finger
View detailed information about a player (online or offline).

```
finger Hero
finger <player>
```

Shows:
- Name and display name
- Level and role (Player/Builder/Admin)
- Account age and creation date
- Online status or last login time
- Total play time
- Plan file (for builders+, if `/users/<name>/user.plan` exists)

Works for both online players and offline players by loading their saved data.

#### help
Access the in-game help system.

```
help                    # Show help index
help <topic>            # View help on a topic
help <category>         # List topics in a category
help search <term>      # Search for topics
help commands           # List all commands
```

#### bug
Submit a bug report to GitHub Issues.

```
bug <short description>
```

Opens an IDE-style editor where you can provide detailed information about the bug. The report is submitted directly to the game's GitHub repository.

Example:
```
bug The door in the tavern doesn't open
```

This opens an editor with a template:
- Steps to Reproduce
- Expected Behavior
- Actual Behavior
- Additional Context

Click "Submit Bug" (or Ctrl+S) to submit. The bug report includes your player name, current location, and timestamp automatically.

**Note:** Requires `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` to be configured in `.env`.

### Character Customization

#### alias
Create command shortcuts.

```
alias                    # List all aliases
alias k kill             # Create alias 'k' for 'kill'
alias gs get sword       # Create alias 'gs' for 'get sword'
```

#### unalias
Remove a command alias.

```
unalias k                # Remove the 'k' alias
```

#### colors
View available color codes for display names and messages.

```
colors                   # Show all color codes with examples
```

#### emotes
List all available emote commands.

```
emotes                   # Show all emotes
emotes smile             # Show specific emote variations
```

#### prompt
Customize your command prompt.

```
prompt                   # Show current prompt
prompt >                 # Set simple prompt
prompt [$hp/$maxhp] >    # Set prompt with variables
```

#### train
Spend experience points to improve stats.

```
train                    # Show trainable stats and costs
train strength           # Increase strength
```

#### displayname (dname)
Set a custom display name with colors.

```
displayname                           # Show current display name
displayname clear                     # Remove custom name
displayname Sir {blue}$N{/} the Bold  # Set custom name
```

- Use `$N` as a placeholder for your actual name
- Color codes: `{red}`, `{blue}`, `{green}`, `{yellow}`, `{cyan}`, `{magenta}`, `{bold}`, `{dim}`, `{/}` (reset)
- Maximum 100 characters
- Must include `$N` or your actual name

#### settings (set)
View and manage your personal settings.

```
settings                    # List all settings by category
settings <setting>          # Show details for a setting
settings <setting> <value>  # Change a setting
settings reset <setting>    # Reset a setting to default
settings reset all          # Reset all settings to defaults
```

Settings are organized by category (display, communication, gameplay) and include options like:
- `brief` - Show brief room descriptions
- `compact` - Compact inventory display
- `autoloot` - Automatically loot defeated enemies
- And more

#### mon
Toggle the vitals monitor display.

```
mon             # Show current status
mon on          # Enable vitals monitor
mon off         # Disable vitals monitor
```

### Session

#### save
Manually save your character.

```
save                     # Save character data
```

Characters are auto-saved periodically, but manual save ensures changes are persisted.

#### quit
Disconnect from the game.

```
quit
```

Saves your character and disconnects cleanly.

## Builder Commands

Available to players with Builder permission level or higher.

### Navigation

#### goto (teleport, tp)
Teleport to a player's location or to a room by path.

```
goto Hero                   # Teleport to a player's location
goto /areas/town/center     # Go to a room by absolute path
goto tavern                 # Go to a room relative to current directory
```

The command first tries to find an active player by name (even if link-dead). If no player is found, it treats the argument as a room path and resolves it relative to your current working directory. Rooms are loaded from disk if not already in memory.

#### home
Teleport to your personal workroom.

```
home                        # Teleport to /users/<name>/workroom
```

Creates a magical teleport effect visible to others in the room. Your workroom must exist at `/users/<name>/workroom.ts`.

#### summon
Teleport another player to your location.

```
summon Hero                 # Bring Hero to your room
```

The summoned player sees a mystical portal effect.

#### whereami
Show detailed information about your current location.

```
whereami                    # Display room path and coordinates
```

### Communication

#### btalk
Send a message on the builder channel.

```
btalk Anyone know how to create a door?
```

Only visible to builders and above.

### Object Manipulation

#### clone
Create an instance of an object from a blueprint.

```
clone /std/sword            # Clone a sword into your inventory
clone /areas/town/goblin    # Clone an NPC into the room
```

#### dest (destruct)
Destroy an object.

```
dest sword                  # Destroy an item by name
dest goblin                 # Destroy an NPC
dest #12345                 # Destroy by object ID
```

#### zap
Instantly kill an NPC (builder power).

```
zap goblin                  # Kill an NPC instantly
```

Useful for testing or clearing stuck NPCs.

#### nohassle
Toggle invulnerability to NPC attacks.

```
nohassle                    # Toggle no-hassle mode
nohassle on                 # Enable (NPCs won't attack you)
nohassle off                # Disable
```

#### setmessage
Customize your enter/exit messages.

```
setmessage enter arrives in a flash of light.
setmessage exit vanishes in a puff of smoke.
setmessage clear enter      # Reset to default
```

Others see these messages when you move between rooms.

#### stats (bstat, @stat)
View detailed statistics about an object.

```
stats sword                 # View item stats
stats goblin                # View NPC stats
stats me                    # View your own stats
stats here                  # View current room stats
```

#### patch
Call a method on a living object with primitive arguments.

```
patch <target> <method> [args...]
```

Examples:
```
patch me set_hit_points 50       # Set your HP
patch me setBaseStat strength 15 # Set a stat
patch goblin setHealth 10        # Modify an NPC
patch me monitorEnabled true     # Enable monitor
```

Target can be:
- `me` - yourself
- Player name - another player
- NPC name - an NPC in your room

### Object Manipulation

#### update
Reload mudlib objects or commands from disk (true hot-reload).

```
update /std/room          # Reload a standard library object
update /areas/town/tavern # Reload a specific room
update here               # Reload the room you're in
update sword.ts           # Reload relative to current directory
update _look              # Reload a command (auto-finds in cmds directories)
update /cmds/player/_say  # Reload a command with full path
```

This is **true runtime hot-reload** - the code is recompiled from TypeScript and applied in memory. No server restart required!

**For Objects (rooms, items, NPCs):**
- Existing clones keep their old behavior (traditional LPMud style)
- New clones created after the update use the new code
- Use `destruct` + `clone` to force an existing clone to use new code

**For Commands:**
- All usages of the command immediately use the new code
- Command is found in `/cmds/player/`, `/cmds/builder/`, `/cmds/admin/`, or `/cmds/wizard/`
- Use just the command name (e.g., `_look`) or full path

### File System Commands

Builders have access to a full set of file system commands that emulate Linux. Each builder maintains their own current working directory (cwd).

The `~` character expands to the player's home directory at `/users/<playername>/`. For example, if logged in as "Hero", `~` expands to `/users/hero/`.

#### pwd
Print current working directory.

```
pwd
```

#### cd
Change directory.

```
cd /areas/town      # Absolute path
cd ..               # Parent directory
cd subdir           # Relative path
cd                  # Go to home directory (~)
cd ~                # Go to home directory (/users/<name>/)
cd ~/projects       # Go to ~/projects
cd -                # Go to previous directory
```

#### ls (dir)
List files and directories.

```
ls                  # List current directory
ls -l               # Long format with details
ls -a               # Show hidden files
ls -la              # Long format with hidden files
ls /areas           # List specific directory
```

#### cat (more)
Display file contents.

```
cat file.ts         # Display entire file
cat -n file.ts      # With line numbers
cat -h 20 file.ts   # First 20 lines (head)
cat -t 10 file.ts   # Last 10 lines (tail)
```

#### mkdir
Create directories.

```
mkdir newdir        # Create directory
mkdir -p a/b/c      # Create with parents
```

#### rmdir
Remove directories.

```
rmdir emptydir      # Remove empty directory
rmdir -r dir        # Remove recursively (careful!)
```

#### rm (del)
Remove files.

```
rm file.ts          # Remove file
rm -f critical.ts   # Force remove without warning
```

#### mv (rename)
Move or rename files and directories.

```
mv oldname.ts newname.ts   # Rename
mv file.ts /other/dir/     # Move to directory
```

#### cp (copy)
Copy files.

```
cp original.ts copy.ts     # Copy file
cp file.ts /backup/        # Copy to directory
```

#### cat (more)
Display file contents with paging.

```
cat file.ts             # Display entire file
cat -n file.ts          # With line numbers
cat -h 20 file.ts       # First 20 lines (head)
cat -t 10 file.ts       # Last 10 lines (tail)
cat -a file.ts          # All without paging
cat here                # View current room's source file
```

#### ed (edit)
Online line editor for creating and editing files.

```
ed newfile.ts           # Create/edit a file
ed here                 # Edit the current room
```

Once in the editor:
- `h` - Show help
- `p` - Print lines (e.g., `p`, `p 5`, `p 1,10`, `%p`)
- `a` - Append lines (end with `.` on own line)
- `i 5` - Insert before line 5
- `d 5` - Delete line 5
- `d 3,7` - Delete lines 3-7
- `c 5` - Change line 5
- `s/old/new/` - Substitute on current line
- `s/old/new/g` - Substitute all occurrences
- `w` - Save file
- `q` - Quit (warns if unsaved)
- `wq` - Save and quit

#### ide
Open a visual code editor in the web client.

```
ide file.ts             # Open file in visual editor
ide here                # Edit current room in IDE
```

Features:
- Syntax highlighting for TypeScript
- Line numbers
- Search/replace (Ctrl+F)
- Real-time error display on save
- Keyboard shortcuts: Ctrl+S (save), Escape (close)

### AI Content Generation

These commands use the Claude AI API to generate game content. They require `CLAUDE_API_KEY` to be configured in the `.env` file.

#### aidescribe (aid)
Generate AI descriptions for game objects.

```
aidescribe <type> <name> [theme/keywords]
```

Types: `room`, `item`, `npc`, `weapon`, `armor`

Examples:
```
aidescribe room "Dusty Library" fantasy
aidescribe npc "Old Blacksmith" "gruff, experienced"
aidescribe weapon "Iron Sword" "rusty, old"
aidescribe item "Leather Bag" "worn, travel"
```

Generates short and long descriptions. Uses world lore from the lore daemon for consistency.

#### airoom
Generate a complete room definition using AI.

```
airoom <theme> [exits]
```

Examples:
```
airoom "abandoned mine"
airoom "cozy tavern" "north,east,west"
airoom "forest clearing" "north,south,east,west"
airoom "dark dungeon cell" "north"
```

Generates:
- Short and long descriptions
- Terrain type
- Suggested items
- Suggested NPCs
- Ambiance message
- Code snippet ready to copy

Uses world lore for consistency with the game world.

#### ainpc
Generate a complete NPC definition using AI.

```
ainpc <name> <role> [personality]
```

Examples:
```
ainpc "Old Fisherman" "quest giver" "grumpy, knows about sea monsters"
ainpc "Blacksmith" "merchant" "gruff, experienced, former soldier"
ainpc "Town Guard" "guard" "vigilant, by-the-book"
ainpc "Mysterious Stranger" "information broker"
```

Generates:
- Short and long descriptions
- Personality and background
- Speaking style (formality, verbosity, accent)
- Chat messages (idle actions)
- Static responses (fallback triggers)
- Knowledge topics and forbidden subjects
- Local knowledge facts
- Complete code snippet with AI context

Uses world lore and provides matching lore IDs for the NPC's `worldLore` configuration.

### Lore Management

#### lore
Manage world lore entries for AI consistency.

```
lore list [category]              # List all lore entries
lore show <id>                    # Show a specific entry
lore add <category> <title>       # Add new lore (opens IDE)
lore edit <id>                    # Edit existing lore (opens IDE)
lore remove <id>                  # Remove a lore entry
lore generate <category> <title> [theme]  # AI-generate lore
lore search <keyword>             # Search lore content
lore tags                         # List all tags
```

Categories: `world`, `region`, `faction`, `history`, `character`, `event`, `item`, `creature`, `location`, `economics`, `mechanics`, `faith`

Examples:
```
lore list                         # List all lore
lore list faction                 # List faction lore only
lore show faith:sun-god           # Show specific entry
lore add faith "Moon Goddess"     # Add new entry (opens IDE)
lore edit region:valdoria         # Edit existing entry
lore generate event "The Great Fire" "destruction, city, tragedy"
lore search dragon                # Search for dragon-related lore
lore tags                         # Show all unique tags
```

The `add` and `edit` subcommands open the IDE with a JSON template for editing. The `generate` subcommand uses AI to create new lore entries.

Lore entries are stored in `/data/lore/entries.json` and are automatically loaded on server start.

See [Daemons > Lore Daemon](daemons.md#lore-daemon) and [AI Integration Guide](ai-integration.md) for details.

## Admin Commands

Available only to administrators.

### Communication

#### atalk
Send a message on the admin channel.

```
atalk Server restart in 5 minutes
```

Only visible to administrators.

### Configuration

#### config (mudconfig)
View and manage mud-wide configuration settings.

```
config                      # List all settings with values
config <key>                # View a specific setting
config <key> <value>        # Change a setting
config reset <key>          # Reset a setting to default
```

Examples:
```
config                                  # Show all settings
config disconnect.timeoutMinutes        # View disconnect timeout
config disconnect.timeoutMinutes 30     # Set to 30 minutes
config reset disconnect.timeoutMinutes  # Reset to default (15)
```

Available settings:
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `disconnect.timeoutMinutes` | number | 15 | Minutes before disconnected player is force-quit |

Settings are persisted to `/data/config/settings.json` and survive server restarts.

### System

#### reload (reloadcmds)
Reload all commands from disk.

```
reload
reloadcmds
```

Use after modifying command files to apply changes without restarting.

## Creating Custom Commands

Commands are TypeScript files in the `/mudlib/cmds/` directory.

### Basic Structure

```typescript
// /mudlib/cmds/player/_mycommand.ts
import type { MudObject } from '../../std/object.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['mycommand', 'mc'];  // Command name and aliases
export const description = 'Description for help';
export const usage = 'mycommand <args>';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;

  if (!args) {
    ctx.sendLine('Usage: mycommand <something>');
    return;
  }

  ctx.sendLine(`You did mycommand with: ${args}`);
}
```

### File Naming

- Files must start with underscore: `_commandname.ts`
- Place in appropriate directory based on permission level:
  - `/cmds/player/` - All players
  - `/cmds/builder/` - Builders and above
  - `/cmds/admin/` - Admins only

### Command Context

The `ctx` parameter provides:

| Property | Type | Description |
|----------|------|-------------|
| `player` | MudObject | The player executing the command |
| `args` | string | Arguments passed to the command |
| `verb` | string | The command verb used |
| `send(msg)` | function | Send raw output |
| `sendLine(msg)` | function | Send output with newline |
| `savePlayer()` | function | Save player data (async) |

### Async Commands

Commands can be async for operations that need to wait:

```typescript
export async function execute(ctx: CommandContext): Promise<void> {
  ctx.sendLine('Loading...');
  await someAsyncOperation();
  ctx.sendLine('Done!');
}
```

### Accessing Efuns

Efuns are globally available in all mudlib code - you don't need to declare them:

```typescript
export function execute(ctx: CommandContext): void {
  // Efuns are globally available
  const players = efuns.allPlayers();
  ctx.sendLine(`There are ${players.length} players online.`);

  // Other common efuns
  const room = efuns.environment(ctx.player);
  const now = efuns.time();
  const randomNum = efuns.random(100);
}
```

See [Efuns Reference](efuns.md) for the complete API.

### Example: Emote Command

```typescript
// /mudlib/cmds/player/_emote.ts
import type { MudObject } from '../../std/object.js';

interface CommandContext {
  player: MudObject;
  args: string;
  sendLine(message: string): void;
}

interface Room extends MudObject {
  broadcast(message: string, options?: { exclude?: MudObject[] }): void;
}

export const name = ['emote', 'em', ':'];
export const description = 'Perform an emote';
export const usage = 'emote <action>';

export function execute(ctx: CommandContext): void {
  const { player, args } = ctx;

  if (!args) {
    ctx.sendLine('Emote what?');
    return;
  }

  const room = player.environment as Room | null;
  if (!room) return;

  const playerName = (player as { name?: string }).name ?? 'Someone';
  room.broadcast(`${playerName} ${args}`);
}
```

## Command Loading

Commands are automatically loaded when the server starts. To reload commands after changes:

1. **Admins**: Use the `reload` command in-game
2. **Development**: Restart the server with `npm run dev`

## Best Practices

1. **Validate Input** - Always check if required arguments are provided
2. **Give Feedback** - Inform players what happened
3. **Handle Errors** - Gracefully handle missing objects or invalid states
4. **Use Aliases** - Provide short aliases for common commands
5. **Document Usage** - Set meaningful `description` and `usage` exports
6. **Check Permissions** - Verify player has access to restricted features
