/**
 * Builder help topics - Basic building concepts.
 */

import type { HelpFileDefinition } from '../../lib/help-loader.js';

export const topics: HelpFileDefinition[] = [
  {
    name: 'bset',
    title: 'Setting Object Properties',
    category: 'building',
    aliases: ['@set', 'setprop'],
    keywords: ['property', 'modify', 'change'],
    content: `{bold}@set Command:{/}
Set properties on game objects.

{bold}Usage:{/}
  {yellow}@set <object> <property> <value>{/}

{bold}Common Properties:{/}
  {cyan}shortDesc{/}  - Brief description (shown in room)
  {cyan}longDesc{/}   - Full description (when examined)
  {cyan}name{/}       - Object's internal name
  {cyan}weight{/}     - Object weight (for items)
  {cyan}value{/}      - Object value in gold

{bold}Examples:{/}
  {yellow}@set sword shortDesc a gleaming sword{/}
  {yellow}@set here longDesc A dark and dusty room.{/}
  {yellow}@set chest value 100{/}

{bold}Special Properties:{/}
  {cyan}noget{/}    - Item cannot be picked up
  {cyan}nodrop{/}   - Item cannot be dropped
  {cyan}invisible{/} - Object is hidden

{bold}Notes:{/}
- Use {yellow}@stat <object>{/} to see current properties
- Some properties require specific permissions
- Changes take effect immediately`,
    seeAlso: ['building', 'bstat', 'bcreate'],
  },
  {
    name: 'bstat',
    title: 'Viewing Object Statistics',
    category: 'building',
    aliases: ['@stat', 'examine'],
    keywords: ['info', 'properties', 'debug'],
    content: `{bold}@stat Command:{/}
View detailed information about an object.

{bold}Usage:{/}
  {yellow}@stat{/}           - Stat the current room
  {yellow}@stat <object>{/}  - Stat a specific object
  {yellow}@stat me{/}        - Stat yourself

{bold}Information Shown:{/}
  {cyan}Object ID{/}    - Unique identifier
  {cyan}Object Path{/}  - File path of the object
  {cyan}Environment{/}  - What contains this object
  {cyan}Inventory{/}    - What this object contains
  {cyan}Properties{/}   - All custom properties
  {cyan}Actions{/}      - Registered action verbs

{bold}For Rooms:{/}
  {cyan}Exits{/}        - All configured exits
  {cyan}Light Level{/}  - Room brightness

{bold}For Living Objects:{/}
  {cyan}Health{/}       - Current/max health
  {cyan}Stats{/}        - Strength, dex, etc.

{bold}Tips:{/}
- Use {yellow}@stat here{/} for the current room
- Use {yellow}@stat <player>{/} to examine players`,
    seeAlso: ['building', 'bset', 'bcreate'],
  },
  {
    name: 'bdig',
    title: 'Digging New Rooms',
    category: 'building',
    aliases: ['@dig', 'dig'],
    keywords: ['room', 'create', 'exit', 'connect'],
    content: `{bold}@dig Command:{/}
Create a new room connected to your current location.

{bold}Usage:{/}
  {yellow}@dig <direction> <room_path>{/}

{bold}Examples:{/}
  {yellow}@dig north /areas/myzone/hallway{/}
  {yellow}@dig east /areas/myzone/garden{/}

{bold}What Happens:{/}
1. A new room file is created at the specified path
2. An exit is created from your current room
3. A return exit is created in the new room
4. The new room has default descriptions

{bold}After Digging:{/}
- Use {yellow}@set here shortDesc ...{/} to set the title
- Use {yellow}@set here longDesc ...{/} to set the description
- Add more exits with {yellow}@link{/}

{bold}Permissions:{/}
- You can only dig in areas you have write access to
- Check with your admin for your assigned areas`,
    seeAlso: ['building', 'blink', 'bunlink'],
  },
  {
    name: 'blink',
    title: 'Linking Rooms',
    category: 'building',
    aliases: ['@link', 'link'],
    keywords: ['exit', 'connect', 'passage'],
    content: `{bold}@link Command:{/}
Create an exit from the current room to another room.

{bold}Usage:{/}
  {yellow}@link <direction> <room_path>{/}

{bold}Examples:{/}
  {yellow}@link north /areas/valdoria/aldric/market{/}
  {yellow}@link up /areas/tower/second_floor{/}

{bold}One-Way vs Two-Way:{/}
  {yellow}@link{/} creates a one-way exit by default
  {yellow}@link -both <dir> <path>{/} creates exits in both directions

{bold}Special Exits:{/}
  {yellow}@link enter /areas/cave/entrance{/}
  {yellow}@link climb /areas/tree/top{/}

{bold}Conditional Exits:{/}
Some exits can have conditions:
- Require a key
- Require minimum level
- Require specific class
Contact an admin for help with these.

{bold}Removing Exits:{/}
Use {yellow}@unlink <direction>{/} to remove an exit.`,
    seeAlso: ['building', 'bdig', 'bunlink'],
  },
  {
    name: 'bunlink',
    title: 'Removing Exits',
    category: 'building',
    aliases: ['@unlink', 'unlink'],
    keywords: ['exit', 'remove', 'delete'],
    content: `{bold}@unlink Command:{/}
Remove an exit from the current room.

{bold}Usage:{/}
  {yellow}@unlink <direction>{/}

{bold}Examples:{/}
  {yellow}@unlink north{/}
  {yellow}@unlink up{/}

{bold}Notes:{/}
- This only removes the exit from the current room
- The destination room is not affected
- The return exit (if any) is not removed
- Use {yellow}@unlink{/} in the destination to remove the return

{bold}Caution:{/}
- Removing exits can strand players
- Make sure there's another way out
- Consider temporarily blocking instead`,
    seeAlso: ['building', 'blink', 'bdig'],
  },
  {
    name: 'patch',
    title: 'Patching Living Objects',
    category: 'building',
    aliases: ['bpatch'],
    keywords: ['modify', 'living', 'health', 'mana', 'stats', 'debug', 'test'],
    content: `{bold}patch Command:{/}
Call methods or set properties on living objects in real-time.

{bold}Usage:{/}
  {yellow}patch <target> <method/property> [args...]{/}

{bold}Targets:{/}
  {cyan}me{/}, {cyan}self{/}, {cyan}myself{/} - Yourself
  {cyan}<name>{/}              - Any living in the room by name

{bold}Getting Values:{/}
  {yellow}patch me health{/}        - Show current health
  {yellow}patch me level{/}         - Show current level
  {yellow}patch goblin alive{/}     - Check if goblin is alive

{bold}Setting Properties:{/}
  {yellow}patch me health 50{/}     - Set HP to 50
  {yellow}patch me mana 25{/}       - Set MP to 25
  {yellow}patch me maxHealth 200{/} - Set max HP
  {yellow}patch me level 10{/}      - Set level to 10
  {yellow}patch me experience 500{/} - Set XP

{bold}Calling Methods:{/}
  {yellow}patch me setBaseStat strength 15{/}
  {yellow}patch me setStatModifier dexterity 5{/}
  {yellow}patch me heal 25{/}
  {yellow}patch me gainExperience 100{/}
  {yellow}patch goblin takeDamage 10{/}

{bold}Value Types:{/}
  Numbers:  {cyan}50{/}, {cyan}3.14{/}, {cyan}-10{/}
  Booleans: {cyan}true{/}, {cyan}false{/}
  Strings:  {cyan}hello{/} or {cyan}"hello world"{/}

{bold}Common Properties:{/}
  {cyan}health{/}     - Current hit points
  {cyan}maxHealth{/}  - Maximum hit points
  {cyan}mana{/}       - Current mana points
  {cyan}maxMana{/}    - Maximum mana points
  {cyan}level{/}      - Character level
  {cyan}experience{/} - Experience points
  {cyan}alive{/}      - Living/dead status (read-only)

{bold}Common Methods:{/}
  {cyan}heal(amount){/}           - Restore health
  {cyan}takeDamage(amount){/}     - Deal damage
  {cyan}setBaseStat(stat, val){/} - Set a base stat
  {cyan}setStatModifier(stat, val){/} - Set stat bonus
  {cyan}gainExperience(amount){/} - Add XP

{bold}Tips:{/}
- Use this for testing and debugging
- Changes take effect immediately
- Be careful modifying other players`,
    seeAlso: ['building', 'bstat', 'bset'],
  },
  {
    name: 'ide',
    title: 'Visual IDE Editor',
    category: 'building',
    aliases: ['visual-editor', 'code-editor'],
    keywords: ['edit', 'code', 'syntax', 'highlighting'],
    content: `{bold}IDE Command:{/}
Open a full-featured code editor in your browser.

{bold}Usage:{/}
  {yellow}ide <file>{/}     - Open file for editing
  {yellow}ide here{/}       - Edit current room's source file
  {yellow}ide ~/file.ts{/}  - Edit in your home directory

{bold}Features:{/}
- Syntax highlighting for TypeScript/JavaScript
- Line numbers and code navigation
- Search/Replace (Ctrl+F)
- Auto-indent and bracket matching
- Real-time compile error display

{bold}Keyboard Shortcuts:{/}
  {cyan}Ctrl+S{/}    - Save file
  {cyan}Escape{/}    - Close editor (prompts if unsaved)
  {cyan}Ctrl+F{/}    - Find/Replace

{bold}Examples:{/}
  {yellow}ide /areas/town/tavern.ts{/}
  {yellow}ide here{/}
  {yellow}ide ~/workroom.ts{/}`,
    seeAlso: ['ed', 'cat', 'update'],
  },
  {
    name: 'ed',
    title: 'Line Editor',
    category: 'building',
    aliases: ['edit', 'line-editor'],
    keywords: ['edit', 'text', 'classic'],
    content: `{bold}ED Command:{/}
Classic line-based text editor.

{bold}Usage:{/}
  {yellow}ed <file>{/}      - Open file for editing
  {yellow}ed here{/}        - Edit current room's source

{bold}Editor Commands:{/}
  {cyan}h{/}              - Show help
  {cyan}p{/}              - Print current line
  {cyan}p <n>{/}          - Print line n
  {cyan}p <n>,<m>{/}      - Print lines n through m
  {cyan}%p{/}             - Print all lines
  {cyan}<n>{/}            - Go to line n
  {cyan}a{/}              - Append lines (end with . on own line)
  {cyan}i <n>{/}          - Insert before line n
  {cyan}d <n>{/}          - Delete line n
  {cyan}d <n>,<m>{/}      - Delete lines n through m
  {cyan}c <n>{/}          - Change line n
  {cyan}s/old/new/{/}     - Substitute on current line
  {cyan}s/old/new/g{/}    - Substitute all occurrences
  {cyan}w{/}              - Write (save) file
  {cyan}q{/}              - Quit (warns if unsaved)
  {cyan}q!{/}             - Quit without saving
  {cyan}wq{/}             - Write and quit`,
    seeAlso: ['ide', 'cat', 'update'],
  },
  {
    name: 'cat',
    title: 'View File Contents',
    category: 'building',
    aliases: ['more', 'view', 'type'],
    keywords: ['read', 'display', 'show', 'file'],
    content: `{bold}CAT Command:{/}
Display file contents with paging support.

{bold}Usage:{/}
  {yellow}cat <file>{/}        - Display file (paged)
  {yellow}cat -n <file>{/}     - Display with line numbers
  {yellow}cat -h <n> <file>{/} - First n lines (head)
  {yellow}cat -t <n> <file>{/} - Last n lines (tail)
  {yellow}cat -a <file>{/}     - All without paging
  {yellow}cat here{/}          - View current room's source

{bold}Paging Controls:{/}
  {cyan}Enter/Space{/}  - Next page
  {cyan}b{/}            - Previous page
  {cyan}g/G{/}          - Go to beginning/end
  {cyan}/<pattern>{/}   - Search
  {cyan}n{/}            - Next search result
  {cyan}q{/}            - Quit

{bold}Examples:{/}
  {yellow}cat /std/room.ts{/}
  {yellow}cat -n here{/}
  {yellow}cat -h 50 ~/workroom.ts{/}`,
    seeAlso: ['ed', 'ide', 'ls'],
  },
  {
    name: 'home',
    title: 'Go to Workroom',
    category: 'building',
    aliases: ['workroom'],
    keywords: ['teleport', 'office', 'base'],
    content: `{bold}HOME Command:{/}
Teleport to your personal workroom.

{bold}Usage:{/}
  {yellow}home{/}

{bold}Workroom Location:{/}
Your workroom is located at:
  /users/<yourname>/workroom

{bold}Notes:{/}
- Creates the workroom if it doesn't exist
- Loads the room from disk if not in memory
- Great for building and testing

{bold}Related:{/}
  {yellow}goto{/}    - Go to any room
  {yellow}summon{/}  - Bring a player to you`,
    seeAlso: ['goto', 'summon', 'whereami'],
  },
  {
    name: 'update',
    title: 'Reload Objects',
    category: 'building',
    aliases: ['reload', 'refresh'],
    keywords: ['compile', 'reload', 'hot-reload'],
    content: `{bold}UPDATE Command:{/}
Reload a mudlib object from disk.

{bold}Usage:{/}
  {yellow}update <object>{/}  - Reload specified object
  {yellow}update here{/}      - Reload current room
  {yellow}update{/}           - Reload current room

{bold}Path Resolution:{/}
- Relative paths resolve against your cwd
- Use absolute paths for certainty
- 'here' means current room

{bold}Examples:{/}
  {yellow}update here{/}
  {yellow}update /areas/town/tavern{/}
  {yellow}update sword.ts{/}  (from current directory)

{bold}Notes:{/}
- Changes take effect immediately
- Existing instances are updated
- Compile errors are reported`,
    seeAlso: ['ide', 'ed', 'rehash'],
  },
];

export default topics;
