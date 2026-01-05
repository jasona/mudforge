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

### Information

#### look (l)
Examine your surroundings or an object.

```
look              # Look at the room
look sword        # Look at an object
l                 # Alias for look
```

#### inventory (i, inv)
See what you are carrying.

```
inventory
i
inv
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

Declare efuns at the top of your command file:

```typescript
declare const efuns: {
  allPlayers(): MudObject[];
  findObject(path: string): MudObject | undefined;
  send(target: MudObject, message: string): void;
};

export function execute(ctx: CommandContext): void {
  const players = efuns.allPlayers();
  ctx.sendLine(`There are ${players.length} players online.`);
}
```

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
