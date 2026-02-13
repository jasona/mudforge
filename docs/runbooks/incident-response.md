# Incident Response Runbook

## Severity Levels

- `SEV-1`: Service down, data loss risk, major security incident.
- `SEV-2`: Significant degradation or abuse impacting many players.
- `SEV-3`: Localized issue or workaround available.

## Immediate Actions

1. Acknowledge incident and assign incident lead.
2. Capture timestamp, current branch/commit, and deployment target.
3. Check `/health` and `/ready`.
4. Review logs for crash loops, auth abuse spikes, or connection churn.
5. If needed, enable maintenance mode or stop new connections.

## Containment

- Security incident: rotate exposed secrets and block abusive accounts/IPs.
- Abuse incident: use `ban` and `kick`, gather reports from `reports.json`.
- Stability incident: rollback to last known good release.

## Recovery

1. Validate service health.
2. Validate login flow and core commands.
3. Confirm world state saves are healthy.
4. Post a short player-facing incident update.

## Postmortem

- Record root cause, contributing factors, and detection gaps.
- Add permanent action items with owners and due dates.
