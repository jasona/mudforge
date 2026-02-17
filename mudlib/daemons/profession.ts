/**
 * Profession Daemon
 *
 * Central manager for all profession-related functionality including
 * skill tracking, XP calculations, crafting, and gathering.
 */

import { MudObject } from '../std/object.js';
import {
  type ProfessionId,
  type PlayerProfessionData,
  type ProfessionSkill,
  type GatherResult,
  type CraftResult,
  type MovementResult,
  type LevelUpResult,
  type MaterialQuality,
  type RecipeDefinition,
  type ResourceNodeDefinition,
  type SkillGatedExit,
  PROFESSION_CONSTANTS,
  QUALITY_VALUES,
  QUALITY_COLORS,
  QUALITY_NAMES,
  getXPRequired,
  DEFAULT_PLAYER_PROFESSION_DATA,
} from '../std/profession/types.js';
import { PROFESSION_DEFINITIONS, getTerrainRequirement } from '../std/profession/definitions.js';
import { getMaterial, MATERIAL_DEFINITIONS } from '../std/profession/materials.js';
import { RECIPE_DEFINITIONS } from '../std/profession/recipes.js';
import { RESOURCE_NODE_DEFINITIONS } from '../std/profession/resource-nodes.js';

/**
 * Interface for entities with profession data (players).
 */
export interface ProfessionPlayer {
  name: string;
  getProperty<T>(key: string): T | undefined;
  setProperty(key: string, value: unknown): void;
  receive(message: string): void;
  getStat(stat: string): number;
  inventory: MudObject[];
  environment: MudObject | null;
  health: number;
  mana: number;
  takeDamage?(amount: number, type: string): void;
}

// Singleton instance
let professionDaemonInstance: ProfessionDaemon | null = null;

/**
 * Get the profession daemon singleton.
 */
export function getProfessionDaemon(): ProfessionDaemon {
  if (!professionDaemonInstance) {
    professionDaemonInstance = new ProfessionDaemon();
  }
  return professionDaemonInstance;
}

/**
 * Profession Daemon - manages all profession-related functionality.
 */
export class ProfessionDaemon extends MudObject {
  constructor() {
    super();
    this.name = 'ProfessionDaemon';
    this.shortDesc = 'the profession daemon';
  }

  // ========== Player Data Management ==========

  /**
   * Get or create profession data for a player.
   */
  getPlayerData(player: ProfessionPlayer): PlayerProfessionData {
    let data = player.getProperty<PlayerProfessionData>('professionData');
    if (!data) {
      data = { ...DEFAULT_PLAYER_PROFESSION_DATA, skills: [], unlockedRecipes: [], discoveredNodes: [] };
      player.setProperty('professionData', data);
    }
    return data;
  }

  /**
   * Save profession data to player.
   */
  private savePlayerData(player: ProfessionPlayer, data: PlayerProfessionData): void {
    player.setProperty('professionData', data);
  }

  /**
   * Get a player's skill in a specific profession.
   * Returns skill data, or creates it at level 1 for movement skills (level 0 for others).
   */
  getPlayerSkill(player: ProfessionPlayer, professionId: ProfessionId): ProfessionSkill {
    const data = this.getPlayerData(player);
    let skill = data.skills.find((s) => s.professionId === professionId);

    if (!skill) {
      // All professions start at level 1 so new players can immediately use
      // baseline crafting/gathering/movement actions.
      const startingLevel = PROFESSION_CONSTANTS.PROFESSION_STARTING_LEVEL;

      skill = {
        professionId,
        level: startingLevel,
        experience: 0,
        totalUses: 0,
      };
      data.skills.push(skill);
      this.savePlayerData(player, data);
    } else if (skill.level < PROFESSION_CONSTANTS.PROFESSION_STARTING_LEVEL) {
      // Migration: upgrade legacy level-0 profession records to new baseline.
      skill.level = PROFESSION_CONSTANTS.PROFESSION_STARTING_LEVEL;
      skill.experience = Math.max(0, skill.experience);
      this.savePlayerData(player, data);
    }

    return skill;
  }

  /**
   * Get all skills for a player.
   */
  getAllPlayerSkills(player: ProfessionPlayer): ProfessionSkill[] {
    const data = this.getPlayerData(player);
    return data.skills;
  }

