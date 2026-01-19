/**
 * Avatar definitions for player portraits.
 *
 * 10 avatar options with varying presentations and skin tones:
 * - 4 masculine (m1-m4): light, medium, tan, dark
 * - 4 feminine (f1-f4): light, medium, tan, dark
 * - 2 androgynous (a1-a2): medium-light, medium-dark
 */

// Skin tone color palettes
const SKIN_TONES = {
  light: { base: '#F5D0C5', shadow: '#E8B4A6', highlight: '#FBE4DC' },
  medium: { base: '#D4A574', shadow: '#C08B5C', highlight: '#E4BC8E' },
  tan: { base: '#B07D4B', shadow: '#8B5E34', highlight: '#C99B6D' },
  dark: { base: '#6B4423', shadow: '#4A2F18', highlight: '#8B5A32' },
  mediumLight: { base: '#E0B896', shadow: '#C9A07C', highlight: '#F0D0B0' },
  mediumDark: { base: '#8B5A3C', shadow: '#6B4028', highlight: '#A87450' },
};

// Hair colors
const HAIR = {
  black: '#1a1a1a',
  brown: '#4a3728',
  darkBrown: '#2d1f14',
  auburn: '#6b3a2a',
  blonde: '#c9a86c',
  gray: '#6b6b6b',
};

/**
 * Generate a masculine avatar SVG.
 */
