# Changelog

All notable changes to this project are documented in this file.

## [2.0.0] - Unreleased

### Added

- Public release checklist and freeze policy docs.
- CI workflow for typecheck/lint/test/build plus coverage job.
- Runbooks for incident response, backup restore, and graceful shutdown.
- Moderation commands: `ban`, `unban`, `kick`, and player `report`.
- Legal baseline docs: Terms of Service and Privacy Policy.

### Changed

- Hardened efun file path validation and file stat permissions.
- Added production validation for `WS_SESSION_SECRET`.
- Added atomic persistence writes with backup snapshots.
- Added API and connection rate limiting.
- Added login brute-force protections and ban enforcement hooks.
- Improved shutdown sequencing and configurable shutdown timeout.
- Added exploit protections for `wimpycmd`, `pickpocket`, and `give`.
