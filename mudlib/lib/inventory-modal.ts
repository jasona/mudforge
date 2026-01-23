/**
 * Inventory Modal - Build and display graphical inventory modal.
 *
 * Creates a GUI modal showing equipped items and carried inventory with
 * interactive equip/unequip/drop buttons, AI-generated item images, and
 * encumbrance tracking.
 */

import type {
  GUIOpenMessage,
  GUIUpdateMessage,
  GUIClientMessage,
  LayoutContainer,
  DisplayElement,
  InputElement,
  ModalButton,
  TooltipConfig,
} from './gui-types.js';
import type { EquipmentSlot } from '../std/equipment.js';
import { SLOT_DISPLAY_NAMES } from '../std/equipment.js';
import { getPortraitDaemon, type ObjectImageType } from '../daemons/portrait.js';
import { detectObjectType } from './look-modal.js';
import type { MudObject } from '../std/object.js';
import type { Weapon } from '../std/weapon.js';
import type { Armor } from '../std/armor.js';
import type { QualityTier, GeneratedItemData } from '../std/loot/types.js';

/**
 * Interface for inventory modal player data.
 */
interface InventoryPlayer {
  name: string;
  inventory: MudObject[];
  gold: number;
  getAllEquipped(): Map<EquipmentSlot, MudObject>;
  getCarriedWeight(): number;
  getMaxCarryWeight(): number;
  getEncumbrancePercent(): number;
  onGUIResponse?: (msg: GUIClientMessage) => void;
}

/**
 * Format a number with commas.
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Truncate a string to a maximum length.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '\u2026';
}

/**
 * Strip MUD color codes from a string.
 * Removes patterns like {red}, {bold}, {/}, {bold}{green}, etc.
 */
function stripColorCodes(str: string): string {
  return str.replace(/\{[^}]*\}/g, '');
}

/**
 * Quality tier to CSS color mapping.
 */
const QUALITY_COLORS: Record<QualityTier, string> = {
  common: '#ffffff',     // White
  uncommon: '#4ade80',   // Green
  rare: '#60a5fa',       // Blue
  epic: '#c084fc',       // Purple
  legendary: '#fb923c',  // Orange
  unique: '#fbbf24',     // Gold/Yellow
};

/**
 * Get the item display color, using quality tier for generated items.
 */
function getItemTypeColor(item: MudObject): string {
  // Check if this is a generated item with quality data
  const itemWithGenData = item as MudObject & {
    getGeneratedItemData?: () => GeneratedItemData;
  };

  if (itemWithGenData.getGeneratedItemData) {
    const genData = itemWithGenData.getGeneratedItemData();
    if (genData && genData.quality) {
      return QUALITY_COLORS[genData.quality] || '#ddd';
    }
  }

  // Fall back to type-based colors for non-generated items
  const type = detectObjectType(item);
  if (type === 'weapon') return '#ef4444'; // Weapons - red
  if (type === 'armor') return '#60a5fa'; // Armor - blue
  return '#ddd'; // Other items - white/gray
}

/**
 * Check if an item is equippable (weapon or armor).
 */
function isEquippable(item: MudObject): boolean {
  const type = detectObjectType(item);
  return type === 'weapon' || type === 'armor';
}

/**
 * Get the encumbrance bar color based on percentage.
 */
function getEncumbranceColor(percent: number): string {
  if (percent <= 74) return '#4ade80'; // Green
  if (percent <= 99) return '#fbbf24'; // Yellow
  return '#ef4444'; // Red
}

/**
 * Get the fallback image for an item type.
 */
function getFallbackImage(type: ObjectImageType): string {
  const portraitDaemon = getPortraitDaemon();
  return portraitDaemon.getFallbackImage(type);
}

/**
 * Capitalize the first letter of a string.
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format weapon handedness for display.
 */
function formatHandedness(handedness: string): string {
  switch (handedness) {
    case 'light':
      return 'Light (dual-wield)';
    case 'one_handed':
      return 'One-handed';
    case 'two_handed':
      return 'Two-handed';
    default:
      return capitalizeFirst(handedness);
  }
}

/**
 * Get quality color for tooltip display.
 */
