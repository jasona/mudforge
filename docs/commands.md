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
get all                  # Pick up all items in the room
get sword from chest     # Get an item from a container
get all from chest       # Get all items from a container
```

#### drop (put)
Drop items or put them in containers.

```
drop sword               # Drop an item on the floor
drop all                 # Drop all items
drop sword in chest      # Put an item in a container
put sword in chest       # Same as drop ... in
```

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

### Character Customization

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

#### mon
Toggle the vitals monitor display.

```
mon             # Show current status
mon on          # Enable vitals monitor
mon off         # Disable vitals monitor
```

### Session

#### quit
Disconnect from the game.

```
quit
```

Saves your character and disconnects cleanly.

## Builder Commands

Available to players with Builder permission level or higher.

### Navigation

#### goto
Teleport to a location.

```
goto /areas/town/center     # Go to a room by path
goto Hero                   # Go to a player
```

### Communication

#### btalk
Send a message on the builder channel.

```
btalk Anyone know how to create a door?
```

Only visible to builders and above.

### Object Manipulation

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

#### ed (edit)
Online line editor for creating and editing files.

```
ed newfile.ts       # Create/edit a file
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

## Admin Commands

Available only to administrators.

### Communication

#### atalk
Send a message on the admin channel.

```
atalk Server restart in 5 minutes
```

Only visible to administrators.

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
