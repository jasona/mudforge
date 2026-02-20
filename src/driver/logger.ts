/**
 * Logger - Shared pino logger singleton for the driver.
 *
 * Provides a centralized logger that is initialized by the Driver
 * and can be imported by any server-side module.
 *
 * Usage:
 *   import { getLogger } from './logger.js';
 *   const logger = getLogger();
 *   logger.info('Hello');
 *   logger.warn({ key: 'value' }, 'Warning message');
 */

import pino, { type Logger } from 'pino';

let _logger: Logger = pino({ level: 'info' }); // Default until driver initializes

/**
 * Initialize the shared logger. Called by the Driver during startup.
 * @param logger The configured pino logger instance
 */
export function initializeLogger(logger: Logger): void {
  _logger = logger;
}

/**
 * Get the shared pino logger instance.
 */
export function getLogger(): Logger {
  return _logger;
}
