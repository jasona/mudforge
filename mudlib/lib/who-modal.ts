/**
 * Who Modal - Build and display players online modal.
 *
 * Creates a GUI modal showing all connected players with their
 * avatars, names, levels, races, and classes in a card-based layout.
 */

import type {
  GUIOpenMessage,
  LayoutContainer,
  DisplayElement,
} from './gui-types.js';
import { canSee } from '../std/visibility/index.js';
import { getPortraitDaemon } from '../daemons/portrait.js';
import type { Living } from '../std/living.js';
import type { MudObject } from '../std/object.js';

/**
 * Interface for player data in the who modal.
 */
interface WhoPlayer extends MudObject {
  name: string;
  level?: number;
  permissionLevel?: number;
  race?: string;
  guild?: string;
  avatar?: string;
  displayName?: string | null; // Custom display name template (null if not set)
  getDisplayName?(): string;
  getProperty?(key: string): unknown;
}

/**
 * Interface for visible player with partial visibility info.
 */
interface VisiblePlayer {
  player: WhoPlayer;
  isPartiallyVisible: boolean;
}

/**
 * Rank badge info with text and color.
 */
interface RankBadge {
  text: string;
  color: string;
}

/**
 * Color token to CSS color mapping.
 */
const COLOR_TO_CSS: Record<string, string> = {
  // Basic colors
  black: '#000000',
  red: '#cc0000',
  green: '#00cc00',
  yellow: '#cccc00',
  blue: '#0066cc',
  magenta: '#cc00cc',
  cyan: '#00cccc',
  white: '#cccccc',
  // Bright colors
  BLACK: '#666666',
  RED: '#ff3333',
  GREEN: '#33ff33',
  YELLOW: '#ffff33',
  BLUE: '#3399ff',
  MAGENTA: '#ff33ff',
  CYAN: '#33ffff',
  WHITE: '#ffffff',
  // Extended colors
  orange: '#ff9900',
  pink: '#ffaacc',
  purple: '#9933ff',
  brown: '#996633',
  lime: '#99ff33',
  teal: '#339999',
  navy: '#003366',
  gold: '#ffcc00',
  coral: '#ff6666',
  salmon: '#ff9999',
  violet: '#9966ff',
  indigo: '#330099',
  crimson: '#cc3333',
  azure: '#3399ff',
  mint: '#99ffcc',
  lavender: '#cc99ff',
  rose: '#ff99cc',
  peach: '#ffcc99',
  sky: '#66ccff',
  forest: '#336633',
  dim: '#666666',
};

/**
 * Convert MUD color tokens to HTML with CSS colors.
 * Handles tokens like {red}, {bold}, {/}, etc.
 */
function colorTokensToHtml(text: string): string {
  let html = '';
  let i = 0;
  const openTags: string[] = [];

  while (i < text.length) {
    // Check for color token
    if (text[i] === '{') {
      const endIndex = text.indexOf('}', i);
      if (endIndex !== -1) {
        const token = text.slice(i + 1, endIndex);

        // Handle reset
        if (token === '/' || token === 'reset') {
          // Close all open tags
          while (openTags.length > 0) {
            html += '</span>';
            openTags.pop();
          }
        }
        // Handle bold
        else if (token === 'bold' || token === 'b') {
          html += '<span style="font-weight: bold;">';
          openTags.push('bold');
        }
        // Handle dim
        else if (token === 'dim') {
          html += '<span style="opacity: 0.6;">';
          openTags.push('dim');
        }
        // Handle italic
        else if (token === 'italic' || token === 'i') {
          html += '<span style="font-style: italic;">';
          openTags.push('italic');
        }
        // Handle underline
        else if (token === 'underline' || token === 'u') {
          html += '<span style="text-decoration: underline;">';
          openTags.push('underline');
        }
        // Handle color
        else if (COLOR_TO_CSS[token]) {
          html += `<span style="color: ${COLOR_TO_CSS[token]};">`;
          openTags.push('color');
        }
        // Unknown token - just skip
        else {
          // Skip unknown tokens
        }

        i = endIndex + 1;
        continue;
      }
    }

    // Escape HTML special characters
    if (text[i] === '<') {
      html += '&lt;';
    } else if (text[i] === '>') {
      html += '&gt;';
    } else if (text[i] === '&') {
      html += '&amp;';
    } else {
      html += text[i];
    }
    i++;
  }

  // Close any remaining open tags
  while (openTags.length > 0) {
    html += '</span>';
    openTags.pop();
  }

  return html;
}

/**
 * Get the rank badge for a player based on permission level.
 * Only shows rank badges for staff (Builder+), not player levels.
 */
