/**
 * Look Modal - Build and display modal when looking at objects.
 *
 * Creates a GUI modal showing AI-generated images and type-specific details
 * for players, NPCs, weapons, armor, containers, and items.
 */

import type {
  GUIOpenMessage,
  GUIUpdateMessage,
  LayoutContainer,
  DisplayElement,
} from './gui-types.js';
import { MudObject } from '../std/object.js';
import { getPortraitDaemon, type ObjectImageType } from '../daemons/portrait.js';

// Import type checking - we'll do runtime checks instead of instanceof
// to avoid circular dependency issues

/**
 * Detect the type of a MudObject for modal display.
 */
export function detectObjectType(obj: MudObject): ObjectImageType {
  // Check for Player (has permissionLevel and isConnected)
  if ('permissionLevel' in obj && 'isConnected' in obj) {
    return 'player';
  }

  // Check for NPC (has isAggressiveTo method)
  if ('isAggressiveTo' in obj && !('permissionLevel' in obj)) {
    return 'npc';
  }

  // Check for Corpse (has ownerName property - before Container check since Corpse extends Container)
  if ('ownerName' in obj && 'isPlayerCorpse' in obj) {
    return 'corpse';
  }

  // Check for GoldPile (has amount property specific to gold)
  if ('amount' in obj && 'addGold' in obj) {
    return 'gold';
  }

  // Check for Weapon (has minDamage and maxDamage)
  if ('minDamage' in obj && 'maxDamage' in obj) {
    return 'weapon';
  }

  // Check for Armor (has armor property and slot but not damage)
  if ('armor' in obj && 'slot' in obj && !('minDamage' in obj)) {
    return 'armor';
  }

  // Check for Container (has maxItems and canOpenClose)
  if ('maxItems' in obj && 'canOpenClose' in obj) {
    return 'container';
  }

  // Default to generic item
  return 'item';
}

/**
 * Capitalize the first letter of a string.
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Strip articles from the beginning of a string.
 * e.g., "a sword" -> "sword", "the dragon" -> "dragon"
 */
function stripArticle(str: string): string {
  const lower = str.toLowerCase();
  if (lower.startsWith('a ')) return str.slice(2);
  if (lower.startsWith('an ')) return str.slice(3);
  if (lower.startsWith('the ')) return str.slice(4);
  return str;
}

/**
 * Get a display name from an object.
 */
function getDisplayName(obj: MudObject): string {
  // For players, use name directly
  if ('permissionLevel' in obj && 'name' in obj) {
    const name = (obj as MudObject & { name: string }).name;
    return capitalizeFirst(name);
  }
  // For other objects, strip article and capitalize
  return capitalizeFirst(stripArticle(obj.shortDesc));
}

/**
 * Build player-specific modal layout.
 */
function buildPlayerLayout(obj: MudObject): LayoutContainer {
  const player = obj as MudObject & {
    name: string;
    level: number;
    title: string;
    getProperty?: (key: string) => unknown;
  };

  const name = capitalizeFirst(player.name);
  const level = player.level || 1;
  const title = player.title || '';
  const charDesc = player.getProperty?.('characterDescription') as string | undefined;
  const description = charDesc || player.longDesc;

  const children: Array<LayoutContainer | DisplayElement> = [];

  // Name and title
  children.push({
    type: 'heading',
    id: 'look-name',
    content: name,
    level: 3,
    style: { color: '#4ade80', margin: '0 0 4px 0', textAlign: 'center' },
  } as DisplayElement);

  if (title) {
    children.push({
      type: 'text',
      id: 'look-title',
      content: title,
      style: { color: '#888', fontSize: '14px', textAlign: 'center', marginBottom: '8px' },
    } as DisplayElement);
  }

  // Level
  children.push({
    type: 'text',
    id: 'look-level',
    content: `Level ${level}`,
    style: { color: '#fbbf24', fontSize: '14px', textAlign: 'center', marginBottom: '12px' },
  } as DisplayElement);

  // Description
  if (description) {
    children.push({
      type: 'paragraph',
      id: 'look-description',
      content: description,
      style: { color: '#ddd', fontSize: '13px', lineHeight: '1.5' },
    } as DisplayElement);
  }

  return {
    type: 'vertical',
    gap: '4px',
    children,
  };
}

