# Guild System Documentation

The guild system provides a multi-class progression system where players can join up to 3 guilds, learn skills, and advance through guild ranks.

## Table of Contents

- [Overview](#overview)
- [Joining a Guild](#joining-a-guild)
- [Guild Progression](#guild-progression)
- [Skills](#skills)
- [Player Commands](#player-commands)
- [The Four Starter Guilds](#the-four-starter-guilds)
- [Builder Guide: Creating Guilds](#builder-guide-creating-guilds)
- [Builder Guide: Creating Skills](#builder-guide-creating-skills)
- [Technical Reference](#technical-reference)

---

## Overview

The guild system features:

- **Multi-Guild Membership**: Players can join up to 3 guilds simultaneously
- **Opposing Guilds**: Some guilds are mutually exclusive (e.g., cannot be both Fighter and Mage)
- **Dual Progression**: Guild levels (1-20) unlock skills; skill levels (1-100) improve effectiveness
- **Skill Types**: Combat abilities, passive bonuses, utility spells, and more
- **Guild Channels**: Each guild has a private communication channel for members
- **Persistent Data**: Guild memberships and skill levels save with the player

---

## Joining a Guild

### Finding a Guild Hall

Guild halls are accessible from the town center in Aldric. Type the guild name as a direction:

```
> fighter    - Enter the Fighter Guild arena
> mage       - Enter the Mage Guild tower
> thief      - Enter the Thief Guild den
> cleric     - Enter the Cleric Guild temple
```

### Meeting the Guildmaster

Each guild hall contains a Guildmaster NPC who can:
- Provide information about the guild
- Accept new members
- Teach skills to members
- Show your advancement progress

### Joining

To join a guild, use the `guild join` command:

```
> guild join fighter      - Join the Fighter Guild
> guild join mage         - Join the Mage Guild
```

You can also interact with the Guildmaster in a guild hall:

```
> join                    - Type "join" in the guild hall
> say join                - Say "join" to the guildmaster
```

To learn about guilds before joining:

```
> guild list              - See all available guilds
> guild info fighter      - Learn about the Fighter Guild
```

### Requirements

Each guild has requirements that must be met:

| Guild   | Stat Requirements |
|---------|-------------------|
| Fighter | STR 12, CON 10    |
| Mage    | INT 14, WIS 10    |
| Thief   | DEX 14, LUCK 10   |
| Cleric  | WIS 14, CHA 10    |

### Restrictions

- Maximum of **3 guilds** per player
- Some guilds are **opposing** and cannot both be joined:
  - Fighter and Mage are opposing guilds

---

## Guild Progression

### Guild Levels

Each guild membership has a separate level (1-20):

- **Level 1**: Automatically granted when joining
- **Levels 2-20**: Require spending Guild XP to advance

**Guild XP Formula**: `(currentLevel + 1)^2 * 500`

| Level | XP Required | Cumulative XP |
|-------|-------------|---------------|
| 2     | 2,000       | 2,000         |
| 3     | 4,500       | 6,500         |
| 4     | 8,000       | 14,500        |
| 5     | 12,500      | 27,000        |
| 10    | 55,000      | 192,500       |
| 15    | 120,000     | 617,500       |
| 20    | 200,000     | 1,377,500     |

### Earning Guild XP

Guild XP is earned through:
- Defeating enemies (distributed across all guilds)
- Completing guild-specific quests
- Using guild skills successfully

### Advancing Guild Level

```
> advance                 - Show all advancement options
> advance fighter         - Spend XP to advance Fighter guild level
```

---

## Skills

### Skill Types

| Type      | Description                                      |
|-----------|--------------------------------------------------|
| `combat`  | Offensive abilities that deal damage             |
| `passive` | Always-active bonuses (no activation needed)     |
| `utility` | Non-combat abilities (teleport, lockpick, etc.)  |
| `buff`    | Temporary self-enhancements                      |
| `debuff`  | Abilities that weaken enemies                    |
| `crafting`| Item creation abilities                          |

### Skill Targets

| Target   | Description                           |
|----------|---------------------------------------|
| `self`   | Affects only the user                 |
| `single` | Affects one target (enemy or ally)    |
| `room`   | Affects everyone in the room          |
| `object` | Affects an item or object             |
| `none`   | No target required                    |

### Learning Skills

Skills are unlocked by reaching the required guild level:

```
> ask guildmaster about skills    - See available skills
> ask guildmaster about bash      - Learn about a specific skill
> say learn bash                  - Learn the bash skill (costs gold)
```

### Skill Levels

Each skill has its own level (1-100):

- **Level 1**: Granted when learning the skill
- **Levels 2-100**: Require spending player XP to advance

**Skill XP Cost**: `skillLevel * advanceCostPerLevel`

```
> advance bash            - Spend XP to improve bash skill
```

### Using Skills

Active skills are used with the `skill use` command or skill aliases:

```
> skill use bash goblin   - Use bash on a goblin
> bash goblin             - Shorthand (if bash is learned)
> skill use heal          - Use heal on yourself
> heal                    - Shorthand for self-target skills
```

### Passive Skills

Passive skills provide permanent bonuses while you're a guild member:

- Automatically applied when you log in
- Scale with skill level
- Examples: +STR, +max HP, +critical chance

### Cooldowns

Most active skills have cooldowns preventing spam:

```
> skills                  - Shows cooldown status for each skill
```

---

## Player Commands

### Guild Command

```
guild                     Show your current guild memberships
guild list                List all available guilds
guild info <name>         Show detailed info about a guild
guild join <name>         Join a guild (if you meet requirements)
guild leave <name>        Leave a guild (requires confirmation)
```

### Skills Command

```
skills                    List all your learned skills
skills <guild>            List skills from a specific guild
skill info <name>         Show detailed skill information
skill use <name> [target] Use an active skill
```

### Advance Command

```
advance                   Show all advancement options and costs
advance <guild>           Advance your guild level (costs guild XP)
advance <skill>           Advance a skill level (costs player XP)
```

### Guild Channels

When you join a guild, you automatically gain access to its channel:

```
> fighter Hello fellow warriors!    - Send message on fighter channel
> mage Anyone want to group?        - Send message on mage channel
```

---

## The Four Starter Guilds

### Fighter Guild

**Theme**: Melee combat mastery, defense, and raw physical power

**Primary Stats**: STR, CON
**Requirements**: STR 12, CON 10
**Opposing Guilds**: Mage
**Guildmaster**: Garrok the Ironheart

#### Skills

| Skill | Level | Type | Description |
|-------|-------|------|-------------|
| Bash | 1 | Combat | Powerful strike that can stun |
| Toughness | 2 | Passive | +CON bonus, increases max HP |
| Parry | 4 | Passive | Chance to deflect melee attacks |
| Power Attack | 6 | Combat | Heavy blow dealing extra damage |
| Shield Wall | 8 | Buff | Massive damage reduction |
| Cleave | 10 | Combat | Strike multiple enemies |
| Battle Cry | 14 | Buff | Boost party's combat abilities |
| Berserker Rage | 16 | Buff | +damage, +speed, -defense |
| Whirlwind | 20 | Combat | Devastating spin attack hitting all enemies |

---

### Mage Guild

**Theme**: Arcane destruction, elemental mastery, and magical utility

**Primary Stats**: INT, WIS
**Requirements**: INT 14, WIS 10
**Opposing Guilds**: Fighter
**Guildmaster**: Elyndra the Starweaver

#### Skills

| Skill | Level | Type | Description |
|-------|-------|------|-------------|
| Magic Missile | 1 | Combat | Reliable arcane damage |
| Arcane Knowledge | 2 | Passive | +INT bonus, increases spell power |
| Fire Bolt | 4 | Combat | Quick fire damage spell |
| Frost Armor | 6 | Buff | Ice shield that damages attackers |
| Lightning | 8 | Combat | Chain lightning hitting multiple foes |
| Fireball | 10 | Combat | Explosive area damage |
| Teleport | 14 | Utility | Instant travel to known locations |
| Mana Shield | 16 | Buff | Convert damage to mana cost |
| Meteor Storm | 20 | Combat | Devastating area destruction |

---

### Thief Guild

**Theme**: Stealth, precision strikes, and cunning utility

**Primary Stats**: DEX, LUCK
**Requirements**: DEX 14, LUCK 10
**Opposing Guilds**: None
**Guildmaster**: Shadow

#### Skills

| Skill | Level | Type | Description |
|-------|-------|------|-------------|
| Hide | 1 | Utility | Become invisible to enemies |
| Nimble Fingers | 2 | Passive | +DEX bonus, improves thief skills |
| Sneak | 4 | Utility | Move silently past enemies |
| Backstab | 6 | Combat | Massive damage from stealth |
| Lockpick | 8 | Utility | Open locked doors and containers |
| Poison Blade | 10 | Buff | Add poison damage to attacks |
| Pickpocket | 12 | Utility | Steal from NPCs |
| Shadow Step | 16 | Utility | Short-range teleport through shadows |
| Assassinate | 20 | Combat | Instant kill attempt on weakened foes |

---

### Cleric Guild

**Theme**: Divine healing, protection, and holy wrath

**Primary Stats**: WIS, CHA
**Requirements**: WIS 14, CHA 10
**Opposing Guilds**: None
**Guildmaster**: High Priestess Seraphina

#### Skills

| Skill | Level | Type | Description |
|-------|-------|------|-------------|
| Heal | 1 | Combat | Restore health to a target |
| Divine Grace | 2 | Passive | +WIS bonus, improves healing |
| Bless | 4 | Buff | Improve target's combat stats |
| Cure Poison | 6 | Utility | Remove poison effects |
| Turn Undead | 8 | Combat | Damage and fear undead enemies |
| Group Heal | 10 | Combat | Heal all party members |
| Divine Shield | 14 | Buff | Absorb incoming damage |
| Holy Smite | 16 | Combat | Divine damage against evil |
| Resurrection | 20 | Utility | Revive fallen players |

---

## Builder Guide: Creating Guilds

### Guild Definition Structure

Create guild definitions in `mudlib/std/guild/definitions.ts`:

```typescript
import type { GuildDefinition, SkillDefinition } from './types.js';

export const MY_GUILD: GuildDefinition = {
  id: 'ranger',                    // Unique identifier
  name: 'Ranger Guild',            // Display name
  description: 'Masters of the wild who blend combat and nature magic.',
  primaryStats: ['dex', 'wis'],    // Main stats for this class
  statRequirements: {              // Minimum stats to join
    dex: 14,
    wis: 12,
  },
  opposingGuilds: ['necromancer'], // Cannot join both
  channelColor: 'green',           // Guild channel color
  skillTree: [
    { guildLevel: 1, skills: ['ranger:track', 'ranger:survival'] },
    { guildLevel: 5, skills: ['ranger:arrow_rain'] },
    { guildLevel: 10, skills: ['ranger:beast_companion'] },
  ],
};

export const MY_GUILD_SKILLS: SkillDefinition[] = [
  // ... skill definitions
];
```

### Registering the Guild

Add your guild to the GuildDaemon's `load()` method:

```typescript
// In mudlib/daemons/guild.ts load() method
import { MY_GUILD, MY_GUILD_SKILLS } from '../std/guild/definitions.js';

// Register guild
this.registerGuild(MY_GUILD);

// Register skills
for (const skill of MY_GUILD_SKILLS) {
  this.registerSkill(skill);
}
```

### Creating a Guild Hall

Create a guild hall room in `mudlib/areas/guilds/ranger/guild_hall.ts`:

```typescript
import { Room } from '../../../lib/std.js';
import type { GuildMaster } from '../../../std/guild/guild-master.js';

export class RangerGuildHall extends Room {
  constructor() {
    super();
    this.shortDesc = 'Ranger Guild Lodge';
    this.longDesc = `A rustic wooden lodge nestled at the edge of the forest...`;

    this.addExit('out', '/areas/valdoria/aldric/center');
    this.addId('ranger guild');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    // Spawn guildmaster
    if (typeof efuns !== 'undefined' && efuns.cloneObject) {
      const gm = await efuns.cloneObject<GuildMaster>(
        '/areas/guilds/ranger/guildmaster',
        'RangerGuildmaster'
      );
      if (gm) await gm.moveTo(this);
    }
  }
}

export default RangerGuildHall;
```

### Creating a Guildmaster

Create the guildmaster NPC in `mudlib/areas/guilds/ranger/guildmaster.ts`:

```typescript
import { GuildMaster } from '../../../std/guild/guild-master.js';

export class RangerGuildmaster extends GuildMaster {
  constructor() {
    super();

    this.setNPC({
      name: 'Thornwood',
      shortDesc: 'Thornwood, Ranger Guildmaster',
      longDesc: `A weathered man with keen eyes...`,
    });

    this.setGuild('ranger');
    this.setGreeting('The forest calls to those who listen. Do you hear it?');

    this.addId('thornwood');
    this.addId('guildmaster');
  }

  override async onCreate(): Promise<void> {
    await super.onCreate();

    this.addChat('The wild teaches patience and precision.', 'say');
    this.addChat('examines some animal tracks on the floor.', 'emote');
  }
}

export default RangerGuildmaster;
```

---

## Builder Guide: Creating Skills

### Skill Definition Structure

```typescript
const mySkill: SkillDefinition = {
  id: 'ranger:arrow_rain',         // Format: guildId:skillName
  name: 'Arrow Rain',              // Display name
  description: 'Rain arrows down on all enemies in the area.',
  type: 'combat',                  // combat, passive, utility, buff, debuff
  target: 'room',                  // self, single, room, object, none
  guild: 'ranger',                 // Must match a registered guild
  guildLevelRequired: 10,          // Guild level needed to learn
  manaCost: 40,                    // MP cost per use
  cooldown: 15000,                 // Cooldown in milliseconds
  maxLevel: 100,                   // Maximum skill level
  learnCost: 500,                  // Gold cost to learn
  advanceCostPerLevel: 30,         // XP cost per skill level
  prerequisites: ['ranger:track'], // Skills that must be learned first
  effect: {
    type: 'damage',
    baseMagnitude: 25,             // Base damage/healing amount
    magnitudePerLevel: 0.8,        // Bonus per skill level
    damageType: 'piercing',        // physical, fire, ice, lightning, etc.
    duration: 0,                   // For DoTs/buffs (milliseconds)
    statModifiers: {},             // For passive stat bonuses
    combatModifiers: {},           // For passive combat bonuses
  },
};
```

### Skill Effect Types

#### Damage Skills

```typescript
effect: {
  type: 'damage',
  baseMagnitude: 30,
  magnitudePerLevel: 1.0,
  damageType: 'fire',
}
```

#### Healing Skills

```typescript
effect: {
  type: 'heal',
  baseMagnitude: 40,
  magnitudePerLevel: 1.5,
}
```

#### Passive Stat Bonuses

```typescript
effect: {
  type: 'passive',
  statModifiers: {
    dex: { base: 2, perLevel: 0.1 },  // +2 DEX at level 1, +0.1 per level
    luck: { base: 1, perLevel: 0.05 },
  },
}
```

#### Passive Combat Bonuses

```typescript
effect: {
  type: 'passive',
  combatModifiers: {
    toCritical: { base: 5, perLevel: 0.2 },   // +5% crit at level 1
    damageBonus: { base: 0, perLevel: 0.5 },  // +0.5 damage per level
  },
}
```

#### Buff Skills

```typescript
effect: {
  type: 'buff',
  duration: 60000,  // 60 seconds
  statModifiers: {
    str: { base: 5, perLevel: 0.2 },
  },
}
```

#### Damage Over Time

```typescript
effect: {
  type: 'dot',
  baseMagnitude: 10,        // Damage per tick
  magnitudePerLevel: 0.3,
  damageType: 'poison',
  duration: 30000,          // 30 seconds
  tickInterval: 3000,       // Every 3 seconds
}
```

---

## Technical Reference

### GuildDaemon API

```typescript
import { getGuildDaemon } from '../daemons/guild.js';
const guildDaemon = getGuildDaemon();

// Guild queries
guildDaemon.getGuild('fighter');           // Get guild definition
guildDaemon.getAllGuilds();                // Get all guild definitions
guildDaemon.getSkill('fighter:bash');      // Get skill definition
guildDaemon.getGuildSkills('fighter');     // Get all skills for a guild

// Membership
guildDaemon.canJoinGuild(player, 'fighter');  // Check if can join
guildDaemon.joinGuild(player, 'fighter');     // Join a guild
guildDaemon.leaveGuild(player, 'fighter');    // Leave a guild
guildDaemon.isMember(player, 'fighter');      // Check membership
guildDaemon.getPlayerGuilds(player);          // Get all memberships

// Guild levels
guildDaemon.getGuildLevel(player, 'fighter'); // Get guild level
guildDaemon.getGuildXP(player, 'fighter');    // Get current guild XP
guildDaemon.awardGuildXP(player, 'fighter', 100); // Award XP
guildDaemon.advanceGuildLevel(player, 'fighter'); // Level up

// Skills
guildDaemon.hasSkill(player, 'fighter:bash');    // Check if learned
guildDaemon.getSkillLevel(player, 'fighter:bash'); // Get skill level
guildDaemon.learnSkill(player, 'fighter:bash');  // Learn a skill
guildDaemon.advanceSkill(player, 'fighter:bash'); // Improve skill
guildDaemon.useSkill(player, 'fighter:bash', target); // Use skill

// Cooldowns
guildDaemon.isOnCooldown(player, 'fighter:bash');
guildDaemon.getCooldownRemaining(player, 'fighter:bash');

// Passives
guildDaemon.applyAllPassives(player);  // Reapply all passive effects
```

### PlayerGuildData Structure

Stored in `player.getProperty('guildData')`:

```typescript
interface PlayerGuildData {
  guilds: {
    guildId: GuildId;
    guildLevel: number;
    guildXP: number;
    joinedAt: number;
  }[];
  skills: {
    skillId: string;
    level: number;
    xpInvested: number;
  }[];
  cooldowns: {
    skillId: string;
    expiresAt: number;
  }[];
}
```

### File Structure

```
mudlib/
  daemons/
    guild.ts                    # GuildDaemon singleton
  std/
    guild/
      index.ts                  # Exports
      types.ts                  # Type definitions
      definitions.ts            # Guild and skill data
      guild-master.ts           # GuildMaster NPC class
  cmds/player/
    _guild.ts                   # guild command
    _skills.ts                  # skills command
    _advance.ts                 # advance command
  areas/guilds/
    fighter/
      guild_hall.ts             # Fighter guild room
      guildmaster.ts            # Garrok NPC
    mage/
      guild_hall.ts             # Mage guild room
      guildmaster.ts            # Elyndra NPC
    thief/
      guild_hall.ts             # Thief guild room
      guildmaster.ts            # Shadow NPC
    cleric/
      guild_hall.ts             # Cleric guild room
      guildmaster.ts            # Seraphina NPC
```

---

## Examples

### Example: Checking Guild Status

```typescript
// In a quest or NPC interaction
const guildDaemon = getGuildDaemon();

if (guildDaemon.isMember(player, 'fighter')) {
  const level = guildDaemon.getGuildLevel(player, 'fighter');
  if (level >= 10) {
    player.receive('Ah, a veteran of the arena! I have a special task for you.');
  }
}
```

### Example: Guild-Restricted Room

```typescript
// In a room file
this.addConditionalExit('sanctum', '/guilds/fighter/inner_sanctum', (who) => {
  const guildDaemon = getGuildDaemon();
  if (!guildDaemon.isMember(who, 'fighter')) {
    const receiver = who as MudObject & { receive?: (msg: string) => void };
    receiver.receive?.('Only members of the Fighter Guild may enter.\n');
    return false;
  }
  return true;
});
```

### Example: Skill-Based Quest Requirement

```typescript
// Check if player can complete a stealth mission
const guildDaemon = getGuildDaemon();

if (!guildDaemon.hasSkill(player, 'thief:sneak')) {
  player.receive('You need the Sneak skill to attempt this mission.\n');
  return;
}

const sneakLevel = guildDaemon.getSkillLevel(player, 'thief:sneak');
if (sneakLevel < 50) {
  player.receive('Your Sneak skill is not high enough. Train more!\n');
  return;
}
```
