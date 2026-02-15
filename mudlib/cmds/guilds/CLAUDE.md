# mudlib/cmds/guilds/ - Guild Skill Commands

Guild-specific combat abilities loaded when player joins a guild.

## Subdirectories

- `cleric/` (9 commands) - Healing, buffs, holy damage
- `fighter/` (11 commands) - Physical attacks, taunts, defensive abilities
- `mage/` (11 commands) - Elemental spells, debuffs, utility
- `thief/` (9 commands) - Stealth, backstab, poison, evasion

## Standard Guild Command Pattern

```typescript
import { getGuildDaemon } from '../../../daemons/guild.js';

export const name = ['skillname'];
export const description = 'Skill description';

export async function execute(ctx: CommandContext): Promise<void> {
  const guildDaemon = getGuildDaemon();
  const skillId = 'guild:skillname';  // Format: <guild>:<skill>

  // 1. Check if player has learned the skill
  if (!guildDaemon.hasSkill(player, skillId)) {
    ctx.sendLine('{yellow}You have not learned this skill yet.{/}');
    return;
  }

  // 2. Find target (from args or current combat target)
  // 3. Execute skill via guild daemon
  const result = guildDaemon.useSkill(player, skillId, target);

  if (result.success) {
    ctx.send(result.message);
  } else {
    ctx.sendLine(`{red}${result.message}{/}`);
  }
}
```

## Guild Targeting Conventions

- **Cleric**: defaults to self for heals, target for damage
- **Fighter**: uses current combat target
- **Mage**: some target room (AoE), some target single
- **Thief**: uses current combat target, some require stealth
