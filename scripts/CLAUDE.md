# scripts/ - Utility Scripts

## Files

- `bump-version.js` (99 lines) - Semantic version management for driver (package.json) and game (mudlib/config/game.json):
  ```bash
  node scripts/bump-version.js                 # Show current versions
  node scripts/bump-version.js game minor      # Bump game minor
  node scripts/bump-version.js driver major    # Bump driver major
  ```
- `import-emotes.ts` - Emoji/emote data import for chat system
- `start.sh` - Shell wrapper for server startup

## audit/

Code quality enforcement scripts (run in CI):

- `check.mjs` (114 lines) - CI quality gate. Checks: circular dependency count, `any` usage, `as any` count, file size bounds. Reads baselines from `docs/audit/baseline/`. Blocks merge if thresholds exceeded.
- `circular-deps.mjs` (123 lines) - ESM import graph analyzer. Detects circular dependencies.
- `code-metrics.mjs` (156 lines) - TypeScript anti-pattern scanner. Counts: any, as, !!, function types. Identifies largest files.

## CI Integration

`npm run audit` runs `scripts/audit/check.mjs`. Called by `.github/workflows/audit.yml`.
