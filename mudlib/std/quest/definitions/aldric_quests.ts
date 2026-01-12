/**
 * Aldric Quest Definitions
 *
 * Quests for the Aldric starting area.
 */

import type { QuestDefinition } from '../types.js';

/**
 * The Rat Problem - Kill quest for beginners
 */
export const RAT_PROBLEM: QuestDefinition = {
  id: 'aldric:rat_problem',
  name: 'The Rat Problem',
  description: 'Clear the rats from the bakery cellar.',
  storyText: `The baker has been having terrible trouble with giant rats in his cellar.
They've been eating through his flour stores and scaring his apprentices.
He needs someone brave enough to go down there and deal with them once and for all.

"Please, adventurer! Those rats are ruining me. I'll pay you well if you can get rid of them."`,
  objectives: [
    {
      type: 'kill',
      targets: ['/areas/valdoria/aldric/cellar_rat', 'giant_rat', 'cellar rat'],
      targetName: 'Giant Rat',
      required: 5,
    },
  ],
  rewards: {
    experience: 100,
    gold: 25,
    questPoints: 1,
  },
  prerequisites: {
    level: 1,
  },
  giverNpc: '/areas/valdoria/aldric/baker',
  area: 'aldric',
  recommendedLevel: 1,
};

/**
 * Lost Supplies - Fetch quest
 */
export const LOST_SUPPLIES: QuestDefinition = {
  id: 'aldric:lost_supplies',
  name: 'Lost Supplies',
  description: "Recover the merchant's stolen supplies.",
  storyText: `A caravan was attacked by bandits on the south road yesterday.
The merchant lost several crates of valuable supplies that were meant for the shops here in Aldric.
Find and return them before the bandits sell them off to the black market.

"Those supplies are worth a fortune! I'll make it worth your while if you can recover them."`,
  objectives: [
    {
      type: 'fetch',
      itemPaths: ['/items/quest/supply_crate', 'supply_crate', 'supply crate'],
      itemName: 'Supply Crate',
      required: 3,
      consumeOnComplete: true,
    },
  ],
  rewards: {
    experience: 150,
    gold: 50,
    questPoints: 2,
  },
  prerequisites: {
    level: 3,
    quests: ['aldric:rat_problem'],
  },
  giverNpc: '/areas/valdoria/aldric/merchant',
  area: 'aldric',
  recommendedLevel: 3,
};

/**
 * Map the Depths - Exploration quest
 */
export const MAP_THE_DEPTHS: QuestDefinition = {
  id: 'aldric:map_the_depths',
  name: 'Map the Depths',
  description: 'Explore the underground passages beneath the castle.',
  storyText: `The castle guard captain needs updated maps of the underground passages.
The old maps are centuries out of date, and there have been reports of strange noises from below.
Explore each section of the depths and return with information about what you find.

"Be careful down there, adventurer. We don't know what's been living in those tunnels."`,
  objectives: [
    {
      type: 'explore',
      locations: [
        '/areas/valdoria/aldric_depths/entrance',
        '/areas/valdoria/aldric_depths/corridor',
        '/areas/valdoria/aldric_depths/cellblock',
        '/areas/valdoria/aldric_depths/storage',
        '/areas/valdoria/aldric_depths/depths',
      ],
      locationName: 'the underground depths',
    },
  ],
  rewards: {
    experience: 300,
    gold: 100,
    questPoints: 5,
  },
  prerequisites: {
    level: 5,
  },
  giverNpc: '/areas/valdoria/aldric/guard_captain',
  area: 'aldric',
  recommendedLevel: 8,
};

/**
 * Urgent Message - Delivery quest
 */
export const URGENT_MESSAGE: QuestDefinition = {
  id: 'aldric:urgent_message',
  name: 'Urgent Message',
  description: 'Deliver a sealed letter to Master Vorn.',
  storyText: `The town crier has an urgent message that must reach Master Vorn
at the Fighter Guild training hall immediately. Time is of the essence!

"This letter came by courier this morning. It's marked urgent, but I can't leave my post.
Please take it to Master Vorn at the training hall right away!"`,
  objectives: [
    {
      type: 'deliver',
      itemPath: '/items/quest/sealed_letter',
      itemName: 'Sealed Letter',
      targetNpc: '/areas/valdoria/aldric/master_vorn',
      targetName: 'Master Vorn',
    },
  ],
  rewards: {
    experience: 50,
    gold: 10,
    questPoints: 1,
  },
  giverNpc: '/areas/valdoria/aldric/town_crier',
  area: 'aldric',
  recommendedLevel: 1,
};

/**
 * Meet the Guildmasters - Talk quest
 */
export const MEET_THE_GUILDMASTERS: QuestDefinition = {
  id: 'aldric:meet_guildmasters',
  name: 'Meet the Guildmasters',
  description: 'Introduce yourself to the guild leaders of Aldric.',
  storyText: `As a new adventurer in Aldric, it would be wise to introduce yourself
to the various guild leaders in town. Each guild offers unique skills and abilities
that could prove invaluable in your journey.

Visit each guildmaster and learn about what their guild has to offer.`,
  objectives: [
    {
      type: 'talk',
      npcPath: '/areas/valdoria/aldric/master_vorn',
      npcName: 'Master Vorn (Fighter Guild)',
    },
    {
      type: 'talk',
      npcPath: '/areas/valdoria/aldric/archmage_lyra',
      npcName: 'Archmage Lyra (Mage Guild)',
    },
    {
      type: 'talk',
      npcPath: '/areas/valdoria/aldric/shadow_master',
      npcName: 'Shadow (Thief Guild)',
    },
    {
      type: 'talk',
      npcPath: '/areas/valdoria/aldric/high_priest',
      npcName: 'Father Aldric (Cleric Guild)',
    },
  ],
  rewards: {
    experience: 200,
    questPoints: 3,
  },
  prerequisites: {
    level: 1,
  },
  giverNpc: '/areas/valdoria/aldric/town_crier',
  area: 'aldric',
  recommendedLevel: 1,
};

/**
 * Wolf Pelts - Kill and fetch combo quest
 */
export const WOLF_PELTS: QuestDefinition = {
  id: 'aldric:wolf_pelts',
  name: 'Wolf Pelts',
  description: 'Hunt wolves and collect their pelts for the tanner.',
  storyText: `The local tanner is running low on wolf pelts and needs more for his leather work.
Wolves have been spotted in the forest east of town.

"I'll pay good coin for quality wolf pelts. Just be careful out there -
those wolves hunt in packs."`,
  objectives: [
    {
      type: 'kill',
      targets: ['/areas/valdoria/forest/wolf', 'forest_wolf', 'wolf'],
      targetName: 'Forest Wolf',
      required: 8,
    },
    {
      type: 'fetch',
      itemPaths: ['/items/quest/wolf_pelt', 'wolf_pelt', 'wolf pelt'],
      itemName: 'Wolf Pelt',
      required: 5,
      consumeOnComplete: true,
    },
  ],
  rewards: {
    experience: 250,
    gold: 75,
    questPoints: 3,
  },
  prerequisites: {
    level: 4,
  },
  giverNpc: '/areas/valdoria/aldric/tanner',
  area: 'aldric',
  recommendedLevel: 5,
};

/**
 * All Aldric quests
 */
export const ALDRIC_QUESTS: QuestDefinition[] = [
  RAT_PROBLEM,
  LOST_SUPPLIES,
  MAP_THE_DEPTHS,
  URGENT_MESSAGE,
  MEET_THE_GUILDMASTERS,
  WOLF_PELTS,
];

export default ALDRIC_QUESTS;