function createMasculineAvatar(
  skin: { base: string; shadow: string; highlight: string },
  hairColor: string,
  hasBeard: boolean = false
): string {
  const beardMarkup = hasBeard
    ? `<ellipse cx="32" cy="44" rx="10" ry="6" fill="${hairColor}" opacity="0.8"/>
       <ellipse cx="32" cy="48" rx="8" ry="5" fill="${hairColor}" opacity="0.6"/>`
    : '';

  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="64" height="64" fill="#2a2a3a"/>

  <!-- Neck -->
  <rect x="26" y="42" width="12" height="14" fill="${skin.base}"/>
  <rect x="26" y="42" width="12" height="4" fill="${skin.shadow}"/>

  <!-- Shoulders -->
  <ellipse cx="32" cy="62" rx="22" ry="12" fill="#3a3a4a"/>
  <ellipse cx="32" cy="60" rx="18" ry="8" fill="#4a4a5a"/>

  <!-- Head -->
  <ellipse cx="32" cy="28" rx="16" ry="18" fill="${skin.base}"/>

  <!-- Ear shadows -->
  <ellipse cx="16" cy="28" rx="3" ry="5" fill="${skin.shadow}"/>
  <ellipse cx="48" cy="28" rx="3" ry="5" fill="${skin.shadow}"/>

  <!-- Ears -->
  <ellipse cx="16" cy="28" rx="2.5" ry="4" fill="${skin.base}"/>
  <ellipse cx="48" cy="28" rx="2.5" ry="4" fill="${skin.base}"/>

  <!-- Hair -->
  <path d="M16 24 Q16 10 32 8 Q48 10 48 24 Q48 16 32 14 Q16 16 16 24" fill="${hairColor}"/>
  <ellipse cx="32" cy="12" rx="14" ry="6" fill="${hairColor}"/>

  <!-- Face shadow -->
  <ellipse cx="32" cy="32" rx="12" ry="10" fill="${skin.shadow}" opacity="0.3"/>

  <!-- Eyes -->
  <ellipse cx="26" cy="26" rx="3" ry="2" fill="white"/>
  <ellipse cx="38" cy="26" rx="3" ry="2" fill="white"/>
  <circle cx="26" cy="26" r="1.5" fill="#2a2a2a"/>
  <circle cx="38" cy="26" r="1.5" fill="#2a2a2a"/>

  <!-- Eyebrows -->
  <path d="M22 22 Q26 20 30 22" stroke="${hairColor}" stroke-width="1.5" fill="none"/>
  <path d="M34 22 Q38 20 42 22" stroke="${hairColor}" stroke-width="1.5" fill="none"/>

  <!-- Nose -->
  <path d="M32 28 L32 34 L30 36" stroke="${skin.shadow}" stroke-width="1" fill="none"/>

  <!-- Mouth -->
  <path d="M28 40 Q32 42 36 40" stroke="#8b5a5a" stroke-width="1.5" fill="none"/>

  ${beardMarkup}
</svg>`;
}

/**
 * Generate a feminine avatar SVG.
 */
function createFeminineAvatar(
  skin: { base: string; shadow: string; highlight: string },
  hairColor: string,
  hairStyle: 'long' | 'short' = 'long'
): string {
  const hairMarkup =
    hairStyle === 'long'
      ? `<path d="M12 24 Q10 8 32 6 Q54 8 52 24 L52 44 Q52 50 46 52 L46 44 Q48 20 32 16 Q16 20 18 44 L18 52 Q12 50 12 44 Z" fill="${hairColor}"/>
       <ellipse cx="32" cy="10" rx="16" ry="6" fill="${hairColor}"/>`
      : `<path d="M14 26 Q14 10 32 8 Q50 10 50 26 Q50 18 32 14 Q14 18 14 26" fill="${hairColor}"/>
       <ellipse cx="32" cy="12" rx="15" ry="7" fill="${hairColor}"/>`;

  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="64" height="64" fill="#2a2a3a"/>

  <!-- Hair back (for long hair) -->
  ${hairStyle === 'long' ? `<ellipse cx="32" cy="40" rx="20" ry="24" fill="${hairColor}"/>` : ''}

  <!-- Neck -->
  <rect x="27" y="42" width="10" height="12" fill="${skin.base}"/>

  <!-- Shoulders -->
  <ellipse cx="32" cy="62" rx="20" ry="12" fill="#4a3a5a"/>
  <ellipse cx="32" cy="60" rx="16" ry="8" fill="#5a4a6a"/>

  <!-- Head -->
  <ellipse cx="32" cy="28" rx="15" ry="17" fill="${skin.base}"/>

  <!-- Ears -->
  <ellipse cx="17" cy="28" rx="2" ry="4" fill="${skin.base}"/>
  <ellipse cx="47" cy="28" rx="2" ry="4" fill="${skin.base}"/>

  <!-- Hair front -->
  ${hairMarkup}

  <!-- Face highlight -->
  <ellipse cx="28" cy="24" rx="6" ry="4" fill="${skin.highlight}" opacity="0.3"/>

  <!-- Eyes -->
  <ellipse cx="26" cy="26" rx="3.5" ry="2.5" fill="white"/>
  <ellipse cx="38" cy="26" rx="3.5" ry="2.5" fill="white"/>
  <circle cx="26" cy="26" r="1.8" fill="#3a5a3a"/>
  <circle cx="38" cy="26" r="1.8" fill="#3a5a3a"/>
  <circle cx="26.5" cy="25.5" r="0.6" fill="white"/>
  <circle cx="38.5" cy="25.5" r="0.6" fill="white"/>

  <!-- Eyelashes -->
  <path d="M22 24 Q24 22 26 24" stroke="#1a1a1a" stroke-width="0.5" fill="none"/>
  <path d="M38 24 Q40 22 42 24" stroke="#1a1a1a" stroke-width="0.5" fill="none"/>

  <!-- Eyebrows -->
  <path d="M23 22 Q26 21 29 22" stroke="${hairColor}" stroke-width="1" fill="none"/>
  <path d="M35 22 Q38 21 41 22" stroke="${hairColor}" stroke-width="1" fill="none"/>

  <!-- Nose -->
  <path d="M32 28 L32 33 L30 35" stroke="${skin.shadow}" stroke-width="0.8" fill="none"/>

  <!-- Mouth -->
  <ellipse cx="32" cy="40" rx="4" ry="1.5" fill="#c46a6a"/>
  <path d="M28 39 Q32 41 36 39" stroke="#a05050" stroke-width="0.5" fill="none"/>

  <!-- Blush -->
  <ellipse cx="22" cy="34" rx="4" ry="2" fill="#e8a0a0" opacity="0.3"/>
  <ellipse cx="42" cy="34" rx="4" ry="2" fill="#e8a0a0" opacity="0.3"/>
</svg>`;
}

/**
 * Generate an androgynous avatar SVG.
 */
