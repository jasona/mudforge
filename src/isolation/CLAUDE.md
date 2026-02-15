# src/isolation/ - V8 Sandbox Execution

## Files

- `isolate-pool.ts` - Pool of V8 isolates with memory limits (default 128MB). Event-driven queue (no polling).
- `sandbox.ts` - Execution environment setup. No Node.js built-ins available; only whitelisted efuns.
- `script-runner.ts` - Runs scripts with timeout (default 5000ms). Returns {success, value} or {success: false, error, stack}.

## Key Patterns

- Mudlib code runs in isolated V8 contexts with memory/timeout limits
- Only efuns registered via `registerFunction()` are available inside sandbox
- Async efuns supported via `async: true` flag
- Pool waiting is event-driven to avoid memory leaks
