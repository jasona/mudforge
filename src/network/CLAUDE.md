# src/network/ - HTTP Server & WebSocket

## Files

- `server.ts` - Fastify HTTP server serving static client files and WebSocket upgrades. Health endpoints at `/health` and `/ready`.
- `connection.ts` (~1039 lines) - WebSocket wrapper with protocol message sending, backpressure management, and close handling. Re-exports types from `shared/protocol-types.ts`.
- `connection-manager.ts` - Tracks all active connections. EventEmitter for connect/disconnect events.
- `session-manager.ts` - HMAC-SHA256 signed session tokens. TTL aligned with disconnect timeout.
- `i3-client.ts` - Intermud 3 protocol (TCP).
- `i2-client.ts`, `i2-codec.ts` - Intermud 2 protocol (UDP) with LPC codec.
- `grapevine-client.ts` - Grapevine cross-MUD network (WebSocket).
- `discord-client.ts` - Discord bot integration.
- `lpc-codec.ts` - LPC data format encoder/decoder.

## Protocol Message Format

All structured messages: `\x00[TYPE]<json>`

Types: STATS, MAP, COMBAT, EQUIPMENT, QUEST, COMM, SOUND, GIPHY, IDE, GUI, SESSION, TIME, GAMETIME, COMPLETION, AUTH, VISIBILITY

## Backpressure Levels

- 64KB: warn and slow down
- 256KB: queue messages
- 512KB: hard stop sending

## Connection Close Diagnostic

`connection.close()` captures stack trace for debugging close sources (the `Error: close() call trace` you see in logs is intentional diagnostic logging).

## Session Reconnection Flow

1. Client stores session token
2. On reconnect, validates token (HMAC signature + expiry)
3. Finds existing active player
4. Transfers to new connection
5. Issues fresh token