/**
 * Build NPC-specific modal layout.
 */
function buildNpcLayout(obj: MudObject): LayoutContainer {
  const npc = obj as MudObject & {
    name: string;
    level: number;
    title?: string;
    health: number;
    maxHealth: number;
    healthPercent: number;
  };

  const name = getDisplayName(obj);
  const level = npc.level || 1;
  const healthPercent = npc.healthPercent ?? 100;

  const children: Array<LayoutContainer | DisplayElement> = [];

  // Name
  children.push({
    type: 'heading',
    id: 'look-name',
    content: name,
    level: 3,
    style: { color: '#f87171', margin: '0 0 4px 0', textAlign: 'center' },
  } as DisplayElement);

  // Level
  children.push({
    type: 'text',
    id: 'look-level',
    content: `Level ${level}`,
    style: { color: '#fbbf24', fontSize: '14px', textAlign: 'center', marginBottom: '8px' },
  } as DisplayElement);

  // Health bar (only if not at full health)
  if (healthPercent < 100) {
    children.push({
      type: 'horizontal',
      gap: '8px',
      style: { alignItems: 'center', marginBottom: '8px' },
      children: [
        {
          type: 'text',
          id: 'look-health-label',
          content: 'Health:',
          style: { color: '#888', fontSize: '12px', width: '50px' },
        } as DisplayElement,
        {
          type: 'progress',
          id: 'look-health-bar',
          progress: healthPercent,
          progressColor: healthPercent > 50 ? '#4ade80' : healthPercent > 25 ? '#fbbf24' : '#f87171',
          style: { flex: '1', height: '8px' },
        } as DisplayElement,
        {
          type: 'text',
          id: 'look-health-pct',
          content: `${Math.round(healthPercent)}%`,
          style: { color: '#888', fontSize: '12px', width: '40px', textAlign: 'right' },
        } as DisplayElement,
      ],
    });
  }

  // Description
  children.push({
    type: 'paragraph',
    id: 'look-description',
    content: obj.longDesc,
    style: { color: '#ddd', fontSize: '13px', lineHeight: '1.5' },
  } as DisplayElement);

  return {
    type: 'vertical',
    gap: '4px',
    children,
  };
}

/**
 * Build weapon-specific modal layout.
 */
function buildWeaponLayout(obj: MudObject): LayoutContainer {
  const weapon = obj as MudObject & {
    minDamage: number;
    maxDamage: number;
    damageType: string;
    handedness: string;
    skillRequired: string | null;
    skillLevel: number;
    value: number;
  };

  const name = getDisplayName(obj);
  const children: Array<LayoutContainer | DisplayElement> = [];

  // Name
  children.push({
    type: 'heading',
    id: 'look-name',
    content: name,
    level: 3,
    style: { color: '#60a5fa', margin: '0 0 8px 0', textAlign: 'center' },
  } as DisplayElement);

  // Stats grid
  const stats: Array<{ label: string; value: string; color?: string }> = [
    { label: 'Damage', value: `${weapon.minDamage} - ${weapon.maxDamage}`, color: '#f87171' },
    { label: 'Type', value: capitalizeFirst(weapon.damageType || 'physical') },
    { label: 'Hands', value: formatHandedness(weapon.handedness) },
  ];

  if (weapon.skillRequired) {
    stats.push({
      label: 'Skill',
      value: `${capitalizeFirst(weapon.skillRequired)} (${weapon.skillLevel})`,
    });
  }

  if (weapon.value > 0) {
    stats.push({ label: 'Value', value: `${weapon.value} gold`, color: '#fbbf24' });
  }

  children.push(buildStatsGrid(stats));

  // Description
  children.push({
    type: 'paragraph',
    id: 'look-description',
    content: obj.longDesc,
    style: { color: '#ddd', fontSize: '13px', lineHeight: '1.5', marginTop: '12px' },
  } as DisplayElement);

  return {
    type: 'vertical',
    gap: '4px',
    children,
  };
}