function getTooltipQualityColor(item: MudObject, defaultColor: string): string {
  const itemWithGenData = item as MudObject & {
    getGeneratedItemData?: () => GeneratedItemData;
  };

  if (itemWithGenData.getGeneratedItemData) {
    const genData = itemWithGenData.getGeneratedItemData();
    if (genData && genData.quality) {
      return QUALITY_COLORS[genData.quality] || defaultColor;
    }
  }

  return defaultColor;
}

/**
 * Get quality badge HTML for tooltips.
 */
function getQualityBadge(item: MudObject): string {
  const itemWithGenData = item as MudObject & {
    getGeneratedItemData?: () => GeneratedItemData;
  };

  if (itemWithGenData.getGeneratedItemData) {
    const genData = itemWithGenData.getGeneratedItemData();
    if (genData && genData.quality) {
      const color = QUALITY_COLORS[genData.quality];
      const qualityName = genData.quality.charAt(0).toUpperCase() + genData.quality.slice(1);
      return `<div style="display:inline-block;padding:2px 6px;border-radius:4px;background:${color}22;color:${color};font-size:10px;font-weight:bold;margin-bottom:4px;">${qualityName}</div>`;
    }
  }

  return '';
}

/**
 * Build tooltip HTML content for a weapon.
 */
function buildWeaponTooltip(item: MudObject): string {
  const weapon = item as MudObject & {
    minDamage: number;
    maxDamage: number;
    damageType: string;
    handedness: string;
    skillRequired: string | null;
    skillLevel: number;
    value: number;
    longDesc: string;
  };

  const nameColor = getTooltipQualityColor(item, '#ef4444');
  const qualityBadge = getQualityBadge(item);

  const lines: string[] = [
    `<div style="font-weight:bold;color:${nameColor};font-size:14px;margin-bottom:4px;">${capitalizeFirst(stripColorCodes(item.shortDesc))}</div>`,
    qualityBadge,
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Damage:</span><span style="color:#f87171;">${weapon.minDamage} - ${weapon.maxDamage}</span></div>`,
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Type:</span><span style="color:#ddd;">${capitalizeFirst(weapon.damageType || 'physical')}</span></div>`,
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Hands:</span><span style="color:#ddd;">${formatHandedness(weapon.handedness)}</span></div>`,
  ];

  if (weapon.skillRequired) {
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Skill:</span><span style="color:#ddd;">${capitalizeFirst(weapon.skillRequired)} (${weapon.skillLevel})</span></div>`);
  }

  if (weapon.value > 0) {
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Value:</span><span style="color:#fbbf24;">${weapon.value} gold</span></div>`);
  }

  lines.push(`<div style="color:#aaa;font-size:11px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">${weapon.longDesc}</div>`);

  return lines.join('');
}

/**
 * Build tooltip HTML content for armor.
 */
function buildArmorTooltip(item: MudObject): string {
  const armor = item as MudObject & {
    armor: number;
    slot: string;
    value: number;
    longDesc: string;
    getResistances?: () => Map<string, number>;
  };

  const nameColor = getTooltipQualityColor(item, '#60a5fa');
  const qualityBadge = getQualityBadge(item);

  const lines: string[] = [
    `<div style="font-weight:bold;color:${nameColor};font-size:14px;margin-bottom:4px;">${capitalizeFirst(stripColorCodes(item.shortDesc))}</div>`,
    qualityBadge,
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Armor:</span><span style="color:#4ade80;">${armor.armor}</span></div>`,
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Slot:</span><span style="color:#ddd;">${capitalizeFirst(armor.slot || 'body')}</span></div>`,
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
        lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Resists:</span><span style="color:#22d3ee;">${resList.join(', ')}</span></div>`);
      }
    }
  }

  if (armor.value > 0) {
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Value:</span><span style="color:#fbbf24;">${armor.value} gold</span></div>`);
  }

  lines.push(`<div style="color:#aaa;font-size:11px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">${armor.longDesc}</div>`);

  return lines.join('');
}

/**
 * Build tooltip HTML content for a generic item.
 */
function buildItemTooltip(item: MudObject): string {
  const genericItem = item as MudObject & {
    weight?: number;
    value?: number;
    longDesc: string;
  };

  const nameColor = getTooltipQualityColor(item, '#e5e5e5');
  const qualityBadge = getQualityBadge(item);

  const lines: string[] = [
    `<div style="font-weight:bold;color:${nameColor};font-size:14px;margin-bottom:4px;">${capitalizeFirst(stripColorCodes(item.shortDesc))}</div>`,
    qualityBadge,
  ];

  if (genericItem.weight !== undefined && genericItem.weight > 0) {
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Weight:</span><span style="color:#ddd;">${genericItem.weight.toFixed(1)} lbs</span></div>`);
  }

  if (genericItem.value !== undefined && genericItem.value > 0) {
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#888;">Value:</span><span style="color:#fbbf24;">${genericItem.value} gold</span></div>`);
  }

  lines.push(`<div style="color:#aaa;font-size:11px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">${genericItem.longDesc}</div>`);

  return lines.join('');
}

