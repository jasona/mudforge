# mudlib/cmds/ - Command System

## Directory Structure

```
cmds/
├── player/    (103 commands) - Permission level 0, all players
├── builder/   (41 commands)  - Permission level 1, builders+
├── senior/    (3 commands)   - Permission level 2, senior builders+
├── admin/     (22 commands)  - Permission level 3, admins only
└── guilds/    (39 commands)  - Guild-specific skills
    ├── cleric/  (9)
    ├── fighter/ (11)
    ├── mage/    (11)
    └── thief/   (9)
```

## Command Interface

```typescript
export interface Command {
  name: string | string[];  // Command name(s) / aliases
  description: string;
  usage?: string;
  execute(ctx: CommandContext): boolean | void | Promise<boolean | void>;
}
```

## CommandContext

```typescript
interface CommandContext {
  player: MudObject;
  input: string;       // Full input (trimmed)
  verb: string;        // Command verb used
  args: string;        // Arguments after verb
  send(msg: string): void;      // Without newline
  sendLine(msg: string): void;  // With newline
  savePlayer(): Promise<void>;
}
```

## File Naming Convention

All command files MUST be prefixed with `_` (e.g., `_look.ts`, `_get.ts`).

## Export Pattern

```typescript
export const name = ['look', 'l'];
export const description = 'Look at something';
export const usage = 'look [target]';
export function execute(ctx: CommandContext): void { ... }
export default { name, description, usage, execute };
```

## Critical Gotcha: Name Collisions

Multiple command files can register the same verb. CommandManager loads later files that override earlier ones. If a command stops working, check for name collisions across all command directories.

## Color Codes

`{red}`, `{green}`, `{blue}`, `{yellow}`, `{cyan}`, `{magenta}`, `{bold}`, `{dim}`, `{/}` (reset)

## Return Values

- void/true: success
- false: failure (stops macros)
