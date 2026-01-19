# Sound System

The MudForge sound system allows mudlib developers to trigger audio playback on the client through efuns. Sounds are organized by category, giving players control over which sound types they want to hear.

## Overview

The sound system follows a simple message flow:

```
Server (Mudlib)                    Client
     │                               │
     │  playSound(player,            │
     │    'combat', 'hit')           │
     │  ─────────────────────────►   │
     │       [SOUND] message         │  SoundManager.play()
     │                               │  SoundPanel shows indicator
     │                               │
```

Sounds are:
- **Triggered server-side** via efuns
- **Played client-side** with user volume/mute controls
- **Organized by category** for fine-grained player control
- **Resolved flexibly** - use predefined sounds or custom files

## Quick Start

### Play a Sound Once

```typescript
// Combat hit sound
efuns.playSound(player, 'combat', 'hit');

// Spell cast with custom volume
efuns.playSound(player, 'spell', 'cast', { volume: 0.8 });

// Quest complete
efuns.playSound(player, 'quest', 'complete');
```

### Loop a Sound

```typescript
// Start ambient rain (must provide ID for stopping later)
efuns.loopSound(player, 'ambient', 'rain', 'room-weather', { volume: 0.3 });

// Later, stop the rain
efuns.stopSound(player, 'ambient', 'room-weather');
```

### Custom Sound Files

```typescript
// Play a custom sound with the combat indicator
efuns.playSound(player, 'combat', 'boss-roar.mp3');

// Play from a subdirectory with the alert indicator
efuns.playSound(player, 'alert', 'bosses/dragon-roar');
```

## Sound Categories

Sounds are organized into categories. Each category has:
- A toggle in the client UI (players can enable/disable)
- An indicator icon shown when sounds play
- Default enabled state

| Category | Icon | Description | Default |
|----------|------|-------------|---------|
| `combat` | ⚔️ | Combat hits, misses, blocks, parries | On |
| `spell` | ✨ | Spell casting, magic effects | On |
| `skill` | 💪 | Skill use, abilities | On |
| `potion` | 🧪 | Potion use, item consumption | On |
| `quest` | 📜 | Quest accepted, quest complete | On |
| `celebration` | 🎉 | Level up, achievement | On |
| `discussion` | 💬 | Say, tell, channel messages | On |
| `alert` | ⚠️ | Low HP warning, incoming attack | On |
| `ambient` | 🌿 | Environmental sounds, room ambience | Off |
| `ui` | 🖱️ | Button clicks, menu sounds | Off |

### Category Controls

The category parameter determines:
1. **Which indicator** is shown in the sound panel
2. **Which toggle** enables/disables the sound
3. **Default file resolution** (if not using custom path)

This means you can play any sound file while showing any category indicator:

```typescript
// Play a custom dragon sound, but show the alert indicator
efuns.playSound(player, 'alert', 'bosses/dragon-roar.mp3');

// Play custom tavern music with the ambient indicator/toggle
efuns.loopSound(player, 'ambient', 'areas/tavern-music.mp3', 'room-music');
```

## API Reference

### playSound

Play a sound once on the target player's client.

```typescript
efuns.playSound(
  targetPlayer: MudObject,
  category: SoundCategory,
  sound: string,
  options?: { volume?: number; id?: string }
): void
```

