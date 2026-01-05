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
    logger,
  });

  // Wire up server events to driver
  server.on('connection', async (connection) => {
    await driver.onPlayerConnect(connection);
  });

  server.on('message', async (connection, message) => {
    await driver.onPlayerInput(connection, message);
  });

  server.on('disconnect', async (connection) => {
    await driver.onPlayerDisconnect(connection);
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