/**
 * Format handedness for display.
 */
function formatHandedness(handedness: string): string {
  switch (handedness) {
    case 'one_handed':
      return 'One-handed';
    case 'two_handed':
      return 'Two-handed';
    case 'light':
      return 'Light';
    default:
      return capitalizeFirst(handedness);
  }
}

/**
 * Build armor-specific modal layout.
 */
function buildArmorLayout(obj: MudObject): LayoutContainer {
  const armor = obj as MudObject & {
    armor: number;
    slot: string;
    value: number;
    getResistances?: () => Map<string, number>;
  };

  const name = getDisplayName(obj);
  const children: Array<LayoutContainer | DisplayElement> = [];

  // Name
  children.push({
    type: 'heading',
    id: 'look-name',
    content: name,
    level: 3,
    style: { color: '#a78bfa', margin: '0 0 8px 0', textAlign: 'center' },
  } as DisplayElement);

  // Stats grid
  const stats: Array<{ label: string; value: string; color?: string }> = [
    { label: 'Armor', value: `${armor.armor}`, color: '#4ade80' },
    { label: 'Slot', value: capitalizeFirst(armor.slot || 'body') },
  ];

  // Add resistances if any
  if (armor.getResistances) {
    const resistances = armor.getResistances();
    if (resistances.size > 0) {
      const resList: string[] = [];
      resistances.forEach((value, type) => {
        if (value !== 0) {
          const sign = value > 0 ? '+' : '';
          resList.push(`${capitalizeFirst(type)} ${sign}${value}`);
        }
      });
      if (resList.length > 0) {
        stats.push({ label: 'Resists', value: resList.join(', '), color: '#22d3ee' });
      }
    }
  }

  if (armor.value > 0) {
    stats.push({ label: 'Value', value: `${armor.value} gold`, color: '#fbbf24' });
  }

  children.push(buildStatsGrid(stats));

  // Description
  children.push({
    type: 'paragraph',
    id: 'look-description',
    content: obj.longDesc,
    style: { color: '#ddd', fontSize: '13px', lineHeight: '1.5', marginTop: '12px' },
  } as DisplayElement);

  return {
    type: 'vertical',
    gap: '4px',
    children,
  };
}

/**
 * Build container-specific modal layout.
 */
function buildContainerLayout(obj: MudObject): LayoutContainer {
  const container = obj as MudObject & {
    itemCount: number;
    maxItems: number;
    isOpen: boolean;
    isLocked: boolean;
    canOpenClose: boolean;
    inventory: MudObject[];
  };

  const name = getDisplayName(obj);
  const children: Array<LayoutContainer | DisplayElement> = [];

  // Name
  children.push({
    type: 'heading',
    id: 'look-name',
    content: name,
    level: 3,
    style: { color: '#fbbf24', margin: '0 0 8px 0', textAlign: 'center' },
  } as DisplayElement);

  // Stats grid
  const stats: Array<{ label: string; value: string; color?: string }> = [
    {
      label: 'Capacity',
      value: `${container.itemCount} / ${container.maxItems}`,
      color: container.itemCount >= container.maxItems ? '#f87171' : '#4ade80',
    },
  ];

  // State (only if it can open/close)
  if (container.canOpenClose) {
    let state = container.isOpen ? 'Open' : 'Closed';
    let stateColor = container.isOpen ? '#4ade80' : '#888';
    if (container.isLocked) {
      state = 'Locked';
      stateColor = '#f87171';
    }
    stats.push({ label: 'State', value: state, color: stateColor });
  }

  children.push(buildStatsGrid(stats));

  // Contents preview (first 5 items if open)
  if (container.isOpen && container.inventory.length > 0) {
    const previewItems = container.inventory.slice(0, 5);
    const contentsChildren: Array<DisplayElement> = previewItems.map((item, i) => ({
      type: 'text',
      id: `look-contents-${i}`,
      content: `• ${item.shortDesc}`,
      style: { color: '#aaa', fontSize: '12px' },
    }));

    if (container.inventory.length > 5) {
      contentsChildren.push({
        type: 'text',
        id: 'look-contents-more',
        content: `... and ${container.inventory.length - 5} more`,
        style: { color: '#666', fontSize: '12px', fontStyle: 'italic' },
      } as DisplayElement);
    }

    children.push({
      type: 'vertical',
      gap: '2px',
      style: { marginTop: '12px', padding: '8px', backgroundColor: '#1a1a1f', borderRadius: '4px' },
      children: [
        {
          type: 'text',
          id: 'look-contents-label',
          content: 'Contains:',
          style: { color: '#888', fontSize: '12px', marginBottom: '4px' },
        } as DisplayElement,
        ...contentsChildren,
      ],
    });
  }

  // Description
  children.push({
    type: 'paragraph',
    id: 'look-description',
    content: obj.longDesc,
    style: { color: '#ddd', fontSize: '13px', lineHeight: '1.5', marginTop: '12px' },
  } as DisplayElement);

  return {
    type: 'vertical',
    gap: '4px',
    children,
  };
}

