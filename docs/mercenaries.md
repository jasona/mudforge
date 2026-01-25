# Mercenary System

The mercenary system allows players to hire NPC companions that follow them and assist in combat. Mercenaries use the NPC Behavior System for intelligent, role-appropriate combat AI.

## Overview

Mercenaries are professional fighters-for-hire that can be recruited from mercenary brokers found in taverns and pubs throughout the world. Each mercenary has a specific combat role and uses AI to make tactical decisions during battle.

**Key Features:**
- Four mercenary types with distinct combat roles
- Intelligent combat AI using the behavior system
- Automatic following when moving between rooms
- Persistence across login sessions
- Customizable names
- Level-based pricing with discounts for lower-level hires

## Hiring Mercenaries

### Location

Mercenaries can be hired from brokers in taverns. The first broker, **Grimjaw**, is located at **The Rusty Blade** pub in Aldric (southwest from the town center).

### How to Hire

1. Go to the pub and find the mercenary broker
2. Say `hire`, `shop`, or `mercenary` to the broker
3. A GUI modal will open showing:
   - Available mercenary types (left panel)
   - Level selection and cost preview (center panel)
   - Your current mercenaries (right panel)
4. Select a type, choose a level, and click **Hire**
5. Gold will be deducted and the mercenary will appear

### Hiring Limits

| Player Level | Max Mercenaries |
|--------------|-----------------|
| 1-29         | 1               |
| 30+          | 2               |

## Mercenary Types

### Fighter (Tank)

**Role:** Front-line defender who draws enemy attention and protects allies.

| Attribute | Value |
|-----------|-------|
| Combat Role | Tank |
| Behavior Mode | Aggressive |
| Base Mana | 20 |

**Skills:**
- `bash` - Stuns the target
- `taunt` - Forces enemies to attack the fighter
- `defensive_stance` - Reduces incoming damage
- `shield_wall` - Major defensive cooldown

**Combat Behavior:**
- Prioritizes taunting enemies off injured allies
- Uses defensive skills when health is low
- Engages multiple enemies to keep them off damage dealers

---

### Mage (Ranged DPS)

**Role:** Powerful spellcaster who deals heavy damage from a distance.

| Attribute | Value |
|-----------|-------|
| Combat Role | DPS (Ranged) |
| Behavior Mode | Aggressive |
| Base Mana | 100 |

**Skills:**
- `magic_missile` - Reliable arcane damage
- `fire_bolt` - Fire damage spell
- `frost_armor` - Defensive ice barrier
- `lightning` - High damage lightning strike

**Combat Behavior:**
- Maintains distance from enemies when possible
- Prioritizes high-damage spells
- Uses defensive spells when threatened
- Manages mana efficiently

---

### Thief (Melee DPS)

**Role:** Stealthy combatant who deals precise, devastating strikes.

| Attribute | Value |
|-----------|-------|
| Combat Role | DPS (Melee) |
| Behavior Mode | Aggressive |
| Base Mana | 50 |

**Skills:**
- `hide` - Enters stealth mode
- `backstab` - High damage from stealth
- `poison_blade` - Applies damage-over-time poison

**Combat Behavior:**
- Attempts to hide before engaging
- Uses backstab for maximum damage from stealth
- Applies poison for sustained damage
- Repositions for tactical advantage

---

### Cleric (Healer)

**Role:** Divine spellcaster focused on keeping allies alive.

| Attribute | Value |
|-----------|-------|
| Combat Role | Healer |
| Behavior Mode | Defensive |
| Base Mana | 80 |

**Skills:**
- `heal` - Single target healing
- `bless` - Buff that improves ally stats
- `group_heal` - Heals multiple allies
- `divine_shield` - Protective barrier

**Combat Behavior:**
- Prioritizes healing injured allies (owner first)
- Casts buffs before and during combat
- Uses emergency heals when allies are critical
- Will heal owner even when not directly in combat

## Pricing

Mercenary costs are based on the mercenary's level relative to the player's level.

### Formula

```
Cost = BaseCost × MercLevel × 10 × DiscountFactor

Where:
- BaseCost = 100 gold
- DiscountFactor = 0.75^(PlayerLevel - MercLevel) for lower-level mercs
- DiscountFactor = 1.0 for same-level mercs
```

### Example Costs (Level 20 Player)

| Merc Level | Cost | Notes |
|------------|------|-------|
| 20 | 20,000g | Same level (full price) |
| 15 | 6,328g | 5 levels lower |
| 10 | 1,676g | 10 levels lower |
| 5 | 444g | 15 levels lower (bargain) |

Lower-level mercenaries are significantly cheaper but less effective in combat.

## Player Commands

All commands use the `mercenary` command (aliases: `merc`, `mercs`).

### List Mercenaries

```
merc
merc list
```

Displays all your current mercenaries with:
- Name and type
- Level
- Combat role
- Health bar
- Follow status

### Dismiss a Mercenary

```
merc dismiss <name or type>
```

Permanently releases a mercenary from your service. They will depart and cannot be recovered.

**Examples:**
```
merc dismiss fighter
merc dismiss Grok
```

### Follow Mode

```
merc follow
```

Makes all mercenaries follow you when you move between rooms. This is the default behavior.

### Stay Mode

```
merc stay
merc stop
merc wait
```