  /**
   * Check if player has enough skill level for an action.
   */
  hasSkillLevel(player: ProfessionPlayer, professionId: ProfessionId, requiredLevel: number): boolean {
    const skill = this.getPlayerSkill(player, professionId);
    return skill.level >= requiredLevel;
  }

  // ========== XP and Leveling ==========

  /**
   * Award XP to a player's profession skill.
   * @returns Level up result if player leveled up
   */
  awardXP(
    player: ProfessionPlayer,
    professionId: ProfessionId,
    baseXP: number,
    options: {
      isChallenge?: boolean; // Node/recipe level > skill level
      isTrivial?: boolean; // Content is 10+ levels below skill
      isFirstCraft?: boolean;
      isCritical?: boolean;
      isDiscovery?: boolean;
    } = {}
  ): LevelUpResult | null {
    const data = this.getPlayerData(player);
    let skill = data.skills.find((s) => s.professionId === professionId);

    if (!skill) {
      skill = this.getPlayerSkill(player, professionId);
    }

    // Can't gain XP at max level
    if (skill.level >= PROFESSION_CONSTANTS.MAX_SKILL_LEVEL) {
      return null;
    }

    // Calculate XP modifiers
    let xp = baseXP;

    if (options.isChallenge) {
      xp *= 1 + PROFESSION_CONSTANTS.CHALLENGE_XP_BONUS;
    }
    if (options.isTrivial) {
      xp *= 1 - PROFESSION_CONSTANTS.TRIVIAL_XP_PENALTY;
    }
    if (options.isFirstCraft) {
      xp *= 1 + PROFESSION_CONSTANTS.FIRST_CRAFT_XP_BONUS;
    }
    if (options.isCritical) {
      xp *= 1 + PROFESSION_CONSTANTS.CRITICAL_GATHER_XP_BONUS;
    }
    if (options.isDiscovery) {
      xp *= 1 + PROFESSION_CONSTANTS.DISCOVERY_XP_BONUS;
    }

    xp = Math.floor(xp);
    skill.experience += xp;
    skill.totalUses++;

    // Check for level up
    const xpRequired = getXPRequired(skill.level);
    const oldLevel = skill.level;

    while (skill.experience >= getXPRequired(skill.level) && skill.level < PROFESSION_CONSTANTS.MAX_SKILL_LEVEL) {
      skill.experience -= getXPRequired(skill.level);
      skill.level++;

      // Announce level up
      const profession = PROFESSION_DEFINITIONS[professionId];
      player.receive(`\n{bold}{yellow}Your ${profession.name} skill has increased to level ${skill.level}!{/}\n`);

      // Check for newly unlocked recipes
      const newRecipes = this.getRecipesUnlockedAtLevel(professionId, skill.level);
      if (newRecipes.length > 0) {
        player.receive(`{green}You can now craft: ${newRecipes.map((r) => r.name).join(', ')}{/}\n`);
      }
    }

    this.savePlayerData(player, data);

    // Show XP gain
    const profession = PROFESSION_DEFINITIONS[professionId];
    player.receive(`{dim}+${xp} ${profession.name} XP{/}\n`);

    if (skill.level > oldLevel) {
      return {
        success: true,
        oldLevel,
        newLevel: skill.level,
        profession: professionId,
        unlockedRecipes: this.getRecipesUnlockedAtLevel(professionId, skill.level).map((r) => r.id),
      };
    }

    return null;
  }

  /**
   * Get XP progress for display.
   */
  getXPProgress(player: ProfessionPlayer, professionId: ProfessionId): { current: number; required: number; percent: number } {
    const skill = this.getPlayerSkill(player, professionId);
    const required = getXPRequired(skill.level);
    const percent = skill.level >= PROFESSION_CONSTANTS.MAX_SKILL_LEVEL ? 100 : Math.floor((skill.experience / required) * 100);
    return { current: skill.experience, required, percent };
  }

  // ========== Recipe Management ==========

  /**
   * Get all recipes for a profession.
   */
  getRecipesForProfession(professionId: ProfessionId): RecipeDefinition[] {
    return Object.values(RECIPE_DEFINITIONS).filter((r) => r.profession === professionId);
  }

