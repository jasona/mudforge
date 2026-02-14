# MudForge v2.0 Release Checklist

Use this checklist to gate public releases.

## Pre-Release Quality

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run audit:check`
- [ ] No open P0 issues for security, persistence, abuse prevention, or shutdown reliability

## Security and Abuse Controls

- [ ] Production `WS_SESSION_SECRET` is set
- [ ] Login brute-force protections are enabled
- [ ] API rate limits are enabled for public endpoints
- [ ] File access checks pass (path containment, permission checks)
- [ ] Moderation commands (`ban`, `kick`, `report`) are available and tested

## Gameplay Readiness

- [ ] High-risk exploit checks validated (`wimpycmd`, `pickpocket`, bulk `give`)
- [ ] Core command smoke test pass (login, movement, combat, inventory, chat)
- [ ] New player onboarding path verified end-to-end

## Operations and Recovery

- [ ] Health and readiness endpoints are green in staging
- [ ] Backup job runs and artifacts are retained
- [ ] Restore drill succeeds from latest backup
- [ ] Incident and rollback runbooks are reviewed

## Public Launch Artifacts

- [ ] `CHANGELOG.md` updated for release
- [ ] Deployment docs verified against current endpoints and config
- [ ] Terms of Service and Privacy Policy published
- [ ] v2.0 announcement draft prepared
- [ ] Support/reporting channel is staffed