function getPlayerRank(player: WhoPlayer): RankBadge | null {
  const permLevel = player.permissionLevel ?? 0;

  if (permLevel >= 3) {
    return { text: '[ADMIN]', color: '#ef4444' }; // Red
  } else if (permLevel >= 2) {
    return { text: '[SENIOR]', color: '#fbbf24' }; // Yellow
  } else if (permLevel >= 1) {
    return { text: '[BUILD]', color: '#c084fc' }; // Magenta/Purple
  }

  // Regular player - no badge (level shown on info line)
  return null;
}

/**
 * Get level color based on level value.
 */
function getLevelColor(level: number): string {
  if (level >= 50) return '#ef4444';      // Red
  if (level >= 40) return '#fbbf24';      // Yellow
  if (level >= 30) return '#c084fc';      // Magenta
  if (level >= 20) return '#22d3ee';      // Cyan
  if (level >= 10) return '#4ade80';      // Green
  return '#ddd';                          // Default
}

/**
 * Get the player's avatar image.
 * Prefers profilePortrait over avatar ID.
 */
function getPlayerAvatar(player: WhoPlayer): string {
  // Check for AI-generated profile portrait first
  if (player.getProperty) {
    const profilePortrait = player.getProperty('profilePortrait');
    if (profilePortrait && typeof profilePortrait === 'string') {
      return profilePortrait;
    }
  }

  // Fall back to avatar ID
  if (player.avatar) {
    return player.avatar;
  }

  // Use fallback from portrait daemon
  const portraitDaemon = getPortraitDaemon();
  return portraitDaemon.getFallbackImage('player');
}

/**
 * Build a player card for the who modal.
 */
function buildPlayerCard(
  player: WhoPlayer,
  isPartiallyVisible: boolean,
  isCurrentPlayer: boolean
): LayoutContainer {
  const avatar = getPlayerAvatar(player);

  // Get the display name - if player has a custom displayName set, use getDisplayName()
  // which returns it with $N replaced. Otherwise capitalize the raw name.
  let displayName: string;
  if (player.displayName) {
    // Player has a custom display name - use it with colors intact
    displayName = player.getDisplayName?.() ?? player.name;
  } else {
    // No custom display name - capitalize the raw name
    displayName = efuns.capitalize(player.name);
  }
  const displayNameHtml = colorTokensToHtml(displayName);
  const rankBadge = getPlayerRank(player);

  // For partially visible players, show limited info
  if (isPartiallyVisible) {
    return {
      type: 'horizontal',
      gap: '12px',
      style: {
        padding: '12px',
        borderBottom: '1px solid #333',
        alignItems: 'center',
        backgroundColor: isCurrentPlayer ? 'rgba(74, 222, 128, 0.1)' : undefined,
        borderLeft: isCurrentPlayer ? '3px solid #4ade80' : undefined,
      },
      children: [
        // Mystery avatar
        {
          type: 'image',
          id: `who-avatar-${player.name}`,
          src: getPortraitDaemon().getFallbackImage('player'),
          alt: 'Unknown',
          style: {
            width: '64px',
            height: '64px',
            borderRadius: '8px',
            border: '2px solid #444',
            flexShrink: '0',
            opacity: '0.5',
          },
        } as DisplayElement,
        // Info column
        {
          type: 'vertical',
          gap: '4px',
          style: { flex: '1' },
          children: [
            // Row 1: Name with [i] indicator (using HTML for colors)
            {
              type: 'html',
              id: `who-name-${player.name}`,
              content: `<span style="color: #4ade80; font-weight: bold;">[i]</span> ${displayNameHtml}`,
            } as DisplayElement,
            // Row 2: Partially visible note
            {
              type: 'text',
              id: `who-info-${player.name}`,
              content: '(Partially visible)',
              style: { color: '#666', fontSize: '13px', fontStyle: 'italic' },
            } as DisplayElement,
          ],
        },
      ],
    };
  }

  // Full player info
  const race = efuns.capitalize(player.race || 'Human');
  const className = player.guild || 'Adventurer';
  const level = player.level ?? 1;
  const levelColor = getLevelColor(level);

  // Build children for info column
  const infoChildren: (LayoutContainer | DisplayElement)[] = [];

  // Row 1: Name + optional rank badge (using HTML for display name colors)
  if (rankBadge) {
    infoChildren.push({
      type: 'html',
      id: `who-name-${player.name}`,
      content: `<span style="font-weight: bold; font-size: 15px;">${displayNameHtml}</span> <span style="color: ${rankBadge.color}; font-size: 12px; font-weight: bold;">${rankBadge.text}</span>`,
    } as DisplayElement);
  } else {
    infoChildren.push({
      type: 'html',
      id: `who-name-${player.name}`,
      content: `<span style="font-weight: bold; font-size: 15px;">${displayNameHtml}</span>`,
    } as DisplayElement);
  }

  // Row 2: Level, race, class (with colored level)
  infoChildren.push({
    type: 'html',
    id: `who-info-${player.name}`,
    content: `<span style="color: #888; font-size: 13px;"><span style="color: ${levelColor};">Level ${level}</span> \u2022 ${race} \u2022 ${className}</span>`,
  } as DisplayElement);

  return {
    type: 'horizontal',
    gap: '12px',
    style: {
      padding: '12px',
      borderBottom: '1px solid #333',
      alignItems: 'center',
      backgroundColor: isCurrentPlayer ? 'rgba(74, 222, 128, 0.1)' : undefined,
      borderLeft: isCurrentPlayer ? '3px solid #4ade80' : undefined,
    },
    children: [
      // Avatar (64x64)
      {
        type: 'image',
        id: `who-avatar-${player.name}`,
        src: avatar,
        alt: player.name,
        style: {
          width: '64px',
          height: '64px',
          borderRadius: '8px',
          border: '2px solid #333',
          flexShrink: '0',
        },
      } as DisplayElement,
      // Info column
      {
        type: 'vertical',
        gap: '4px',
        style: { flex: '1' },
        children: infoChildren,
      },
    ],
  };
}

