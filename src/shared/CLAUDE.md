# src/shared/ - Shared Protocol Types

## Files

- `protocol-types.ts` - Canonical type definitions shared between server (connection.ts) and client (websocket-client.ts).

## Types Defined

SessionTokenMessage, SessionResumeMessage, TimeMessage, IdeMessage, GUIMessage, MapMessage, StatsMessage, StatsDeltaMessage, EquipmentMessage, CompletionMessage, AuthRequest, AuthResponseMessage, QuestMessage, CommMessage, CombatMessage, SoundMessage, GiphyMessage, GameTimeMessage, and related subtypes.

## Import Pattern

- Server: `connection.ts` re-exports from here for backward compatibility
- Client: `websocket-client.ts` re-exports so existing consumers don't need to update imports
- Protocol parser: `protocol-parser.ts` uses these types for message parsing

## Key Convention

When adding a new protocol message type, define it here first, then import in both connection.ts and websocket-client.ts.
