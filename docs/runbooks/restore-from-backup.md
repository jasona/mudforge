# Restore From Backup Runbook

## Backup Scope

- `mudlib/data/players/`
- `mudlib/data/world-state.json`
- `mudlib/data/permissions.json`
- Optional moderation/config data under `mudlib/data/`

## Restore Steps

1. Stop the server process.
2. Archive current `mudlib/data` as a safety copy.
3. Extract selected backup into `mudlib/data`.
4. Validate file ownership/permissions.
5. Start server and verify `/health` and `/ready`.
6. Validate sample player login and world interactions.

## Validation Checklist

- Player saves load correctly.
- World state is present and current enough for RPO target.
- Permissions and moderation files are readable.
- No JSON parse errors in startup logs.

## Rollback

If restore fails, stop server and restore the safety copy from step 2.
