/**
 * Thief class help - Skills and abilities.
 * Only visible to players with class: 'thief'
 */

import type { HelpFileDefinition } from '../../../lib/help-loader.js';

export const topics: HelpFileDefinition[] = [
  {
    name: 'sneak',
    title: 'Sneak Skill',
    category: 'skills',
    aliases: ['stealth', 'sneaking'],
    keywords: ['invisible', 'hidden', 'undetected'],
    content: `{bold}Sneak - Thief Skill{/}

{bold}Description:{/}
Move silently and avoid detection.

{bold}Usage:{/}
  {yellow}sneak{/}     - Toggle sneak mode
  {yellow}sneak on{/}  - Enable sneaking
  {yellow}sneak off{/} - Disable sneaking

{bold}Effects:{/}
- You become harder to detect
- Movement doesn't alert enemies
- Required for {yellow}backstab{/}

{bold}Breaking Sneak:{/}
- Attacking (except backstab)
- Being detected by an enemy
- Taking damage
- Using loud abilities

{bold}Detection Factors:{/}
- Your Dexterity vs enemy Wisdom
- Light level (darkness helps)
- Armor type (heavy = loud)
- Movement speed (walking is quieter)

{bold}Tips:{/}
- Wear light armor for best results
- Stay in shadows when possible
- Scout areas before engaging`,
    seeAlso: ['thief', 'backstab', 'hide'],
  },
  {
    name: 'backstab',
    title: 'Backstab Skill',
    category: 'skills',
    aliases: ['ambush'],
    keywords: ['damage', 'stealth', 'attack', 'critical'],
    content: `{bold}Backstab - Thief Skill{/}

{bold}Description:{/}
Strike from the shadows for massive damage.

{bold}Usage:{/}
  {yellow}backstab <target>{/}

{bold}Requirements:{/}
- Must be sneaking or hidden
- Must be wielding a dagger or short sword
- Target must be unaware of you

{bold}Damage:{/}
- Base: {cyan}3x weapon damage{/}
- Dagger bonus: {green}4x damage{/}
- From behind: {green}+25% damage{/}

{bold}Cooldown:{/} 30 seconds (from combat start)

{bold}Tips:{/}
- Always open combat with backstab
- Daggers are best for backstabbing
- Position behind your target
- {red}Cannot backstab alert enemies{/}
- Consider {yellow}hide{/} to reset for another`,
    seeAlso: ['thief', 'sneak', 'hide'],
  },
  {
    name: 'hide',
    title: 'Hide Skill',
    category: 'skills',
    aliases: ['vanish', 'shadow'],
    keywords: ['invisible', 'stealth', 'disappear'],
    content: `{bold}Hide - Thief Skill{/}

{bold}Description:{/}
Attempt to disappear into the shadows.

{bold}Usage:{/}
  {yellow}hide{/}

{bold}Requirements:{/}
- Cannot be in active combat
- Must have shadows nearby (not too bright)

{bold}Effects:{/}
- Become invisible to most enemies
- Can set up for {yellow}backstab{/}
- Enemies lose track of you

{bold}Success Factors:{/}
- Your Dexterity
- Room light level
- Nearby cover/shadows
- Enemy perception

{bold}Cooldown:{/} 20 seconds

{bold}Tips:{/}
- Use {yellow}hide{/} after {yellow}flee{/} to reset combat
- Darker rooms = easier hiding
- Some enemies can see hidden thieves
- Great for scouting and escaping`,
    seeAlso: ['thief', 'sneak', 'backstab'],
  },
  {
    name: 'pickpocket',
    title: 'Pickpocket Skill',
    category: 'skills',
    aliases: ['steal', 'pilfer'],
    keywords: ['theft', 'money', 'gold', 'npc'],
    content: `{bold}Pickpocket - Thief Skill{/}

{bold}Description:{/}
Attempt to steal from an NPC without being noticed.

{bold}Usage:{/}
  {yellow}pickpocket <target>{/}
  {yellow}steal from <target>{/}

{bold}Success Factors:{/}
- Your Dexterity
- Target's Wisdom
- Whether they're distracted
- Your pickpocket skill level

{bold}What You Can Steal:{/}
- Gold coins
- Small items (keys, gems)
- Cannot steal equipped items

{bold}If Caught:{/}
- Target becomes hostile
- Guards may be alerted
- Reputation penalty

{bold}Tips:{/}
- Practice on distracted targets
- Crowded areas provide cover
- {red}Don't steal from other players{/} (against rules)
- Some NPCs have nothing to steal`,
    seeAlso: ['thief', 'lockpick'],
  },
  {
    name: 'lockpick',
    title: 'Lockpick Skill',
    category: 'skills',
    aliases: ['pick lock', 'unlock'],
    keywords: ['door', 'chest', 'lock', 'open'],
    content: `{bold}Lockpick - Thief Skill{/}

{bold}Description:{/}
Attempt to open locked doors, chests, and containers.

{bold}Usage:{/}
  {yellow}lockpick <target>{/}
  {yellow}pick <target>{/}

{bold}Requirements:{/}
- Must have lockpicks in inventory
- Target must be locked (not magically sealed)

{bold}Success Factors:{/}
- Your Dexterity
- Your lockpick skill level
- Lock complexity

{bold}Failure:{/}
- Minor failure: Try again
- Major failure: Lockpick breaks
- Critical failure: Trap may trigger

{bold}Lock Types:{/}
  {green}Simple{/}   - Easy, rarely trapped
  {yellow}Standard{/} - Moderate difficulty
  {red}Complex{/}  - Requires high skill
  {magenta}Magical{/}  - Cannot be picked

{bold}Tips:{/}
- Carry multiple lockpicks
- Check for traps before picking
- Some locks require special picks`,
    seeAlso: ['thief', 'pickpocket'],
  },
];

export default topics;
