# mudlib/std/ - Base Classes & Game Systems

## Object Hierarchy

```
MudObject (object.ts)
├── Item (item.ts) - Physical objects with weight, value, light source
│   ├── Weapon (weapon.ts) - Damage, handedness, special attacks
│   ├── Armor (armor.ts) - Protection, slots, resistances
│   ├── Container (container.ts) - Storage with capacity/lock
│   ├── Consumable (consumable.ts) - Food/drink/potion with effects
│   ├── Corpse (corpse.ts) - Death container, auto-destruct
│   ├── GoldPile (gold-pile.ts) - Loose gold wrapper
│   ├── Bag (bag.ts) - Weight-reducing container
│   ├── Campfire (campfire.ts) - Light source + regen bonus
│   └── Ferry/Vehicle (ferry.ts, vehicle.ts) - Transport
├── Room (room.ts, ~1007 lines) - Locations with exits, spawning, visibility
├── Living (living.ts, ~1904 lines) - Sentient base with stats, combat, effects
│   ├── Player (player.ts, ~3100 lines) - User-controlled, save/restore, UI
│   ├── NPC (npc.ts, ~1946 lines) - Computer-controlled, AI, chat, loot
│   │   ├── Merchant (merchant.ts) - Buy/sell
│   │   ├── Trainer (trainer.ts) - Teach skills
│   │   ├── Mercenary (mercenary.ts) - Hireable companion
│   │   ├── Pet (pet.ts) - Summoned animal
│   │   └── Bot (bot.ts) - Autonomous NPC
│   └── Shadow (shadow.ts) - Overlay/proxy system
└── equipment.ts - Equipment slot type definitions (no class)
```

## Core Stats (Living)

7 stats: Strength, Intelligence, Wisdom, Charisma, Dexterity, Constitution, Luck
- Range: MIN_STAT=1 to MAX_STAT=50
- Formula: effective = base + modifier

9 combat stats: toHit, toCritical, toBlock, toDodge, toParry, toRiposte, attackSpeed, damageBonus, armorBonus

## Effect System (Living)

Types: stat_modifier, combat_modifier, damage_over_time, heal_over_time, damage_shield, thorns, stun, slow, haste, invulnerable, stealth, invisibility, see_invisible, detect_hidden, taunt, blind, deaf, mute, arm_disabled, leg_disabled, threat_modifier

Magnitude caps: stat_modifier=15, combat_modifier=40, DoT=50, resistance=75%
Max stacks: 5

## NPC Types

normal (1x), miniboss (1.5x HP), elite (2x HP), boss (3x HP, 5x XP)

## Player Save Data (PlayerSaveData)

Complete state: name, title, gender, level, experience, health, mana, stats, location, inventory, equipment, properties, account info, exploration, currency, guilds, avatar, race, pets, mercenaries, generated items, persistent effects.

## Subsystem Directories

- `combat/` - Combat types, effects
- `guild/` - Guild definitions, skills, guild master NPC
- `profession/` - Crafting/gathering system with materials, recipes, tools, stations, resource nodes
- `quest/` - Quest types and definitions
- `race/` - Race definitions and latent abilities
- `visibility/` - Light levels, perception, visibility checks
- `behavior/` - NPC combat AI evaluator
- `loot/` - Random loot generation with quality tiers and affixes
- `consumables/` - Healing potions, food items
- `materials/` - Crafting materials (firewood, tinder)
- `generated/` - Templates for randomly generated weapons/armor/baubles
- `party/` - Party system types
- `items/` - Special items (see_invisibility potion)

## Key Lifecycle Hooks

- `onCreate()` - Object created
- `onDestroy()` - Object destructed
- `onClone(blueprint)` - After cloning
- `onReset()` - Periodic reset (respawn items/NPCs)
- `heartbeat()` - Every 2 seconds if enabled
- `onEnter(obj, from?)` - Living enters room (only via moveDirection)
- `onLeave(obj, to?)` - Living leaves room (only via moveDirection)
- `onTake(taker)` - Item picked up (gated by instanceof Item)
- `onDrop(dropper)` - Item dropped
- `onDeath()` - Health reaches 0

## Important Convention

Setting NPC `name` auto-generates IDs from name tokens. "Master Vorn" → addId('master'), addId('vorn'), addId('master vorn').
