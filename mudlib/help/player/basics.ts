/**
 * Basic gameplay help topics for all players.
 */

import type { HelpFileDefinition } from '../../lib/help-loader.js';

export const topics: HelpFileDefinition[] = [
  {
    name: 'quitting',
    title: 'Quitting the Game',
    category: 'gameplay',
    aliases: ['quit', 'logout', 'exit', 'disconnect'],
    keywords: ['leave', 'save', 'bye'],
    content: `{bold}Quitting the Game:{/}
Use the {yellow}quit{/} command to safely leave the game.

{bold}What Happens:{/}
- Your character is saved automatically
- Your location is remembered
- Any items you carry are preserved

{bold}Important:{/}
- Always use {yellow}quit{/} rather than closing your window
- If you disconnect unexpectedly, your character will be saved
- You'll return to where you left off next time

{bold}Idle Timeout:{/}
If you're inactive for too long, you may be automatically disconnected.
Your character will still be saved.`,
    seeAlso: ['introduction', 'commands'],
  },
  {
    name: 'death',
    title: 'Death and Resurrection',
    category: 'gameplay',
    aliases: ['dying', 'die', 'respawn'],
    keywords: ['dead', 'killed', 'resurrection', 'penalty'],
    content: `{bold}What Happens When You Die:{/}
Death is not permanent, but it does have consequences.

{bold}Upon Death:{/}
1. You become a ghost briefly
2. You respawn at your bind point (usually the town center)
3. You may lose some experience points
4. Some items might be left on your corpse

{bold}Recovering Your Items:{/}
- Return to where you died
- Look at your corpse to see your items
- {yellow}get all from corpse{/} to recover items
- Corpses eventually decay, so hurry!

{bold}Avoiding Death:{/}
- Watch your health during combat
- Use {yellow}flee{/} to escape dangerous fights
- Carry healing potions
- Don't fight enemies much stronger than you

{bold}Bind Points:{/}
Use a bed or special locations to set your respawn point.`,
    seeAlso: ['combat', 'healing'],
  },
  {
    name: 'healing',
    title: 'Healing and Recovery',
    category: 'gameplay',
    aliases: ['heal', 'rest', 'recovery'],
    keywords: ['health', 'hp', 'potion', 'restore', 'mana', 'mp'],
    content: `{bold}Ways to Heal:{/}

{bold}Natural Recovery:{/}
- Health and mana regenerate slowly over time
- Resting speeds up regeneration of both
- Being in a safe area (like the inn) helps

{bold}Consumables:{/}
  {yellow}eat <food>{/}        - Food restores health
  {yellow}drink <potion>{/}    - Healing potions restore HP instantly
  {yellow}drink mana potion{/} - Mana potions restore MP instantly
  {yellow}use bandage{/}       - Bandages heal wounds

{bold}Magical Healing:{/}
- Clerics can cast healing spells
- Some items have healing enchantments
- Certain locations have healing properties

{bold}Special Locations:{/}
- The town fountain provides minor healing
- Temples offer healing services
- Inns allow you to rest fully (HP & MP)

{bold}Tips:{/}
- Always carry a few healing and mana potions
- Eat food regularly to maintain health
- Rest after difficult battles to recover both HP and MP`,
    seeAlso: ['death', 'combat', 'items', 'mana'],
  },
  {
    name: 'score',
    title: 'Character Score and Stats',
    category: 'gameplay',
    aliases: ['stats', 'status', 'character'],
    keywords: ['attributes', 'level', 'experience', 'info'],
    content: `{bold}Viewing Your Score:{/}
Use the {yellow}score{/} command to see your character information.

{bold}Information Shown:{/}
  {cyan}Name and Title{/}  - Your character identity
  {cyan}Level{/}           - Your current experience level
  {cyan}Experience{/}      - Progress toward next level
  {cyan}Health (HP){/}     - Current and maximum hit points
  {cyan}Mana (MP){/}       - Current and maximum magic points
  {cyan}Class{/}           - Your character class

{bold}Attributes:{/}
  {yellow}Strength{/}     - Physical power, melee damage
  {yellow}Dexterity{/}    - Agility, accuracy, dodge chance
  {yellow}Constitution{/} - Toughness, health points
  {yellow}Intelligence{/} - Magic power, mana pool
  {yellow}Wisdom{/}       - Magic resistance, perception
  {yellow}Charisma{/}     - Social interactions, prices
  {yellow}Luck{/}         - Critical hits, rare drops

{bold}Related Commands:{/}
  {yellow}score{/}        - Full character sheet
  {yellow}score stats{/}  - View stats only
  {yellow}score brief{/}  - Condensed info
  {yellow}skills{/}       - View your skills
  {yellow}equipment{/}    - View worn items`,
    seeAlso: ['classes', 'skills', 'equipment', 'mana'],
  },
  {
    name: 'mana',
    title: 'Magic Points (Mana)',
    category: 'gameplay',
    aliases: ['mp', 'magic', 'magicpoints'],
    keywords: ['spell', 'casting', 'magic', 'arcane', 'energy'],
    content: `{bold}Magic Points (MP):{/}
Mana is the magical energy used to cast spells and use magical abilities.

{bold}Understanding Mana:{/}
  {cyan}Current MP{/}  - How much mana you have available
  {cyan}Maximum MP{/}  - Your total mana capacity
  {cyan}MP Bar{/}      - Visual indicator shown in {yellow}score{/}

{bold}Using Mana:{/}
- Spells and magical abilities consume mana
- Each spell has a specific mana cost
- If you don't have enough mana, the spell fails
- More powerful spells cost more mana

{bold}Recovering Mana:{/}
- Mana regenerates slowly over time
- Resting speeds up regeneration
- Some items restore mana instantly
- Intelligence affects your max mana pool

{bold}Managing Mana:{/}
- Check your mana with {yellow}score{/} or {yellow}score brief{/}
- Carry mana potions for emergencies
- Use lower-cost spells when mana is low
- Rest between battles to recover

{bold}Tips:{/}
- Intelligence increases your maximum mana
- Wisdom helps with mana regeneration
- Magical classes rely heavily on mana
- Non-casters still use mana for special abilities`,
    seeAlso: ['score', 'healing', 'magic'],
  },
  {
    name: 'levels',
    title: 'Character Levels',
    category: 'gameplay',
    aliases: ['level', 'leveling', 'levelup'],
    keywords: ['advancement', 'progress', 'grow', 'stronger'],
    content: `{bold}Character Levels:{/}
Your level represents your overall power and experience in the world.

{bold}Understanding Levels:{/}
- All characters start at level 1
- Higher levels unlock new abilities and content
- Leveling up increases your HP and MP
- NPCs also have levels that indicate their strength

{bold}How to Level Up:{/}
1. Gain experience points (XP) through various activities
2. Accumulate enough XP to meet the level requirement
3. Spend your XP to level up

{bold}XP Requirements:{/}
The XP needed for each level follows this formula:
  Level 2:  400 XP
  Level 3:  900 XP
  Level 5:  2,500 XP
  Level 10: 10,000 XP

{bold}Level Up Benefits:{/}
- +10 Maximum HP
- +5 Maximum MP
- Access to new areas and quests
- Stronger abilities

{bold}Tips:{/}
- Check your XP progress with {yellow}score{/}
- Save XP for either leveling or raising stats
- Higher-level enemies give more XP`,
    seeAlso: ['experience', 'score', 'training'],
  },
  {
    name: 'experience',
    title: 'Experience Points (XP)',
    category: 'gameplay',
    aliases: ['xp', 'exp'],
    keywords: ['points', 'gain', 'earn', 'spend'],
    content: `{bold}Experience Points (XP):{/}
XP is the currency of character advancement.

{bold}Earning XP:{/}
- Defeating enemies in combat
- Completing quests
- Exploring new areas
- Solving puzzles
- Special achievements

{bold}Spending XP:{/}
You can spend your XP on:

  {cyan}Leveling Up{/}
  - Increases your character level
  - Grants bonus HP and MP
  - Cost: level^2 * 100 XP

  {cyan}Raising Stats{/}
  - Increase any base stat by 1 point
  - Cost: current_stat * 50 XP
  - Example: Raising STR from 10 to 11 costs 500 XP

{bold}XP Strategy:{/}
- Balance between levels and stats
- Early levels are cheap - level up first
- Later, raising key stats may be better value
- Stats can go up to 100 (before modifiers)

{bold}Viewing XP:{/}
- {yellow}score{/} shows your current XP and progress
- {yellow}score brief{/} shows a quick XP summary`,
    seeAlso: ['levels', 'training', 'score'],
  },
  {
    name: 'training',
    title: 'Training and Advancement',
    category: 'gameplay',
    aliases: ['train', 'advance', 'improve'],
    keywords: ['stats', 'raise', 'increase', 'strengthen'],
    content: `{bold}Training Your Character:{/}
Spend your hard-earned XP to become stronger.

{bold}Raising Stats:{/}
Use the {yellow}train{/} command to improve your attributes:
  {yellow}train strength{/}     - Increase STR by 1
  {yellow}train intelligence{/} - Increase INT by 1
  {yellow}train <stat>{/}       - Any stat name works

{bold}Stat Training Costs:{/}
The cost to raise a stat is: current_value * 50 XP
  From 1 to 2:   50 XP
  From 10 to 11: 500 XP
  From 50 to 51: 2,500 XP
  From 99 to 100: 4,950 XP

{bold}Leveling Up:{/}
Use the {yellow}levelup{/} command when you have enough XP:
  {yellow}levelup{/} - Spend XP to gain a level

{bold}Level Costs:{/}
  Level 2:  400 XP
  Level 5:  2,500 XP
  Level 10: 10,000 XP

{bold}Tips:{/}
- Focus on stats that match your playstyle
- STR for melee, INT for magic, CON for survival
- Don't neglect Luck - it affects many things!`,
    seeAlso: ['levels', 'experience', 'score'],
  },
];

export default topics;
