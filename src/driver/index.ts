/**
 * MudForge Driver - Main Entry Point
 *
 * A modern MUD driver inspired by LDMud, built with Node.js and TypeScript.
 */

import { loadConfig, validateConfig } from './config.js';
import pino from 'pino';

const config = loadConfig();
const errors = validateConfig(config);

if (errors.length > 0) {
  console.error('Configuration errors:');
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

const logger = config.logPretty
  ? pino({
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    })
  : pino({
      level: config.logLevel,
    });

logger.info({ config }, 'MudForge Driver starting...');
logger.info(`Server will listen on ${config.host}:${config.port}`);
logger.info(`Mudlib path: ${config.mudlibPath}`);
logger.info(`Master object: ${config.masterObject}`);

// TODO: Initialize driver components
// - Object Registry
// - Isolate Pool
// - Compiler
// - Network Server
// - Load Master object

logger.info('MudForge Driver initialized successfully');
