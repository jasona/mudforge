/**
 * Help Daemon - Manages the in-game help system.
 *
 * Provides organized help topics with access control based on:
 * - Permission level (player, builder, admin)
 * - Class membership (fighter, thief, mage, etc.)
 * - Custom groups (guilds, clans, etc.)
 *
 * Also supports dynamic command help via getCommandInfo efun.
 */

import { MudObject } from '../std/object.js';

declare const efuns: {
  getCommandInfo(name: string): {
    names: string[];
    filePath: string;
    level: number;
    description: string;
    usage?: string | undefined;
  } | undefined;
  getAvailableCommands(level?: number): Array<{
    name: string;
    names: string[];
    description: string;
    usage?: string;
    level: number;
  }>;
};

/**
 * Access requirements for help topics.
 */
export interface HelpAccess {
  /** Minimum permission level required (0=player, 1=builder, 2=senior, 3=admin) */
  minPermission?: number;
  /** Required class (e.g., 'fighter', 'thief') */
  requiredClass?: string;
  /** Required property key/value pair (e.g., for guild membership) */
  requiredProperty?: { key: string; value: unknown };
  /** If true, topic is hidden from listings but still accessible */
  hidden?: boolean;
}

/**
 * Help topic structure.
 */
export interface HelpTopic {
  /** Unique topic name (used for lookup) */
  name: string;
  /** Display title */
  title: string;
  /** Category for organization */
  category: HelpCategory;
  /** The help content (supports color tokens) */
  content: string;
  /** Alternative names for this topic */
  aliases?: string[];
  /** Related topic names */
  seeAlso?: string[];
  /** Access requirements */
  access?: HelpAccess;
  /** Keywords for search */
  keywords?: string[];
}

/**
 * Help categories.
 */
export type HelpCategory =
  | 'commands'      // Command reference
  | 'gameplay'      // General gameplay info
  | 'combat'        // Combat system
  | 'classes'       // Class-specific
  | 'skills'        // Skills and abilities
  | 'items'         // Items and equipment
  | 'world'         // World/lore
  | 'communication' // Chat and channels
  | 'building'      // Builder tools
  | 'admin'         // Admin tools
  | 'system';       // System/technical

/**
 * Category display names and descriptions.
 */
export const CATEGORY_INFO: Record<HelpCategory, { name: string; description: string; color: string }> = {
  commands: { name: 'Commands', description: 'Available commands and how to use them', color: 'cyan' },
  gameplay: { name: 'Gameplay', description: 'General gameplay information', color: 'green' },
  combat: { name: 'Combat', description: 'Combat system and mechanics', color: 'red' },
  classes: { name: 'Classes', description: 'Character classes and abilities', color: 'magenta' },
  skills: { name: 'Skills', description: 'Skills and how to use them', color: 'yellow' },
  items: { name: 'Items', description: 'Items, equipment, and inventory', color: 'yellow' },
  world: { name: 'World', description: 'Lore and world information', color: 'blue' },
  communication: { name: 'Communication', description: 'Chat, channels, and social features', color: 'cyan' },
  building: { name: 'Building', description: 'Builder tools and techniques', color: 'MAGENTA' },
  admin: { name: 'Administration', description: 'Administrative tools and commands', color: 'RED' },
  system: { name: 'System', description: 'Technical and system information', color: 'dim' },
};

/**
 * Player interface for help access checks.
 */
interface HelpPlayer extends MudObject {
  name: string;
  receive(message: string): void;
  getProperty(key: string): unknown;
  permissionLevel?: number;
}

/**
 * Help Daemon class.
 */
export class HelpDaemon extends MudObject {
  private _topics: Map<string, HelpTopic> = new Map();
  private _aliases: Map<string, string> = new Map(); // alias -> topic name

  constructor() {
    super();
    this.shortDesc = 'Help Daemon';
    this.longDesc = 'The help daemon manages the in-game help system.';

    // Register default help topics
    this.registerDefaultTopics();
  }

  /**
   * Register a help topic.
   */
  registerTopic(topic: HelpTopic): boolean {
    const name = topic.name.toLowerCase();

    if (this._topics.has(name)) {
      return false; // Topic already exists
    }

    this._topics.set(name, topic);

    // Register aliases
    if (topic.aliases) {
      for (const alias of topic.aliases) {
        this._aliases.set(alias.toLowerCase(), name);
      }
    }

    return true;
  }

  /**
   * Unregister a help topic.
   */
  unregisterTopic(name: string): boolean {
    const topicName = name.toLowerCase();
    const topic = this._topics.get(topicName);

    if (!topic) {
      return false;
    }

    // Remove aliases
    if (topic.aliases) {
      for (const alias of topic.aliases) {
        this._aliases.delete(alias.toLowerCase());
      }
    }

    this._topics.delete(topicName);
    return true;
  }

  /**
   * Get a topic by name or alias.
   * Does not check commands - use getCommandHelp for that.
   */
  getTopic(name: string): HelpTopic | undefined {
    const lower = name.toLowerCase();

    // Try direct lookup
    let topic = this._topics.get(lower);
    if (topic) return topic;

    // Try alias lookup
    const realName = this._aliases.get(lower);
    if (realName) {
      return this._topics.get(realName);
    }

    return undefined;
  }

