# mudlib/cmds/admin/ - Admin Commands (22 commands)

Permission level 3 - available to administrators only.

## Key Commands

Player Management: `_promote.ts`, `_demote.ts`, `_ban.ts`, `_unban.ts`, `_kick.ts`
Server: `_shutdown.ts`, `_reboot.ts`, `_config.ts`
Debugging: `_snoop.ts`, `_eval.ts`, `_trace.ts`
Moderation: `_mute.ts`, `_unmute.ts`, `_freeze.ts`
System: `_reload.ts`, `_reset.ts`, `_gc.ts`

## Important Notes

- `_promote.ts` creates user directory and workroom when promoting to builder
- Admin commands can write anywhere (except forbidden files: .env, package.json, tsconfig.json)
- `_config.ts` manages mud-wide settings via ConfigDaemon
- `_ban.ts` supports optional expiration dates