Makes all mercenaries stay in their current location. They will not follow you until you use `merc follow` again.

### Order Attack

```
merc attack <target>
```

Orders all mercenaries in your current room to attack a specific target.

**Examples:**
```
merc attack goblin
merc attack wolf
```

### Name a Mercenary

```
merc name <mercenary> <new name>
```

Gives a mercenary a custom name. Names must:
- Be 20 characters or less
- Start with a letter
- Contain only letters, numbers, spaces, hyphens, or apostrophes

**Examples:**
```
merc name fighter Grok
merc name cleric Sister Mercy
merc name thief Shadow-blade
```

## Combat AI

Mercenaries use the **NPC Behavior System** for intelligent combat decisions. Each combat round, the behavior daemon:

1. Evaluates the combat context (allies, enemies, health levels, threats)
2. Scores possible actions based on the mercenary's role
3. Executes the highest-scoring action

### Role-Specific Behaviors

| Role | Priority Actions |
|------|------------------|
| Tank | Taunt enemies, use defensive skills when low HP, protect allies |
| Healer | Heal injured allies, buff party, emergency self-heals |
| DPS Melee | Backstab from stealth, apply DoT effects, focus high-value targets |
| DPS Ranged | Cast damage spells, maintain distance, use AoE when beneficial |

### Healing Behavior

Cleric mercenaries will:
- Heal the owner when their HP drops below 70%
- Prioritize the owner over other targets
- Cast heals even when not directly in combat (if owner is injured)
- Announce healing spells to the room

### Flee Behavior

When a mercenary's health drops critically low (configurable threshold), they may attempt to flee combat to survive.

## Following and Separation

### Automatic Following

When in follow mode, mercenaries automatically:
- Follow the owner when they move rooms
- Announce their movement to other players in the room
- Cannot follow while in active combat

### Automatic Rejoin

If a mercenary becomes separated from their owner (e.g., owner teleports), the mercenary will:
- Detect the separation during their next heartbeat
- Automatically move to the owner's location
- Announce their departure and arrival

### Owner Offline

If a mercenary's owner goes offline, the mercenary will dismiss themselves with a thematic message:

| Type | Departure Message |
|------|-------------------|
| Fighter | Sheathes weapon: "Contract's over if the employer's gone." Strides away. |
| Mage | Closes spellbook: "No patron, no pay." Vanishes in arcane light. |
| Thief | Glances nervously: "Boss ain't paying anymore..." Slips into shadows. |
| Cleric | Offers a prayer: "My services are no longer required here." Departs with dignity. |

## Persistence

Mercenaries are saved with player data and restored on login:

### Saved Data
- Mercenary ID and type
- Custom name (if any)
- Level and stats (HP, mana)
- Behavior configuration
- Learned skills and skill levels
- Hire timestamp

### Restoration

When a player logs in:
1. Mercenary data is loaded from the player save file
2. New mercenary objects are created
3. Stats, skills, and behavior are restored
4. Mercenaries are placed in the player's current room
5. Mercenaries default to follow mode

## Death and Loss

### Mercenary Death

When a mercenary dies in combat:
- A corpse is created with any items they carried
- The owner receives a notification
- The mercenary is permanently lost
- A new mercenary must be hired to replace them

### No Resurrection

Dead mercenaries cannot be resurrected. The corpse will decay normally.

## Technical Reference

### Files

| File | Purpose |
|------|---------|
| `mudlib/lib/mercenary-types.ts` | Type definitions and templates |
| `mudlib/std/mercenary.ts` | Mercenary class |
| `mudlib/daemons/mercenary.ts` | MercenaryDaemon singleton |
| `mudlib/lib/mercenary-modal.ts` | GUI modal for hiring |
| `mudlib/cmds/player/_mercenary.ts` | Player commands |
| `mudlib/areas/valdoria/aldric/pub.ts` | The Rusty Blade pub |
| `mudlib/areas/valdoria/aldric/broker.ts` | Grimjaw broker NPC |

### Integration Points

| System | Integration |
|--------|-------------|
| Behavior System | Mercenaries use `BehaviorDaemon` for combat AI |
| Guild System | Skills executed via `GuildDaemon` |
| Combat System | Attacks handled by `CombatDaemon` |
| Movement (`_go.ts`) | Mercenary following on room change |
| Player Save | Mercenary data saved/restored with player |
| Login Daemon | Mercenaries restored on player login |

### Adding New Mercenary Types

To add a new mercenary type:

1. Add the type to `MercenaryType` in `mercenary-types.ts`
2. Create a template in `MERCENARY_TEMPLATES`
3. Define appropriate skills, behavior role, and base stats
4. Update the modal UI if needed
5. Add departure message in `mercenary.ts` `dismissSelfOwnerOffline()`

### Behavior Configuration

Mercenaries extend the standard `BehaviorConfig` with:

```typescript
{
  mode: 'aggressive' | 'defensive',
  role: 'tank' | 'healer' | 'dps_melee' | 'dps_ranged',
  guild: 'fighter' | 'mage' | 'thief' | 'cleric',
  mercenaryOwner: string  // Owner's name - used to identify allies
}
```

The `mercenaryOwner` property allows the behavior evaluator to recognize the owner as an ally for healing and protection purposes.
