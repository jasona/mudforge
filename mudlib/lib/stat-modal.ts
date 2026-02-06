/**
 * Stat Modal - Build and display comprehensive player statistics modal.
 *
 * Creates a tabbed GUI modal showing all available player data including
 * stats, equipment, inventory, combat info, and account details.
 * Used by the builder+ "stat <player>" command.
 */

import type {
  GUIOpenMessage,
  GUIUpdateMessage,
  LayoutContainer,
  DisplayElement,
  TooltipConfig,
} from './gui-types.js';
import type { MudObject } from '../std/object.js';
import type { EquipmentSlot } from '../std/equipment.js';
import { SLOT_DISPLAY_NAMES } from '../std/equipment.js';
import { STAT_SHORT_NAMES, type StatName, type EncumbranceLevel } from '../std/living.js';
import { getPortraitDaemon, type ObjectImageType } from '../daemons/portrait.js';
import { getRaceDaemon } from '../daemons/race.js';
import type { RaceId } from '../std/race/types.js';
import type { Effect } from '../std/combat/types.js';
import type { QualityTier, GeneratedItemData } from '../std/loot/types.js';

/**
 * Interface for stat modal target player data.
 */
interface StatTargetPlayer {
  name: string;
  title: string;
  gender: string;
  race: string;
  level: number;
  permissionLevel: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  experience: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  gold: number;
  bankedGold: number;
  playTime: number;
  idleTime: number;
  createdAt: number;
  lastLogin: number;
  alive: boolean;
  avatar: string;
  posture: string;
  inCombat: boolean;
  ipAddress: string;
  resolvedHostname: string | null;
  environment: MudObject | null;
  inventory: MudObject[];
  getProperty(key: string): unknown;
  getStats(): Record<StatName, number>;
  getBaseStats(): Record<StatName, number>;
  getStatBonus(stat: StatName): number;
  getAllEquipped(): Map<EquipmentSlot, MudObject>;
  getCarriedWeight(): number;
  getMaxCarryWeight(): number;
  getEncumbranceLevel(): EncumbranceLevel;
  getEncumbrancePenalties(): { attackSpeedPenalty: number; dodgePenalty: number };
  getEncumbrancePercent(): number;
  getCombatStat(stat: string): number;
  getEffects(): Effect[];
  getExploredRooms(): string[];
  getDisplayAddress(): string;
  isConnected(): boolean;
}

/**
 * Interface for the viewer player.
 */
interface ViewerPlayer {
  name: string;
}

/**
 * Equipment grid layout - organized in rows for visual display.
 */
const EQUIPMENT_GRID_SLOTS: EquipmentSlot[][] = [
  ['head', 'cloak'],
  ['main_hand', 'chest', 'off_hand'],
  ['hands', 'legs', 'feet'],
];

/**
 * Quality tier to CSS color mapping.
 */
