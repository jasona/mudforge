# Progression and Leveling

This guide explains how character progression works in MudForge.

## Overview

Player progression has two layers:

- **Character level and stats** (base RPG progression)
- **Guild skills** (class-style ability progression)

## Character Level System

Core implementation is in `mudlib/std/player.ts`.

### Level Cap

- Maximum player level: **50**

### XP Curve

XP required for level `N`:

```text
xpForLevel(N) = N * N * 100
```

Examples:

- Level 2 target: 400 XP
- Level 10 target: 10,000 XP

### Gaining XP

XP sources include:

- NPC kills
- quests/tutorial rewards
- party XP sharing flows
- some passive guild usage XP hooks

### Level Up

When leveling succeeds:

- XP cost for next level is paid
- player level increases by 1
- default level-up bonuses apply:
  - +10 max HP
  - +5 max MP
  - current HP/MP increase with new maxima

## Stat Growth

Base stats can be increased by spending XP.

### Stat Raise Cost

```text
xpToRaiseStat = currentStat * 50
```

Constraints:

- stats cannot exceed the max stat cap defined by `Living`/player constants

## Combat Difficulty Scaling

Combat performance scales strongly with:

- level difference
- base stats (especially STR/DEX/LUCK/CON/WIS depending on context)
- combat stat modifiers from gear/effects

Use `consider <target>` before fights to estimate relative danger.

## Guild Skill Progression

Guild progression is documented in detail in `docs/guilds.md`; key points:

- skills are learned through guild systems/trainers
- active skills have mana costs and cooldowns
- skills level through progression/usage models in guild daemon logic

Player command:

```text
skills
skill info <name>
skill available
```

## Practical New-Player Loop

1. Complete tutorial for starting XP and baseline mechanics.
2. Fight level-appropriate targets (`consider` first).
3. Spend XP on level-ups and strategic stat increases.
4. Join guilds and begin skill progression.

## Builder Balancing Notes

When tuning progression:

- validate level curve pacing against area content
- keep trainer/stat costs aligned with expected XP/hour
- ensure early game has enough low-risk XP opportunities
- test party XP feel to avoid punishing grouped play

## Key Files

- `mudlib/std/player.ts`
- `mudlib/daemons/guild.ts`
- `mudlib/std/trainer.ts`
- `mudlib/cmds/player/_skills.ts`

## Related Docs

- `docs/guilds.md`
- `docs/combat.md`
- `docs/quests.md`
- `docs/tutorial-system.md`
