# Connection and Session Lifecycle

This guide explains how MudForge handles WebSocket connections, disconnects, reconnection, and session tokens.

## Overview

MudForge separates:

- **transport connection state** (network WebSocket health)
- **player object session state** (active player in world)

Primary files:

- `src/network/connection.ts`
- `src/network/server.ts`
- `src/network/session-manager.ts`
- `src/driver/driver.ts`

## Connection Lifecycle

1. client connects to `/ws`
2. connection object is created and registered
3. login/auth flow binds a player object
4. heartbeat and keepalive begin
5. disconnect/timeout/quit paths handle cleanup or resume

## Heartbeats and Keepalive

Server heartbeat loop periodically:

- sends ping frames
- sends time data frames
- tracks missed pong counts
- monitors backpressure and buffer health

Connections can be terminated for:

- excessive missed pongs
- critical output buffer growth (stuck/unread client)

## Link-Dead Handling

On unexpected disconnect (not `quit`):

- player is moved to void
- previous location is stored
- disconnect timer starts (configurable)
- player remains active for possible reconnect

If reconnect occurs in time:

- timer is canceled
- player is rebound and restored

If timeout expires:

- player is saved and force-removed from active state

## Session Tokens

Session tokens are HMAC-signed and include:

- player identity
- connection metadata
- expiry timestamp
- nonce

Managed by `SessionManager`:

- token creation
- validation
- invalidation on logout or replacement

## Session Resume Flow

When client sends session resume request:

1. token is validated
2. active player object is looked up
3. connection transfer occurs
4. previous location restored if needed
5. new token is issued
6. optional buffered message replay occurs

## Session Takeover

If a character is already connected and a new valid login occurs:

- old connection is closed
- new connection is bound to same player object
- gameplay continuity is maintained without duplicate players

## Configurable Timeout

Disconnect timeout uses mud config:

```text
disconnect.timeoutMinutes
```

Admin command example:

```text
config disconnect.timeoutMinutes 30
```

## Operational Notes

- Keep timeout long enough for common client refresh/network hiccups.
- Monitor logs for repeated backpressure terminations.
- Ensure load balancer/proxy timeout settings align with heartbeat strategy.
- Use clean `quit` for deterministic immediate session shutdown.

## Troubleshooting

If players report reconnect issues:

1. confirm token expiry window and server clock sanity
2. verify player remains in active players map after disconnect
3. inspect disconnect reason (heartbeat timeout vs explicit close)
4. check if connection buffer repeatedly hit critical thresholds

## Related Docs

- `docs/character-creation-and-login.md`
- `docs/player-features.md`
- `docs/deployment.md`