const QUALITY_COLORS: Record<QualityTier, string> = {
  common: '#ffffff',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fb923c',
  unique: '#fbbf24',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format playtime from seconds to human-readable format.
 */
function formatPlayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format a timestamp to a date string.
 */
function formatDate(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a timestamp to a date/time string.
 */
function formatDateTime(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get permission level label.
 */
function getPermissionLabel(level: number): string {
  switch (level) {
    case 0:
      return 'Player';
    case 1:
      return 'Builder';
    case 2:
      return 'Senior Builder';
    case 3:
      return 'Administrator';
    default:
      return 'Unknown';
  }
}

/**
 * Get permission level color.
 */
function getPermissionColor(level: number): string {
  switch (level) {
    case 0:
      return '#888';
    case 1:
      return '#60a5fa';
    case 2:
      return '#c084fc';
    case 3:
      return '#ef4444';
    default:
      return '#888';
  }
}

/**
 * Get health bar color based on percentage.
 */
function getHealthColor(percent: number): string {
  if (percent <= 25) return '#ef4444';
  if (percent <= 50) return '#fbbf24';
  return '#4ade80';
}

/**
 * Capitalize the first letter of a string.
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a number with commas.
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Strip MUD color codes from a string.
 */
function stripColorCodes(str: string): string {
  return str.replace(/\{[^}]*\}/g, '');
}

/**
 * Truncate a string to a maximum length.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '\u2026';
}

/**
 * Get the fallback image for an item type.
 */
function getFallbackImage(type: ObjectImageType): string {
  const portraitDaemon = getPortraitDaemon();
  return portraitDaemon.getFallbackImage(type);
}

/**
 * Detect the type of a MudObject for image generation.
 */
function detectObjectType(obj: MudObject): ObjectImageType {
  if ('minDamage' in obj && 'maxDamage' in obj) return 'weapon';
  if ('armor' in obj && 'slot' in obj) return 'armor';
  if ('maxItems' in obj && 'canOpenClose' in obj) return 'container';
  return 'item';
}

/**
 * Get the item display color, using quality tier for generated items.
 */
function getItemTypeColor(item: MudObject): string {
  const itemWithGenData = item as MudObject & {
    getGeneratedItemData?: () => GeneratedItemData;
  };

  if (itemWithGenData.getGeneratedItemData) {
    const genData = itemWithGenData.getGeneratedItemData();
    if (genData && genData.quality) {
      return QUALITY_COLORS[genData.quality] || '#ddd';
    }
  }

  const type = detectObjectType(item);
  if (type === 'weapon') return '#ef4444';
  if (type === 'armor') return '#60a5fa';
  return '#ddd';
}

/**
 * Get racial stat bonuses for a race.
 */
function getRacialBonuses(raceId: string): Partial<Record<StatName, number>> {
  const raceDaemon = getRaceDaemon();
  const race = raceDaemon.getRace(raceId as RaceId);
  if (!race) return {};
  return race.statBonuses as Partial<Record<StatName, number>>;
}

/**
 * Get the player's avatar/portrait image.
 */
function getPlayerImage(player: StatTargetPlayer): string {
  const profilePortrait = player.getProperty('profilePortrait');
  if (profilePortrait && typeof profilePortrait === 'string') {
    return profilePortrait;
  }
  if (player.avatar) {
    return player.avatar;
  }
  const portraitDaemon = getPortraitDaemon();
  return portraitDaemon.getFallbackImage('player');
}

// ============================================================================
// Section Header
// ============================================================================

/**
 * Build a section header.
 */
function buildSectionHeader(title: string, id: string): DisplayElement {
  return {
    type: 'text',
    id,
    content: title,
    style: {
      color: '#888',
      fontSize: '12px',
      textTransform: 'uppercase',
      marginBottom: '8px',
      fontWeight: 'bold',
    },
  };
}

// ============================================================================
// Tab 1: Overview
// ============================================================================

function buildOverviewTab(player: StatTargetPlayer, avatarSrc: string): LayoutContainer {
  const displayName = player.title
    ? `${capitalizeFirst(player.name)} ${player.title}`
    : capitalizeFirst(player.name);
  const raceName = capitalizeFirst(player.race);
  const role = getPermissionLabel(player.permissionLevel);
  const roleColor = getPermissionColor(player.permissionLevel);

  const hpPercent = Math.round((player.health / player.maxHealth) * 100);
  const mpPercent = Math.round((player.mana / player.maxMana) * 100);
  const xpPercent = Math.round((player.experience / player.xpForNextLevel) * 100);

  const statusText = player.alive ? 'Alive' : 'Dead';
  const statusColor = player.alive ? '#4ade80' : '#ef4444';
  const connectionStatus = player.isConnected() ? 'Online' : 'Offline';
  const connectionColor = player.isConnected() ? '#4ade80' : '#888';

  return {
    type: 'vertical',
    id: 'overview-tab',
    tabLabel: 'Overview',
    tabId: 'overview',
    gap: '12px',
    style: { padding: '16px' },
    children: [
      // Hero section
      {
        type: 'horizontal',
        id: 'overview-hero',
        gap: '16px',
        style: { alignItems: 'center', marginBottom: '16px' },
        children: [
          {
            type: 'image',
            id: 'overview-avatar',
            src: avatarSrc,
            alt: player.name,
            style: {
              width: '100px',
              height: '100px',
              borderRadius: '8px',
              border: '2px solid #333',
              objectFit: 'cover',
              flexShrink: '0',
            },
          } as DisplayElement,
          {
            type: 'vertical',
            id: 'overview-info',
            gap: '4px',
            style: { flex: '1' },
            children: [
              {
                type: 'heading',
                id: 'overview-name',
                content: displayName,
                level: 3,
                style: { color: '#4ade80', margin: '0' },
              } as DisplayElement,
              {
                type: 'text',
                id: 'overview-race',
                content: `${raceName} \u2022 Level ${player.level}`,
                style: { color: '#ddd', fontSize: '14px' },
              } as DisplayElement,
              {
                type: 'horizontal',
                id: 'overview-badges',
                gap: '8px',
                style: { marginTop: '4px' },
                children: [
                  {
                    type: 'text',
                    id: 'overview-role',
                    content: role,
                    style: {
                      color: roleColor,
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                    },
                  } as DisplayElement,
                  {
                    type: 'text',
                    id: 'overview-status',
                    content: statusText,
                    style: {
                      color: statusColor,
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                    },
                  } as DisplayElement,
                  {
                    type: 'text',
                    id: 'overview-connection',
                    content: connectionStatus,
                    style: {
                      color: connectionColor,
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                    },
                  } as DisplayElement,
                ],
              },
            ],
          },
        ],
      },
      // Divider
      { type: 'divider', id: 'overview-divider' } as DisplayElement,
      // Vitals section
      buildSectionHeader('VITALS', 'overview-vitals-header'),
      // HP bar
      {
        type: 'horizontal',
        id: 'overview-hp-row',
        gap: '8px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'text',
            id: 'overview-hp-label',
            content: 'HP',
            style: { color: '#888', fontSize: '13px', width: '30px' },
          } as DisplayElement,
          {
            type: 'progress',
            id: 'overview-hp-bar',
            progress: hpPercent,
            progressColor: getHealthColor(hpPercent),
            style: { flex: '1', height: '12px' },
          } as DisplayElement,
          {
            type: 'text',
            id: 'overview-hp-text',
            content: `${player.health}/${player.maxHealth}`,
            style: { color: '#ddd', fontSize: '12px', width: '80px', textAlign: 'right' },
          } as DisplayElement,
        ],
      },
      // MP bar
      {
        type: 'horizontal',
        id: 'overview-mp-row',
        gap: '8px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'text',
            id: 'overview-mp-label',
            content: 'MP',
            style: { color: '#888', fontSize: '13px', width: '30px' },
          } as DisplayElement,
          {
            type: 'progress',
            id: 'overview-mp-bar',
            progress: mpPercent,
            progressColor: '#60a5fa',
            style: { flex: '1', height: '12px' },
          } as DisplayElement,
          {
            type: 'text',
            id: 'overview-mp-text',
            content: `${player.mana}/${player.maxMana}`,
            style: { color: '#ddd', fontSize: '12px', width: '80px', textAlign: 'right' },
          } as DisplayElement,
        ],
      },
      // XP bar
      {
        type: 'horizontal',
        id: 'overview-xp-row',
        gap: '8px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'text',
            id: 'overview-xp-label',
            content: 'XP',
            style: { color: '#888', fontSize: '13px', width: '30px' },
          } as DisplayElement,
          {
            type: 'progress',
            id: 'overview-xp-bar',
            progress: xpPercent,
            progressColor: '#fbbf24',
            style: { flex: '1', height: '12px' },
          } as DisplayElement,
          {
            type: 'text',
            id: 'overview-xp-text',
            content: `${formatNumber(player.experience)}/${formatNumber(player.xpForNextLevel)}`,
            style: { color: '#ddd', fontSize: '12px', width: '120px', textAlign: 'right' },
          } as DisplayElement,
        ],
      },
      {
        type: 'text',
        id: 'overview-xp-remaining',
        content: `${formatNumber(player.xpToNextLevel)} XP to next level`,
        style: { color: '#666', fontSize: '11px', marginLeft: '38px' },
      } as DisplayElement,
      // Wealth section
      {
        type: 'horizontal',
        id: 'overview-wealth-row',
        gap: '24px',
        style: { marginTop: '16px' },
        children: [
          {
            type: 'vertical',
            id: 'overview-gold-col',
            gap: '4px',
            children: [
              buildSectionHeader('GOLD', 'overview-gold-header'),
              {
                type: 'text',
                id: 'overview-gold-value',
                content: formatNumber(player.gold),
                style: { color: '#fbbf24', fontSize: '18px', fontWeight: 'bold' },
              } as DisplayElement,
            ],
          },
          {
            type: 'vertical',
            id: 'overview-banked-col',
            gap: '4px',
            children: [
              buildSectionHeader('BANKED', 'overview-banked-header'),
              {
                type: 'text',
                id: 'overview-banked-value',
                content: formatNumber(player.bankedGold),
                style: { color: '#fbbf24', fontSize: '18px', fontWeight: 'bold' },
              } as DisplayElement,
            ],
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Tab 2: Stats
// ============================================================================

function buildStatRow(
  label: string,
  value: number,
  racialBonus: number,
  equipBonus: number,
  id: string
): LayoutContainer {
  const totalBonus = racialBonus + equipBonus;
  let color = '#ddd';
  if (totalBonus > 0) color = '#4ade80';
  else if (totalBonus < 0) color = '#ef4444';

  const parts: string[] = [`${value}`];
  if (racialBonus !== 0) {
    const sign = racialBonus > 0 ? '+' : '';
    parts.push(`${sign}${racialBonus}R`);
  }
  if (equipBonus !== 0) {
    const sign = equipBonus > 0 ? '+' : '';
    parts.push(`${sign}${equipBonus}E`);
  }

  const text = parts.length > 1 ? `${value} (${parts.slice(1).join(' ')})` : `${value}`;

  return {
    type: 'horizontal',
    id: `stat-row-${id}`,
    gap: '4px',
    style: { alignItems: 'center', justifyContent: 'space-between' },
    children: [
      {
        type: 'text',
        id: `stat-label-${id}`,
        content: label,
        style: { color: '#888', fontSize: '13px', width: '40px' },
      } as DisplayElement,
      {
        type: 'text',
        id: `stat-value-${id}`,
        content: text,
        style: { color, fontSize: '13px', fontWeight: 'bold' },
      } as DisplayElement,
    ],
  };
}

function buildStatsTab(player: StatTargetPlayer): LayoutContainer {
  const stats = player.getStats();
  const racialBonuses = getRacialBonuses(player.race);
  const leftStats: StatName[] = ['strength', 'dexterity', 'constitution'];
  const rightStats: StatName[] = ['intelligence', 'wisdom', 'charisma'];

  const leftColumn: LayoutContainer[] = leftStats.map((stat) => {
    const value = stats[stat];
    const racialBonus = racialBonuses[stat] || 0;
    const equipBonus = player.getStatBonus(stat);
    return buildStatRow(STAT_SHORT_NAMES[stat], value, racialBonus, equipBonus, stat);
  });

  const rightColumn: LayoutContainer[] = rightStats.map((stat) => {
    const value = stats[stat];
    const racialBonus = racialBonuses[stat] || 0;
    const equipBonus = player.getStatBonus(stat);
    return buildStatRow(STAT_SHORT_NAMES[stat], value, racialBonus, equipBonus, stat);
  });

  const luckValue = stats.luck;
  const luckRacialBonus = racialBonuses.luck || 0;
  const luckEquipBonus = player.getStatBonus('luck');

  // Combat modifiers
  const toHit = player.getCombatStat('toHit');
  const toDodge = player.getCombatStat('toDodge');
  const toDamage = player.getCombatStat('toDamage');
  const armorClass = player.getCombatStat('armorClass');

  return {
    type: 'vertical',
    id: 'stats-tab',
    tabLabel: 'Stats',
    tabId: 'stats',
    gap: '12px',
    style: { padding: '16px' },
    children: [
      buildSectionHeader('CORE STATS', 'stats-core-header'),
      {
        type: 'horizontal',
        id: 'stats-columns',
        gap: '32px',
        children: [
          {
            type: 'vertical',
            id: 'stats-left-col',
            gap: '8px',
            style: { flex: '1' },
            children: leftColumn,
          },
          {
            type: 'vertical',
            id: 'stats-right-col',
            gap: '8px',
            style: { flex: '1' },
            children: rightColumn,
          },
        ],
      },
      buildStatRow(STAT_SHORT_NAMES.luck, luckValue, luckRacialBonus, luckEquipBonus, 'luck'),
      { type: 'divider', id: 'stats-divider' } as DisplayElement,
      buildSectionHeader('COMBAT MODIFIERS', 'stats-combat-header'),
      {
        type: 'horizontal',
        id: 'stats-combat-row1',
        gap: '24px',
        children: [
          {
            type: 'vertical',
            id: 'stats-tohit-col',
            gap: '2px',
            children: [
              { type: 'text', id: 'stats-tohit-label', content: 'To Hit', style: { color: '#888', fontSize: '11px' } } as DisplayElement,
              { type: 'text', id: 'stats-tohit-value', content: `${toHit >= 0 ? '+' : ''}${toHit}%`, style: { color: toHit >= 0 ? '#4ade80' : '#ef4444', fontSize: '14px', fontWeight: 'bold' } } as DisplayElement,
            ],
          },
          {
            type: 'vertical',
            id: 'stats-dodge-col',
            gap: '2px',
            children: [
              { type: 'text', id: 'stats-dodge-label', content: 'Dodge', style: { color: '#888', fontSize: '11px' } } as DisplayElement,
              { type: 'text', id: 'stats-dodge-value', content: `${toDodge >= 0 ? '+' : ''}${toDodge}%`, style: { color: toDodge >= 0 ? '#4ade80' : '#ef4444', fontSize: '14px', fontWeight: 'bold' } } as DisplayElement,
            ],
          },
          {
            type: 'vertical',
            id: 'stats-damage-col',
            gap: '2px',
            children: [
              { type: 'text', id: 'stats-damage-label', content: 'Damage', style: { color: '#888', fontSize: '11px' } } as DisplayElement,
              { type: 'text', id: 'stats-damage-value', content: `${toDamage >= 0 ? '+' : ''}${toDamage}%`, style: { color: toDamage >= 0 ? '#4ade80' : '#ef4444', fontSize: '14px', fontWeight: 'bold' } } as DisplayElement,
            ],
          },
          {
            type: 'vertical',
            id: 'stats-ac-col',
            gap: '2px',
            children: [
              { type: 'text', id: 'stats-ac-label', content: 'Armor', style: { color: '#888', fontSize: '11px' } } as DisplayElement,
              { type: 'text', id: 'stats-ac-value', content: `${armorClass}`, style: { color: '#60a5fa', fontSize: '14px', fontWeight: 'bold' } } as DisplayElement,
            ],
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Tab 3: Equipment
// ============================================================================

function buildEquipmentSlot(
  slot: EquipmentSlot,
  item: MudObject | undefined,
  itemImage: string
): LayoutContainer {
  const hasItem = !!item;
  const slotLabel = SLOT_DISPLAY_NAMES[slot];

  const children: Array<LayoutContainer | DisplayElement> = [
    {
      type: 'text',
      id: `eq-slot-label-${slot}`,
      content: slotLabel.toUpperCase(),
      style: {
        color: '#888',
        fontSize: '9px',
        textTransform: 'uppercase',
        textAlign: 'center',
      },
    } as DisplayElement,
  ];

  if (hasItem) {
    children.push({
      type: 'image',
      id: `eq-slot-img-${slot}`,
      src: itemImage,
      alt: stripColorCodes(item.shortDesc),
      style: {
        width: '40px',
        height: '40px',
        borderRadius: '4px',
        objectFit: 'cover',
      },
    } as DisplayElement);
  } else {
    children.push({
      type: 'text',
      id: `eq-slot-empty-${slot}`,
      content: '\u2014',
      style: {
        color: '#444',
        fontSize: '20px',
        height: '40px',
        lineHeight: '40px',
        textAlign: 'center',
      },
    } as DisplayElement);
  }

  children.push({
    type: 'text',
    id: `eq-slot-name-${slot}`,
    content: hasItem ? truncate(stripColorCodes(item.shortDesc), 10) : 'Empty',
    style: {
      color: hasItem ? '#ddd' : '#555',
      fontSize: '9px',
      textAlign: 'center',
    },
  } as DisplayElement);

  const container: LayoutContainer = {
    type: 'vertical',
    id: `equipment-slot-${slot}`,
    gap: '2px',
    style: {
      width: '80px',
      minHeight: '85px',
      backgroundColor: hasItem ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)',
      border: hasItem ? '2px solid #4ade80' : '2px dashed #444',
      borderRadius: '6px',
      padding: '6px',
      alignItems: 'center',
    },
    children,
  };

  if (hasItem && item) {
    container.tooltip = buildItemTooltip(item);
  }

  return container;
}

function buildItemTooltip(item: MudObject): TooltipConfig {
  const type = detectObjectType(item);
  const lines: string[] = [];
  const nameColor = getItemTypeColor(item);

  lines.push(`<div style="font-weight:bold;color:${nameColor};font-size:13px;margin-bottom:4px;">${capitalizeFirst(stripColorCodes(item.shortDesc))}</div>`);

  if (type === 'weapon') {
    const weapon = item as MudObject & { minDamage: number; maxDamage: number; damageType: string; handedness: string };
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:#888;">Damage:</span><span style="color:#f87171;">${weapon.minDamage}-${weapon.maxDamage}</span></div>`);
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:#888;">Type:</span><span style="color:#ddd;">${capitalizeFirst(weapon.damageType || 'physical')}</span></div>`);
  } else if (type === 'armor') {
    const armor = item as MudObject & { armor: number; slot: string };
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:#888;">Armor:</span><span style="color:#4ade80;">${armor.armor}</span></div>`);
    lines.push(`<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:#888;">Slot:</span><span style="color:#ddd;">${capitalizeFirst(armor.slot)}</span></div>`);
  }

  return {
    content: lines.join(''),
    html: true,
    position: 'auto',
    maxWidth: '220px',
  };
}

function buildEquipmentTab(
  player: StatTargetPlayer,
  equipped: Map<EquipmentSlot, MudObject>,
  itemImages: Map<MudObject, string>
): LayoutContainer {
  const rows: LayoutContainer[] = [];

  for (const slots of EQUIPMENT_GRID_SLOTS) {
    const slotElements: LayoutContainer[] = [];
    for (const slot of slots) {
      const item = equipped.get(slot);
      const image = item ? (itemImages.get(item) || getFallbackImage(detectObjectType(item))) : '';
      slotElements.push(buildEquipmentSlot(slot, item, image));
    }
    rows.push({
      type: 'horizontal',
      id: `eq-row-${rows.length}`,
      gap: '8px',
      style: { justifyContent: 'center', marginBottom: '8px' },
      children: slotElements,
    });
  }

  // Encumbrance
  const carriedWeight = player.getCarriedWeight();
  const maxWeight = player.getMaxCarryWeight();
  const encPercent = player.getEncumbrancePercent();
  const encLevel = player.getEncumbranceLevel();
  const penalties = player.getEncumbrancePenalties();

  let encColor = '#4ade80';
  if (encPercent > 100) encColor = '#ef4444';
  else if (encPercent > 74) encColor = '#fbbf24';

  const penaltyText = encLevel === 'none' ? 'No penalties'
    : `Attack -${Math.round(penalties.attackSpeedPenalty * 100)}%${penalties.dodgePenalty > 0 ? `, Dodge -${Math.round(penalties.dodgePenalty * 100)}%` : ''}`;

  return {
    type: 'vertical',
    id: 'equipment-tab',
    tabLabel: 'Equipment',
    tabId: 'equipment',
    gap: '8px',
    style: { padding: '16px' },
    children: [
      ...rows,
      { type: 'divider', id: 'eq-divider' } as DisplayElement,
      buildSectionHeader('ENCUMBRANCE', 'eq-enc-header'),
      {
        type: 'horizontal',
        id: 'eq-enc-row',
        gap: '8px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'progress',
            id: 'eq-enc-bar',
            progress: Math.min(100, encPercent),
            progressColor: encColor,
            style: { flex: '1', height: '12px' },
          } as DisplayElement,
          {
            type: 'text',
            id: 'eq-enc-text',
            content: `${carriedWeight.toFixed(1)}/${maxWeight.toFixed(1)} lbs`,
            style: { color: '#ddd', fontSize: '12px', width: '100px', textAlign: 'right' },
          } as DisplayElement,
        ],
      },
      {
        type: 'text',
        id: 'eq-enc-level',
        content: `${capitalizeFirst(encLevel)} (${Math.round(encPercent)}%) - ${penaltyText}`,
        style: { color: encColor, fontSize: '11px' },
      } as DisplayElement,
    ],
  };
}

// ============================================================================
// Tab 4: Inventory
// ============================================================================

function buildInventoryTab(
  player: StatTargetPlayer,
  equipped: Map<EquipmentSlot, MudObject>
): LayoutContainer {
  const items = player.inventory;
  const equippedSet = new Set<MudObject>(equipped.values());
  const carriedItems = items.filter((item) => !equippedSet.has(item));

  // Group items by type
  const weapons: MudObject[] = [];
  const armor: MudObject[] = [];
  const misc: MudObject[] = [];

  for (const item of carriedItems) {
    const type = detectObjectType(item);
    if (type === 'weapon') weapons.push(item);
    else if (type === 'armor') armor.push(item);
    else misc.push(item);
  }

  const sections: LayoutContainer[] = [];

  const buildItemList = (items: MudObject[], sectionId: string): LayoutContainer[] => {
    return items.map((item, i) => {
      const weight = 'weight' in item ? (item as { weight: number }).weight : 0;
      const value = 'value' in item ? (item as { value: number }).value : 0;
      return {
        type: 'horizontal',
        id: `${sectionId}-item-${i}`,
        gap: '8px',
        style: { justifyContent: 'space-between', padding: '4px 0' },
        children: [
          {
            type: 'text',
            id: `${sectionId}-item-name-${i}`,
            content: truncate(stripColorCodes(item.shortDesc), 30),
            style: { color: getItemTypeColor(item), fontSize: '12px', flex: '1' },
          } as DisplayElement,
          {
            type: 'text',
            id: `${sectionId}-item-weight-${i}`,
            content: `${weight.toFixed(1)} lbs`,
            style: { color: '#888', fontSize: '11px', width: '60px', textAlign: 'right' },
          } as DisplayElement,
          {
            type: 'text',
            id: `${sectionId}-item-value-${i}`,
            content: value > 0 ? `${value}g` : '-',
            style: { color: '#fbbf24', fontSize: '11px', width: '40px', textAlign: 'right' },
          } as DisplayElement,
        ],
      };
    });
  };

  if (weapons.length > 0) {
    sections.push(buildSectionHeader(`WEAPONS (${weapons.length})`, 'inv-weapons-header') as unknown as LayoutContainer);
    sections.push(...buildItemList(weapons, 'inv-weapons'));
  }

  if (armor.length > 0) {
    sections.push(buildSectionHeader(`ARMOR (${armor.length})`, 'inv-armor-header') as unknown as LayoutContainer);
    sections.push(...buildItemList(armor, 'inv-armor'));
  }

  if (misc.length > 0) {
    sections.push(buildSectionHeader(`MISC (${misc.length})`, 'inv-misc-header') as unknown as LayoutContainer);
    sections.push(...buildItemList(misc, 'inv-misc'));
  }

  if (carriedItems.length === 0) {
    sections.push({
      type: 'text',
      id: 'inv-empty',
      content: 'Inventory is empty.',
      style: { color: '#666', fontSize: '13px', textAlign: 'center', marginTop: '32px' },
    } as unknown as LayoutContainer);
  }

  // Total weight summary
  const totalWeight = carriedItems.reduce((sum, item) => {
    const w = 'weight' in item ? (item as { weight: number }).weight : 0;
    return sum + w;
  }, 0);

  return {
    type: 'vertical',
    id: 'inventory-tab',
    tabLabel: 'Inventory',
    tabId: 'inventory',
    gap: '4px',
    style: { padding: '16px', overflowY: 'auto', maxHeight: '350px' },
    children: [
      ...sections,
      { type: 'divider', id: 'inv-divider', style: { marginTop: '12px' } } as DisplayElement,
      {
        type: 'text',
        id: 'inv-summary',
        content: `Total: ${carriedItems.length} items, ${totalWeight.toFixed(1)} lbs`,
        style: { color: '#888', fontSize: '12px', textAlign: 'center' },
      } as DisplayElement,
    ],
  };
}

// ============================================================================
// Tab 5: Account
// ============================================================================

function buildAccountTab(player: StatTargetPlayer): LayoutContainer {
  const location = player.environment?.objectPath || 'Nowhere';
  const exploredCount = player.getExploredRooms().length;
  const effects = player.getEffects();
  const posture = capitalizeFirst(player.posture);

  const infoRows: LayoutContainer[] = [
    buildInfoRow('Created', formatDate(player.createdAt), 'account-created'),
    buildInfoRow('Last Login', formatDateTime(player.lastLogin), 'account-lastlogin'),
    buildInfoRow('Play Time', formatPlayTime(player.playTime), 'account-playtime'),
    buildInfoRow('Idle Time', formatPlayTime(player.idleTime), 'account-idle'),
    buildInfoRow('Address', player.getDisplayAddress(), 'account-address'),
    buildInfoRow('Location', location, 'account-location'),
    buildInfoRow('Explored', `${exploredCount} rooms`, 'account-explored'),
    buildInfoRow('Posture', posture, 'account-posture'),
    buildInfoRow('In Combat', player.inCombat ? 'Yes' : 'No', 'account-combat'),
  ];

  const effectsSection: LayoutContainer[] = [];
  if (effects.length > 0) {
    effectsSection.push(buildSectionHeader('ACTIVE EFFECTS', 'account-effects-header') as unknown as LayoutContainer);
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i]!;
      const durationText = effect.duration > 0 ? `${Math.ceil(effect.duration / 1000)}s` : 'Permanent';
      effectsSection.push({
        type: 'horizontal',
        id: `account-effect-${i}`,
        gap: '8px',
        style: { justifyContent: 'space-between' },
        children: [
          {
            type: 'text',
            id: `account-effect-name-${i}`,
            content: effect.name,
            style: { color: effect.category === 'buff' ? '#4ade80' : '#ef4444', fontSize: '12px' },
          } as DisplayElement,
          {
            type: 'text',
            id: `account-effect-duration-${i}`,
            content: durationText,
            style: { color: '#888', fontSize: '11px' },
          } as DisplayElement,
        ],
      });
    }
  } else {
    effectsSection.push({
      type: 'text',
      id: 'account-no-effects',
      content: 'No active effects',
      style: { color: '#666', fontSize: '12px', fontStyle: 'italic' },
    } as unknown as LayoutContainer);
  }

  return {
    type: 'vertical',
    id: 'account-tab',
    tabLabel: 'Account',
    tabId: 'account',
    gap: '8px',
    style: { padding: '16px' },
    children: [
      buildSectionHeader('ACCOUNT INFO', 'account-info-header'),
      ...infoRows,
      { type: 'divider', id: 'account-divider', style: { marginTop: '8px', marginBottom: '8px' } } as DisplayElement,
      ...effectsSection,
    ],
  };
}

function buildInfoRow(label: string, value: string, id: string): LayoutContainer {
  return {
    type: 'horizontal',
    id: `info-row-${id}`,
    gap: '8px',
    style: { justifyContent: 'space-between' },
    children: [
      {
        type: 'text',
        id: `${id}-label`,
        content: `${label}:`,
        style: { color: '#888', fontSize: '12px' },
      } as DisplayElement,
      {
        type: 'text',
        id: `${id}-value`,
        content: value,
        style: { color: '#ddd', fontSize: '12px', textAlign: 'right', maxWidth: '200px', overflow: 'hidden' },
      } as DisplayElement,
    ],
  };
}

// ============================================================================
// Main Modal Function
// ============================================================================

/**
 * Open the stat modal for viewing a player's comprehensive stats.
 *
 * @param viewer The player viewing the stats (builder+)
 * @param target The player whose stats are being viewed
 */
export async function openStatModal(
  viewer: ViewerPlayer,
  target: StatTargetPlayer
): Promise<void> {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const avatarSrc = getPlayerImage(target);
  const equipped = target.getAllEquipped();

  // Build item images map with fallbacks
  const itemImages = new Map<MudObject, string>();
  for (const item of target.inventory) {
    const type = detectObjectType(item);
    itemImages.set(item, getFallbackImage(type));
  }

  // Build the tabbed layout
  const layout: LayoutContainer = {
    type: 'tabs',
    id: 'stat-tabs',
    defaultTab: 0,
    children: [
      buildOverviewTab(target, avatarSrc),
      buildStatsTab(target),
      buildEquipmentTab(target, equipped, itemImages),
      buildInventoryTab(target, equipped),
      buildAccountTab(target),
    ],
  };

  // Send the modal
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'stat-modal',
      title: `PLAYER STATS: ${capitalizeFirst(target.name)}`,
      size: 'medium',
      closable: true,
      escapable: true,
      headerStyle: {
        textAlign: 'center',
      },
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

  // Async: fetch real images for equipped items and update (parallel, non-blocking)
  const portraitDaemon = getPortraitDaemon();
  const imagePromises = [...equipped].map(async ([slot, item]) => {
    const type = detectObjectType(item);
    try {
      const actualImage = await portraitDaemon.getObjectImage(item, type);
      const fallbackImage = getFallbackImage(type);
      if (actualImage !== fallbackImage) {
        return { key: `eq-slot-img-${slot}`, src: actualImage };
      }
    } catch {
      // Keep fallback
    }
    return null;
  });

  const results = await Promise.allSettled(imagePromises);
  const updates: Record<string, Partial<DisplayElement>> = {};
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      updates[result.value.key] = { src: result.value.src };
    }
  }

  if (Object.keys(updates).length > 0) {
    try {
      const updateMessage: GUIUpdateMessage = {
        action: 'update',
        modalId: 'stat-modal',
        updates: { elements: updates },
      };
      efuns.guiSend(updateMessage);
    } catch {
      // Modal closed
    }
  }
}

export default { openStatModal };
