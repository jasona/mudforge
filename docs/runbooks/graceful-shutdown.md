# Graceful Shutdown Runbook

## Goal

Stop accepting new traffic, preserve player/world state, and exit cleanly.

## Procedure

1. Send `SIGTERM` to the process manager target.
2. Driver enters shutdown path:
   - server marks shutdown mode (new WS connects rejected)
   - driver stop sequence runs
   - server closes active connections
3. Process exits before `SHUTDOWN_TIMEOUT_MS`.

## Verification

- No new sessions are accepted during shutdown.
- `driver.stop()` completes.
- Process exits without forced timeout.

## Timeout Handling

If timeout is reached:

1. Capture logs and stack traces.
2. Force stop process.
3. Investigate stuck operations before next deploy.