  /**
   * Get help for a topic, checking commands first.
   * Returns formatted help string or undefined.
   */
  getHelp(name: string, player: HelpPlayer): string | undefined {
    // First, check if it's a command
    const cmdHelp = this.getCommandHelp(name);
    if (cmdHelp) {
      return cmdHelp;
    }

    // Fall back to static topic
    const topic = this.getTopic(name);
    if (topic && this.canAccess(player, topic)) {
      return this.formatTopic(topic);
    }

    return undefined;
  }

  /**
   * Check if a player can access a topic.
   */
  canAccess(player: HelpPlayer, topic: HelpTopic): boolean {
    if (!topic.access) {
      return true; // No restrictions
    }

    const access = topic.access;

    // Check permission level
    if (access.minPermission !== undefined) {
      const playerLevel = player.permissionLevel ?? 0;
      if (playerLevel < access.minPermission) {
        return false;
      }
    }

    // Check class requirement
    if (access.requiredClass) {
      const playerClass = player.getProperty('class') as string | undefined;
      if (playerClass?.toLowerCase() !== access.requiredClass.toLowerCase()) {
        return false;
      }
    }

    // Check property requirement
    if (access.requiredProperty) {
      const value = player.getProperty(access.requiredProperty.key);
      if (value !== access.requiredProperty.value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all topics accessible to a player.
   */
  getAccessibleTopics(player: HelpPlayer): HelpTopic[] {
    const topics: HelpTopic[] = [];

    for (const topic of this._topics.values()) {
      if (this.canAccess(player, topic) && !topic.access?.hidden) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Get topics in a specific category accessible to a player.
   */
  getTopicsByCategory(player: HelpPlayer, category: HelpCategory): HelpTopic[] {
    return this.getAccessibleTopics(player).filter(t => t.category === category);
  }

  /**
   * Get available categories for a player.
   */
  getAvailableCategories(player: HelpPlayer): HelpCategory[] {
    const categories = new Set<HelpCategory>();

    for (const topic of this.getAccessibleTopics(player)) {
      categories.add(topic.category);
    }

    return Array.from(categories);
  }

  /**
   * Search topics by keyword.
   */
  searchTopics(player: HelpPlayer, query: string): HelpTopic[] {
    const lower = query.toLowerCase();
    const results: HelpTopic[] = [];

    for (const topic of this.getAccessibleTopics(player)) {
      // Check name
      if (topic.name.toLowerCase().includes(lower)) {
        results.push(topic);
        continue;
      }

      // Check title
      if (topic.title.toLowerCase().includes(lower)) {
        results.push(topic);
        continue;
      }

      // Check aliases
      if (topic.aliases?.some(a => a.toLowerCase().includes(lower))) {
        results.push(topic);
        continue;
      }

      // Check keywords
      if (topic.keywords?.some(k => k.toLowerCase().includes(lower))) {
        results.push(topic);
        continue;
      }

      // Check content (basic search)
      if (topic.content.toLowerCase().includes(lower)) {
        results.push(topic);
      }
    }

    return results;
  }

  /**
   * Format a topic for display.
   */
  formatTopic(topic: HelpTopic): string {
    const categoryInfo = CATEGORY_INFO[topic.category];
    const lines: string[] = [];

    // Header
    lines.push(`{bold}{${categoryInfo.color}}=== ${topic.title} ==={/}`);
    lines.push(`{dim}Category: ${categoryInfo.name}{/}`);
    lines.push('');

    // Content
    lines.push(topic.content);

    // Aliases
    if (topic.aliases && topic.aliases.length > 0) {
      lines.push('');
      lines.push(`{dim}Aliases: ${topic.aliases.join(', ')}{/}`);
    }

    // See Also
    if (topic.seeAlso && topic.seeAlso.length > 0) {
      lines.push('');
      lines.push(`{cyan}See also:{/} ${topic.seeAlso.join(', ')}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Format the main help index.
   */
  formatIndex(player: HelpPlayer): string {
    const categories = this.getAvailableCategories(player);
    const lines: string[] = [];

    lines.push('{bold}{cyan}=== Help System ==={/}');
    lines.push('');
    lines.push('Welcome to the help system. Use {yellow}help <topic>{/} to view help on a specific topic.');
    lines.push('');
    lines.push('{bold}Available Categories:{/}');

    for (const cat of categories) {
      const info = CATEGORY_INFO[cat];
      const count = this.getTopicsByCategory(player, cat).length;
      lines.push(`  {${info.color}}${info.name.padEnd(15)}{/} - ${info.description} {dim}(${count} topics){/}`);
    }

    lines.push('');
    lines.push('{dim}Commands:{/}');
    lines.push('  {yellow}help <topic>{/}      - View help on a topic');
    lines.push('  {yellow}help <category>{/}   - List topics in a category');
    lines.push('  {yellow}help search <term>{/} - Search for help topics');
    lines.push('  {yellow}help commands{/}     - List all available commands');

    return lines.join('\n') + '\n';
  }

  /**
   * Format a category listing.
   */
  formatCategory(player: HelpPlayer, category: HelpCategory): string {
    const topics = this.getTopicsByCategory(player, category);
    const info = CATEGORY_INFO[category];
    const lines: string[] = [];

    lines.push(`{bold}{${info.color}}=== ${info.name} ==={/}`);
    lines.push(`{dim}${info.description}{/}`);
    lines.push('');

    if (topics.length === 0) {
      lines.push('No topics available in this category.');
    } else {
      for (const topic of topics.sort((a, b) => a.title.localeCompare(b.title))) {
        const preview = topic.content.split('\n')[0].substring(0, 50);
        lines.push(`  {yellow}${topic.name.padEnd(20)}{/} - ${preview}...`);
      }
    }

    lines.push('');
    lines.push(`{dim}Use 'help <topic>' for more information.{/}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Format search results.
   */
  formatSearchResults(results: HelpTopic[], query: string): string {
    const lines: string[] = [];

    lines.push(`{bold}{cyan}=== Search Results for "${query}" ==={/}`);
    lines.push('');

    if (results.length === 0) {
      lines.push('No matching topics found.');
    } else {
      lines.push(`Found ${results.length} matching topic(s):`);
      lines.push('');

      for (const topic of results) {
        const info = CATEGORY_INFO[topic.category];
        lines.push(`  {yellow}${topic.name.padEnd(20)}{/} {${info.color}}[${info.name}]{/}`);
      }
    }

    lines.push('');
    lines.push(`{dim}Use 'help <topic>' for more information.{/}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Get dynamic help for a command using getCommandInfo.
   * Returns undefined if not a command or not accessible.
   */
  getCommandHelp(cmdName: string): string | undefined {
    try {
      const info = efuns.getCommandInfo(cmdName);
      if (!info) {
        return undefined;
      }

      return this.formatCommandHelp(info);
    } catch {
      return undefined;
    }
  }

  /**
   * Format command info into help text.
   */
  formatCommandHelp(info: {
    names: string[];
    filePath: string;
    level: number;
    description: string;
    usage?: string | undefined;
  }): string {
    const lines: string[] = [];
    const levelNames = ['Player', 'Builder', 'Senior Builder', 'Administrator'];
    const levelColors = ['cyan', 'MAGENTA', 'yellow', 'RED'];
    const levelName = levelNames[info.level] ?? 'Unknown';
    const levelColor = levelColors[info.level] ?? 'dim';

    // Header
    lines.push(`{bold}{cyan}=== ${info.names[0]} ==={/}`);
    lines.push(`{dim}Category: Commands{/}`);
    lines.push('');

    // Description
    lines.push(info.description);
    lines.push('');

    // Usage
    if (info.usage) {
      lines.push('{bold}Usage:{/}');
      lines.push(`  {yellow}${info.usage}{/}`);
      lines.push('');
    }

    // Aliases
    if (info.names.length > 1) {
      lines.push(`{dim}Aliases: ${info.names.slice(1).join(', ')}{/}`);
    }

    // Level and path
    lines.push(`{dim}Path: ${this.formatMudlibPath(info.filePath)} ({${levelColor}}${levelName}{/}{dim} command){/}`);

    return lines.join('\n') + '\n';
  }

  /**
   * Convert absolute file path to mudlib path.
   */
  private formatMudlibPath(filePath: string): string {
    // Extract the mudlib-relative path
    const mudlibIndex = filePath.indexOf('/mudlib/');
    if (mudlibIndex >= 0) {
      let path = filePath.slice(mudlibIndex + 7); // Remove '/mudlib' prefix
      // Remove .ts extension
      if (path.endsWith('.ts')) {
        path = path.slice(0, -3);
      }
      return path;
    }
    return filePath;
  }

  /**
   * Format a list of all available commands grouped by permission level.
   */
  formatCommandList(player: HelpPlayer): string {
    try {
      const commands = efuns.getAvailableCommands();
      const lines: string[] = [];

      lines.push('{bold}{cyan}=== Available Commands ==={/}');
      lines.push('');

      // Group by level
      const levelNames = ['Player', 'Builder', 'Senior Builder', 'Administrator'];
      const levelColors = ['cyan', 'MAGENTA', 'yellow', 'RED'];

      for (let level = 0; level <= 3; level++) {
        const cmds = commands.filter(c => c.level === level);
        if (cmds.length === 0) continue;

        const levelName = levelNames[level] ?? 'Unknown';
        const color = levelColors[level] ?? 'dim';

        lines.push(`{bold}{${color}}${levelName} Commands:{/}`);

        // Sort alphabetically and format in columns
        const sorted = cmds.sort((a, b) => a.name.localeCompare(b.name));

        for (const cmd of sorted) {
          const nameStr = cmd.name.padEnd(16);
          const desc = cmd.description.length > 50 ? cmd.description.slice(0, 47) + '...' : cmd.description;
          lines.push(`  {yellow}${nameStr}{/} - ${desc}`);
        }

        lines.push('');
      }

      lines.push(`{dim}Use 'help <command>' for details on a specific command.{/}`);

      return lines.join('\n') + '\n';
    } catch {
      return '{red}Error retrieving command list.{/}\n';
    }
  }

  /**
   * Register default help topics.
   */
  private registerDefaultTopics(): void {
    // === GAMEPLAY ===
    this.registerTopic({
      name: 'introduction',
      title: 'Introduction to the Game',
      category: 'gameplay',
      aliases: ['intro', 'newbie', 'start', 'starting'],
      keywords: ['new', 'player', 'begin', 'tutorial'],
      content: `Welcome to the game! This is a text-based multiplayer world where you can
explore, fight monsters, complete quests, and interact with other players.

{bold}Getting Started:{/}
1. Use {yellow}look{/} to see your surroundings
2. Use {yellow}go <direction>{/} to move (north, south, east, west)
3. Use {yellow}inventory{/} or {yellow}i{/} to see what you're carrying
4. Use {yellow}help commands{/} to see available commands

{bold}Exploring:{/}
- Room exits are shown in {green}green{/}
- Items you can interact with are shown in {yellow}yellow{/}
- NPCs and characters are shown in {magenta}magenta{/}

{bold}Getting Help:{/}
- Use {yellow}help <topic>{/} for specific help
- Use the {cyan}newbie{/} channel to ask questions
- Type {yellow}shout{/} to talk to everyone online`,
      seeAlso: ['commands', 'movement', 'communication'],
    });

    this.registerTopic({
      name: 'movement',
      title: 'Movement and Navigation',
      category: 'gameplay',
      aliases: ['move', 'moving', 'go', 'walk', 'travel'],
      keywords: ['direction', 'north', 'south', 'east', 'west'],
      content: `{bold}Moving Around:{/}
Use the {yellow}go{/} command or direction shortcuts to move:
  {yellow}go north{/} or {yellow}n{/}  - Move north
  {yellow}go south{/} or {yellow}s{/}  - Move south
  {yellow}go east{/} or {yellow}e{/}   - Move east
  {yellow}go west{/} or {yellow}w{/}   - Move west
  {yellow}go up{/} or {yellow}u{/}     - Go up (stairs, ladders)
  {yellow}go down{/} or {yellow}d{/}   - Go down

{bold}Finding Your Way:{/}
- Use {yellow}look{/} to see available exits (shown in {green}green{/})
- Some exits may be hidden or locked
- Use {yellow}look <direction>{/} to peek into an adjacent room

{bold}Special Movement:{/}
- {yellow}enter <place>{/} - Enter a building or structure
- {yellow}climb <object>{/} - Climb something
- {yellow}swim{/} - Swim across water`,
      seeAlso: ['look', 'commands'],
    });

    this.registerTopic({
      name: 'look',
      title: 'Looking and Examining',
      category: 'commands',
      aliases: ['l', 'examine', 'ex'],
      keywords: ['see', 'view', 'inspect'],
      content: `{bold}The Look Command:{/}
Use {yellow}look{/} to examine your surroundings and objects.

{bold}Usage:{/}
  {yellow}look{/}           - Look at the current room
  {yellow}look <object>{/}  - Examine an object in detail
  {yellow}look <player>{/}  - Look at another player
  {yellow}look <direction>{/} - Peek in a direction

{bold}Shortcuts:{/}
  {yellow}l{/} - Same as look
  {yellow}ex <thing>{/} - Examine something closely

{bold}Tips:{/}
- Looking at objects may reveal hidden details
- Some objects have multiple things to look at
- NPCs may react when you look at them`,
      seeAlso: ['movement', 'inventory'],
    });

    // === COMMANDS ===
    this.registerTopic({
      name: 'commands',
      title: 'Command Reference',
      category: 'commands',
      aliases: ['cmds', 'command'],
      keywords: ['list', 'available', 'all'],
      content: `{bold}Basic Commands:{/}
  {yellow}look{/} (l)        - Look at your surroundings
  {yellow}go <dir>{/}       - Move in a direction
  {yellow}inventory{/} (i)  - View your inventory
  {yellow}get <item>{/}     - Pick up an item
  {yellow}drop <item>{/}    - Drop an item
  {yellow}quit{/}           - Save and exit the game

{bold}Communication:{/}
  {yellow}say <msg>{/}      - Talk to people in the room
  {yellow}shout <msg>{/}    - Shout to everyone online
  {yellow}ooc <msg>{/}      - Out-of-character chat
  {yellow}tell <who> <msg>{/} - Private message

{bold}Information:{/}
  {yellow}help{/}           - This help system
  {yellow}who{/}            - List online players
  {yellow}score{/}          - View your character stats
  {yellow}time{/}           - Current game time

{bold}Other:{/}
  {yellow}emote <action>{/} - Perform an action
  {yellow}channel{/}        - Manage chat channels

Use {yellow}help <command>{/} for details on specific commands.`,
      seeAlso: ['introduction', 'communication'],
    });

    this.registerTopic({
      name: 'inventory',
      title: 'Inventory Management',
      category: 'commands',
      aliases: ['i', 'inv'],
      keywords: ['items', 'carrying', 'equipment'],
      content: `{bold}Inventory Commands:{/}
  {yellow}inventory{/} or {yellow}i{/} - List items you're carrying
  {yellow}get <item>{/}       - Pick up an item
  {yellow}drop <item>{/}      - Drop an item
  {yellow}give <item> to <player>{/} - Give an item to someone

{bold}Equipment:{/}
  {yellow}wear <item>{/}      - Wear armor or clothing
  {yellow}wield <item>{/}     - Wield a weapon
  {yellow}remove <item>{/}    - Remove worn/wielded items
  {yellow}equipment{/}        - View worn equipment

{bold}Item Interaction:{/}
  {yellow}look <item>{/}      - Examine an item
  {yellow}use <item>{/}       - Use an item's special function
  {yellow}eat <food>{/}       - Eat food
  {yellow}drink <beverage>{/} - Drink something`,
      seeAlso: ['look', 'commands'],
    });

    // === COMMUNICATION ===
    this.registerTopic({
      name: 'communication',
      title: 'Communication Guide',
      category: 'communication',
      aliases: ['chat', 'talk', 'speak'],
      keywords: ['say', 'shout', 'tell', 'channel'],
      content: `{bold}Talking to Others:{/}
There are several ways to communicate with other players:

{bold}Local Communication:{/}
  {yellow}say <message>{/}  - Talk to everyone in the room
  {yellow}'<message>{/}     - Shortcut for say
  {yellow}emote <action>{/} - Describe an action you take

{bold}Global Communication:{/}
  {yellow}shout <message>{/} - Broadcast to everyone online
  {yellow}ooc <message>{/}   - Out-of-character global chat
  {yellow}newbie <message>{/} - Ask questions on the newbie channel

{bold}Private Communication:{/}
  {yellow}tell <player> <message>{/} - Send a private message
  {yellow}reply <message>{/}         - Reply to last tell

{bold}Channels:{/}
Use {yellow}channel{/} to manage your channel subscriptions.
  {yellow}channel list{/}       - List available channels
  {yellow}channel <name> on{/}  - Turn a channel on
  {yellow}channel <name> off{/} - Turn a channel off`,
      seeAlso: ['channels', 'emote'],
    });

    this.registerTopic({
      name: 'channels',
      title: 'Chat Channels',
      category: 'communication',
      aliases: ['channel'],
      keywords: ['chat', 'public', 'global'],
      content: `{bold}About Channels:{/}
Channels allow you to communicate with specific groups of players.

{bold}Default Channels:{/}
  {yellow}Shout{/}  - Public channel, everyone can hear
  {yellow}OOC{/}    - Out-of-character discussion
  {yellow}Newbie{/} - Help channel for new players

{bold}Channel Commands:{/}
  {yellow}channel{/}           - List all channels and status
  {yellow}channel <name> on{/}  - Turn a channel on
  {yellow}channel <name> off{/} - Turn a channel off

{bold}Sending Messages:{/}
Most channels have shortcut commands:
  {yellow}shout <message>{/}  - Send to Shout channel
  {yellow}ooc <message>{/}    - Send to OOC channel
  {yellow}newbie <message>{/} - Send to Newbie channel

{bold}Special Channels:{/}
Some channels are restricted based on your role or class.
Builders have access to the {magenta}Builder{/} channel.
Admins have access to the {red}Admin{/} channel.`,
      seeAlso: ['communication', 'shout'],
    });

    // === BUILDING (Builder+) ===
    this.registerTopic({
      name: 'building',
      title: 'Builder Introduction',
      category: 'building',
      aliases: ['builder', 'build'],
      access: { minPermission: 1 },
      keywords: ['create', 'design', 'rooms', 'objects'],
      content: `{bold}Welcome, Builder!{/}
As a builder, you can create and modify areas of the game world.

{bold}Builder Tools:{/}
  {yellow}@create{/}   - Create new objects
  {yellow}@edit{/}     - Edit existing objects
  {yellow}@clone{/}    - Clone an object
  {yellow}@dest{/}     - Destroy an object

{bold}Room Editing:{/}
  {yellow}@dig{/}      - Create a new room with exits
  {yellow}@link{/}     - Link rooms together
  {yellow}@unlink{/}   - Remove an exit

{bold}Object Properties:{/}
  {yellow}@set{/}      - Set object properties
  {yellow}@stat{/}     - View object statistics

{bold}File Operations:{/}
  {yellow}@read{/}     - Read a mudlib file
  {yellow}@write{/}    - Write to a file (if permitted)

{bold}Communication:{/}
Use the {magenta}builder{/} channel ({yellow}btalk{/}) to talk with other builders.`,
      seeAlso: ['bcreate', 'bedit', 'bdig'],
    });

    this.registerTopic({
      name: 'bcreate',
      title: 'Creating Objects',
      category: 'building',
      aliases: ['@create'],
      access: { minPermission: 1 },
      keywords: ['new', 'object', 'item', 'npc'],
      content: `{bold}@create Command:{/}
Creates new game objects.

{bold}Usage:{/}
  {yellow}@create <type> <path>{/}

{bold}Object Types:{/}
  {yellow}room{/}   - Create a new room
  {yellow}item{/}   - Create a new item
  {yellow}npc{/}    - Create a new NPC
  {yellow}weapon{/} - Create a new weapon
  {yellow}armor{/}  - Create a new armor piece

{bold}Examples:{/}
  {yellow}@create room /areas/myzone/room1{/}
  {yellow}@create item /areas/myzone/sword{/}

{bold}Notes:{/}
- You can only create objects in areas you have access to
- New objects start with default properties
- Use {yellow}@edit{/} to modify the object after creation`,
      seeAlso: ['building', 'bedit', 'bset'],
    });

    // === ADMIN (Admin only) ===
    this.registerTopic({
      name: 'administration',
      title: 'Admin Guide',
      category: 'admin',
      aliases: ['admin'],
      access: { minPermission: 3 },
      keywords: ['administrator', 'manage'],
      content: `{bold}Administrator Commands:{/}

{bold}Player Management:{/}
  {yellow}@ban{/}      - Ban a player
  {yellow}@unban{/}    - Remove a ban
  {yellow}@kick{/}     - Disconnect a player
  {yellow}@promote{/}  - Change player permission level
  {yellow}@demote{/}   - Lower player permission level

{bold}Server Management:{/}
  {yellow}@shutdown{/} - Shutdown the server
  {yellow}@reboot{/}   - Reboot the server
  {yellow}@reload{/}   - Reload game files

{bold}Debugging:{/}
  {yellow}@eval{/}     - Evaluate code (dangerous!)
  {yellow}@trace{/}    - Enable object tracing
  {yellow}@log{/}      - View server logs

{bold}Communication:{/}
Use the {red}admin{/} channel ({yellow}atalk{/}) for admin discussion.

{bold}{red}CAUTION:{/} Admin commands can affect all players. Use responsibly.`,
      seeAlso: ['building', 'apromote'],
    });

    // === CLASS-SPECIFIC (Examples) ===
    this.registerTopic({
      name: 'fighter',
      title: 'Fighter Class Guide',
      category: 'classes',
      aliases: ['warrior'],
      access: { requiredClass: 'fighter' },
      keywords: ['combat', 'strength', 'tank'],
      content: `{bold}The Fighter Class:{/}
Fighters are masters of martial combat, excelling in melee battle.

{bold}Key Attributes:{/}
  {yellow}Strength{/}    - Primary attribute, increases damage
  {yellow}Constitution{/} - Secondary, increases health

{bold}Fighter Abilities:{/}
  {yellow}bash{/}        - Stun an enemy briefly
  {yellow}berserk{/}     - Increase damage, decrease defense
  {yellow}parry{/}       - Defensive stance
  {yellow}cleave{/}      - Attack multiple enemies

{bold}Combat Tips:{/}
- Wear heavy armor for maximum protection
- Two-handed weapons deal more damage
- Use {yellow}bash{/} to interrupt enemy spells
- {yellow}berserk{/} is risky but powerful against tough foes

{bold}Recommended Equipment:{/}
- Plate armor, chain mail, or scale mail
- Swords, axes, maces, or polearms
- Shields for defensive builds`,
      seeAlso: ['combat', 'classes'],
    });

    this.registerTopic({
      name: 'thief',
      title: 'Thief Class Guide',
      category: 'classes',
      aliases: ['rogue'],
      access: { requiredClass: 'thief' },
      keywords: ['stealth', 'dexterity', 'sneak'],
      content: `{bold}The Thief Class:{/}
Thieves excel at stealth, subterfuge, and precision strikes.

{bold}Key Attributes:{/}
  {yellow}Dexterity{/} - Primary attribute, affects skills
  {yellow}Agility{/}   - Secondary, increases dodge chance

{bold}Thief Abilities:{/}
  {yellow}sneak{/}       - Move without being detected
  {yellow}backstab{/}    - Devastating attack from stealth
  {yellow}pickpocket{/}  - Steal from NPCs
  {yellow}lockpick{/}    - Open locked doors and chests
  {yellow}hide{/}        - Become invisible in shadows

{bold}Combat Tips:{/}
- Always attack from stealth when possible
- Light armor allows better sneaking
- Daggers allow faster attacks
- Avoid prolonged melee combat

{bold}Recommended Equipment:{/}
- Leather armor or cloth
- Daggers, short swords, or throwing knives
- Lockpicks and other thief tools`,
      seeAlso: ['combat', 'classes'],
    });

    // Generic class info (always visible)
    this.registerTopic({
      name: 'classes',
      title: 'Character Classes',
      category: 'classes',
      aliases: ['class'],
      keywords: ['fighter', 'thief', 'mage', 'cleric'],
      content: `{bold}Available Classes:{/}
Each class has unique abilities and playstyles.

{bold}Combat Classes:{/}
  {yellow}Fighter{/} - Masters of martial combat
  {yellow}Ranger{/}  - Skilled with bow and nature magic

{bold}Stealth Classes:{/}
  {yellow}Thief{/}   - Experts in stealth and subterfuge
  {yellow}Assassin{/} - Deadly precision strikers

{bold}Magic Classes:{/}
  {yellow}Mage{/}    - Wielders of arcane power
  {yellow}Cleric{/}  - Divine spellcasters and healers

{bold}Choosing a Class:{/}
- Consider your preferred playstyle
- Each class excels in different situations
- Multi-classing may be available later

Once you choose a class, use {yellow}help <class>{/} for detailed information.
(Class-specific help is only visible to members of that class.)`,
      seeAlso: ['combat', 'skills'],
    });

    // === COMBAT ===
    this.registerTopic({
      name: 'combat',
      title: 'Combat System',
      category: 'combat',
      aliases: ['fight', 'fighting', 'battle'],
      keywords: ['attack', 'kill', 'damage'],
      content: `{bold}Combat Basics:{/}
Combat in this game is turn-based with automatic attacks.

{bold}Starting Combat:{/}
  {yellow}kill <target>{/}  - Attack an enemy
  {yellow}attack <target>{/} - Same as kill

{bold}During Combat:{/}
  {yellow}flee{/}          - Attempt to escape
  {yellow}<ability>{/}     - Use a class ability
  {yellow}use <item>{/}    - Use an item (potion, etc.)

{bold}Combat Information:{/}
  {yellow}consider <enemy>{/} - Estimate enemy difficulty
  {yellow}hp{/}              - Check your health

{bold}Combat Tips:{/}
- Watch your health and flee if needed
- Use abilities wisely - they may have cooldowns
- Position matters for some abilities
- Healing between fights is important

{bold}Death:{/}
If you die, you'll respawn at your bind point.
You may lose some experience and items.`,
      seeAlso: ['classes', 'skills', 'death'],
    });

    // === STATS ===
    this.registerTopic({
      name: 'stats',
      title: 'Character Statistics',
      category: 'gameplay',
      aliases: ['statistics', 'attributes', 'abilities'],
      keywords: ['strength', 'intelligence', 'wisdom', 'charisma', 'dexterity', 'constitution', 'luck'],
      content: `{bold}Character Stats:{/}
Your character has seven core statistics that affect gameplay:

{bold}{cyan}STR{/} {bold}Strength{/}
  Physical power. Affects melee damage, carrying capacity,
  and feats of strength like breaking doors.

{bold}{cyan}INT{/} {bold}Intelligence{/}
  Mental acuity. Affects magic power, mana pool size,
  and learning speed for skills.

{bold}{cyan}WIS{/} {bold}Wisdom{/}
  Perception and insight. Affects magic resistance,
  mana regeneration, and detecting hidden things.

{bold}{cyan}CHA{/} {bold}Charisma{/}
  Social influence. Affects NPC reactions, shop prices,
  and leadership abilities.

{bold}{cyan}DEX{/} {bold}Dexterity{/}
  Agility and coordination. Affects accuracy, dodge chance,
  stealth, and ranged attacks.

{bold}{cyan}CON{/} {bold}Constitution{/}
  Physical toughness. Affects health points, resistance
  to poison/disease, and stamina.

{bold}{cyan}LUK{/} {bold}Luck{/}
  Fortune and fate. Affects critical hits, rare drops,
  and random beneficial events.

{bold}Stat Bonuses:{/}
Each stat provides a bonus (or penalty) calculated as:
  {yellow}(stat - 10) / 2{/}, rounded down

For example:
  Stat 10 = +0 bonus
  Stat 14 = +2 bonus
  Stat 18 = +4 bonus
  Stat 6  = -2 penalty

Use {yellow}score{/} or {yellow}score stats{/} to view your stats.`,
      seeAlso: ['score', 'classes', 'combat'],
    });

    this.registerTopic({
      name: 'score',
      title: 'Score Command',
      category: 'commands',
      aliases: ['sc'],
      keywords: ['character', 'sheet', 'info', 'status'],
      content: `{bold}Score Command:{/}
View your character's statistics and status.

{bold}Usage:{/}
  {yellow}score{/}        - Full character sheet
  {yellow}score stats{/}  - View only your stats
  {yellow}score brief{/}  - Condensed one-line summary

{bold}Information Shown:{/}
  {cyan}Name & Title{/}  - Your character's identity
  {cyan}Gender{/}        - Male, female, or neutral
  {cyan}Class{/}         - Your character class (if set)
  {cyan}Health{/}        - Current and maximum HP
  {cyan}Stats{/}         - All seven core statistics
  {cyan}Play Time{/}     - Total time played

{bold}Stat Display:{/}
Stats are shown with their current value and bonus:
  {cyan}STR{/} 14 ({green}+2{/})

The bonus is used for skill checks and combat.`,
      seeAlso: ['stats', 'classes'],
    });

    // === SETTINGS ===
    this.registerTopic({
      name: 'settings',
      title: 'Player Settings',
      category: 'commands',
      aliases: ['set'],
      keywords: ['config', 'options', 'preferences', 'customize'],
      content: `{bold}Settings Command:{/}
Manage your personal game settings.

{bold}Usage:{/}
  {yellow}settings{/}                    - List all settings by category
  {yellow}settings <setting>{/}          - View details for a setting
  {yellow}settings <setting> <value>{/}  - Change a setting
  {yellow}settings reset <setting>{/}    - Reset a setting to default
  {yellow}settings reset all{/}          - Reset all settings

{bold}Available Settings:{/}
Settings are organized by category:

  {cyan}Display{/}
    {yellow}brief{/}     - Show brief room descriptions

  {cyan}Gameplay{/}
    {yellow}compact{/}   - Compact inventory display
    {yellow}autoloot{/}  - Automatically loot defeated enemies

{bold}Examples:{/}
  {yellow}settings brief on{/}     - Enable brief mode
  {yellow}settings autoloot true{/} - Enable auto-looting
  {yellow}settings reset brief{/}   - Reset brief to default

Your settings are saved automatically with your character.`,
      seeAlso: ['displayname', 'commands'],
    });

    // === DISCONNECT HANDLING ===
    this.registerTopic({
      name: 'linkdead',
      title: 'Link-Dead and Disconnection',
      category: 'system',
      aliases: ['disconnect', 'reconnect', 'linkdeath'],
      keywords: ['connection', 'timeout', 'void', 'session'],
      content: `{bold}Link-Dead Handling:{/}
What happens when you unexpectedly disconnect from the game.

{bold}When You Disconnect:{/}
1. Your character "flickers and slowly fades from view"
2. You are moved to a holding area (the void)
3. A disconnect timer starts (default: 15 minutes)
4. You remain visible in the {yellow}who{/} list

{bold}Reconnecting:{/}
1. Log back in with your character name and password
2. Your timer is cancelled
3. You "shimmer back into existence" at your original location
4. All your items and state are preserved

{bold}If You Don't Reconnect:{/}
If the disconnect timer expires:
- Your character is automatically saved
- You are removed from active players
- Others see a disconnection notification

{bold}Quitting Properly:{/}
Use {yellow}quit{/} to save and exit immediately without any timeout.

{bold}Note:{/}
The disconnect timeout is configurable by administrators.`,
      seeAlso: ['quit', 'who'],
    });

    // === GOTO (Builder) ===
    this.registerTopic({
      name: 'goto',
      title: 'Goto Command',
      category: 'building',
      aliases: ['teleport', 'tp'],
      access: { minPermission: 1 },
      keywords: ['teleport', 'move', 'travel', 'builder'],
      content: `{bold}Goto Command (Builder):{/}
Teleport to a player or room location.

{bold}Usage:{/}
  {yellow}goto <player>{/}     - Teleport to a player's location
  {yellow}goto <room path>{/}  - Teleport to a room by path

{bold}Examples:{/}
  {yellow}goto Hero{/}                  - Teleport to player Hero
  {yellow}goto /areas/valdoria/aldric/center{/}    - Absolute room path
  {yellow}goto tavern{/}                - Relative to current directory

{bold}Resolution Order:{/}
1. First tries to find an active player by name
2. If no player found, resolves as a room path
3. Relative paths use your current working directory

{bold}Notes:{/}
- Works even for link-dead players
- Use {yellow}pwd{/} to see your current directory
- Room paths don't need the .ts extension`,
      seeAlso: ['building', 'pwd', 'cd'],
    });

    // === STATS (Senior Builder) ===
    this.registerTopic({
      name: 'stats',
      title: 'Stats Command',
      category: 'building',
      aliases: ['status', 'mudstats'],
      access: { minPermission: 2 },
      keywords: ['memory', 'performance', 'objects', 'scheduler', 'uptime'],
      content: `{bold}Stats Command (Senior Builder+):{/}
Display driver memory and performance statistics.

{bold}Usage:{/}
  {yellow}stats{/}           - Show all statistics
  {yellow}stats memory{/}    - Show only memory usage
  {yellow}stats objects{/}   - Show only object counts
  {yellow}stats scheduler{/} - Show only scheduler info
  {yellow}stats players{/}   - Show only player counts

{bold}Memory Statistics:{/}
  {cyan}Heap Used{/}     - JavaScript heap memory in use
  {cyan}Heap Total{/}    - Total allocated heap memory
  {cyan}RSS{/}           - Resident Set Size (total process memory)
  {cyan}External{/}      - C++ objects bound to JavaScript
  {cyan}ArrayBuffers{/}  - Memory for ArrayBuffer instances

{bold}Object Statistics:{/}
  {cyan}Total{/}       - All registered objects
  {cyan}Blueprints{/}  - Loaded module definitions
  {cyan}Clones{/}      - Instantiated object instances

{bold}Scheduler Statistics:{/}
  {cyan}Heartbeats{/}  - Objects with active heartbeat
  {cyan}Call-outs{/}   - Pending scheduled callbacks
  {cyan}Interval{/}    - Heartbeat tick interval (ms)

{bold}Notes:{/}
- Requires senior builder permission (level 2+)
- Memory shown in human-readable format (KB, MB, GB)
- Use for monitoring server health and debugging`,
      seeAlso: ['building', 'config'],
    });

    // === CONFIG (Admin) ===
    this.registerTopic({
      name: 'config',
      title: 'Config Command',
      category: 'admin',
      aliases: ['mudconfig'],
      access: { minPermission: 3 },
      keywords: ['settings', 'configuration', 'admin', 'server'],
      content: `{bold}Config Command (Admin):{/}
Manage mud-wide configuration settings.

{bold}Usage:{/}
  {yellow}config{/}                      - List all settings
  {yellow}config <key>{/}                - View a specific setting
  {yellow}config <key> <value>{/}        - Change a setting
  {yellow}config reset <key>{/}          - Reset to default

{bold}Available Settings:{/}
  {cyan}disconnect.timeoutMinutes{/}
    Type: number (1-60)
    Default: 15
    Minutes before disconnected player is force-quit

{bold}Examples:{/}
  {yellow}config disconnect.timeoutMinutes{/}      - View current value
  {yellow}config disconnect.timeoutMinutes 30{/}   - Set to 30 minutes
  {yellow}config reset disconnect.timeoutMinutes{/} - Reset to default

{bold}Notes:{/}
- Settings are persisted across server restarts
- Changes take effect immediately
- Saved to /data/config/settings.json`,
      seeAlso: ['administration', 'linkdead'],
    });
  }
}

// Singleton instance
let helpDaemon: HelpDaemon | null = null;
let helpInitialized = false;

/**
 * Get the global HelpDaemon instance.
 */
export function getHelpDaemon(): HelpDaemon {
  if (!helpDaemon) {
    helpDaemon = new HelpDaemon();
  }
  return helpDaemon;
}

/**
 * Initialize additional help files.
 * Called separately to avoid circular imports.
 */
export async function initializeHelpFiles(): Promise<void> {
  if (helpInitialized) return;
  helpInitialized = true;

  try {
    const { initializeHelp } = await import('../help/index.js');
    initializeHelp();
  } catch (error) {
    console.warn('[HelpDaemon] Could not load help files:', error);
  }
}

/**
 * Reset the help daemon (for testing).
 */
export function resetHelpDaemon(): void {
  helpDaemon = null;
  helpInitialized = false;
}

export default HelpDaemon;
