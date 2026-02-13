# Combat System

This guide explains how combat works in MudForge for players, builders, and admins.

## Overview

Combat is real-time and round-based:

- Combat starts with `kill <target>` (or `attack <target>`).
- Once engaged, rounds execute automatically until one side dies, flees, or is separated.
- Round speed, hit chance, damage, and defensive outcomes are all stat-driven.

Core implementation lives in `mudlib/daemons/combat.ts`.

## Player Commands

### Start and Evaluate Fights

```text
kill goblin
attack goblin
consider goblin
con goblin
```

### Escape and Auto-Escape

```text
flee
flee north
wimpy 25
wimpy off
wimpycmd flee east
wimpycmd clear
```

## Combat Lifecycle

1. **Initiate:** attacker and defender must both be alive and in the same room.
2. **Retaliation:** NPC defenders automatically retaliate.
3. **Round loop:** each round resolves attack outcomes and schedules the next round.
4. **End conditions:** death, fleeing, room separation, or explicit combat end.
5. **Cleanup:** combat target UI clears and combat music stops when no fights remain.

## Round Timing

Base timing is 3 seconds, clamped to 1-5 seconds per round.

Timing is affected by:

- attack speed modifiers
- weapon attack speed
- dexterity bonus
- encumbrance penalties

This makes fast, lightly encumbered builds attack more often.

## Hit and Defense Resolution

Combat resolves in stages:

1. Circling chance (no strike this round)
2. Hit roll
3. On miss: possible glancing blow, then parry/dodge/miss
4. On hit: possible block and critical
5. Damage application and messaging

Possible outcomes include:

- miss
- dodge
- parry (with possible riposte)
- glancing blow
- blocked hit
- critical hit

## Damage Model

Damage combines:

- weapon or natural attack roll
- stat scaling (physical uses strength, magical uses intelligence)
- combat stat bonuses
- armor and resistances
- critical bonus behavior

Special handling:

- **Critical hits** add extra damage that bypasses armor reduction.
- **Thorns** can damage attackers after they land hits.
- **Damage shields** and invulnerability effects are respected.

## Threat and Aggro Integration

When NPCs take damage, they build threat toward attackers.

- Magic damage produces higher threat than physical.
- Healing produces reduced threat.
- Threat modifiers and stealth effects influence final threat generation.

For deep aggro behavior, see `docs/aggro-threat.md`.

## Fleeing and Wimpy

Manual fleeing (`flee`) uses a dexterity check and a valid exit.

Wimpy behavior:

- `wimpy <percent>` triggers when HP percent drops below threshold.
- `wimpycmd <command>` runs first if set.
- If no custom command succeeds, random-direction flee is attempted.

## Death Outcomes

On kill:

- kill/death messages are sent to attacker, victim, and room.
- quest kill objectives are updated.
- victim combat state is fully cleaned up.

Player death details are documented in `docs/death-resurrection.md`.

## Rules and Safeguards

- PvP can be globally disabled via config (`combat.playerKilling`).
- Regular players cannot attack staff.
- Staff nohassle can prevent NPC combat interactions.
- Builder/staff survivability protections apply in combat edge cases.

## Builder Tuning Checklist

When tuning combat feel:

- set NPC level and combat stats intentionally
- test with `consider` at multiple player levels
- validate encumbrance impact against intended pacing
- check skill cooldown/mana interactions with baseline auto-attacks
- test flee and wimpy flows in narrow rooms and multi-exit rooms

## Related Docs

- `docs/behavior-system.md`
- `docs/buffs-debuffs.md`
- `docs/aggro-threat.md`
- `docs/death-resurrection.md`
- `docs/guilds.md`
