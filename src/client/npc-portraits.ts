/**
 * NPC Portrait utilities for the combat panel.
 *
 * Provides fallback portrait SVG and validation utilities
 * for NPC portraits in the combat target display.
 */

/**
 * Fallback portrait SVG for when AI generation fails or is unavailable.
 * A simple dark silhouette that works for any creature type.
 */
export const FALLBACK_PORTRAIT = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#1a1a2e"/>
  <ellipse cx="32" cy="24" rx="14" ry="16" fill="#2d2d3d"/>
  <ellipse cx="32" cy="52" rx="18" ry="16" fill="#2d2d3d"/>
  <circle cx="26" cy="22" r="2" fill="#4a4a5a"/>
  <circle cx="38" cy="22" r="2" fill="#4a4a5a"/>
  <text x="32" y="58" text-anchor="middle" fill="#5a5a6a" font-size="8" font-family="sans-serif">?</text>
</svg>`;

/**
 * Get the fallback portrait SVG.
 */
export function getFallbackPortrait(): string {
  return FALLBACK_PORTRAIT;
}

/**
 * Basic validation that a string is valid SVG.
 */
export function isValidSvg(svg: string): boolean {
  if (!svg || typeof svg !== 'string') {
    return false;
  }
  if (!svg.trim().startsWith('<svg')) {
    return false;
  }
  if (!svg.trim().endsWith('</svg>')) {
    return false;
  }
  return true;
}

/**
 * Check if a portrait value is an avatar ID (for players)
 * rather than SVG markup.
 */
export function isAvatarId(portrait: string): boolean {
  return portrait.startsWith('avatar_');
}

/**
 * Check if a portrait value is a data URI (base64 encoded image).
 */
export function isDataUri(portrait: string): boolean {
  return portrait.startsWith('data:');
}
