# mudlib/cmds/builder/ - Builder Commands (41 commands)

Permission level 1 - available to builders and above.

## Key Commands

Object Management: `_clone.ts`, `_destruct.ts`, `_update.ts`, `_reload.ts`
Navigation: `_goto.ts`, `_trans.ts` (transfer player), `_home.ts`
File System: `_cd.ts`, `_ls.ts`, `_cat.ts`, `_edit.ts`, `_mkdir.ts`, `_rm.ts`
Building: `_room.ts`, `_exit.ts`, `_item.ts`, `_npc.ts`
Inspection: `_examine.ts` (detailed), `_info.ts`, `_stat.ts`
Area Builder: `_area.ts` (draft area management via area daemon)
World: `_map.ts`, `_terrain.ts`

## Common Patterns

- File operations use `efuns.writeFile()`, `efuns.readFile()`, `efuns.fileExists()`
- Object cloning: `efuns.cloneObject(path)`
- IDE integration: `efuns.ideOpen({action, path, content, readOnly, language})`
- Builder commands can write to `/areas/` directory
- Protected paths: `/std/`, `/daemons/` blocked for non-admins
