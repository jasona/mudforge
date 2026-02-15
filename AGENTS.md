# Repository Guidelines

## Project Structure & Module Organization
`src/` holds the TypeScript code for the driver and client:
`src/driver/` (core runtime), `src/client/` (web UI), `src/network/` (WS + sessions),
`src/isolation/` (sandbox execution), and `src/shared/` (shared helpers).
`mudlib/` is the game content and standard library (rooms, items, daemons, data).
`tests/` contains Vitest suites organized by domain (e.g., `tests/driver/`, `tests/mudlib/`).
`dist/` is build output. `docs/` and `scripts/` hold documentation and tooling utilities.

## Build, Test, and Development Commands
- `npm run dev`: Run the driver in watch mode (ignores `mudlib/` changes).
- `npm run dev:no-watch`: Run once without watching.
- `npm run build`: TypeScript build plus client bundle output into `dist/`.
- `npm run test`: Run Vitest in CI mode.
- `npm run test:watch`: Watch tests during development.
- `npm run lint` / `npm run lint:fix`: Run ESLint (optionally fixing).
- `npm run format` / `npm run format:check`: Format or verify formatting with Prettier.
- `npm run typecheck`: `tsc --noEmit` for type safety.

## Coding Style & Naming Conventions
TypeScript is the primary language. Prettier enforces 2-space indentation, semicolons,
single quotes, and 100-column wrapping. Use descriptive, domain-aligned names
(`connection-manager`, `object-registry`) and keep file naming consistent with existing
modules. Tests use `*.test.ts` naming.

## Testing Guidelines
Tests are written with Vitest. Place new tests under `tests/` in a matching domain folder.
Use the existing `*.test.ts` pattern (example: `tests/network/session-manager.test.ts`).
Run `npm run test` before submitting changes; use `npm run test:watch` for active work.

## Commit & Pull Request Guidelines
Commit messages follow Conventional Commits (examples in history):
`feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`.
PRs should include:
- A clear summary and rationale
- Linked issues (if any)
- Tests run and results
- Screenshots or clips for UI changes (web client)

## Configuration & Runtime Notes
Node.js >= 22 is required (`package.json` engines). Client assets live in
`src/client/` and are copied/bundled into `dist/client/` by `npm run build:client`.
