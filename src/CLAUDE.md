# src/ - Driver Engine (Node.js)

The driver runs outside the V8 sandbox and provides the core MUD engine.

## Subdirectories

- `driver/` - Core orchestration, object registry, scheduler, efun bridge, compiler
- `network/` - Fastify HTTP server, WebSocket connections, session management
- `isolation/` - V8 isolate pool and sandbox execution
- `client/` - Browser-based web client (built with esbuild)
- `shared/` - Types shared between server and client

## Key Patterns

- All mudlib code runs in sandboxed V8 isolates; only whitelisted efuns are available
- Protocol messages use `\x00[TYPE]<json>` format for all structured data
- Hot-reload updates object prototypes at runtime without losing state
- Singleton pattern used extensively (getRegistry(), getScheduler(), etc.) with reset functions for testing

## Build

- Server: TypeScript compiled via `tsc`, run with `tsx`
- Client: esbuild bundles `index.ts` and `shared-websocket-worker.ts` separately
- `npm run build` compiles both; `npm run build:client` for client only
