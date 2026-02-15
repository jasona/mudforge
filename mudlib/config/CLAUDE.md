# mudlib/config/ - Game Configuration

## Files

- `game.json` - Central game config:
  ```json
  {
    "name": "MudForge",
    "tagline": "Your Adventure Awaits",
    "version": "1.9.2",
    "description": "A Modern MUD Experience",
    "establishedYear": 2026,
    "website": "https://mudforge.org",
    "setupComplete": true
  }
  ```
- `logo.png` - Game logo asset

## Version Management

Game version (game.json) is separate from driver version (package.json). Both managed by `scripts/bump-version.js`.

## Config Daemon

Runtime configuration managed by `daemons/config.ts`, persisted to `data/config/settings.json`. 35+ settings including combat, reset intervals, giphy, discord, bots, time cycle.
