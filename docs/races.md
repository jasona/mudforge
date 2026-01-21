# Race System Documentation

The race system provides eight playable races with unique stat bonuses, latent abilities, appearance traits, and guild restrictions. Players choose their race during character creation, which permanently affects their character's abilities and options.

## Table of Contents

- [Overview](#overview)
- [The Eight Playable Races](#the-eight-playable-races)
- [Race Selection During Registration](#race-selection-during-registration)
- [Stat Bonuses](#stat-bonuses)
- [Latent Abilities](#latent-abilities)
- [Guild Restrictions](#guild-restrictions)
- [Visibility Integration](#visibility-integration)
- [Portrait Integration](#portrait-integration)
- [Lore Integration](#lore-integration)
- [Player Commands](#player-commands)
- [Builder Guide: Adding New Races](#builder-guide-adding-new-races)
- [Developer Reference](#developer-reference)

---

## Overview

The race system features:

- **Eight Playable Races**: Human, Elf, Dwarf, Orc, Halfling, Gnome, Tiefling, Dragonborn
- **Stat Bonuses/Penalties**: Each race has unique modifiers to base stats
- **Latent Abilities**: Permanent passive effects like night vision, resistances, and combat bonuses
- **Guild Restrictions**: Some races cannot join certain guilds (Orc and Tiefling cannot be Clerics)
- **Portrait Integration**: Race appearance data enhances AI-generated character portraits
- **Lore Integration**: Each race has associated lore entries for NPC knowledge
- **Single Source of Truth**: All race data is defined in one file for easy maintenance

---

## The Eight Playable Races

### Human

**The Balanced Choice**

| Attribute | Value |
|-----------|-------|
| Stat Bonuses | None (balanced) |
| Latent Abilities | None |
| Guild Restrictions | None |
| Height Range | 5'4" - 6'2" |

Humans are the most widespread and diverse of all races. While they lack innate magical abilities or physical prowess, their adaptability and determination have allowed them to thrive everywhere. Humans can excel in any role and join any guild.

**Best for**: Players who want flexibility without min-maxing.

---

### Elf

**Graceful and Magical**

| Attribute | Value |
|-----------|-------|
| Stat Bonuses | DEX +2, INT +1, CON -1 |
| Latent Abilities | Night Vision, Magic Resistance |
| Guild Restrictions | None |
| Height Range | 5'6" - 6'4" |

Elves are an ancient race with deep connections to nature and magic. Their long lives give them patience and perspective. They can see perfectly in darkness and possess natural resistance to magic.

**Best for**: Mages, Rangers, and characters favoring finesse over strength.

---

### Dwarf

**Sturdy and Resilient**

| Attribute | Value |
|-----------|-------|
| Stat Bonuses | CON +2, STR +1, CHA -1 |
| Latent Abilities | Infravision, Poison Resistance, Natural Armor |
| Guild Restrictions | None |
| Height Range | 4'0" - 4'8" |

Dwarves are a proud and ancient race, masters of stone and steel. They can see heat signatures in complete darkness, are resistant to poisons, and their tough hide provides natural armor.

**Best for**: Fighters, tanks, and front-line warriors.

---

### Orc

**Powerful Warriors**

| Attribute | Value |
|-----------|-------|
| Stat Bonuses | STR +3, CON +1, INT -2, CHA -1 |
| Latent Abilities | Infravision, Fast Healing |
| Guild Restrictions | **Cannot join Cleric guild** |
| Height Range | 6'0" - 7'0" |

Orcs are known for incredible strength and ferocity. They can see heat signatures and regenerate health faster than other races. Their spiritual beliefs conflict with divine orders, barring them from becoming clerics.

**Best for**: Pure combat characters who want maximum physical power.

---

### Halfling

**Small but Lucky**

| Attribute | Value |
|-----------|-------|
| Stat Bonuses | DEX +2, LUCK +2, STR -2 |
| Latent Abilities | Natural Stealth, Poison Resistance |
| Guild Restrictions | None |
| Height Range | 2'8" - 3'4" |

Halflings are small but resourceful, known for their cheerful disposition and remarkable luck. Their natural stealth abilities make them excellent scouts and thieves.

**Best for**: Thieves, rogues, and luck-based builds.

---

### Gnome

**Clever Inventors**

| Attribute | Value |
|-----------|-------|
| Stat Bonuses | INT +2, WIS +1, STR -2 |
| Latent Abilities | Night Vision, Magic Resistance, Keen Senses |
| Guild Restrictions | None |
| Height Range | 3'0" - 3'6" |

Gnomes are brilliant, with insatiable curiosity and mechanical genius. They possess excellent night vision, magic resistance, and heightened perception.

**Best for**: Mages, scholars, and perception-focused characters.

---

### Tiefling

**Infernal Heritage**

| Attribute | Value |
|-----------|-------|
| Stat Bonuses | CHA +2, INT +1, WIS -1 |
| Latent Abilities | Fire Resistance, Infravision |
| Guild Restrictions | **Cannot join Cleric guild** |
| Height Range | 5'6" - 6'2" |

Tieflings bear the mark of infernal bloodlines, with horns, tails, and unusual skin colors. Their heritage grants fire resistance and infravision, but bars them from religious orders.

**Best for**: Charisma-based characters, sorcerers, warlocks.

---

### Dragonborn

**Dragon Descendants**

| Attribute | Value |
|-----------|-------|
| Stat Bonuses | STR +2, CHA +1, DEX -1 |
| Latent Abilities | Fire Resistance, Natural Armor |
| Guild Restrictions | None |
| Height Range | 6'2" - 7'0" |

Dragonborn are proud dragon descendants bearing scales and draconic features. Their elemental resistance (fire) and natural armor make them formidable warriors and leaders.

**Best for**: Fighters, paladins, and leadership roles.

---

## Race Selection During Registration

### Client Race Picker

The web client displays a race picker during character registration:

1. **Race Cards**: Each race shown with name, description, and stat summary
2. **Selection**: Click a race to select it and view full details
3. **Details Panel**: Shows stat bonuses, abilities, and restrictions
4. **Portrait Preview**: Optional AI-generated sample portrait for the race

### Server-Side Validation

The server validates race selection during registration:

- Checks that the race ID is valid
- Defaults to "human" if no race specified
- Applies race bonuses during character creation

---

## Stat Bonuses

Race stat bonuses are applied to the player's base stats during character creation. These bonuses (and penalties) permanently modify the starting stats.

### Stat Bonus Summary

| Race | STR | DEX | CON | INT | WIS | CHA | LUCK |
|------|-----|-----|-----|-----|-----|-----|------|
| Human | - | - | - | - | - | - | - |
| Elf | - | +2 | -1 | +1 | - | - | - |
| Dwarf | +1 | - | +2 | - | - | -1 | - |
| Orc | +3 | - | +1 | -2 | - | -1 | - |
| Halfling | -2 | +2 | - | - | - | - | +2 |
| Gnome | -2 | - | - | +2 | +1 | - | - |
| Tiefling | - | - | - | +1 | -1 | +2 | - |
| Dragonborn | +2 | -1 | - | - | - | +1 | - |

### How Bonuses Are Applied

```typescript
// From race daemon
applyRaceBonuses(player: RacePlayer, raceId: RaceId): void {
  const race = this.getRace(raceId);

  for (const [stat, bonus] of Object.entries(race.statBonuses)) {
    if (bonus !== 0) {
      const currentBase = player.getBaseStat(stat);
      player.setBaseStat(stat, currentBase + bonus);
    }
  }
}
```

---

## Latent Abilities

Latent abilities are permanent passive effects that races possess. They are applied as hidden effects during character creation and restored on login.

### Ability Reference

| Ability | Effect | Races |
|---------|--------|-------|
| **Night Vision** | See in darkness as dim light | Elf, Gnome |
| **Infravision** | See heat signatures in darkness | Dwarf, Orc, Tiefling |
| **Poison Resistance** | 50% poison damage reduction | Dwarf, Halfling |
| **Magic Resistance** | 25% magic damage reduction | Elf, Gnome |
| **Fire Resistance** | 50% fire damage reduction | Tiefling, Dragonborn |
| **Cold Resistance** | 50% cold damage reduction | *(Available for custom races)* |
| **Natural Armor** | +2 armor bonus | Dwarf, Dragonborn |
| **Fast Healing** | 25% faster HP regeneration | Orc |
| **Natural Stealth** | +5 dodge bonus | Halfling |
| **Keen Senses** | +10 perception bonus | Gnome |

### Ability Types

| Type | Description | System Integration |
|------|-------------|-------------------|
| `perception` | Vision and detection | Visibility system checks |
| `resistance` | Damage reduction | Combat damage calculation |
| `combat` | Combat stat modifiers | Combat system |
| `passive` | Miscellaneous bonuses | Various systems |

### Checking Abilities

```typescript
import { canSeeInDarkness, getDamageResistance } from '../std/race/abilities.js';

// Check if player can see in dark
if (canSeeInDarkness(player)) {
  // Player has night vision or infravision
}

// Get fire resistance percentage
const fireResist = getDamageResistance(player, 'fire'); // Returns 50 for Tiefling
```

---

## Guild Restrictions

Some races have spiritual or cultural conflicts that prevent them from joining certain guilds.

### Current Restrictions

| Race | Cannot Join | Reason |
|------|-------------|--------|
| Orc | Cleric | Spiritual beliefs conflict with divine orders |
| Tiefling | Cleric | Infernal heritage unwelcome in religious orders |

### How Restrictions Work

When a player attempts to join a guild:

```typescript
// In guild daemon
canJoinGuild(player: Player, guildId: string) {
  // Check race restrictions
  const raceRestriction = raceDaemon.canJoinGuild(player.race, guildId);
  if (!raceRestriction.canJoin) {
    return {
      canJoin: false,
      reason: raceRestriction.reason,
    };
  }
  // ... other checks
}
```

Example rejection message:
```
The Orc race cannot join the cleric guild.
```

---

## Visibility Integration

Race perception abilities integrate with the visibility system, allowing certain races to see in darkness.

### Dark Vision Abilities

| Ability | Effect |
|---------|--------|
| Night Vision | See in darkness as if dim light |
| Infravision | See heat signatures in complete darkness |

### Visibility Check Flow

```
1. Room has PITCH_BLACK or VERY_DARK light level
2. Player has no carried light source
3. System checks player.racePerceptionAbilities
4. If contains 'nightVision' or 'infravision' → player CAN see
5. Otherwise → player sees darkness message
```

### Integration Point

In `mudlib/std/visibility/index.ts`:

```typescript
function hasRaceDarkVision(living: Living): boolean {
  const abilities = living.getProperty('racePerceptionAbilities') as string[] | undefined;
  if (!abilities) return false;
  return abilities.includes('nightVision') || abilities.includes('infravision');
}

// Used in canSeeInRoom()
if (effectiveLight < MIN_LIGHT_TO_SEE) {
  if (hasRaceDarkVision(viewer)) {
    return { canSee: true, reason: 'Race dark vision' };
  }
  return { canSee: false, reason: 'Too dark' };
}
```

---

## Portrait Integration

Race appearance data is used to enhance AI-generated character portraits.

### Appearance Configuration

Each race defines appearance traits:

```typescript
interface RaceAppearance {
  skinTones: string[];           // ['pale', 'tan', 'green']
  hairColors: string[];          // ['black', 'silver', 'bald']
  eyeColors: string[];           // ['brown', 'gold', 'red']
  distinctiveFeatures: string[]; // ['pointed ears', 'tusks', 'scales']
  heightRange: string;           // '5\'6" - 6\'4"'
  buildDescription: string;      // 'slender and graceful'
  portraitStyleHints: string;    // 'ethereal elven beauty'
}
```

### Portrait Prompt Building

When generating a portrait with `portrait generate`, the command:
1. Gets the player's race
2. Fetches the race's lore entry for the full description
3. Includes appearance details (distinctive features, skin tones, build, etc.)
4. Combines with the player's custom description

```typescript
// From portrait command - builds prompt with race lore
const raceId = player.race || 'human';
const race = raceDaemon.getRace(raceId);
const loreEntry = loreDaemon.getLore(race.loreEntryId);

let raceContext = '';
if (race) {
  // Include lore description
  if (loreEntry) {
    raceContext += `\nRace: ${race.name}\n`;
    raceContext += `Race Description: ${loreEntry.content}\n`;
  }

  // Include appearance details
  const appearance = race.appearance;
  if (appearance.distinctiveFeatures.length > 0) {
    raceContext += `\nDistinctive racial features that MUST be visible: ${appearance.distinctiveFeatures.join(', ')}`;
  }
  raceContext += `\nTypical skin tones: ${appearance.skinTones.join(', ')}`;
  raceContext += `\nBuild: ${appearance.buildDescription}`;
}

const prompt = `Create a portrait for a fantasy RPG character.

PLAYER'S DESCRIPTION:
${description}
${raceContext}

IMPORTANT: The character's racial features are essential and must be clearly visible.
...`;
```

This ensures that an Orc character will have green skin, tusks, and a massive build even if the player's description doesn't mention these features.

---

## Lore Integration

Each race has an associated lore entry that is the **single source of truth** for race descriptions. Both the `race info` command and `portrait generate` command pull from these lore entries.

### Lore Entry Structure

Race lore is automatically generated from the `longDescription` field in definitions.ts:

```typescript
// In lore daemon
private registerRaceLore(): void {
  const races = getPlayableRaces();

  for (const race of races) {
    const entry: LoreEntry = {
      id: race.loreEntryId,        // 'race:elf'
      category: 'race',
      title: `The ${race.name} People`,
      content: race.longDescription,
      tags: ['race', race.id, 'playable'],
      priority: 8,
    };
    this._lore.set(entry.id, entry);
  }
}
```

### Lore Entry Usage

Race lore entries are used in multiple places:

| System | Usage |
|--------|-------|
| `race info <name>` | Displays lore content as the race description |
| `portrait generate` | Includes lore content in AI portrait prompt |
| NPC knowledge | NPCs can discuss races they have lore for |

### Using Race Lore in NPCs

```typescript
// NPC knowledge scope
knowledgeScope: {
  worldLore: ['race:elf', 'race:dwarf', 'history:founding-of-aldric'],
}
```

NPCs with race lore in their knowledge can discuss racial history and characteristics.

---

## Player Commands

### The `race` Command

```
race                    Show your race information
race list               List all playable races with bonuses
race info <name>        Detailed information about a race
race <name>             Quick race lookup (shorthand)
```

### Example Output

**`race`** (show own race):
```
Elf

Graceful and long-lived, elves possess natural magical talent.

Stat Bonuses: +2 DEX, +1 INT, -1 CON
Abilities: Night Vision, Magic Resistance

Use "race list" to see all races, "race info <name>" for details.
```

**`race list`**:
```
══════════════════════════════════════════
              PLAYABLE RACES
══════════════════════════════════════════

Human
  Versatile and adaptable, humans excel in any role.
  Stats: balanced

Elf (your race)
  Graceful and long-lived, elves possess natural magical talent.
  Stats: +2DEX +1INT -1CON
  Abilities: Night Vision, Magic Resistance

Dwarf
  Stout and resilient, dwarves are master craftsmen and warriors.
  Stats: +2CON +1STR -1CHA
  Abilities: Infravision, Poison Resistance, Natural Armor

...
```

---

## Builder Guide: Adding New Races

All race data is defined in a single file: `mudlib/std/race/definitions.ts`

### Step 1: Add the Race ID

In `mudlib/std/race/types.ts`, add the new race ID:

```typescript
export type RaceId =
  | 'human'
  | 'elf'
  // ... existing races
  | 'myNewRace';  // Add your race ID
```

### Step 2: Define the Race

In `mudlib/std/race/definitions.ts`, add a new race definition:

```typescript
const myNewRace: RaceDefinition = {
  id: 'myNewRace',
  name: 'My New Race',
  shortDescription: 'A brief description for the race picker.',
  longDescription: `A longer description with lore and background.
This text is also used for NPC lore entries.`,
  statBonuses: {
    strength: 1,
    dexterity: 1,
    constitution: -1,
  },
  latentAbilities: ['nightVision', 'poisonResistance'],
  forbiddenGuilds: ['mage'],  // Optional
  appearance: {
    skinTones: ['pale', 'blue', 'gray'],
    hairColors: ['white', 'silver', 'black'],
    eyeColors: ['red', 'gold', 'purple'],
    distinctiveFeatures: ['pointed ears', 'glowing marks'],
    heightRange: '5\'8" - 6\'6"',
    buildDescription: 'athletic and lithe',
    portraitStyleHints: 'mysterious otherworldly being, subtle glow',
  },
  loreEntryId: 'race:myNewRace',
  playable: true,
  displayOrder: 9,  // Position in race picker
};
```

### Step 3: Add to RACE_DEFINITIONS

```typescript
export const RACE_DEFINITIONS: Record<RaceId, RaceDefinition> = {
  human,
  elf,
  dwarf,
  orc,
  halfling,
  gnome,
  tiefling,
  dragonborn,
  myNewRace,  // Add here
};
```

### Step 4: Restart the Server

The race daemon will:
1. Initialize the new race
2. Write updated `races.json` for the client API
3. Register lore entry automatically

No other files need to be modified - the single source of truth pattern handles everything.

### Adding New Latent Abilities

To add a new latent ability:

1. Add the ability type in `types.ts`:
```typescript
export type LatentAbility =
  | 'nightVision'
  // ... existing
  | 'myNewAbility';
```

2. Add the effect definition in `abilities.ts`:
```typescript
export const ABILITY_EFFECTS: Record<LatentAbility, LatentAbilityEffect> = {
  // ... existing
  myNewAbility: {
    ability: 'myNewAbility',
    name: 'My New Ability',
    description: 'Description of what it does.',
    type: 'resistance',  // or 'perception', 'combat', 'passive'
    magnitude: 50,
    damageType: 'lightning',  // for resistance types
  },
};
```

3. Integrate with relevant systems (combat, visibility, etc.)

---

## Developer Reference

### Architecture Overview

```
mudlib/std/race/
├── types.ts           # RaceId, LatentAbility, RaceDefinition interfaces
├── definitions.ts     # All race data (SINGLE SOURCE OF TRUTH)
├── abilities.ts       # Latent ability effects and functions
└── index.ts           # Barrel exports

mudlib/daemons/
├── race.ts            # RaceDaemon - manages race system
├── lore.ts            # Auto-generates race lore entries
└── login.ts           # Applies race during registration

src/network/
└── server.ts          # /api/races endpoint (reads races.json)

src/client/
└── launcher.ts        # Race picker UI
```

### Data Flow

```
definitions.ts (single source of truth)
        │
        ├──→ RaceDaemon (runtime management)
        │         │
        │         └──→ writes races.json
        │                    │
        │                    └──→ /api/races endpoint
        │                              │
        │                              └──→ Client race picker
        │
        └──→ LoreDaemon (auto-generates race lore)
                 │
                 ├──→ NPC knowledge system
                 │
                 ├──→ "race info" command (pulls lore for descriptions)
                 │
                 └──→ "portrait generate" command (includes lore in AI prompt)
```

### RaceDaemon API

```typescript
import { getRaceDaemon } from '../daemons/race.js';
const raceDaemon = getRaceDaemon();

// Race queries
raceDaemon.getRace('elf');              // Get race definition
raceDaemon.getAllPlayableRaces();       // Get all playable races
raceDaemon.isValidRace('elf');          // Check if valid race ID

// Player operations
raceDaemon.applyRaceBonuses(player, 'elf');      // Apply stat bonuses
raceDaemon.applyLatentAbilities(player, 'elf');  // Apply abilities
raceDaemon.applyRace(player, 'elf');             // Apply both

// Guild integration
raceDaemon.canJoinGuild('orc', 'cleric');
// Returns: { canJoin: false, reason: 'The Orc race cannot join the cleric guild.' }

// Portrait integration
raceDaemon.buildPortraitPrompt('elf', 'female', 'A ranger with silver hair');
raceDaemon.buildRaceAwarePrompt('My character description', 'elf', 'female');

// Information display
raceDaemon.getRaceInfo('elf');      // Short formatted info
raceDaemon.getRaceDetails('elf');   // Full detailed info

// Client data
raceDaemon.getRaceDataForClient();  // Simplified data for API
```

### Race Ability Functions

```typescript
import {
  applyLatentAbilities,
  removeLatentAbilities,
  hasLatentAbility,
  canSeeInDarkness,
  hasInfravision,
  getDamageResistance,
  getHealingBonus,
  getPerceptionBonus,
  getActiveAbilities,
} from '../std/race/abilities.js';

// Apply/remove abilities
applyLatentAbilities(player, ['nightVision', 'magicResistance']);
removeLatentAbilities(player, ['nightVision']);

// Check abilities
hasLatentAbility(player, 'nightVision');  // true/false
canSeeInDarkness(player);                  // has nightVision or infravision
hasInfravision(player);                    // specifically has infravision

// Get bonuses
getDamageResistance(player, 'fire');   // 50 for tiefling, 0 otherwise
getDamageResistance(player, 'poison'); // 50 for dwarf/halfling
getHealingBonus(player);               // 25 for orc
getPerceptionBonus(player);            // 10 for gnome

// List active abilities
getActiveAbilities(player);  // ['nightVision', 'magicResistance']
```

### Player Race Properties

```typescript
// Getting race
player.race;  // 'elf'

// Race is stored and persisted automatically
// In player save data:
interface PlayerSaveData {
  race?: RaceId;  // Defaults to 'human' if undefined
  // ...
}
```

### API Endpoint

**GET /api/races**

Returns array of playable races for the client:

```json
[
  {
    "id": "human",
    "name": "Human",
    "shortDescription": "Versatile and adaptable...",
    "statBonuses": {},
    "abilities": [],
    "restrictions": []
  },
  {
    "id": "elf",
    "name": "Elf",
    "shortDescription": "Graceful and long-lived...",
    "statBonuses": { "dexterity": 2, "intelligence": 1, "constitution": -1 },
    "abilities": ["Night Vision", "Magic Resistance"],
    "restrictions": []
  }
  // ... more races
]
```

### Migration: Existing Players

Players created before the race system are automatically assigned Human race:

```typescript
// In player.restore()
if (!data.race) {
  this._race = 'human';  // Default for existing players
}
```

Human race has no bonuses or penalties, so existing characters are unaffected.

---

## Examples

### Checking Race in Quest

```typescript
// Quest that requires a specific race
if (player.race === 'elf') {
  player.receive('The elven spirits recognize you as one of their own.\n');
  // Grant special dialogue or access
} else {
  player.receive('The spirits regard you with suspicion.\n');
}
```

### Race-Restricted Room

```typescript
import { Room, Living } from '../../lib/std.js';

export class ElvenSanctuary extends Room {
  constructor() {
    super();
    this.setRoom({
      shortDesc: 'Elven Sanctuary',
      longDesc: 'A sacred grove accessible only to those of elven blood.',
    });
  }

  override canEnter(who: Living): boolean {
    const player = who as Player;
    if (player.race !== 'elf') {
      player.receive('An invisible barrier prevents your entry.\n');
      player.receive('Only those of elven blood may enter this sanctuary.\n');
      return false;
    }
    return true;
  }
}
```

### NPC Reaction Based on Race

```typescript
import { NPC, Living } from '../../lib/std.js';

export class DwarvenSmith extends NPC {
  override async onGreet(who: Living): Promise<void> {
    const player = who as Player;

    switch (player.race) {
      case 'dwarf':
        this.say('Ah, a fellow son of the mountain! Welcome, cousin!');
        break;
      case 'elf':
        this.say('An elf, eh? Your kind makes decent archers, I suppose.');
        break;
      case 'orc':
        this.say('*eyes you warily* Keep your hands where I can see them.');
        break;
      default:
        this.say('Welcome to my forge. What can I craft for you?');
    }
  }
}
```

### Applying Damage Resistance

```typescript
import { getDamageResistance } from '../std/race/abilities.js';

function calculateDamage(attacker: Living, defender: Living, baseDamage: number, damageType: string): number {
  // Get race resistance
  const resistance = getDamageResistance(defender, damageType);

  // Apply resistance reduction
  const reducedDamage = baseDamage * (1 - resistance / 100);

  return Math.floor(reducedDamage);
}

// Example: Tiefling takes 50 fire damage
// resistance = 50 (fire resistance)
// reducedDamage = 50 * (1 - 50/100) = 50 * 0.5 = 25
```

### Dark Room with Race Vision Check

```typescript
import { Room, Living } from '../../lib/std.js';
import { LightLevel } from '../../std/visibility/types.js';
import { canSeeInDarkness } from '../../std/race/abilities.js';

export class UndergroundCavern extends Room {
  constructor() {
    super();
    this.setRoom({
      shortDesc: 'Underground Cavern',
      longDesc: 'A vast underground cavern stretches into darkness.',
    });
    this.lightLevel = LightLevel.PITCH_BLACK;
  }

  override getFullDescription(viewer: Living): string {
    // Race dark vision allows seeing without light
    if (canSeeInDarkness(viewer)) {
      return `${this.longDesc}\n\nYour enhanced vision reveals ancient dwarven carvings on the walls.`;
    }
    // Otherwise handled by visibility system (shows darkness message)
    return super.getFullDescription(viewer);
  }
}
```
