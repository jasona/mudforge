# Tutorial System

This guide documents MudForge's new-player tutorial pipeline and how to extend it.

## Overview

The tutorial is a state-machine-driven onboarding chapter:

- introduces movement, gear, combat basics
- advances through event notifications from rooms/items/NPCs
- supports skip and reconnect resume

Core logic is in `mudlib/daemons/tutorial.ts`.

## Chapter 1 Flow

Current sequence:

1. Arrive at war camp
2. Enter supply tent
3. Pick up starter gear
4. Wear armor
5. Wield weapon
6. Enter training yard
7. Kill training dummy
8. Exit camp and complete tutorial

## Event-Driven Progression

Tutorial progression is not command-polled; it is event-notified:

- rooms call `notify(player, '<event>')` on entry
- tutorial items call into item-pickup tracking
- milestone checks gate transitions

Examples of events:

- `arrived_at_camp`
- `entered_tent`
- `got_all_gear`
- `wore_armor`
- `wielded_weapon`
- `entered_yard`
- `killed_dummy`
- `entered_exit`

## Dialogue Delivery

Each step has scripted dialogue lines with per-line delay.

- dialogue uses timed callouts
- reconnecting players can have current-step dialogue replayed

## Gated Movement

Tutorial rooms use conditional exits to enforce progression:

- supply tent north exit unlocks after wield milestone
- training yard east exit unlocks after dummy kill milestone

## Skip Behavior

Players can skip by speaking to General Ironheart (response contains "skip").

Skip actions:

- marks tutorial complete
- ensures starter gear is present
- teleports player to town

## Completion Behavior

On normal completion:

- tutorial completion flag set
- reward granted (currently 50 XP)
- delayed teleport to Aldric town center

## Reconnect Behavior Mid-Tutorial

If a player reconnects while still in tutorial:

- tutorial can resume from saved step
- current-step dialogue is replayed to restore context

## Player State Keys

Tutorial uses player properties:

- `tutorial_step` (number)
- `tutorial_complete` (boolean)
- `tutorial_items_picked` (tracking object)

## Builder Extension Guide

To add new tutorial chapters:

1. Add step constants using gap numbering pattern.
2. Add dialogue entries for new steps.
3. Add transition map entries with optional checks.
4. Emit new events from area objects/NPCs/items.
5. Add room gates if progression lock is required.

Recommended practice:

- keep each step single-purpose
- use clear prompts with exact commands for first-time users
- design reconnect-safe dialogue for every gated stage

## Key Files

- `mudlib/daemons/tutorial.ts`
- `mudlib/areas/tutorial/war_camp.ts`
- `mudlib/areas/tutorial/supply_tent.ts`
- `mudlib/areas/tutorial/training_yard.ts`
- `mudlib/areas/tutorial/camp_exit.ts`
- `mudlib/areas/tutorial/general_ironheart.ts`

## Related Docs

- `docs/character-creation-and-login.md`
- `docs/player-features.md`
