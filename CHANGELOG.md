# Changelog

All notable changes to this project are documented in this file.

## [1.9.5] - Unreleased

### Fixed

- Crafted items now use proper class setters instead of generic setProperty.

### Documentation

- Added engage, portraits, setup wizard, sky/time docs and updated existing references.

## [1.9.4]

### Added

- Expanded professions content and fixed gathering interactions.

## [1.9.3]

### Added

- WoW-style NPC engage dialogue overlay with interactive tutorial flow.
- Blocking engage loading modal with rotating status text.
- Enhanced engage dialogue for quests, trading, and NPC behavior.
- Serve generated images over HTTP with URL-first payloads.
- Communications panel with persistent open/closed state.
- Debug dropdown menu with panel controls.

### Fixed

- Strengthened 1Password ignore handling across client inputs.
- Communications panel collapse now properly shrinks the window.

## [1.9.2]

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
