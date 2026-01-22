/**
 * Emoji conversion utility for the MUD client.
 * Converts text emoticons to Unicode emoji characters.
 *
 * IMPORTANT: This must be called AFTER HTML escaping because some emoticons
 * contain characters like '<' that get escaped (e.g., <3 becomes &lt;3)
 */

// Mapping of HTML-escaped emoticons to emoji characters
const EMOTICON_MAP: Record<string, string> = {
  // Smileys (HTML-escaped versions where needed)
  ':)': '😊',
  ':-)': '😊',
  ':]': '😊',
  ':D': '😃',
  ':-D': '😃',
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ':-p': '😛',
  ';)': '😉',
  ';-)': '😉',
  ':(': '😢',
  ':-(': '😢',
  ':[': '😢',
  ":'(": '😭',
  ':O': '😮',
  ':-O': '😮',
  ':o': '😮',
  ':-o': '😮',
  'D:': '😧',
  ':S': '😖',
  ':-S': '😖',
  ':s': '😖',
  ':/': '😕',
  ':-/': '😕',
  ':\\': '😕',
  ':-\\': '😕',
  ':*': '😘',
  ':-*': '😘',
  'XD': '😆',
  'xD': '😆',
  'B)': '😎',
  'B-)': '😎',
  '8)': '😎',
  '8-)': '😎',
  '>:(': '😠',
  '&gt;:(': '😠', // HTML-escaped version
  '>:)': '😈',
  '&gt;:)': '😈', // HTML-escaped version
  'O:)': '😇',
  '0:)': '😇',
  '-_-': '😑',
  '^_^': '😊',
  '^.^': '😊',
  'T_T': '😭',
  'T.T': '😭',
  'o_o': '😳',
  'O_O': '😳',
  '&lt;3': '❤️', // HTML-escaped <3
  '&lt;/3': '💔', // HTML-escaped </3

  // Additional common emoticons
  ':3': '😺',
  ':>': '😊',
  ':->': '😊',
  '=)': '😊',
  '=D': '😃',
  '=(': '😢',
  '=P': '😛',
  '=p': '😛',
  ';P': '😜',
  ';p': '😜',
  ':$': '😳',
  ':-$': '😳',
  ':X': '🤐',
  ':-X': '🤐',
  ':x': '🤐',
  ':@': '😡',
  ':-@': '😡',
};

// Build regex pattern from emoticon keys (escape special regex chars)
function buildPattern(): RegExp {
  const escaped = Object.keys(EMOTICON_MAP)
    .sort((a, b) => b.length - a.length) // Longer patterns first
    .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  // Match emoticons with word boundaries or at start/end
  // Use lookbehind/lookahead to ensure emoticons are standalone
  return new RegExp(`(?<=^|\\s|>)(${escaped.join('|')})(?=$|\\s|<)`, 'g');
}

const EMOTICON_PATTERN = buildPattern();

/**
 * Convert text emoticons to emoji characters.
 * Should be called on HTML-escaped text (after escapeHtml()).
 */
export function convertEmoticons(text: string): string {
  return text.replace(EMOTICON_PATTERN, (match) => EMOTICON_MAP[match] || match);
}

/**
 * Check if emoji conversion is enabled (localStorage setting).
 */
export function isEmojiConversionEnabled(): boolean {
  try {
    const setting = localStorage.getItem('mudforge-emoji-enabled');
    return setting !== 'false'; // Enabled by default
  } catch {
    return true; // Default to enabled if localStorage unavailable
  }
}

/**
 * Set emoji conversion preference.
 */
export function setEmojiConversionEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('mudforge-emoji-enabled', enabled ? 'true' : 'false');
  } catch {
    // Ignore localStorage errors
  }
}
