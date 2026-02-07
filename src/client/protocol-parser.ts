/**
 * Protocol Parser - Single source of truth for parsing server-to-client protocol messages.
 *
 * All protocol messages use the format: \x00[TYPE]<json>
 * This module eliminates the duplicated parsing code between
 * websocket-client.ts and shared-websocket-client.ts.
 */

/**
 * Result of parsing a protocol line.
 * - For JSON protocol messages: { event, data }
 * - For TIME_PONG (non-JSON): { event: 'time-pong', raw }
 * - For plain text messages: null (caller should emit as 'message')
 */
export type ParsedMessage =
  | { event: string; data: unknown; raw?: undefined }
  | { event: 'time-pong'; data?: undefined; raw: string }
  | null;

/**
 * Registry of protocol prefixes to event names.
 * The prefix includes the null byte and brackets (e.g., '\x00[STATS]').
 * The event name is what gets emitted to the UI.
 */
const PROTOCOL_REGISTRY: ReadonlyArray<{ prefix: string; event: string }> = [
  { prefix: '\x00[IDE]',       event: 'ide-message' },
  { prefix: '\x00[MAP]',       event: 'map-message' },
  { prefix: '\x00[STATS]',     event: 'stats-message' },
  { prefix: '\x00[EQUIPMENT]', event: 'equipment-message' },
  { prefix: '\x00[GUI]',       event: 'gui-message' },
  { prefix: '\x00[QUEST]',     event: 'quest-message' },
  { prefix: '\x00[COMPLETE]',  event: 'completion-message' },
  { prefix: '\x00[COMM]',      event: 'comm-message' },
  { prefix: '\x00[AUTH]',      event: 'auth-response' },
  { prefix: '\x00[COMBAT]',    event: 'combat-message' },
  { prefix: '\x00[SOUND]',     event: 'sound-message' },
  { prefix: '\x00[GIPHY]',     event: 'giphy-message' },
  { prefix: '\x00[SESSION]',   event: 'session-message' },
  { prefix: '\x00[TIME]',      event: 'time-message' },
  { prefix: '\x00[GAMETIME]',  event: 'gametime-message' },
];

/**
 * Parse a single line from the server into a protocol message.
 *
 * Returns a ParsedMessage with the event name and parsed data,
 * or null if the line is plain text (not a protocol message).
 *
 * Special cases:
 * - TIME_PONG: returns { event: 'time-pong', raw } since it's not JSON
 * - SESSION/TIME: returns parsed JSON with generic event name;
 *   callers handle sub-routing (session_token vs session_resume, latency injection, etc.)
 */
export function parseProtocolMessage(line: string): ParsedMessage {
  // Fast path: protocol messages always start with \x00
  if (line.charCodeAt(0) !== 0) {
    return null;
  }

  // Check for TIME_PONG first (non-JSON, just a timestamp string)
  if (line.startsWith('\x00[TIME_PONG]')) {
    return { event: 'time-pong', raw: line.slice(12) };
  }

  // Try each registered protocol prefix
  for (const { prefix, event } of PROTOCOL_REGISTRY) {
    if (line.startsWith(prefix)) {
      const jsonStr = line.slice(prefix.length);
      try {
        const data = JSON.parse(jsonStr);
        return { event, data };
      } catch (error) {
        console.error(`Failed to parse ${event}:`, error);
        // Return the event with null data so callers know it was a protocol message
        // (e.g., TIME handler still needs to update heartbeat tracking on parse failure)
        return { event, data: null };
      }
    }
  }

  // Starts with \x00 but no known prefix - treat as plain text
  return null;
}