/**
 * Build corpse-specific modal layout.
 */
function buildCorpseLayout(obj: MudObject): LayoutContainer {
  const corpse = obj as MudObject & {
    ownerName: string;
    ownerLevel: number;
    isPlayerCorpse: boolean;
    decayTime: number;
    inventory: MudObject[];
  };

  const ownerName = capitalizeFirst(corpse.ownerName || 'unknown');
  const children: Array<LayoutContainer | DisplayElement> = [];

  // Name
  children.push({
    type: 'heading',
    id: 'look-name',
    content: `Corpse of ${ownerName}`,
    level: 3,
    style: { color: '#888', margin: '0 0 8px 0', textAlign: 'center' },
  } as DisplayElement);

  // Stats grid
  const stats: Array<{ label: string; value: string; color?: string }> = [];

  if (corpse.ownerLevel) {
    stats.push({ label: 'Level', value: `${corpse.ownerLevel}`, color: '#fbbf24' });
  }

  if (corpse.isPlayerCorpse) {
    stats.push({ label: 'Type', value: 'Player', color: '#4ade80' });
  } else {
    stats.push({ label: 'Type', value: 'Creature', color: '#f87171' });
  }

  if (stats.length > 0) {
    children.push(buildStatsGrid(stats));
  }

  // Contents preview (items on corpse)
  if (corpse.inventory && corpse.inventory.length > 0) {
    const previewItems = corpse.inventory.slice(0, 5);
    const contentsChildren: Array<DisplayElement> = previewItems.map((item, i) => ({
      type: 'text',
      id: `look-contents-${i}`,
      content: `• ${item.shortDesc}`,
      style: { color: '#aaa', fontSize: '12px' },
    }));

    if (corpse.inventory.length > 5) {
      contentsChildren.push({
        type: 'text',
        id: 'look-contents-more',
        content: `... and ${corpse.inventory.length - 5} more`,
        style: { color: '#666', fontSize: '12px', fontStyle: 'italic' },
      } as DisplayElement);
    }

    children.push({
      type: 'vertical',
      gap: '2px',
      style: { marginTop: '12px', padding: '8px', backgroundColor: '#1a1a1f', borderRadius: '4px' },
      children: [
        {
          type: 'text',
          id: 'look-contents-label',
          content: 'Contains:',
          style: { color: '#888', fontSize: '12px', marginBottom: '4px' },
        } as DisplayElement,
        ...contentsChildren,
      ],
    });
  }

  // Description
  children.push({
    type: 'paragraph',
    id: 'look-description',
    content: obj.longDesc,
    style: { color: '#ddd', fontSize: '13px', lineHeight: '1.5', marginTop: '12px' },
  } as DisplayElement);

  return {
    type: 'vertical',
    gap: '4px',
    children,
  };
}

/**
 * Build gold pile modal layout.
 */
