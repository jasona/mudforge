# Soft Launch Burn-In Guide

Use this for the first 7-14 days before fully opening registrations.

## Daily Checks

- Verify `/health` and `/ready`.
- Review login failure rate and abuse/rate-limit events.
- Review reports and moderation actions.
- Confirm backups completed successfully.

## Gameplay Checks

- New account creation and tutorial completion.
- Core command flow: movement, combat, inventory, chat.
- Death/resurrection flow.
- Reconnect/session recovery behavior.

## Stability Checks

- No crash loops.
- No persistent memory growth trend.
- No stuck shutdowns.

## Exit Criteria For Public Expansion

- No unresolved SEV-1 issues.
- No unresolved exploit that risks data or account integrity.
- Moderation response process confirmed by staff.
