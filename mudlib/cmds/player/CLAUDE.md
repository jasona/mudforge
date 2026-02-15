# mudlib/cmds/player/ - Player Commands (103 commands)

Permission level 0 - available to all players.

## Common Commands

Movement: `_go.ts` (directions), `_look.ts`/`_glance.ts`, `_enter.ts`, `_climb.ts`, `_swim.ts`, `_fly.ts`
Items: `_get.ts`, `_drop.ts`, `_give.ts`, `_put.ts`, `_examine.ts`, `_wield.ts`, `_unwield.ts`, `_wear.ts`, `_remove.ts`
Communication: `_say.ts`, `_shout.ts`, `_tell.ts`, `_emote.ts`, `_whisper.ts`, `_channel.ts`
Combat: `_kill.ts`, `_flee.ts`, `_wimpy.ts`, `_consider.ts`
Character: `_score.ts`, `_stats.ts`, `_inventory.ts`, `_equipment.ts`, `_who.ts`, `_quit.ts`
Guilds: `_join.ts`, `_leave.ts`, `_train.ts`, `_advance.ts`, `_skills.ts`
Quests: `_quest.ts`, `_accept.ts`, `_turnin.ts`, `_abandon.ts`
Social: `_bow.ts`, `_nod.ts`, `_wave.ts`, etc.

## Prefix Commands (Single Character Shortcuts)

- `'` → say
- `"` → shout
- `:` → emote
- `;` → nod

## Item Utilities

Many item commands use `../../lib/item-utils.js`:
- `parseItemInput(args)` - supports "sword 2" indexed format
- `findItem(name, inventory, index)` - find by name with optional index
- `countMatching(name, inventory)` - count matches

## Key Patterns

- Most commands use `ctx.args.trim()` for argument parsing
- Broadcasting: notify room via `room.broadcast()` or iterating `room.inventory`
- Communication: `efuns.sendComm()` for channel-style messages
- Always check `if (!args)` and show usage