/**
 * Build tooltip configuration for an item.
 */
function buildItemTooltipConfig(item: MudObject): TooltipConfig {
  const type = detectObjectType(item);
  let content: string;

  if (type === 'weapon') {
    content = buildWeaponTooltip(item);
  } else if (type === 'armor') {
    content = buildArmorTooltip(item);
  } else {
    content = buildItemTooltip(item);
  }

  return {
    content,
    html: true,
    position: 'auto',
    maxWidth: '280px',
  };
}

/**
 * Equipment slot layout positions for visual display.
 */
const EQUIPMENT_LAYOUT: { row: number; slots: EquipmentSlot[] }[] = [
  { row: 0, slots: ['head', 'cloak'] },
  { row: 1, slots: ['main_hand', 'chest', 'off_hand'] },
  { row: 2, slots: ['hands', 'legs', 'feet'] },
];

/**
 * Build an equipment slot display.
 */
function buildEquipmentSlot(
  slot: EquipmentSlot,
  item: MudObject | undefined,
  itemImage: string
): LayoutContainer {
  const hasItem = !!item;
  const slotLabel = SLOT_DISPLAY_NAMES[slot];

  const children: Array<LayoutContainer | DisplayElement | InputElement> = [
    // Slot label
    {
      type: 'text',
      id: `slot-label-${slot}`,
      content: slotLabel.toUpperCase(),
      style: {
        color: '#888',
        fontSize: '9px',
        textTransform: 'uppercase',
        textAlign: 'center',
      },
    } as DisplayElement,
  ];

  // Item image or empty placeholder
  if (hasItem) {
    children.push({
      type: 'image',
      id: `slot-img-${slot}`,
      src: itemImage,
      alt: stripColorCodes(item.shortDesc),
      style: {
        width: '48px',
        height: '48px',
        borderRadius: '4px',
        objectFit: 'cover',
      },
    } as DisplayElement);
  } else {
    children.push({
      type: 'text',
      id: `slot-empty-${slot}`,
      content: '\u2014',
      style: {
        color: '#444',
        fontSize: '24px',
        height: '48px',
        lineHeight: '48px',
        textAlign: 'center',
      },
    } as DisplayElement);
  }

  // Item name or "Empty"
  children.push({
    type: 'text',
    id: `slot-name-${slot}`,
    content: hasItem ? truncate(stripColorCodes(item.shortDesc), 12) : 'Empty',
    style: {
      color: hasItem ? '#ddd' : '#555',
      fontSize: '10px',
      textAlign: 'center',
    },
  } as DisplayElement);

  // Unequip button (only if item equipped)
  if (hasItem) {
    children.push({
      type: 'button',
      id: `unequip-${slot}`,
      name: `unequip-${slot}`,
      label: 'Unequip',
      action: 'custom',
      customAction: `unequip:${slot}`,
      variant: 'secondary',
      style: {
        fontSize: '9px',
        padding: '2px 6px',
        marginTop: '4px',
      },
    } as InputElement);
  }

  const container: LayoutContainer = {
    type: 'vertical',
    id: `equipment-slot-${slot}`,
    gap: '2px',
    style: {
      width: '100px',
      minHeight: '120px',
      backgroundColor: hasItem ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)',
      border: hasItem ? '2px solid #4ade80' : '2px dashed #444',
      borderRadius: '8px',
      padding: '8px',
      alignItems: 'center',
      cursor: hasItem ? 'pointer' : 'default',
    },
    children,
  };

  // Add tooltip for equipped items
  if (hasItem && item) {
    container.tooltip = buildItemTooltipConfig(item);
  }

  return container;
}

