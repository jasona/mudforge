/**
 * Text Utilities
 *
 * Common text manipulation functions used throughout the mudlib.
 */

/**
 * Capitalize the first letter of a string.
 * Returns "Someone" if the input is undefined or empty.
 *
 * @param text The text to capitalize
 * @returns The text with the first letter capitalized
 */
export function capitalizeName(text: string | undefined): string {
  if (!text) return 'Someone';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Capitalize the first letter of each word in a string.
 *
 * @param text The text to title case
 * @returns The text with each word capitalized
 */
export function toTitleCase(text: string): string {
  if (!text) return '';
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Convert a string to a URL-safe slug.
 *
 * @param text The text to slugify
 * @returns A lowercase, hyphen-separated string
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Parse arguments with support for quoted strings.
 *
 * Splits input on spaces, but preserves content inside single or double quotes
 * as a single argument (with quote marks stripped).
 *
 * @param input The input string to parse
 * @returns Array of parsed arguments
 */
export function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
      if (current) {
        args.push(current);
        current = '';
      }
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    args.push(current);
  }

  return args;
}
