/**
 * Sound system types for MudForge.
 *
 * These types define the structure of sound messages sent from the
 * server to the client.
 */

/**
 * Sound categories for organizing and controlling sounds.
 */
export type SoundCategory =
  | 'combat'      // Combat hits, misses, critical strikes
  | 'spell'       // Spell casting, magic effects
  | 'skill'       // Skill use, abilities
  | 'potion'      // Potion use, item consumption
  | 'quest'       // Quest accepted, quest complete
  | 'celebration' // Level up, achievement
  | 'discussion'  // Say, tell, channel messages
  | 'alert'       // Low HP warning, incoming attack
  | 'ambient'     // Room entry, environmental sounds
  | 'ui';         // Button clicks, menu sounds

/**
 * Sound message sent from server to client.
 */
export interface SoundMessage {
  /** Type of sound action */
  type: 'play' | 'loop' | 'stop';
  /** Sound category */
  category: SoundCategory;
  /** Sound identifier (e.g., 'hit', 'level-up', 'rain') */
  sound: string;
  /** Optional volume override (0.0-1.0) */
  volume?: number;
  /** Optional ID for stopping specific sounds */
  id?: string;
}

/**
 * Default category settings.
 */
export const DEFAULT_CATEGORY_ENABLED: Record<SoundCategory, boolean> = {
  combat: true,
  spell: true,
  skill: true,
  potion: true,
  quest: true,
  celebration: true,
  discussion: true,
  alert: true,
  ambient: false,
  ui: false,
};

/**
 * Category display information.
 */
export const CATEGORY_INFO: Record<SoundCategory, { icon: string; label: string }> = {
  combat: { icon: '\u2694\uFE0F', label: 'Combat' },       // Crossed swords
  spell: { icon: '\u2728', label: 'Spell' },               // Sparkles
  skill: { icon: '\uD83D\uDCAA', label: 'Skill' },         // Flexed bicep
  potion: { icon: '\uD83E\uDDEA', label: 'Potion' },       // Test tube
  quest: { icon: '\uD83D\uDCDC', label: 'Quest' },         // Scroll
  celebration: { icon: '\uD83C\uDF89', label: 'Celebration' }, // Party popper
  discussion: { icon: '\uD83D\uDCAC', label: 'Discuss' },  // Speech balloon
  alert: { icon: '\u26A0\uFE0F', label: 'Alert' },         // Warning
  ambient: { icon: '\uD83C\uDF3F', label: 'Ambient' },     // Herb
  ui: { icon: '\uD83D\uDDB1\uFE0F', label: 'Interface' },  // Mouse
};
