# Death and Resurrection

When your character dies in MudForge, you become a ghost and must resurrect to continue playing. This guide covers death mechanics, penalties, corpse management, and resurrection options.

## Death Overview

Death occurs when your health drops to 0 or below. When you die:

1. All combat ends
2. A corpse is created at your location
3. Your inventory and gold transfer to the corpse
4. You become a ghost
5. You must choose how to resurrect

## Ghost Mode

As a ghost, you:
- Can see and hear the world
- Can execute commands
- Cannot attack or use combat abilities
- Cannot regenerate health or mana
- Cannot pick up items or change equipment
- Appear as "the ghost of [name]" to others

Ghost mode persists until you choose to resurrect.

## Corpse Mechanics

### Corpse Contents

Your corpse contains:
- All items you were carrying
- All equipped gear (automatically unequipped)
- All carried gold

**Note:** Banked gold is never lost to death.

### Corpse Decay

Corpses have limited lifespans:

| Type | Decay Time |
|------|------------|
| Player corpse | 60 minutes |
| NPC corpse | 5 minutes |

When a corpse decays:
- Items drop to the room floor
- Gold scatters (lost)
- You receive a notification as a ghost

### Corpse Commands

While alive, you can interact with corpses:
- `look corpse` - View corpse contents
- `get <item> from corpse` - Take items
- `get all from corpse` - Take everything
- `bury corpse` - Dispose of NPC corpses for rewards

## Resurrection Options

### Resurrect at Corpse

```
resurrect corpse
res corpse
```

**Requirements:**
- Must be in ghost mode
- Corpse must still exist

**Process:**
1. You appear at your corpse's location
2. All items return to your inventory
3. All gold is recovered
4. Corpse is destroyed
5. You revive with 25% health and mana

**Advantages:**
- Recover all your items and gold
- Higher health/mana on revival
- Corpse is removed (no decay risk)

### Resurrect at Shrine

```
resurrect shrine
res shrine
```

**Requirements:**
- Must be in ghost mode

**Process:**
1. You appear at the resurrection shrine
2. Corpse remains at death location
3. You're told where your corpse is
4. You revive with 10% health and mana

**Advantages:**
- Always available
- Useful if corpse is in dangerous area

**Disadvantages:**
- Must return to corpse for items
- Lower health/mana on revival
- Risk of corpse decay

## Death Penalties

### Health and Mana Penalties

| Resurrection Type | Health | Mana |
|-------------------|--------|------|
| At Corpse | 25% max | 25% max |
| At Shrine | 10% max | 10% max |

### Gold Risk

- **Carried gold**: Transferred to corpse (can be recovered or lost)
- **Banked gold**: Always safe, never affected by death

### Equipment Risk

- All items go to your corpse
- If corpse decays before recovery, items are dropped in the room
- Items dropped in dangerous areas may be lost

## NPC Death

When you kill an NPC:

### Loot

- NPC inventory transfers to corpse
- Random loot is generated based on NPC's loot table
- Gold drops based on NPC's gold configuration

### Experience

- All attackers receive XP based on the NPC's level
- Party members in the room split XP equally
- Higher level NPCs give more XP

### Respawning

Some NPCs respawn after death:
- Respawn time is configured per NPC
- A new instance appears at the original location
- Loot tables reset

## Sound Effects

- **Death**: Alert sound when you die
- **Resurrection**: Alert sound when you revive

## Tips for Survival

1. **Bank your gold**: Use banks in towns to protect gold from death
2. **Watch your health**: Flee (`flee`) if health gets low
3. **Set wimpy**: Use `wimpy` command to auto-flee at low health
4. **Know shrine locations**: Remember where resurrection shrines are
5. **Travel with party**: Party members can help in dangerous areas
6. **Carry healing**: Stock up on healing potions
7. **Return quickly**: Don't let your corpse decay with valuable items

## Recovery After Death

### If You Resurrected at Corpse

You're all set - items and gold recovered. Find healing or rest to restore health/mana.

### If You Resurrected at Shrine

1. Note the corpse location from the resurrection message
2. Travel back to your corpse carefully
3. `get all from corpse` to recover items
4. Consider the risks if the area is dangerous

## Configuration (Administrators)

Corpse decay times can be configured in `/mudlib/data/config/settings.json`:

```json
{
  "corpse.playerDecayMinutes": 60,
  "corpse.npcDecayMinutes": 5
}
```

## Technical Details

### Death Events

When a player dies, the system:
1. Ends all combat via combat daemon
2. Clears any active shadows/transformations
3. Creates corpse with `isPlayerCorpse = true`
4. Transfers all inventory and gold
5. Sets `_isGhost = true`
6. Broadcasts death message to room

### Resurrection Events

When a player resurrects:
1. Ghost flag is cleared
2. Health/mana set to percentage of max
3. Player is moved to corpse or shrine
4. Items recovered (if corpse resurrection)
5. Corpse destroyed or location remembered
6. Resurrection broadcast to room