**Parameters:**
- `targetPlayer` - The player to send the sound to
- `category` - Sound category (controls UI indicator and enable toggle)
- `sound` - Sound name, filename, or path (see [Sound Resolution](#sound-resolution))
- `options.volume` - Volume multiplier 0.0-1.0 (default: 1.0)
- `options.id` - Optional identifier (rarely needed for one-shot sounds)

**Examples:**

```typescript
// Predefined combat sound
efuns.playSound(player, 'combat', 'hit');

// Spell with reduced volume
efuns.playSound(player, 'spell', 'lightning', { volume: 0.5 });

// Custom sound file
efuns.playSound(player, 'alert', 'custom/alarm.mp3');
```

### loopSound

Loop a sound continuously until stopped.

```typescript
efuns.loopSound(
  targetPlayer: MudObject,
  category: SoundCategory,
  sound: string,
  id: string,
  options?: { volume?: number }
): void
```

**Parameters:**
- `targetPlayer` - The player to send the sound to
- `category` - Sound category (controls UI indicator and enable toggle)
- `sound` - Sound name, filename, or path
- `id` - **Required** unique identifier for stopping the sound later
- `options.volume` - Volume multiplier 0.0-1.0 (default: 1.0)

**Examples:**

```typescript
// Ambient rain loop
efuns.loopSound(player, 'ambient', 'rain', 'room-weather', { volume: 0.3 });

// Combat music
efuns.loopSound(player, 'ambient', 'combat-music', 'combat-bgm');

// Custom area ambience
efuns.loopSound(player, 'ambient', 'areas/dungeon-drip.mp3', 'area-ambience');
```

### stopSound

Stop a playing or looping sound.

```typescript
efuns.stopSound(
  targetPlayer: MudObject,
  category: SoundCategory,
  id?: string
): void
```

**Parameters:**
- `targetPlayer` - The player to send the stop command to
- `category` - Sound category
- `id` - Optional ID of specific sound to stop. If omitted, stops ALL sounds in the category.

**Examples:**

```typescript
// Stop specific sound by ID
efuns.stopSound(player, 'ambient', 'room-weather');

// Stop ALL ambient sounds (no ID = stop all in category)
efuns.stopSound(player, 'ambient');
```

## Sound Resolution

When you specify a sound, the system resolves the file path in this order:

### 1. Predefined Sounds

First, the system checks a built-in map of predefined sounds:

```typescript
efuns.playSound(player, 'combat', 'hit');
// Resolves to: sounds/combat-hit.mp3
```

### 2. Explicit .mp3 Filename

If the sound ends with `.mp3`, it's used directly:

```typescript
efuns.playSound(player, 'combat', 'boss-roar.mp3');
// Resolves to: sounds/boss-roar.mp3
```

### 3. Path-Style

If the sound contains a `/`, it's treated as a path:

```typescript
efuns.playSound(player, 'spell', 'fire/explosion');
// Resolves to: sounds/fire/explosion.mp3
```

### 4. Default Pattern

Otherwise, combines category and sound name:

```typescript
efuns.playSound(player, 'combat', 'slash');
// Resolves to: sounds/combat-slash.mp3
```

### Predefined Sound Map

These sounds are built-in and guaranteed to resolve:

**Combat:**
- `hit`, `miss`, `critical`, `block`, `parry`

**Spell:**
- `cast`, `fire`, `ice`, `lightning`, `heal`, `buff`

**Skill:**
- `use`, `success`, `fail`

**Potion:**
- `drink`, `heal`, `mana`

**Quest:**
- `accept`, `complete`, `update`

**Celebration:**
- `level-up`, `achievement`

**Discussion:**
- `tell`, `say`, `channel`

**Alert:**
- `low-hp`, `incoming`, `warning`

**Ambient:**
- `rain`, `fire`, `wind`, `combat-music`

**UI:**
- `click`, `open`, `close`

## Client Sound Panel

The client displays a compact sound panel in the bottom-right corner.

### Compact View

```
┌─────────────────────────────┐
│  ⚔️ Combat       │  🔊     │
└─────────────────────────────┘
```

Shows:
- **Current sound indicator** - Category icon and label of the last played sound
- **Mute button** - Toggle all sounds on/off

### Expanded View

Click the indicator to expand:

```
┌─────────────────────────────┐
│  🔊 Ready        │  🔊     │
├─────────────────────────────┤
│  Volume  ═══●═══════  70%  │
├─────────────────────────────┤
│ ⚔️ Combat   ✨ Spell       │
│ 💪 Skill    🧪 Potion      │
│ 📜 Quest    🎉 Celebration │
│ 💬 Discuss  ⚠️ Alert       │
│ 🌿 Ambient  🖱️ Interface   │
└─────────────────────────────┘
```

Features:
- **Volume slider** - Master volume control (0-100%)
- **Category toggles** - Enable/disable individual categories
- **Persistent settings** - Saved to localStorage

### Settings Persistence

Player settings are automatically saved to `localStorage` under the key `mudforge-sound-settings`:

```json
{
  "enabled": true,
  "volume": 0.7,
  "categoryEnabled": {
    "combat": true,
    "spell": true,
    "skill": true,
    "potion": true,
    "quest": true,
    "celebration": true,
    "discussion": true,
    "alert": true,
    "ambient": false,
    "ui": false
  }
}
```

## Adding Sound Files

### Directory Structure

Sound files go in `src/client/sounds/` and are copied to `dist/client/sounds/` during build.

```
src/client/sounds/
├── README.txt
├── combat-hit.mp3
├── combat-miss.mp3
├── spell-cast.mp3
├── quest-complete.mp3
├── bosses/              # Custom subdirectory
│   ├── dragon-roar.mp3
│   └── lich-laugh.mp3
└── areas/               # Custom subdirectory
    ├── tavern-music.mp3
    └── forest-ambience.mp3
```

### File Requirements

- **Format:** MP3 (widely supported)
- **Size:** Under 500KB recommended for quick loading
- **Looping:** Ambient/music files should be seamless loops
- **Naming:** Use `category-sound.mp3` for predefined sounds

### Custom Sound Organization

You can organize custom sounds in subdirectories:

```typescript
// From sounds/bosses/dragon-roar.mp3
efuns.playSound(player, 'alert', 'bosses/dragon-roar');

// From sounds/areas/tavern-music.mp3
efuns.loopSound(player, 'ambient', 'areas/tavern-music.mp3', 'room-music');
```

### Missing Sounds

Missing sound files are silently ignored. The client logs a warning to the console but doesn't show any error to the player. This allows gradual sound implementation.

## Usage Examples

### Combat System

```typescript
// In combat daemon or attack resolution
function resolveAttack(attacker: MudObject, defender: MudObject, damage: number): void {
  if (damage > 0) {
    // Hit sound for attacker
    efuns.playSound(attacker, 'combat', 'hit');

    // Different sound for critical hits
    if (isCritical) {
      efuns.playSound(attacker, 'combat', 'critical');
    }

    // Alert defender of incoming damage
    efuns.playSound(defender, 'alert', 'incoming');
  } else {
    // Miss sound
    efuns.playSound(attacker, 'combat', 'miss');

    // Block/parry feedback to defender
    if (wasBlocked) {
      efuns.playSound(defender, 'combat', 'block');
    }
  }
}
```

### Spell Casting

```typescript
// In spell execution
function castSpell(caster: MudObject, spell: Spell, target: MudObject): void {
  // Play spell school-specific sound
  switch (spell.school) {
    case 'fire':
      efuns.playSound(caster, 'spell', 'fire');
      break;
    case 'ice':
      efuns.playSound(caster, 'spell', 'ice');
      break;
    case 'lightning':
      efuns.playSound(caster, 'spell', 'lightning');
      break;
    case 'healing':
      efuns.playSound(target, 'spell', 'heal');
      break;
    default:
      efuns.playSound(caster, 'spell', 'cast');
  }
}
```

### Quest System

```typescript
// Quest daemon
function acceptQuest(player: MudObject, quest: Quest): void {
  player.quests.push(quest);
  efuns.playSound(player, 'quest', 'accept');
  efuns.send(player, `Quest accepted: ${quest.name}`);
}

function completeQuest(player: MudObject, quest: Quest): void {
  quest.completed = true;
  efuns.playSound(player, 'quest', 'complete');
  efuns.send(player, `Quest completed: ${quest.name}!`);

  // Also celebration sound for major quests
  if (quest.isMajor) {
    efuns.playSound(player, 'celebration', 'achievement');
  }
}

function updateQuestObjective(player: MudObject, quest: Quest): void {
  efuns.playSound(player, 'quest', 'update');
  efuns.send(player, `Quest updated: ${quest.currentObjective}`);
}
```

### Level Up

```typescript
// In player level-up logic
function levelUp(player: MudObject): void {
  player.level++;
  efuns.playSound(player, 'celebration', 'level-up');
  efuns.send(player, `Congratulations! You are now level ${player.level}!`);
}
```

### Room Ambience

```typescript
// In room enter hook
function onEnter(player: MudObject, room: MudObject): void {
  // Stop previous room's ambience
  efuns.stopSound(player, 'ambient', 'room-ambience');

  // Start new room's ambience if any
  const ambience = room.getAmbientSound();
  if (ambience) {
    efuns.loopSound(player, 'ambient', ambience, 'room-ambience', { volume: 0.3 });
  }
}

// In room exit hook
function onExit(player: MudObject, room: MudObject): void {
  efuns.stopSound(player, 'ambient', 'room-ambience');
}
```

### Communication

```typescript
// Tell command
function tell(sender: MudObject, target: MudObject, message: string): void {
  efuns.playSound(target, 'discussion', 'tell');
  efuns.send(target, `${sender.name} tells you: ${message}`);
}

// Say command
function say(speaker: MudObject, message: string): void {
  const room = efuns.environment(speaker);
  for (const listener of efuns.allInventory(room)) {
    if (listener !== speaker && isPlayer(listener)) {
      efuns.playSound(listener, 'discussion', 'say');
    }
  }
}

// Channel message
function channelBroadcast(channel: string, sender: MudObject, message: string): void {
  for (const player of getChannelSubscribers(channel)) {
    if (player !== sender) {
      efuns.playSound(player, 'discussion', 'channel');
    }
  }
}
```

### Low Health Warning

```typescript
// In damage resolution
function takeDamage(player: MudObject, amount: number): void {
  player.hp -= amount;

  // Low HP warning at 25%
  const hpPercent = player.hp / player.maxHp;
  if (hpPercent <= 0.25 && hpPercent > 0) {
    efuns.playSound(player, 'alert', 'low-hp');
  }
}
```

### Potion Use

```typescript
// In potion item
function drink(player: MudObject, potion: MudObject): void {
  efuns.playSound(player, 'potion', 'drink');

  switch (potion.type) {
    case 'health':
      player.hp = Math.min(player.hp + potion.amount, player.maxHp);
      efuns.playSound(player, 'potion', 'heal');
      break;
    case 'mana':
      player.mp = Math.min(player.mp + potion.amount, player.maxMp);
      efuns.playSound(player, 'potion', 'mana');
      break;
  }

  efuns.destruct(potion);
}
```

### Boss Encounters

```typescript
// Custom boss sounds
function startBossFight(player: MudObject, boss: MudObject): void {
  // Play boss-specific intro sound
  efuns.playSound(player, 'alert', `bosses/${boss.soundId}-intro.mp3`);

  // Start combat music
  efuns.loopSound(player, 'ambient', `bosses/${boss.soundId}-music.mp3`, 'boss-music');
}

function endBossFight(player: MudObject, boss: MudObject): void {
  // Stop boss music
  efuns.stopSound(player, 'ambient', 'boss-music');

  // Victory sound
  efuns.playSound(player, 'celebration', 'achievement');
}
```

## Best Practices

### 1. Use Appropriate Categories

Choose the category that best matches the event type, not the sound file:

```typescript
// Good: Category matches the event
efuns.playSound(player, 'combat', 'sword-clash');
efuns.playSound(player, 'spell', 'fireball');

// Bad: Mismatched categories confuse players
efuns.playSound(player, 'ui', 'sword-clash');  // Combat event with UI category?
```

### 2. Provide Volume Control for Loud/Frequent Sounds

```typescript
// Ambient sounds should be quieter
efuns.loopSound(player, 'ambient', 'rain', 'weather', { volume: 0.3 });

// Frequent combat sounds at moderate volume
efuns.playSound(player, 'combat', 'hit', { volume: 0.7 });
```

### 3. Always Clean Up Looping Sounds

```typescript
// When player leaves room
efuns.stopSound(player, 'ambient', 'room-ambience');

// When combat ends
efuns.stopSound(player, 'ambient', 'combat-music');

// When player disconnects (in disconnect handler)
efuns.stopSound(player, 'ambient');  // Stop all ambient
```

### 4. Don't Spam Sounds

```typescript
// Bad: Sound on every tick
heartbeat(): void {
  efuns.playSound(this, 'combat', 'hit');  // 60 sounds per minute!
}

// Good: Sound on significant events only
resolveAttack(): void {
  if (attackHit) {
    efuns.playSound(attacker, 'combat', 'hit');
  }
}
```

### 5. Graceful Degradation

Since missing sounds are silently ignored, you can reference sounds that don't exist yet:

```typescript
// This works even if the file doesn't exist
efuns.playSound(player, 'spell', 'meteor-shower');

// Add the file later without code changes
```

### 6. Organize Custom Sounds

```
sounds/
├── bosses/          # Boss-specific sounds
├── areas/           # Area ambience
├── items/           # Special item sounds
└── npcs/            # NPC voice lines
```

### 7. Test with Categories Disabled

Players may disable categories. Ensure your game doesn't rely on sounds for critical feedback - always accompany sounds with text:

```typescript
// Good: Sound + text
efuns.playSound(player, 'alert', 'low-hp');
efuns.send(player, '{RED}Warning: Your health is low!{/}');

// Bad: Sound only
efuns.playSound(player, 'alert', 'low-hp');
// Player with alerts disabled gets no warning!
```

## Technical Details

### Message Protocol

Sound messages use the `[SOUND]` protocol prefix:

```
\x00[SOUND]{"type":"play","category":"combat","sound":"hit","volume":1}
```

### Message Types

| Type | Description |
|------|-------------|
| `play` | Play sound once |
| `loop` | Play continuously until stopped |
| `stop` | Stop a playing sound |

### Client Storage

Settings stored in `localStorage`:
- Key: `mudforge-sound-settings`
- Persists across sessions
- Per-browser (not synced across devices)

### Build Process

The build script copies `src/client/sounds/` to `dist/client/sounds/`:

```bash
npm run build:client
# Includes: cpSync('src/client/sounds', 'dist/client/sounds', { recursive: true })
```

## Type Definitions

Import types from the sound-types module:

```typescript
import type { SoundCategory, SoundMessage } from '../lib/sound-types.js';
```

### SoundCategory

```typescript
type SoundCategory =
  | 'combat'
  | 'spell'
  | 'skill'
  | 'potion'
  | 'quest'
  | 'celebration'
  | 'discussion'
  | 'alert'
  | 'ambient'
  | 'ui';
```

### SoundMessage

```typescript
interface SoundMessage {
  type: 'play' | 'loop' | 'stop';
  category: SoundCategory;
  sound: string;
  volume?: number;
  id?: string;
}
```