/**
 * Build the equipment tab layout.
 */
function buildEquipmentTab(
  player: InventoryPlayer,
  equipped: Map<EquipmentSlot, MudObject>,
  itemImages: Map<MudObject, string>
): LayoutContainer {
  const rows: LayoutContainer[] = [];

  for (const { slots } of EQUIPMENT_LAYOUT) {
    const slotElements: LayoutContainer[] = [];

    for (const slot of slots) {
      const item = equipped.get(slot);
      const image = item ? (itemImages.get(item) || getFallbackImage(detectObjectType(item))) : '';
      slotElements.push(buildEquipmentSlot(slot, item, image));
    }

    rows.push({
      type: 'horizontal',
      id: `equipment-row-${rows.length}`,
      gap: '12px',
      style: {
        justifyContent: 'center',
        marginBottom: '12px',
      },
      children: slotElements,
    });
  }

  // Encumbrance section
  rows.push(buildEncumbranceSection(player));

  // Gold display
  rows.push(buildGoldDisplay(player.gold));

  return {
    type: 'vertical',
    id: 'equipment-tab-content',
    gap: '8px',
    style: {
      padding: '16px',
    },
    children: rows,
  };
}

/**
 * Build an item card for the inventory tab.
 */
function buildItemCard(
  item: MudObject,
  itemIndex: number,
  isEquipped: boolean,
  itemImage: string
): LayoutContainer {
  const typeColor = getItemTypeColor(item);
  const weight = 'weight' in item ? (item as { weight: number }).weight : 0;
  const canEquip = isEquippable(item) && !isEquipped;

  const buttonChildren: Array<InputElement> = [];

  // Equip button (only for weapons/armor that are not equipped)
  if (canEquip) {
    buttonChildren.push({
      type: 'button',
      id: `equip-${itemIndex}`,
      name: `equip-${itemIndex}`,
      label: 'Equip',
      action: 'custom',
      customAction: `equip:${itemIndex}`,
      variant: 'primary',
      style: {
        fontSize: '10px',
        padding: '2px 8px',
      },
    } as InputElement);
  }

  // Drop button (always available for unequipped items)
  if (!isEquipped) {
    buttonChildren.push({
      type: 'button',
      id: `drop-${itemIndex}`,
      name: `drop-${itemIndex}`,
      label: 'Drop',
      action: 'custom',
      customAction: `drop:${itemIndex}`,
      variant: 'danger',
      style: {
        fontSize: '10px',
        padding: '2px 8px',
      },
    } as InputElement);
  }

  const children: Array<LayoutContainer | DisplayElement | InputElement> = [
    // Item image
    {
      type: 'image',
      id: `item-img-${itemIndex}`,
      src: itemImage,
      alt: stripColorCodes(item.shortDesc),
      style: {
        width: '48px',
        height: '48px',
        borderRadius: '4px',
        objectFit: 'cover',
        alignSelf: 'center',
      },
    } as DisplayElement,
    // Item name
    {
      type: 'text',
      id: `item-name-${itemIndex}`,
      content: truncate(stripColorCodes(item.shortDesc), 18),
      style: {
        color: typeColor,
        fontSize: '12px',
        textAlign: 'center',
        fontWeight: 'bold',
      },
    } as DisplayElement,
    // Weight
    {
      type: 'text',
      id: `item-weight-${itemIndex}`,
      content: `${weight.toFixed(1)} lbs`,
      style: {
        color: '#888',
        fontSize: '10px',
        textAlign: 'center',
      },
    } as DisplayElement,
  ];

  // Action buttons row
  if (buttonChildren.length > 0) {
    children.push({
      type: 'horizontal',
      id: `item-buttons-${itemIndex}`,
      gap: '4px',
      style: {
        justifyContent: 'center',
        marginTop: '4px',
      },
      children: buttonChildren,
    });
  }

  // Equipped indicator
  if (isEquipped) {
    children.push({
      type: 'text',
      id: `item-equipped-${itemIndex}`,
      content: '(equipped)',
      style: {
        color: '#4ade80',
        fontSize: '9px',
        textAlign: 'center',
        fontStyle: 'italic',
      },
    } as DisplayElement);
  }

  return {
    type: 'vertical',
    id: `item-card-${itemIndex}`,
    gap: '4px',
    style: {
      padding: '8px',
      backgroundColor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      minWidth: '120px',
      maxWidth: '120px',
      cursor: 'pointer',
    },
    children,
    tooltip: buildItemTooltipConfig(item),
  };
}

