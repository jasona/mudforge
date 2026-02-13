# MudForge Release Freeze Policy

This policy defines the stabilization window before a public release.

## Freeze Window

- Start freeze 7 days before release candidate (`RC`) cut.
- End freeze only after release checklist completion and sign-off.

## Allowed During Freeze

- Security fixes
- Data integrity and persistence fixes
- Crash fixes and reliability fixes
- Test and documentation updates needed for release confidence

## Blocked During Freeze

- New gameplay systems
- Risky refactors without direct release impact
- Protocol or persistence format changes unless required for a blocker
- Non-essential dependency churn

## Change Control

- Every freeze-period PR must include:
  - Risk assessment
  - Rollback plan
  - Test evidence
- At least one reviewer must explicitly confirm release risk is acceptable.

## Exit Criteria

- All release-blocking issues resolved
- CI checks pass on release branch
- Backup/restore drill completed successfully
- Go/No-Go review held with launch owner
