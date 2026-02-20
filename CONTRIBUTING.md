# Contributing to MudForge

Thank you for your interest in contributing to MudForge! This project is designed to be approachable for both human and AI contributors.

## AI-Assisted Development

MudForge is built with AI engineering workflows in mind. The codebase includes `CLAUDE.md` context files, comprehensive documentation, and strong type safety specifically to enable productive AI-assisted development. **AI contributions are very welcome** -- whether you're using Claude Code, Copilot, Cursor, or any other AI coding tool to help author your changes.

When submitting AI-assisted contributions, just make sure you review and understand the code before opening a PR.

## Getting Set Up

```bash
git clone https://github.com/jasona/mudforge.git
cd mudforge
npm install
cp .env.example .env
npm run dev
```

Requires **Node.js 22+**.

## Development Workflow

### Before You Start

1. Create a branch from `main` for your work.
2. Read the [Getting Started](docs/getting-started.md) guide to understand the project structure.
3. Familiarize yourself with the two-tier architecture: **driver** (`src/`) vs **mudlib** (`mudlib/`).

### Code Quality

All of these must pass before submitting a PR:

```bash
npm run typecheck    # TypeScript type checking (zero errors expected)
npm run lint         # ESLint (zero warnings expected)
npm test             # Vitest test suite (all tests passing)
npm run build        # Full build including client bundle
```

You can run all checks at once with:

```bash
npm run release:check
```

### Code Style

- **TypeScript** throughout -- no `any` types in `src/`.
- **Prettier** for formatting (`npm run format`).
- **ESLint** for linting (`npm run lint:fix` for auto-fixes).
- Follow existing patterns in the codebase. The std/ classes and existing areas are good references.

### Writing Tests

- Tests live in `tests/` mirroring the `src/` structure.
- Use [Vitest](https://vitest.dev/) for all tests.
- Test files are named `*.test.ts`.
- Aim to test behavior, not implementation details.

### Commit Messages

Use conventional commit style:

```
feat: add potion brewing system
fix: prevent duplicate player registration on reconnect
docs: update efuns reference with new file APIs
chore: bump game version to 1.9.5
```

## What to Contribute

### Game Content (mudlib/)

- New areas, rooms, NPCs, items, and quests in `mudlib/areas/`
- New player commands in `mudlib/cmds/`
- New or improved daemons in `mudlib/daemons/`
- Base class enhancements in `mudlib/std/`

### Driver (src/)

- Bug fixes and stability improvements
- New efuns (driver APIs exposed to mudlib code)
- Client UI enhancements
- Performance improvements
- Test coverage

### Documentation (docs/)

- Improving existing guides
- Adding examples and tutorials
- Keeping API references up to date

## Pull Request Guidelines

1. **Keep PRs focused.** One feature or fix per PR.
2. **Include tests** for new functionality.
3. **Update docs** if you change APIs or add features.
4. **Describe what and why** in your PR description.
5. All CI checks must pass.

## Architecture Quick Reference

| Area | Purpose | Runs In |
|------|---------|---------|
| `src/driver/` | Core engine, object registry, efun bridge | Node.js |
| `src/network/` | HTTP + WebSocket server | Node.js |
| `src/isolation/` | V8 sandbox management | Node.js |
| `src/client/` | Browser terminal client | Browser |
| `mudlib/std/` | Base classes (Room, NPC, Item, etc.) | V8 Sandbox |
| `mudlib/daemons/` | Background services | V8 Sandbox |
| `mudlib/cmds/` | Player/builder/admin commands | V8 Sandbox |
| `mudlib/areas/` | Game world content | V8 Sandbox |

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
