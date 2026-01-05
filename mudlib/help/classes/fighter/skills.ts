/**
 * Fighter class help - Skills and abilities.
 * Only visible to players with class: 'fighter'
 */

import type { HelpFileDefinition } from '../../../lib/help-loader.js';

export const topics: HelpFileDefinition[] = [
  {
    name: 'bash',
    title: 'Bash Skill',
    category: 'skills',
    aliases: ['shield bash'],
    keywords: ['stun', 'interrupt', 'shield'],
    content: `{bold}Bash - Fighter Skill{/}

{bold}Description:{/}
Slam your shield into an enemy, potentially stunning them.

{bold}Usage:{/}
  {yellow}bash <target>{/}

{bold}Requirements:{/}
- Must be wielding a shield
- Must be in combat

{bold}Effects:{/}
- Deals minor damage
- {cyan}50% chance{/} to stun for 1 round
- Stunned enemies can't attack or cast
- Interrupts enemy spellcasting

{bold}Cooldown:{/} 10 seconds

{bold}Tips:{/}
- Use when enemy is casting a dangerous spell
- Great for protecting weaker party members
- Combine with {yellow}berserk{/} for offensive rush`,
    seeAlso: ['fighter', 'berserk', 'parry'],
  },
  {
    name: 'berserk',
    title: 'Berserk Skill',
    category: 'skills',
    aliases: ['rage', 'fury'],
    keywords: ['damage', 'attack', 'offense'],
    content: `{bold}Berserk - Fighter Skill{/}

{bold}Description:{/}
Enter a battle rage, increasing damage but lowering defense.

{bold}Usage:{/}
  {yellow}berserk{/}

{bold}Effects:{/}
- {green}+50% melee damage{/}
- {red}-25% armor effectiveness{/}
- Duration: 30 seconds
- Cannot flee while berserking

{bold}Cooldown:{/} 2 minutes

{bold}Ending Berserk:{/}
  {yellow}calm{/} - End berserk early (20 sec cooldown remains)

{bold}Tips:{/}
- Use against enemies you know you can kill quickly
- Avoid using when low on health
- Works great with two-handed weapons
- {red}Risky against multiple enemies{/}`,
    seeAlso: ['fighter', 'bash', 'cleave'],
  },
  {
    name: 'cleave',
    title: 'Cleave Skill',
    category: 'skills',
    aliases: ['sweep', 'whirlwind'],
    keywords: ['area', 'multiple', 'aoe'],
    content: `{bold}Cleave - Fighter Skill{/}

{bold}Description:{/}
Swing your weapon in a wide arc, hitting all nearby enemies.

{bold}Usage:{/}
  {yellow}cleave{/}

{bold}Requirements:{/}
- Must be wielding a melee weapon
- Best with two-handed or slashing weapons

{bold}Effects:{/}
- Hits all enemies in the room
- Deals {cyan}75% normal damage{/} to each
- Axes and greatswords: {green}100% damage{/}

{bold}Cooldown:{/} 15 seconds

{bold}Tips:{/}
- Essential for fighting groups
- Great for clearing weak enemies
- Combine with {yellow}berserk{/} for maximum effect
- Be careful not to hit allies!`,
    seeAlso: ['fighter', 'berserk', 'combat'],
  },
  {
    name: 'parry',
    title: 'Parry Skill',
    category: 'skills',
    aliases: ['block', 'defend'],
    keywords: ['defense', 'protect', 'shield'],
    content: `{bold}Parry - Fighter Skill{/}

{bold}Description:{/}
Enter a defensive stance, blocking incoming attacks.

{bold}Usage:{/}
  {yellow}parry{/}

{bold}Effects:{/}
- {green}+50% chance to block attacks{/}
- {red}-50% attack speed{/}
- Duration: Until you attack or move

{bold}Blocking:{/}
- Blocked attacks deal no damage
- Works against melee and ranged
- Cannot block magical attacks

{bold}Tips:{/}
- Use when waiting for heals
- Good for protecting casters
- Drop parry before using {yellow}berserk{/}
- Shields improve block chance further`,
    seeAlso: ['fighter', 'bash', 'combat'],
  },
];

export default topics;
