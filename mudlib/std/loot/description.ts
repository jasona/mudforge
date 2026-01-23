/**
 * AI Description Generator for Random Loot
 *
 * Generates evocative descriptions for randomly generated items using Claude AI.
 * Runs asynchronously to avoid blocking item creation.
 */

import type { GeneratedItemData, QualityTier } from './types.js';
import type { MudObject } from '../object.js';

/**
 * Quality tier flavor descriptions for prompts.
 */
const QUALITY_FLAVORS: Record<QualityTier, string> = {
  common: 'ordinary, functional, unremarkable',
  uncommon: 'well-crafted, slightly above average, reliable',
  rare: 'finely crafted, notable, bears subtle magical properties',
  epic: 'masterwork, powerful, imbued with significant magic',
  legendary: 'legendary, awe-inspiring, radiates power',
  unique: 'one-of-a-kind, storied, possesses a dark or heroic history',
};

/**
 * Get the placeholder description while AI generates the full one.
 * Uses the pre-generated description from the item data if available.
 */
export function getPlaceholderDescription(data: GeneratedItemData): string {
  // Use the description from the generator if available
  if (data.description) {
    return data.description;
  }

  // Fallback to a simple placeholder
  const quality = data.quality;
  const baseName = data.baseName;

  switch (data.generatedType) {
    case 'weapon':
      return `A ${quality} quality ${baseName}. It looks well-suited for combat.`;
    case 'armor':
      return `A ${quality} quality ${baseName}. It provides solid protection.`;
    case 'bauble':
      return `A ${quality} quality ${baseName}. It gleams with an inner light.`;
    default:
      return `A ${quality} quality item.`;
  }
}

/**
 * Build the AI prompt for generating an item description.
 */
function buildDescriptionPrompt(data: GeneratedItemData): string {
  const qualityFlavor = QUALITY_FLAVORS[data.quality];
  const itemType = data.generatedType;

  let typeSpecificInfo = '';
  switch (itemType) {
    case 'weapon':
      typeSpecificInfo = `Weapon Type: ${data.weaponType || 'melee weapon'}
Damage: ${data.minDamage}-${data.maxDamage}
Damage Type: ${data.damageType || 'physical'}`;
      break;
    case 'armor':
      typeSpecificInfo = `Armor Type: ${data.armorType || 'armor'}
Slot: ${data.armorSlot || 'body'}
Armor Value: ${data.armor}`;
      break;
    case 'bauble':
      typeSpecificInfo = `Bauble Type: ${data.baubleType || 'trinket'}
Value: ${data.value} gold`;
      break;
  }

  // Include abilities if any
  let abilitiesInfo = '';
  if (data.abilities && data.abilities.length > 0) {
    const abilityNames = data.abilities.map((a) => a.name).join(', ');
    abilitiesInfo = `\nSpecial Properties: ${abilityNames}`;
  }

  // Include stat bonuses if any
  let bonusInfo = '';
  if (data.statBonuses) {
    const bonuses = Object.entries(data.statBonuses)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`)
      .join(', ');
    if (bonuses) {
      bonusInfo = `\nStat Bonuses: ${bonuses}`;
    }
  }

  return `Generate a short, evocative description (2-3 sentences) for a fantasy ${itemType} in a MUD game.

Item Name: ${data.baseName}
Quality: ${data.quality} (${qualityFlavor})
${typeSpecificInfo}${abilitiesInfo}${bonusInfo}

Requirements:
- Write in second person present tense (e.g., "The blade gleams..." not "You see a blade that gleams...")
- Be atmospheric and immersive
- Match the quality level - ${data.quality} items should feel ${qualityFlavor}
- Keep it to 2-3 sentences maximum
- Do not include game mechanics or stats in the description
- Focus on appearance, feel, and any magical properties
${data.quality === 'unique' ? '- This is a UNIQUE named item with history - hint at its legendary past' : ''}

Respond with ONLY the description text, no quotes or formatting.`;
}

/**
 * Generate an AI description for a generated item.
 * This runs asynchronously and updates the item's longDesc when complete.
 *
 * @param item The MudObject to update
 * @param data The generated item data
 */
export async function generateItemDescription(
  item: MudObject,
  data: GeneratedItemData
): Promise<void> {
  // Check if AI is available
  if (typeof efuns === 'undefined' || !efuns.aiAvailable?.()) {
    // AI not available, keep placeholder description
    return;
  }

  try {
    const prompt = buildDescriptionPrompt(data);

    const result = await efuns.aiGenerate(prompt, undefined, {
      maxTokens: 200,
      temperature: 0.8,
    });

    if (result.success && result.text) {
      // Clean up the response - remove quotes if present
      let description = result.text.trim();
      if (description.startsWith('"') && description.endsWith('"')) {
        description = description.slice(1, -1);
      }

      // Update the item's long description
      item.longDesc = description;
    }
  } catch (error) {
    // Silently fail - keep placeholder description
    console.error('[LootDescription] Error generating description:', error);
  }
}

export default { generateItemDescription, getPlaceholderDescription };
