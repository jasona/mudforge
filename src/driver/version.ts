/**
 * Version information for MudForge Driver and Game.
 *
 * Provides access to both driver version (from package.json)
 * and game configuration (from mudlib/config/game.json).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Driver version information.
 */
export interface DriverVersion {
  name: string;
  version: string;
}

/**
 * Game configuration loaded from mudlib/config/game.json.
 */
export interface GameConfig {
  name: string;
  tagline: string;
  version: string;
  description: string;
  establishedYear: number;
  website: string;
}

// Cached values
let driverVersion: DriverVersion | null = null;
let gameConfig: GameConfig | null = null;

/**
 * Default game configuration used when game.json doesn't exist.
 */
const DEFAULT_GAME_CONFIG: GameConfig = {
  name: 'MudForge',
  tagline: 'Your Adventure Awaits',
  version: '1.0.0',
  description: 'A Modern MUD Experience',
  establishedYear: 2026,
  website: 'https://www.mudforge.org',
};

/**
 * Get driver version information.
 * Reads from package.json and caches the result.
 */
export function getDriverVersion(): DriverVersion {
  if (!driverVersion) {
    const packagePath = resolve(process.cwd(), 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
      driverVersion = {
        name: 'MudForge Driver',
        version: pkg.version || '0.0.0',
      };
    } catch {
      driverVersion = {
        name: 'MudForge Driver',
        version: '0.0.0',
      };
    }
  }
  return driverVersion;
}

/**
 * Load game configuration from the mudlib.
 * @param mudlibPath Path to the mudlib directory
 */
export function loadGameConfig(mudlibPath: string): GameConfig {
  const configPath = resolve(mudlibPath, 'config', 'game.json');

  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
      gameConfig = {
        name: raw.name || DEFAULT_GAME_CONFIG.name,
        tagline: raw.tagline || DEFAULT_GAME_CONFIG.tagline,
        version: raw.version || DEFAULT_GAME_CONFIG.version,
        description: raw.description || DEFAULT_GAME_CONFIG.description,
        establishedYear: raw.establishedYear || DEFAULT_GAME_CONFIG.establishedYear,
        website: raw.website || DEFAULT_GAME_CONFIG.website,
      };
    } catch {
      gameConfig = { ...DEFAULT_GAME_CONFIG };
    }
  } else {
    gameConfig = { ...DEFAULT_GAME_CONFIG };
  }

  return gameConfig;
}

/**
 * Get the cached game configuration.
 * Returns null if loadGameConfig hasn't been called yet.
 */
export function getGameConfig(): GameConfig | null {
  return gameConfig;
}

/**
 * Get a formatted version string combining game and driver info.
 * Example: "MyGame v1.0.0 (MudForge Driver v0.1.0)"
 */
export function getVersionString(): string {
  const driver = getDriverVersion();
  const game = getGameConfig() ?? DEFAULT_GAME_CONFIG;
  return `${game.name} v${game.version} (${driver.name} v${driver.version})`;
}