function createAndrogynousAvatar(
  skin: { base: string; shadow: string; highlight: string },
  hairColor: string
): string {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="64" height="64" fill="#2a2a3a"/>

  <!-- Neck -->
  <rect x="27" y="42" width="10" height="12" fill="${skin.base}"/>

  <!-- Shoulders -->
  <ellipse cx="32" cy="62" rx="20" ry="12" fill="#3a4a4a"/>
  <ellipse cx="32" cy="60" rx="16" ry="8" fill="#4a5a5a"/>

  <!-- Head -->
  <ellipse cx="32" cy="28" rx="15" ry="17" fill="${skin.base}"/>

  <!-- Ears -->
  <ellipse cx="17" cy="28" rx="2.5" ry="4.5" fill="${skin.base}"/>
  <ellipse cx="47" cy="28" rx="2.5" ry="4.5" fill="${skin.base}"/>

  <!-- Hair - medium length, swept style -->
  <path d="M15 28 Q13 10 32 8 Q51 10 49 28 Q49 14 32 12 Q15 14 15 28" fill="${hairColor}"/>
  <ellipse cx="32" cy="11" rx="15" ry="6" fill="${hairColor}"/>
  <path d="M15 22 Q12 24 14 32 L17 28 Q15 24 17 22 Z" fill="${hairColor}"/>
  <path d="M49 22 Q52 24 50 32 L47 28 Q49 24 47 22 Z" fill="${hairColor}"/>

  <!-- Face shadow -->
  <ellipse cx="32" cy="32" rx="10" ry="8" fill="${skin.shadow}" opacity="0.2"/>

  <!-- Eyes -->
  <ellipse cx="26" cy="26" rx="3" ry="2.2" fill="white"/>
  <ellipse cx="38" cy="26" rx="3" ry="2.2" fill="white"/>
  <circle cx="26" cy="26" r="1.6" fill="#4a4a5a"/>
  <circle cx="38" cy="26" r="1.6" fill="#4a4a5a"/>
  <circle cx="26.3" cy="25.5" r="0.5" fill="white"/>
  <circle cx="38.3" cy="25.5" r="0.5" fill="white"/>

  <!-- Eyebrows -->
  <path d="M22 22 Q26 21 29 23" stroke="${hairColor}" stroke-width="1.2" fill="none"/>
  <path d="M35 23 Q38 21 42 22" stroke="${hairColor}" stroke-width="1.2" fill="none"/>

  <!-- Nose -->
  <path d="M32 28 L32 34 L30 36" stroke="${skin.shadow}" stroke-width="0.8" fill="none"/>

  <!-- Mouth -->
  <path d="M28 40 Q32 42 36 40" stroke="#9a6a6a" stroke-width="1.2" fill="none"/>
</svg>`;
}

/**
 * All available avatar SVGs.
 */
export const AVATARS: Record<string, string> = {
  // Masculine avatars
  avatar_m1: createMasculineAvatar(SKIN_TONES.light, HAIR.brown, false),
  avatar_m2: createMasculineAvatar(SKIN_TONES.medium, HAIR.black, true),
  avatar_m3: createMasculineAvatar(SKIN_TONES.tan, HAIR.darkBrown, false),
  avatar_m4: createMasculineAvatar(SKIN_TONES.dark, HAIR.black, true),

  // Feminine avatars
  avatar_f1: createFeminineAvatar(SKIN_TONES.light, HAIR.blonde, 'long'),
  avatar_f2: createFeminineAvatar(SKIN_TONES.medium, HAIR.brown, 'short'),
  avatar_f3: createFeminineAvatar(SKIN_TONES.tan, HAIR.auburn, 'long'),
  avatar_f4: createFeminineAvatar(SKIN_TONES.dark, HAIR.black, 'short'),

  // Androgynous avatars
  avatar_a1: createAndrogynousAvatar(SKIN_TONES.mediumLight, HAIR.gray),
  avatar_a2: createAndrogynousAvatar(SKIN_TONES.mediumDark, HAIR.darkBrown),
};

/**
 * Get the SVG markup for an avatar.
 */
export function getAvatarSvg(id: string): string {
  return AVATARS[id] || AVATARS['avatar_m1'];
}

/**
 * Check if an avatar ID is valid.
 */
export function isValidAvatarId(id: string): boolean {
  return id in AVATARS;
}

/**
 * Avatar metadata for picker UI.
 */
export interface AvatarInfo {
  id: string;
  category: 'masculine' | 'feminine' | 'androgynous';
  label: string;
}

/**
 * Get list of all avatars with metadata.
 */
export function getAvatarList(): AvatarInfo[] {
  return [
    { id: 'avatar_m1', category: 'masculine', label: 'Light' },
    { id: 'avatar_m2', category: 'masculine', label: 'Medium' },
    { id: 'avatar_m3', category: 'masculine', label: 'Tan' },
    { id: 'avatar_m4', category: 'masculine', label: 'Dark' },
    { id: 'avatar_f1', category: 'feminine', label: 'Light' },
    { id: 'avatar_f2', category: 'feminine', label: 'Medium' },
    { id: 'avatar_f3', category: 'feminine', label: 'Tan' },
    { id: 'avatar_f4', category: 'feminine', label: 'Dark' },
    { id: 'avatar_a1', category: 'androgynous', label: 'Light' },
    { id: 'avatar_a2', category: 'androgynous', label: 'Dark' },
  ];
}

/**
 * Get default avatar based on gender.
 */
export function getDefaultAvatar(gender: 'male' | 'female' | 'neutral'): string {
  switch (gender) {
    case 'male':
      return 'avatar_m1';
    case 'female':
      return 'avatar_f1';
    case 'neutral':
    default:
      return 'avatar_a1';
  }
}
