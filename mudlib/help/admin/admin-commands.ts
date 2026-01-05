/**
 * Admin help topics - Administrative commands.
 */

import type { HelpFileDefinition } from '../../lib/help-loader.js';

export const topics: HelpFileDefinition[] = [
  {
    name: 'apromote',
    title: 'Promoting Players',
    category: 'admin',
    aliases: ['@promote', 'promote'],
    keywords: ['permission', 'level', 'builder', 'admin'],
    content: `{bold}@promote Command:{/}
Change a player's permission level.

{bold}Usage:{/}
  {yellow}@promote <player> <level>{/}

{bold}Permission Levels:{/}
  {white}0{/} - Player (default)
  {cyan}1{/} - Builder (can create content)
  {yellow}2{/} - Senior Builder (expanded access)
  {red}3{/} - Administrator (full access)

{bold}Examples:{/}
  {yellow}@promote Bob 1{/}    - Make Bob a builder
  {yellow}@promote Alice 3{/}  - Make Alice an admin

{bold}Notes:{/}
- Players must be online to be promoted
- New permissions take effect immediately
- Changes are saved with the player
- Only admins can promote to admin level

{bold}Related:{/}
  {yellow}@demote <player>{/} - Lower permission level
  {yellow}@who -l{/}          - List players with levels`,
    seeAlso: ['administration', 'ademote'],
  },
  {
    name: 'ademote',
    title: 'Demoting Players',
    category: 'admin',
    aliases: ['@demote', 'demote'],
    keywords: ['permission', 'level', 'revoke'],
    content: `{bold}@demote Command:{/}
Lower a player's permission level.

{bold}Usage:{/}
  {yellow}@demote <player>{/}        - Lower by one level
  {yellow}@demote <player> <level>{/} - Set to specific level

{bold}Examples:{/}
  {yellow}@demote Bob{/}      - Lower Bob's level by 1
  {yellow}@demote Alice 0{/}  - Return Alice to player status

{bold}Caution:{/}
- Demoting a builder revokes their building access
- Objects they created remain in the game
- Consider warning the player first`,
    seeAlso: ['administration', 'apromote'],
  },
  {
    name: 'aban',
    title: 'Banning Players',
    category: 'admin',
    aliases: ['@ban', 'ban'],
    keywords: ['block', 'kick', 'remove', 'punish'],
    content: `{bold}@ban Command:{/}
Prevent a player from connecting to the game.

{bold}Usage:{/}
  {yellow}@ban <player> [reason]{/}
  {yellow}@ban <player> -time <duration> [reason]{/}

{bold}Examples:{/}
  {yellow}@ban Troll harassment{/}
  {yellow}@ban Spammer -time 24h spamming chat{/}
  {yellow}@ban Cheater -time 7d exploiting bugs{/}

{bold}Duration Formats:{/}
  {cyan}1h{/}  - 1 hour
  {cyan}24h{/} - 24 hours
  {cyan}7d{/}  - 7 days
  {cyan}30d{/} - 30 days
  (no time = permanent)

{bold}What Happens:{/}
1. Player is immediately disconnected
2. Their IP/account is blocked
3. Ban is logged with reason
4. Temporary bans expire automatically

{bold}Viewing Bans:{/}
  {yellow}@bans{/}           - List all active bans
  {yellow}@unban <player>{/} - Remove a ban

{bold}Note:{/}
Always include a reason for documentation.`,
    seeAlso: ['administration', 'aunban', 'akick'],
  },
  {
    name: 'akick',
    title: 'Kicking Players',
    category: 'admin',
    aliases: ['@kick', 'kick'],
    keywords: ['disconnect', 'remove'],
    content: `{bold}@kick Command:{/}
Forcibly disconnect a player.

{bold}Usage:{/}
  {yellow}@kick <player> [reason]{/}

{bold}Examples:{/}
  {yellow}@kick Bob causing trouble{/}
  {yellow}@kick AFK idle for too long{/}

{bold}Notes:{/}
- Player can reconnect immediately
- Use {yellow}@ban{/} to prevent reconnection
- The reason is shown to the player
- Action is logged

{bold}Alternative:{/}
- For persistent problems, use {yellow}@ban{/} with a time limit`,
    seeAlso: ['administration', 'aban'],
  },
  {
    name: 'abroadcast',
    title: 'System Broadcasts',
    category: 'admin',
    aliases: ['@broadcast', 'broadcast', '@wall'],
    keywords: ['announce', 'message', 'all'],
    content: `{bold}@broadcast Command:{/}
Send a message to all connected players.

{bold}Usage:{/}
  {yellow}@broadcast <message>{/}

{bold}Examples:{/}
  {yellow}@broadcast Server will restart in 5 minutes.{/}
  {yellow}@broadcast Welcome to our new players!{/}

{bold}Formatting:{/}
The message supports color codes:
  {yellow}@broadcast {red}URGENT:{/} Server maintenance soon!{/}

{bold}Related:{/}
  {yellow}@wall{/} - Alias for broadcast
  {yellow}shout{/} - Regular player shout (not a system message)`,
    seeAlso: ['administration', 'ashutdown'],
  },
  {
    name: 'ashutdown',
    title: 'Server Shutdown',
    category: 'admin',
    aliases: ['@shutdown', 'shutdown'],
    keywords: ['stop', 'server', 'maintenance'],
    content: `{bold}@shutdown Command:{/}
Shut down the game server.

{bold}Usage:{/}
  {yellow}@shutdown [delay] [reason]{/}

{bold}Examples:{/}
  {yellow}@shutdown{/}                    - Immediate shutdown
  {yellow}@shutdown 5m maintenance{/}     - 5 minute warning
  {yellow}@shutdown 1h server upgrade{/}  - 1 hour warning

{bold}What Happens:{/}
1. Warning broadcast to all players
2. Countdown begins (if delay specified)
3. All players are saved and disconnected
4. Server process exits

{bold}Canceling:{/}
  {yellow}@shutdown -cancel{/}

{bold}{red}CAUTION:{/}
- Always give players time to save
- Announce the reason
- Coordinate with other admins`,
    seeAlso: ['administration', 'abroadcast'],
  },
];

export default topics;