  /**
   * Get recipes unlocked at a specific level.
   */
  getRecipesUnlockedAtLevel(professionId: ProfessionId, level: number): RecipeDefinition[] {
    return this.getRecipesForProfession(professionId).filter((r) => r.levelRequired === level);
  }

  /**
   * Get recipes available to a player (based on level).
   */
  getAvailableRecipes(player: ProfessionPlayer, professionId: ProfessionId): RecipeDefinition[] {
    const skill = this.getPlayerSkill(player, professionId);
    return this.getRecipesForProfession(professionId).filter((r) => {
      // Must meet level requirement
      if (r.levelRequired > skill.level) return false;
      // If requires learning, must be unlocked
      if (r.requiresLearning) {
        const data = this.getPlayerData(player);
        return data.unlockedRecipes.includes(r.id);
      }
      return true;
    });
  }

  /**
   * Get a recipe by ID.
   */
  getRecipe(recipeId: string): RecipeDefinition | undefined {
    return RECIPE_DEFINITIONS[recipeId];
  }

  /**
   * Check if player knows a recipe.
   */
  knowsRecipe(player: ProfessionPlayer, recipeId: string): boolean {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return false;

    const skill = this.getPlayerSkill(player, recipe.profession);
    if (skill.level < recipe.levelRequired) return false;

    if (recipe.requiresLearning) {
      const data = this.getPlayerData(player);
      return data.unlockedRecipes.includes(recipeId);
    }

    return true;
  }

  /**
   * Learn a recipe (for recipes that require discovery).
   */
  learnRecipe(player: ProfessionPlayer, recipeId: string): boolean {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) return false;

    const data = this.getPlayerData(player);
    if (data.unlockedRecipes.includes(recipeId)) return false;

