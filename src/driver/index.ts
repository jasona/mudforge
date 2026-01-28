/**
 * MudForge Driver - Main Entry Point
 *
 * A modern MUD driver inspired by LDMud, built with Node.js and TypeScript.
 */

import 'dotenv/config';
import { getDriver } from './driver.js';
import { Server } from '../network/server.js';

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

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    await server.stop();
    await driver.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