/**
 * Build the inventory (backpack) tab layout.
 */
function buildInventoryTab(
  player: InventoryPlayer,
  equipped: Map<EquipmentSlot, MudObject>,
  itemImages: Map<MudObject, string>
): LayoutContainer {
  const items = player.inventory;
  const equippedSet = new Set<MudObject>(equipped.values());

  // Filter to non-equipped items for the backpack view
  const carriedItems = items.filter((item) => !equippedSet.has(item));

  if (carriedItems.length === 0) {
    return {
      type: 'vertical',
      id: 'inventory-tab-content',
      gap: '16px',
      style: {
        padding: '16px',
        alignItems: 'center',
      },
      children: [
        {
          type: 'text',
          id: 'empty-inventory',
          content: 'Your backpack is empty.',
          style: {
            color: '#888',
            fontSize: '14px',
            textAlign: 'center',
            marginTop: '32px',
          },
        } as DisplayElement,
        buildEncumbranceSection(player),
        buildGoldDisplay(player.gold),
      ],
    };
  }

  // Build item cards in a grid (3 columns)
  const itemCards: LayoutContainer[] = [];
  for (let i = 0; i < carriedItems.length; i++) {
    const item = carriedItems[i];
    const originalIndex = items.indexOf(item);
    const image = itemImages.get(item) || getFallbackImage(detectObjectType(item));
    itemCards.push(buildItemCard(item, originalIndex, false, image));
  }

  // Create rows of 3 items
  const rows: LayoutContainer[] = [];
  for (let i = 0; i < itemCards.length; i += 3) {
    const rowItems = itemCards.slice(i, i + 3);
    rows.push({
      type: 'horizontal',
      id: `inventory-row-${Math.floor(i / 3)}`,
      gap: '12px',
      style: {
        justifyContent: 'center',
      },
      children: rowItems,
    });
  }

  return {
    type: 'vertical',
    id: 'inventory-tab-content',
    gap: '12px',
    style: {
      padding: '16px',
      overflowY: 'auto',
      maxHeight: '400px',
    },
    children: [
      ...rows,
      {
        type: 'divider',
        id: 'inventory-divider',
        style: { marginTop: '16px', marginBottom: '8px' },
      } as DisplayElement,
      {
        type: 'text',
        id: 'inventory-count',
        content: `Carrying: ${carriedItems.length} item${carriedItems.length !== 1 ? 's' : ''}`,
        style: {
          color: '#888',
          fontSize: '12px',
          textAlign: 'center',
        },
      } as DisplayElement,
      buildEncumbranceSection(player),
      buildGoldDisplay(player.gold),
    ],
  };
}

/**
 * Build the encumbrance section with progress bar.
 */