    data.unlockedRecipes.push(recipeId);
    this.savePlayerData(player, data);
    player.receive(`{green}You have learned to craft: ${recipe.name}{/}\n`);
    return true;
  }

  // ========== Material Checking ==========

  /**
   * Check if player has required materials for a recipe.
   */
  hasMaterials(player: ProfessionPlayer, recipe: RecipeDefinition): { has: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const material = getMaterial(ingredient.materialId);
      if (!material) {
        missing.push(`Unknown material: ${ingredient.materialId}`);
        continue;
      }

      // Count matching materials in inventory
      let count = 0;
      for (const item of player.inventory) {
        const itemMaterialId = item.getProperty<string>('materialId');
        if (itemMaterialId === ingredient.materialId) {
          const itemQuantity = item.getProperty<number>('quantity') || 1;
          // Check quality if required
          if (ingredient.qualityMinimum) {
            const itemQuality = item.getProperty<MaterialQuality>('quality') || 'common';
            if (QUALITY_VALUES[itemQuality] >= QUALITY_VALUES[ingredient.qualityMinimum]) {
              count += itemQuantity;
            }
          } else {
            count += itemQuantity;
          }
        }
      }

      if (count < ingredient.quantity) {
        missing.push(`${material.name} x${ingredient.quantity} (have ${count})`);
      }
    }

    return { has: missing.length === 0, missing };
  }

  /**
   * Consume materials from player inventory for crafting.
   * Returns average quality of consumed materials.
   */
  consumeMaterials(player: ProfessionPlayer, recipe: RecipeDefinition): MaterialQuality {
    let totalQuality = 0;
    let materialCount = 0;

    for (const ingredient of recipe.ingredients) {
      let remaining = ingredient.quantity;

      for (const item of [...player.inventory]) {
        if (remaining <= 0) break;

        const itemMaterialId = item.getProperty<string>('materialId');
        if (itemMaterialId !== ingredient.materialId) continue;

        // Check quality if required
        if (ingredient.qualityMinimum) {
          const itemQuality = item.getProperty<MaterialQuality>('quality') || 'common';
          if (QUALITY_VALUES[itemQuality] < QUALITY_VALUES[ingredient.qualityMinimum]) {
            continue;
          }
        }

        const itemQuantity = item.getProperty<number>('quantity') || 1;
        const itemQuality = item.getProperty<MaterialQuality>('quality') || 'common';
        const toConsume = Math.min(remaining, itemQuantity);

        totalQuality += QUALITY_VALUES[itemQuality] * toConsume;
        materialCount += toConsume;
        remaining -= toConsume;

        // Remove or reduce item quantity
        if (toConsume >= itemQuantity) {
          // Remove entire stack
          if (typeof efuns !== 'undefined' && efuns.destruct) {
            efuns.destruct(item);
          }
        } else {
          // Reduce stack
          item.setProperty('quantity', itemQuantity - toConsume);
        }
      }
    }

    // Calculate average quality
    const avgQualityValue = materialCount > 0 ? totalQuality / materialCount : 2;

    // Convert back to quality tier
    const qualityTiers: MaterialQuality[] = ['poor', 'common', 'fine', 'superior', 'exceptional', 'legendary'];
    const qualityIndex = Math.min(Math.floor(avgQualityValue) - 1, qualityTiers.length - 1);
    return qualityTiers[Math.max(0, qualityIndex)];
  }

  // ========== Tool/Station Checking ==========

  /**
   * Check if player has required tool equipped or in inventory.
   */
  hasTool(player: ProfessionPlayer, toolType: string): { has: boolean; tool: MudObject | null; tier: number } {
    for (const item of player.inventory) {
      const itemToolType = item.getProperty<string>('toolType');
      if (itemToolType === toolType) {
        const tier = item.getProperty<number>('toolTier') || 1;
        return { has: true, tool: item, tier };
      }
    }
    return { has: false, tool: null, tier: 0 };
  }

  /**
   * Check if player is near a crafting station.
   */
  hasStation(player: ProfessionPlayer, stationType: string): { has: boolean; station: MudObject | null; tier: number } {
    const room = player.environment;
    if (!room) return { has: false, station: null, tier: 0 };

    // Check room contents for stations
    const contents = room.getProperty<MudObject[]>('contents') || [];
    for (const item of contents) {
      const itemStationType = item.getProperty<string>('stationType');
      if (itemStationType === stationType) {
        const tier = item.getProperty<number>('stationTier') || 1;
        return { has: true, station: item, tier };
      }
    }

    // Also check if room itself is a station (like a forge room)
    const roomStationType = room.getProperty<string>('stationType');
    if (roomStationType === stationType) {
      const tier = room.getProperty<number>('stationTier') || 1;
      return { has: true, station: room, tier: tier };
    }

    return { has: false, station: null, tier: 0 };
  }

  /**
   * Use tool durability.
   */
  useTool(tool: MudObject): { broken: boolean; remaining: number } {
    const durability = tool.getProperty<number>('durability') || 100;
    const maxDurability = tool.getProperty<number>('maxDurability') || 100;
    const newDurability = durability - 1;

    if (newDurability <= 0) {
      return { broken: true, remaining: 0 };
    }

    tool.setProperty('durability', newDurability);
    return { broken: false, remaining: newDurability };
  }

  // ========== Quality Calculations ==========

  /**
   * Calculate output quality for crafting.
   */
  calculateCraftQuality(
    player: ProfessionPlayer,
    recipe: RecipeDefinition,
    inputQuality: MaterialQuality,
    toolTier: number = 0,
    stationTier: number = 0
  ): MaterialQuality {
    if (!recipe.qualityAffected) {
      return 'common'; // Fixed quality output
    }

    const skill = this.getPlayerSkill(player, recipe.profession);
    const profession = PROFESSION_DEFINITIONS[recipe.profession];

    // Base from input quality
    let qualityValue = QUALITY_VALUES[inputQuality];

    // Skill bonus: +0.5 tier per 20 levels above recipe requirement
    const levelAdvantage = skill.level - recipe.levelRequired;
    qualityValue += levelAdvantage / 20 * 0.5;

    // Stat bonus
    const statValue = player.getStat(profession.primaryStat);
    qualityValue += (statValue - 10) * 0.02;

    // Tool bonus
    qualityValue += PROFESSION_CONSTANTS.TOOL_TIER_BONUS[toolTier] || 0;

    // Station bonus
    qualityValue += PROFESSION_CONSTANTS.STATION_TIER_BONUS[stationTier] || 0;

    // Clamp and convert to tier
    const qualityTiers: MaterialQuality[] = ['poor', 'common', 'fine', 'superior', 'exceptional', 'legendary'];
    const index = Math.min(Math.max(0, Math.round(qualityValue) - 1), qualityTiers.length - 1);
    return qualityTiers[index];
  }

  // ========== Movement Skills ==========

  /**
   * Attempt to use a skill-gated exit.
   */
  attemptSkillGatedMovement(player: ProfessionPlayer, exit: SkillGatedExit): MovementResult {
    const skill = this.getPlayerSkill(player, exit.profession);
    const profession = PROFESSION_DEFINITIONS[exit.profession];

    // Check skill level
    if (skill.level < exit.level) {
      // Failure
      if (exit.failDamage && player.takeDamage) {
        player.takeDamage(exit.failDamage, 'physical');
      }
      return {
        success: false,
        message: exit.failMessage,
        damageTaken: exit.failDamage,
      };
    }

    // Check resource cost
    if (exit.cost) {
      // For now, use mana for flying, health for swimming/climbing (as stamina proxy)
      if (exit.profession === 'flying') {
        if (player.mana < exit.cost) {
          return {
            success: false,
            message: `You don't have enough mana to fly (need ${exit.cost}).`,
          };
        }
        player.mana -= exit.cost;
      } else {
        // Swimming/climbing uses HP as stamina proxy
        // (A real system would have a separate stamina stat)
        if (player.health <= exit.cost) {
          return {
            success: false,
            message: `You're too exhausted to continue (need ${exit.cost} stamina).`,
          };
        }
        player.health -= exit.cost;
      }
    }

    // Success - award XP
    const xpGained = profession.baseXPPerUse;
    this.awardXP(player, exit.profession, xpGained);

    return {
      success: true,
      message: '',
      xpGained,
      resourceCost: exit.cost,
    };
  }

  // ========== Resource Node Discovery ==========

  /**
   * Check if player has discovered a hidden node.
   */
  hasDiscoveredNode(player: ProfessionPlayer, nodeId: string): boolean {
    const data = this.getPlayerData(player);
    return data.discoveredNodes.includes(nodeId);
  }

  /**
   * Discover a hidden resource node.
   */
  discoverNode(player: ProfessionPlayer, nodeId: string): boolean {
    const data = this.getPlayerData(player);
    if (data.discoveredNodes.includes(nodeId)) return false;

    data.discoveredNodes.push(nodeId);
    this.savePlayerData(player, data);

    const nodeDef = RESOURCE_NODE_DEFINITIONS[nodeId];
    if (nodeDef) {
      player.receive(`{yellow}You have discovered: ${nodeDef.name}!{/}\n`);

      // Bonus XP for discovery
      const profession = PROFESSION_DEFINITIONS[nodeDef.gatherProfession];
      this.awardXP(player, nodeDef.gatherProfession, profession.baseXPPerUse, { isDiscovery: true });
    }

    return true;
  }

  // ========== Display Helpers ==========

  /**
   * Format a quality tier with color.
   */
  formatQuality(quality: MaterialQuality): string {
    const color = QUALITY_COLORS[quality];
    const name = QUALITY_NAMES[quality];
    return `{${color}}${name}{/}`;
  }

  /**
   * Format profession skill for display.
   */
  formatSkill(skill: ProfessionSkill): string {
    const profession = PROFESSION_DEFINITIONS[skill.professionId];
    const progress = this.getXPProgress({ getProperty: () => undefined, setProperty: () => {}, receive: () => {}, getStat: () => 10, inventory: [], environment: null, name: '', health: 100, mana: 100 } as ProfessionPlayer, skill.professionId);

    if (skill.level >= PROFESSION_CONSTANTS.MAX_SKILL_LEVEL) {
      return `${profession.name}: {yellow}${skill.level}{/} (MAX)`;
    }

    return `${profession.name}: {yellow}${skill.level}{/} (${skill.experience}/${progress.required} XP)`;
  }

  /**
   * Get skill level bracket description.
   */
  getSkillRank(level: number): string {
    if (level === 0) return 'Untrained';
    if (level < 20) return 'Novice';
    if (level < 40) return 'Apprentice';
    if (level < 60) return 'Journeyman';
    if (level < 80) return 'Expert';
    if (level < 100) return 'Master';
    return 'Grandmaster';
  }
}

export default ProfessionDaemon;