/**
 * Build the empty state for when no players are online.
 */
function buildEmptyState(): LayoutContainer {
  return {
    type: 'vertical',
    gap: '16px',
    style: {
      padding: '32px',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '800px',
    },
    children: [
      {
        type: 'text',
        id: 'who-empty-message',
        content: 'No players are currently online.',
        style: {
          color: '#666',
          fontSize: '14px',
          textAlign: 'center',
        },
      } as DisplayElement,
    ],
  };
}

/**
 * Build the header section with MUD name and tagline.
 */
function buildHeaderSection(gameName: string, tagline: string): LayoutContainer {
  return {
    type: 'vertical',
    gap: '4px',
    style: {
      padding: '16px',
      textAlign: 'center',
      borderBottom: '1px solid #333',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    children: [
      {
        type: 'text',
        id: 'who-game-name',
        content: gameName.toUpperCase(),
        style: {
          color: '#fbbf24',
          fontSize: '18px',
          fontWeight: 'bold',
          textAlign: 'center',
        },
      } as DisplayElement,
      {
        type: 'text',
        id: 'who-tagline',
        content: tagline,
        style: {
          color: '#888',
          fontSize: '13px',
          fontStyle: 'italic',
          textAlign: 'center',
        },
      } as DisplayElement,
    ],
  };
}

/**
 * Open the who modal for a viewer.
 *
 * @param viewer The player viewing the who list
 */
export function openWhoModal(viewer: Living): void {
  if (typeof efuns === 'undefined' || !efuns.guiSend) {
    return;
  }

  // Get game configuration
  const game = efuns.gameConfig();

  // Get all connected players
  let allPlayers: MudObject[] = [];
  if (efuns.allPlayers) {
    allPlayers = efuns.allPlayers();
  }

  // Filter players by visibility
  const visiblePlayers: VisiblePlayer[] = [];

  for (const obj of allPlayers) {
    const playerLiving = obj as Living;
    const visResult = canSee(viewer, playerLiving);

    if (visResult.canSee) {
      visiblePlayers.push({
        player: obj as WhoPlayer,
        isPartiallyVisible: visResult.isPartiallyVisible,
      });
    }
  }

  // Sort players: admins first, then by level
  const sortedPlayers = [...visiblePlayers].sort((a, b) => {
    const aPermLevel = a.player.permissionLevel ?? 0;
    const bPermLevel = b.player.permissionLevel ?? 0;

    if (aPermLevel !== bPermLevel) {
      return bPermLevel - aPermLevel;
    }

    const aLevel = a.player.level ?? 1;
    const bLevel = b.player.level ?? 1;
    return bLevel - aLevel;
  });

  // Build player cards
  const playerCards: LayoutContainer[] = sortedPlayers.map(({ player, isPartiallyVisible }) => {
    const isCurrentPlayer = player.name === (viewer as WhoPlayer).name;
    return buildPlayerCard(player, isPartiallyVisible, isCurrentPlayer);
  });

  // Build the content section
  const contentSection: LayoutContainer =
    playerCards.length === 0
      ? buildEmptyState()
      : {
          type: 'vertical',
          gap: '0',
          style: {
            minHeight: '800px',
            maxHeight: '800px',
            overflowY: 'auto',
          },
          children: playerCards,
        };

  // Build the full modal layout with header
  const layout: LayoutContainer = {
    type: 'vertical',
    gap: '0',
    children: [
      buildHeaderSection(game.name, game.tagline),
      contentSection,
    ],
  };

  // Build subtitle with player count
  const playerCount = visiblePlayers.length;
  const countText = playerCount === 1 ? '1 Player Online' : `${playerCount} Players Online`;

  // Send the modal - use custom dimensions
  const message: GUIOpenMessage = {
    action: 'open',
    modal: {
      id: 'who-modal',
      title: 'PLAYERS ONLINE',
      subtitle: countText,
      size: 'medium',
      width: '845px', // 30% wider than previous 650px
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

export default { openWhoModal };