function buildEncumbranceSection(player: InventoryPlayer): LayoutContainer {
  const carriedWeight = player.getCarriedWeight();
  const maxWeight = player.getMaxCarryWeight();
  const percent = player.getEncumbrancePercent();
  const barColor = getEncumbranceColor(percent);

  return {
    type: 'vertical',
    id: 'encumbrance-section',
    gap: '4px',
    style: {
      width: '100%',
      marginTop: '16px',
    },
    children: [
      {
        type: 'horizontal',
        id: 'encumbrance-header',
        gap: '8px',
        style: {
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        children: [
          {
            type: 'text',
            id: 'encumbrance-label',
            content: 'Weight:',
            style: {
              color: '#888',
              fontSize: '12px',
            },
          } as DisplayElement,
          {
            type: 'text',
            id: 'encumbrance-value',
            content: `${carriedWeight.toFixed(1)} / ${maxWeight.toFixed(1)} lbs`,
            style: {
              color: '#ddd',
              fontSize: '12px',
            },
          } as DisplayElement,
        ],
      },
      {
        type: 'progress',
        id: 'encumbrance-bar',
        progress: Math.min(100, percent),
        progressColor: barColor,
        style: {
          height: '12px',
          width: '100%',
        },
      } as DisplayElement,
      {
        type: 'text',
        id: 'encumbrance-percent',
        content: `${Math.round(percent)}% encumbered`,
        style: {
          color: barColor,
          fontSize: '10px',
          textAlign: 'center',
        },
      } as DisplayElement,
    ],
  };
}

/**
 * Build the gold display.
 */
function buildGoldDisplay(gold: number): LayoutContainer {
  return {
    type: 'horizontal',
    id: 'gold-display',
    gap: '8px',
    style: {
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: '8px',
    },
    children: [
      {
        type: 'text',
        id: 'gold-icon',
        content: '\uD83D\uDCB0',
        style: {
          fontSize: '16px',
        },
      } as DisplayElement,
      {
        type: 'text',
        id: 'gold-label',
        content: 'Gold:',
        style: {
          color: '#888',
          fontSize: '13px',
        },
      } as DisplayElement,
      {
        type: 'text',
        id: 'gold-value',
        content: formatNumber(gold),
        style: {
          color: '#fbbf24',
          fontSize: '13px',
          fontWeight: 'bold',
        },
      } as DisplayElement,
    ],
  };
}

/**
 * Execute an equip action for an item.
 */
async function executeEquipAction(player: InventoryPlayer, item: MudObject): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.executeCommand) return;

  const playerObj = player as MudObject & { permissionLevel?: number };
  const level = playerObj.permissionLevel ?? 0;

  if ('wield' in item) {
    // It's a weapon - use wield command
    await efuns.executeCommand(playerObj, `wield ${item.shortDesc}`, level);
  } else if ('wear' in item) {
    // It's armor - use wear command
    await efuns.executeCommand(playerObj, `wear ${item.shortDesc}`, level);
  }
}

/**
 * Execute an unequip action for a slot.
 */
async function executeUnequipAction(player: InventoryPlayer, slot: EquipmentSlot): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.executeCommand) return;

  const equipped = player.getAllEquipped();
  const item = equipped.get(slot);
  if (!item) return;

  const playerObj = player as MudObject & { permissionLevel?: number };
  const level = playerObj.permissionLevel ?? 0;

  if ('wield' in item) {
    // It's a weapon - use unwield command
    await efuns.executeCommand(playerObj, `unwield ${item.shortDesc}`, level);
  } else if ('wear' in item) {
    // It's armor - use remove command
    await efuns.executeCommand(playerObj, `remove ${item.shortDesc}`, level);
  }
}

/**
 * Execute a drop action for an item.
 */
async function executeDropAction(player: InventoryPlayer, item: MudObject): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.executeCommand) return;

  const playerObj = player as MudObject & { permissionLevel?: number };
  const level = playerObj.permissionLevel ?? 0;

  await efuns.executeCommand(playerObj, `drop ${item.shortDesc}`, level);
}

/**
 * Set up the response handler for inventory modal actions.
 * @param player The player
 * @param skipIfExists If true, don't overwrite an existing handler (used during refresh)
 */
function setupResponseHandler(player: InventoryPlayer, skipIfExists: boolean = false): void {
  // Don't overwrite handler during refresh to avoid issues
  if (skipIfExists && player.onGUIResponse) {
    return;
  }

  player.onGUIResponse = async (message: GUIClientMessage) => {
    try {
      if (message.action === 'button' && message.customAction) {
        const [action, target] = message.customAction.split(':');

        // Determine which tab to show after refresh based on action source
        // equip/drop actions come from Backpack tab (1), unequip from Equipment tab (0)
        const activeTab = action === 'unequip' ? 0 : 1;

        // Execute the action
        if (action === 'equip') {
          const itemIndex = parseInt(target, 10);
          const item = player.inventory[itemIndex];
          if (item) {
            await executeEquipAction(player, item);
          }
        } else if (action === 'unequip') {
          const slot = target as EquipmentSlot;
          await executeUnequipAction(player, slot);
        } else if (action === 'drop') {
          const itemIndex = parseInt(target, 10);
          const item = player.inventory[itemIndex];
          if (item) {
            await executeDropAction(player, item);
          }
        }

        // Refresh the modal with updated inventory state
        // Pass the active tab to preserve user's view
        await refreshInventoryModal(player, activeTab);
      }

      if (message.action === 'closed') {
        // Clean up response handler
        player.onGUIResponse = undefined;
      }
    } catch (err) {
      // Log error but don't crash
      console.error('[InventoryModal] Error handling GUI response:', err);
    }
  };
}