function buildGoldLayout(obj: MudObject): LayoutContainer {
  const goldPile = obj as MudObject & {
    amount: number;
  };

  const amount = goldPile.amount || 0;
  const children: Array<LayoutContainer | DisplayElement> = [];

  // Name
  children.push({
    type: 'heading',
    id: 'look-name',
    content: 'Gold Coins',
    level: 3,
    style: { color: '#fbbf24', margin: '0 0 8px 0', textAlign: 'center' },
  } as DisplayElement);

  // Amount
  children.push({
    type: 'text',
    id: 'look-amount',
    content: `${amount.toLocaleString()} coin${amount !== 1 ? 's' : ''}`,
    style: { color: '#fcd34d', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', marginBottom: '12px' },
  } as DisplayElement);

  // Description
  children.push({
    type: 'paragraph',
    id: 'look-description',
    content: obj.longDesc,
    style: { color: '#ddd', fontSize: '13px', lineHeight: '1.5' },
  } as DisplayElement);

  return {
    type: 'vertical',
    gap: '4px',
    children,
  };
}

/**
 * Build generic item modal layout.
 */
function buildItemLayout(obj: MudObject): LayoutContainer {
  const item = obj as MudObject & {
    weight?: number;
    value?: number;
  };

  const name = getDisplayName(obj);
  const children: Array<LayoutContainer | DisplayElement> = [];

  // Name
  children.push({
    type: 'heading',
    id: 'look-name',
    content: name,
    level: 3,
    style: { color: '#e5e5e5', margin: '0 0 8px 0', textAlign: 'center' },
  } as DisplayElement);

  // Stats grid (only if there are stats to show)
  const stats: Array<{ label: string; value: string; color?: string }> = [];

  if (item.weight !== undefined && item.weight > 0) {
    stats.push({ label: 'Weight', value: `${item.weight}` });
  }

  if (item.value !== undefined && item.value > 0) {
    stats.push({ label: 'Value', value: `${item.value} gold`, color: '#fbbf24' });
  }

  if (stats.length > 0) {
    children.push(buildStatsGrid(stats));
  }

  // Description
  children.push({
    type: 'paragraph',
    id: 'look-description',
    content: obj.longDesc,
    style: { color: '#ddd', fontSize: '13px', lineHeight: '1.5', marginTop: stats.length > 0 ? '12px' : '0' },
  } as DisplayElement);

  return {
    type: 'vertical',
    gap: '4px',
    children,
  };
}

/**
 * Build a stats grid with label-value pairs.
 */
function buildStatsGrid(
  stats: Array<{ label: string; value: string; color?: string }>
): LayoutContainer {
  const children: Array<LayoutContainer | DisplayElement> = stats.map((stat, i) => ({
    type: 'horizontal',
    gap: '8px',
    style: { justifyContent: 'space-between' },
    children: [
      {
        type: 'text',
        id: `look-stat-label-${i}`,
        content: stat.label + ':',
        style: { color: '#888', fontSize: '13px' },
      } as DisplayElement,
      {
        type: 'text',
        id: `look-stat-value-${i}`,
        content: stat.value,
        style: { color: stat.color || '#ddd', fontSize: '13px', fontWeight: 'bold' },
      } as DisplayElement,
    ],
  }));

  return {
    type: 'vertical',
    gap: '4px',
    style: { padding: '8px', backgroundColor: '#1a1a1f', borderRadius: '4px' },
    children,
  };
}

/**
 * Build the content layout for a target object based on its type.
 */
function buildContentLayout(obj: MudObject, type: ObjectImageType): LayoutContainer {
  switch (type) {
    case 'player':
      return buildPlayerLayout(obj);
    case 'npc':
      return buildNpcLayout(obj);
    case 'weapon':
      return buildWeaponLayout(obj);
    case 'armor':
      return buildArmorLayout(obj);
    case 'container':
      return buildContainerLayout(obj);
    case 'corpse':
      return buildCorpseLayout(obj);
    case 'gold':
      return buildGoldLayout(obj);
    case 'item':
    default:
      return buildItemLayout(obj);
  }
}

/**
 * Get extra context for image generation based on object type.
 */
function getExtraContext(obj: MudObject, type: ObjectImageType): Record<string, unknown> | undefined {
  switch (type) {
    case 'weapon': {
      const weapon = obj as MudObject & { damageType?: string };
      return weapon.damageType ? { damageType: weapon.damageType } : undefined;
    }
    case 'armor': {
      const armor = obj as MudObject & { slot?: string };
      return armor.slot ? { slot: armor.slot } : undefined;
    }
    case 'container': {
      const container = obj as MudObject & { isOpen?: boolean };
      return { isOpen: container.isOpen ?? true };
    }
    default:
      return undefined;
  }
}

/**
 * Get existing image for a player (from avatar or profilePortrait).
 */
function getPlayerExistingImage(obj: MudObject): string | null {
  const player = obj as MudObject & {
    avatar?: string;
    getProperty?: (key: string) => unknown;
  };

  // Check for AI-generated profile portrait first
  if (player.getProperty) {
    const profilePortrait = player.getProperty('profilePortrait');
    if (profilePortrait && typeof profilePortrait === 'string') {
      return profilePortrait;
    }
  }

  // Fall back to avatar ID (client will render)
  if (player.avatar) {
    return player.avatar;
  }

  return null;
}

/**
 * Open the look modal for a target object.
 *
 * @param player The player looking at the target
 * @param target The object being looked at
 */
export async function openLookModal(
  player: MudObject & { onGUIResponse?: unknown },
  target: MudObject
): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const type = detectObjectType(target);
  const portraitDaemon = getPortraitDaemon();

  // Play NPC look sound if configured
  if (type === 'npc' && 'lookSound' in target) {
    const npc = target as MudObject & { lookSound: string | null };
    if (npc.lookSound && efuns.playSound) {
      efuns.playSound(player, 'ambient', npc.lookSound);
    }
  }

  // Get existing image for players, or fallback for others
  let initialImage: string;
  if (type === 'player') {
    const existingImage = getPlayerExistingImage(target);
    initialImage = existingImage || portraitDaemon.getFallbackImage(type);
  } else {
    initialImage = portraitDaemon.getFallbackImage(type);
  }

  // Build the content layout
  const contentLayout = buildContentLayout(target, type);

  // Build the full modal layout with image and content side by side
  const layout: LayoutContainer = {
    type: 'horizontal',
    gap: '16px',
    style: { alignItems: 'flex-start' },
    children: [
      // Image column
      {
        type: 'vertical',
        style: { flexShrink: '0' },
        children: [
          {
            type: 'image',
            id: 'look-image',
            src: initialImage,
            alt: target.shortDesc,
            style: {
              width: '128px',
              height: '128px',
              borderRadius: '8px',
              border: '2px solid #333',
              backgroundColor: '#1a1a2e',
              objectFit: 'cover',
            },
          } as DisplayElement,
        ],
      },
      // Content column
      {
        type: 'vertical',
        style: { flex: '1', minWidth: '200px' },
        children: [contentLayout],
      },
    ],
  };

  // Send the modal
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'look-modal',
      title: 'Examine',
      size: 'medium',
      closable: true,
      escapable: true,
    },
    layout,
    buttons: [
      {
        id: 'close',
        label: 'Close',
        action: 'cancel',
        variant: 'secondary',
      },
    ],
  };

  efuns.guiSend(message);

  // Async: Generate/retrieve the actual image
  // Don't wait for players if they already have an image
  if (type === 'player' && getPlayerExistingImage(target)) {
    return;
  }

  // Get the actual image (from cache or AI generation)
  const extraContext = getExtraContext(target, type);
  const actualImage = await portraitDaemon.getObjectImage(target, type, extraContext);

  // Update the modal with the actual image if it differs
  if (actualImage !== initialImage) {
    const updateMessage: GUIUpdateMessage = {
      action: 'update',
      modalId: 'look-modal',
      updates: {
        elements: {
          'look-image': {
            src: actualImage,
          },
        },
      },
    };
    // Try to send the update - may fail if player closed the modal or disconnected
    try {
      efuns.guiSend(updateMessage);
    } catch {
      // Modal was closed or player disconnected - ignore
    }
  }
}
