/**
 * Score Modal - Build and display character sheet modal.
 *
 * Creates a GUI modal showing the player's character sheet with avatar,
 * stat bars, and organized sections for a visually appealing score display.
 */

import type {
  GUIOpenMessage,
  LayoutContainer,
  DisplayElement,
} from './gui-types.js';
import { STAT_SHORT_NAMES, type StatName } from '../std/living.js';
import { getPortraitDaemon } from '../daemons/portrait.js';
import { getRaceDaemon } from '../daemons/race.js';
import type { RaceId } from '../std/race/types.js';

/**
 * Interface for score modal player data.
 */
interface ScorePlayer {
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
  alive: boolean;
  avatar: string;
  getProperty(key: string): unknown;
  getStats(): Record<StatName, number>;
  getBaseStats(): Record<StatName, number>;
  getStatBonus(stat: StatName): number;
}

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
 * Get health bar color based on percentage.
 */
function getHealthColor(percent: number): string {
  if (percent <= 25) return '#ef4444'; // Red
  if (percent <= 50) return '#fbbf24'; // Yellow
  return '#4ade80'; // Green
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
 * Build the hero section with avatar and basic info.
 */
function buildHeroSection(player: ScorePlayer, avatarSrc: string): LayoutContainer {
  const displayName = player.title ? `${capitalizeFirst(player.name)} ${player.title}` : capitalizeFirst(player.name);
  const raceName = capitalizeFirst(player.race);
  const role = getPermissionLabel(player.permissionLevel);

  return {
    type: 'horizontal',
    gap: '16px',
    style: { alignItems: 'center', marginBottom: '16px' },
    children: [
      // Avatar image
      {
        type: 'image',
        id: 'score-avatar',
        src: avatarSrc,
        alt: player.name,
        style: {
          width: '128px',
          height: '128px',
          borderRadius: '8px',
          border: '2px solid #333',
          backgroundColor: '#1a1a2e',
          objectFit: 'cover',
          flexShrink: '0',
        },
      } as DisplayElement,
      // Name/title/info column
      {
        type: 'vertical',
        gap: '4px',
        style: { flex: '1' },
        children: [
          {
            type: 'heading',
            id: 'score-name',
            content: displayName,
            level: 2,
            style: { color: '#4ade80', margin: '0' },
          } as DisplayElement,
          {
            type: 'text',
            id: 'score-race-level',
            content: `${raceName} \u2022 Level ${player.level} \u2022 ${role}`,
            style: { color: '#888', fontSize: '14px' },
          } as DisplayElement,
        ],
      },
    ],
  };
}

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

/**
 * Build the experience section with progress bar.
 */
function buildExperienceSection(player: ScorePlayer): LayoutContainer {
  const xpPercent = Math.round((player.experience / player.xpForNextLevel) * 100);

  return {
    type: 'vertical',
    gap: '4px',
    style: { marginBottom: '16px' },
    children: [
      buildSectionHeader('EXPERIENCE', 'score-xp-header'),
      {
        type: 'horizontal',
        gap: '8px',
        style: { alignItems: 'center' },
        children: [
          {
            type: 'progress',
            id: 'score-xp-bar',
            progress: xpPercent,
            progressColor: '#fbbf24',
            style: { flex: '1', height: '12px' },
          } as DisplayElement,
          {
            type: 'text',
            id: 'score-xp-text',
            content: `${formatNumber(player.experience)} / ${formatNumber(player.xpForNextLevel)} XP`,
            style: { color: '#ddd', fontSize: '12px', width: '140px', textAlign: 'right' },
          } as DisplayElement,
        ],
      },
      {
        type: 'text',
        id: 'score-xp-remaining',
        content: `${formatNumber(player.xpToNextLevel)} XP to next level`,
        style: { color: '#666', fontSize: '11px' },
      } as DisplayElement,
    ],
  };
}

/**
 * Build a progress bar row for vitals.
 */
function buildVitalBar(
  label: string,
  id: string,
  current: number,
  max: number,
  color: string
): LayoutContainer {
  const percent = Math.round((current / max) * 100);
  const barColor = label === 'HP' ? getHealthColor(percent) : color;

  return {
    type: 'horizontal',
    gap: '8px',
    style: { alignItems: 'center' },
    children: [
      {
        type: 'text',
        id: `score-${id}-label`,
        content: label,
        style: { color: '#888', fontSize: '13px', width: '30px' },
      } as DisplayElement,
      {
        type: 'progress',
        id: `score-${id}-bar`,
        progress: percent,
        progressColor: barColor,
        style: { flex: '1', height: '12px' },
      } as DisplayElement,
      {
        type: 'text',
        id: `score-${id}-text`,
        content: `${current}/${max}`,
        style: { color: '#ddd', fontSize: '12px', width: '70px', textAlign: 'right' },
      } as DisplayElement,
    ],
  };
}

/**
 * Build the vitals section with HP and MP bars.
 */
function buildVitalsSection(player: ScorePlayer): LayoutContainer {
  return {
    type: 'vertical',
    gap: '8px',
    style: { marginBottom: '16px' },
    children: [
      buildSectionHeader('VITALS', 'score-vitals-header'),
      buildVitalBar('HP', 'hp', player.health, player.maxHealth, '#4ade80'),
      buildVitalBar('MP', 'mp', player.mana, player.maxMana, '#60a5fa'),
    ],
  };
}

/**
 * Format a stat value with its bonuses.
 * Shows racial and equipment bonuses separately if present.
 */
function formatStatValue(
  value: number,
  racialBonus: number,
  equipBonus: number
): { text: string; color: string } {
  const parts: string[] = [`${value}`];
  let hasBonus = false;

  // Add racial bonus indicator
  if (racialBonus !== 0) {
    const sign = racialBonus > 0 ? '+' : '';
    parts.push(`${sign}${racialBonus}R`);
    hasBonus = true;
  }

  // Add equipment bonus indicator
  if (equipBonus !== 0) {
    const sign = equipBonus > 0 ? '+' : '';
    parts.push(`${sign}${equipBonus}E`);
    hasBonus = true;
  }

  // Determine color based on total bonus
  const totalBonus = racialBonus + equipBonus;
  let color = '#ddd';
  if (totalBonus > 0) {
    color = '#4ade80'; // Green for positive
  } else if (totalBonus < 0) {
    color = '#ef4444'; // Red for negative
  }

  // Format: "14 (+3R)" or "14 (+3R +1E)" or just "14"
  const text = hasBonus ? `${value} (${parts.slice(1).join(' ')})` : `${value}`;
  return { text, color };
}

/**
 * Build a stat row.
 */
function buildStatRow(
  label: string,
  value: number,
  racialBonus: number,
  equipBonus: number,
  id: string
): LayoutContainer {
  const formatted = formatStatValue(value, racialBonus, equipBonus);

  return {
    type: 'horizontal',
    gap: '4px',
    style: { alignItems: 'center' },
    children: [
      {
        type: 'text',
        id: `score-stat-${id}-label`,
        content: label,
        style: { color: '#888', fontSize: '13px', width: '35px' },
      } as DisplayElement,
      {
        type: 'text',
        id: `score-stat-${id}-value`,
        content: formatted.text,
        style: { color: formatted.color, fontSize: '13px', fontWeight: 'bold' },
      } as DisplayElement,
    ],
  };
}

/**
 * Get racial stat bonuses for a race.
 */
function getRacialBonuses(raceId: string): Partial<Record<StatName, number>> {
  const raceDaemon = getRaceDaemon();
  const race = raceDaemon.getRace(raceId as RaceId);
  if (!race) {
    return {};
  }
  return race.statBonuses as Partial<Record<StatName, number>>;
}

/**
 * Build the stats section with two columns.
 */
function buildStatsSection(player: ScorePlayer): LayoutContainer {
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

  // Add luck
  const luckValue = stats.luck;
  const luckRacialBonus = racialBonuses.luck || 0;
  const luckEquipBonus = player.getStatBonus('luck');

  return {
    type: 'vertical',
    gap: '8px',
    style: { marginBottom: '16px' },
    children: [
      buildSectionHeader('STATS', 'score-stats-header'),
      {
        type: 'horizontal',
        gap: '24px',
        children: [
          {
            type: 'vertical',
            gap: '4px',
            style: { flex: '1' },
            children: leftColumn,
          },
          {
            type: 'vertical',
            gap: '4px',
            style: { flex: '1' },
            children: rightColumn,
          },
        ],
      },
      buildStatRow(STAT_SHORT_NAMES.luck, luckValue, luckRacialBonus, luckEquipBonus, 'luck'),
    ],
  };
}

/**
 * Build the wealth and activity info section.
 */
function buildInfoSection(player: ScorePlayer): LayoutContainer {
  const status = player.alive ? 'Alive' : 'Dead';
  const statusColor = player.alive ? '#4ade80' : '#ef4444';

  return {
    type: 'horizontal',
    gap: '24px',
    children: [
      // Wealth column
      {
        type: 'vertical',
        gap: '4px',
        style: { flex: '1' },
        children: [
          buildSectionHeader('WEALTH', 'score-wealth-header'),
          {
            type: 'horizontal',
            gap: '8px',
            style: { justifyContent: 'space-between' },
            children: [
              {
                type: 'text',
                id: 'score-gold-label',
                content: 'Gold:',
                style: { color: '#888', fontSize: '13px' },
              } as DisplayElement,
              {
                type: 'text',
                id: 'score-gold-value',
                content: formatNumber(player.gold),
                style: { color: '#fbbf24', fontSize: '13px', fontWeight: 'bold' },
              } as DisplayElement,
            ],
          },
          {
            type: 'horizontal',
            gap: '8px',
            style: { justifyContent: 'space-between' },
            children: [
              {
                type: 'text',
                id: 'score-banked-label',
                content: 'Banked:',
                style: { color: '#888', fontSize: '13px' },
              } as DisplayElement,
              {
                type: 'text',
                id: 'score-banked-value',
                content: formatNumber(player.bankedGold),
                style: { color: '#fbbf24', fontSize: '13px', fontWeight: 'bold' },
              } as DisplayElement,
            ],
          },
        ],
      },
      // Activity column
      {
        type: 'vertical',
        gap: '4px',
        style: { flex: '1' },
        children: [
          buildSectionHeader('ACTIVITY', 'score-activity-header'),
          {
            type: 'horizontal',
            gap: '8px',
            style: { justifyContent: 'space-between' },
            children: [
              {
                type: 'text',
                id: 'score-playtime-label',
                content: 'Playtime:',
                style: { color: '#888', fontSize: '13px' },
              } as DisplayElement,
              {
                type: 'text',
                id: 'score-playtime-value',
                content: formatPlayTime(player.playTime),
                style: { color: '#ddd', fontSize: '13px' },
              } as DisplayElement,
            ],
          },
          {
            type: 'horizontal',
            gap: '8px',
            style: { justifyContent: 'space-between' },
            children: [
              {
                type: 'text',
                id: 'score-status-label',
                content: 'Status:',
                style: { color: '#888', fontSize: '13px' },
              } as DisplayElement,
              {
                type: 'text',
                id: 'score-status-value',
                content: status,
                style: { color: statusColor, fontSize: '13px' },
              } as DisplayElement,
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Get the player's avatar/portrait image.
 * Prefers profilePortrait over avatar ID.
 */
function getPlayerImage(player: ScorePlayer): string {
  // Check for AI-generated profile portrait first
  const profilePortrait = player.getProperty('profilePortrait');
  if (profilePortrait && typeof profilePortrait === 'string') {
    return profilePortrait;
  }

  // Fall back to avatar ID
  if (player.avatar) {
    return player.avatar;
  }

  // Use fallback
  const portraitDaemon = getPortraitDaemon();
  return portraitDaemon.getFallbackImage('player');
}

/**
 * Open the score modal for a player.
 *
 * @param player The player to display the score for
 */
export function openScoreModal(player: ScorePlayer): void {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  const avatarSrc = getPlayerImage(player);

  // Build the full modal layout
  const layout: LayoutContainer = {
    type: 'vertical',
    gap: '0',
    children: [
      buildHeroSection(player, avatarSrc),
      {
        type: 'divider',
        id: 'score-divider-1',
        style: { marginBottom: '16px' },
      } as unknown as LayoutContainer,
      buildExperienceSection(player),
      buildVitalsSection(player),
      buildStatsSection(player),
      buildInfoSection(player),
    ],
  };

  // Send the modal
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'score-modal',
      title: 'CHARACTER SHEET',
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
}

export default { openScoreModal };