/**
 * Get extra context for image generation based on object type.
 * Matches the look-modal pattern.
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
 * Build and send the inventory modal.
 * This is the core modal-building logic shared by open and refresh.
 * @param player The player
 * @param defaultTab Which tab to show (0=Equipment, 1=Backpack)
 */
async function buildAndSendModal(player: InventoryPlayer, defaultTab: number = 0): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const portraitDaemon = getPortraitDaemon();
  const equipped = player.getAllEquipped();
  const items = player.inventory;

  // Build item images map with fallbacks initially
  const itemImages = new Map<MudObject, string>();
  for (const item of items) {
    const type = detectObjectType(item);
    itemImages.set(item, getFallbackImage(type));
  }

  // Build tabbed layout
  const layout: LayoutContainer = {
    type: 'tabs',
    id: 'inventory-tabs',
    defaultTab,
    children: [
      {
        type: 'vertical',
        id: 'equipment-tab',
        tabLabel: 'Equipment',
        tabId: 'equipment',
        children: [buildEquipmentTab(player, equipped, itemImages)],
      },
      {
        type: 'vertical',
        id: 'backpack-tab',
        tabLabel: 'Backpack',
        tabId: 'backpack',
        children: [buildInventoryTab(player, equipped, itemImages)],
      },
    ],
  };

  // Footer buttons
  const buttons: ModalButton[] = [
    {
      id: 'close',
      label: 'Close',
      action: 'cancel',
      variant: 'secondary',
    },
  ];

  // Send the modal with fallback images first
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'inventory-modal',
      title: 'INVENTORY',
      size: 'medium',
      closable: true,
      escapable: true,
      headerStyle: {
        textAlign: 'center',
      },
    },
    layout,
    buttons,
  };

  efuns.guiSend(message);

  // Now fetch actual images from cache/AI generation and update the modal
  const updates: Record<string, Partial<DisplayElement>> = {};
  const equippedSet = new Set<MudObject>(equipped.values());

  // Generate images for all inventory items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const type = detectObjectType(item);
    const extraContext = getExtraContext(item, type);

    try {
      const actualImage = await portraitDaemon.getObjectImage(item, type, extraContext);
      const fallbackImage = itemImages.get(item);

      // Update item card image if it differs from fallback
      if (actualImage !== fallbackImage) {
        if (!equippedSet.has(item)) {
          updates[`item-img-${i}`] = { src: actualImage };
        }
      }
    } catch {
      // Keep fallback image on error
    }
  }

  // Generate images for equipped items in their slots
  for (const [slot, item] of equipped) {
    const type = detectObjectType(item);
    const extraContext = getExtraContext(item, type);

    try {
      const actualImage = await portraitDaemon.getObjectImage(item, type, extraContext);
      const fallbackImage = getFallbackImage(type);

      if (actualImage !== fallbackImage) {
        updates[`slot-img-${slot}`] = { src: actualImage };
      }
    } catch {
      // Keep fallback image on error
    }
  }

  // Send update if we have any image changes
  if (Object.keys(updates).length > 0) {
    try {
      const updateMessage: GUIUpdateMessage = {
        action: 'update',
        modalId: 'inventory-modal',
        updates: {
          elements: updates,
        },
      };
      efuns.guiSend(updateMessage);
    } catch {
      // Modal was closed or player disconnected - ignore
    }
  }
}

/**
 * Refresh the inventory modal (called from response handler).
 * Does not set up a new response handler since one already exists.
 * @param player The player
 * @param defaultTab Which tab to show (0=Equipment, 1=Backpack)
 */
async function refreshInventoryModal(player: InventoryPlayer, defaultTab: number = 0): Promise<void> {
  await buildAndSendModal(player, defaultTab);
}

/**
 * Open the inventory modal for a player.
 *
 * @param player The player to display the inventory for
 * @param defaultTab Which tab to show (0=Equipment, 1=Backpack). Defaults to 0.
 */
export async function openInventoryModal(player: InventoryPlayer, defaultTab: number = 0): Promise<void> {
  // Set up response handler for button actions (only on initial open)
  setupResponseHandler(player);

  await buildAndSendModal(player, defaultTab);
}

export default { openInventoryModal };
