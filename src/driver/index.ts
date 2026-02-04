/**
 * MudForge Driver - Main Entry Point
 *
 * A modern MUD driver inspired by LDMud, built with Node.js and TypeScript.
 */

import 'dotenv/config';
import { getDriver } from './driver.js';
import { Server } from '../network/server.js';

// Global error handlers to prevent crashes from unhandled errors
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught exception at', new Date().toISOString());
  console.error('[FATAL] Error:', error.message);
  console.error('[FATAL] Stack:', error.stack);
  console.error('[FATAL] This may cause WebSocket disconnects (code 1005/1006)');
  // Don't exit - let the process continue if possible
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled rejection at', new Date().toISOString());
  console.error('[FATAL] Promise:', promise);
  console.error('[FATAL] Reason:', reason);
  if (reason instanceof Error) {
    console.error('[FATAL] Stack:', reason.stack);
  }
  console.error('[FATAL] This may cause WebSocket disconnects (code 1005/1006)');
  // Don't exit - let the process continue if possible
});

/**
 * Start event loop lag monitoring.
 * Logs warnings when the event loop is delayed by more than 100ms.
 */
function startEventLoopMonitor(): void {
  let lastCheck = Date.now();
  let checkCount = 0;

  setInterval(() => {
    checkCount++;
    const now = Date.now();
    const elapsed = now - lastCheck;
    const lag = elapsed - 1000; // Expected 1s interval

    if (lag > 100) {
      console.warn(`[EVENT-LOOP-LAG] Check #${checkCount}: ${lag}ms delay (elapsed: ${elapsed}ms)`);
    }

    lastCheck = now;
  }, 1000);
}

async function main(): Promise<void> {
  // Get driver instance (loads config)
  const driver = getDriver();
  const config = driver.getConfig();
  const logger = driver.getLogger();

  logger.info({ config }, 'MudForge Driver starting...');
  logger.info(`Server will listen on ${config.host}:${config.port}`);
  logger.info(`Mudlib path: ${config.mudlibPath}`);
  logger.info(`Master object: ${config.masterObject}`);

  // Start the driver (loads master, preloads objects)
  await driver.start();

  // Initialize and start the network server
  const server = new Server({
    port: config.port,
    host: config.host,
    mudlibPath: config.mudlibPath,
    logger,
    logHttpRequests: config.logHttpRequests,
    wsHeartbeatIntervalMs: config.wsHeartbeatIntervalMs,
    wsMaxMissedPongs: config.wsMaxMissedPongs,
  });

  // Wire up server events to driver with error handling
  server.on('connection', async (connection) => {
    try {
      await driver.onPlayerConnect(connection);
    } catch (error) {
      logger.error({ error, id: connection.id }, 'Error in connection handler');
    }
  });

  server.on('message', async (connection, message) => {
    try {
      await driver.onPlayerInput(connection, message);
    } catch (error) {
      logger.error({ error, id: connection.id }, 'Error in message handler');
      // Don't close connection - let player retry
    }
  });

  server.on('disconnect', async (connection) => {
    try {
      await driver.onPlayerDisconnect(connection);
    } catch (error) {
      logger.error({ error, id: connection.id }, 'Error in disconnect handler');
    }
  });

  server.on('error', (error) => {
    logger.error({ error }, 'Server error');
  });

  await server.start();
  logger.info('MudForge Driver initialized successfully');

  // Start event loop lag monitoring for debugging connection issues
  startEventLoopMonitor();

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    // Force exit after 15 seconds if graceful shutdown hangs
    const forceExitTimer = setTimeout(() => {
      logger.warn('Graceful shutdown timeout - forcing exit');
      process.exit(1);
    }, 15000);

    try {
      await server.stop();
      await driver.stop();
    } finally {
      clearTimeout(forceExitTimer);
    }

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
