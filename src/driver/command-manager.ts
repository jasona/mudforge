/**
 * CommandManager - Manages the command system with permission-based directories.
 *
 * Commands are organized in directories by permission level:
 * - cmds/player/  - Available to all players (level 0)
 * - cmds/builder/ - Available to builders and above (level 1)
 * - cmds/senior/  - Available to senior builders and above (level 2)
 * - cmds/admin/   - Available to admins only (level 3)
 *
 * Command files are prefixed with "_" (e.g., _look.ts, _goto.ts)
 * and export a standard Command interface.
 */

import { watch, type FSWatcher } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import type { MudObject } from './types.js';
import type { Logger } from 'pino';

/**
 * Permission levels matching the mudlib's PermissionLevel enum.
 */
export enum PermissionLevel {
  Player = 0,
  Builder = 1,
  SeniorBuilder = 2,
  Administrator = 3,
}

/**
 * Command execution context.
 */
export interface CommandContext {
  /** The player executing the command */
  player: MudObject;
  /** The full input string */
  input: string;
  /** The command verb */
  verb: string;
  /** Arguments after the verb */
  args: string;
  /** Send output to the player */
  send(message: string): void;
  /** Send a line with newline */
  sendLine(message: string): void;
  /** Save the player's state */
  savePlayer(): Promise<void>;
}

/**
 * Command module interface - what command files must export.
 */
export interface Command {
  /** Command name(s) - the verb(s) that trigger this command */
  name: string | string[];
  /** Brief description for help */
  description: string;
  /** Usage syntax */
  usage?: string;
  /**
   * Execute the command.
   * @returns true/void for success, false for failure (stops macros)
   */
  execute(ctx: CommandContext): boolean | void | Promise<boolean | void>;
}

/**
 * Loaded command with metadata.
 */
interface LoadedCommand {
  command: Command;
  level: PermissionLevel;
  filePath: string;
  names: string[];
}

/**
 * Configuration for CommandManager.
 */
export interface CommandManagerConfig {
  /** Root path to the cmds/ directory */
  cmdsPath: string;
  /** Logger instance */
  logger?: Logger | undefined;
  /** Enable hot-reload watching */
  watchEnabled?: boolean | undefined;
  /** Callback to save a player */
  savePlayer?: (player: MudObject) => Promise<void>;
}

/**
 * Directory names mapped to permission levels.
 */
const LEVEL_DIRS: Record<string, PermissionLevel> = {
  player: PermissionLevel.Player,
  builder: PermissionLevel.Builder,
  senior: PermissionLevel.SeniorBuilder,
  admin: PermissionLevel.Administrator,
};

/**
 * Manages command loading, caching, and execution.
 */
export class CommandManager {
  private config: { cmdsPath: string; watchEnabled: boolean };
  private logger: Logger | undefined;
  private commands: Map<string, LoadedCommand> = new Map();
  private commandsByFile: Map<string, LoadedCommand> = new Map();
  private watchers: FSWatcher[] = [];
  private initialized: boolean = false;
  private savePlayerCallback: ((player: MudObject) => Promise<void>) | undefined;

  constructor(config: CommandManagerConfig) {
    this.config = {
      cmdsPath: config.cmdsPath,
      watchEnabled: config.watchEnabled ?? true,
    };
    this.logger = config.logger;
    this.savePlayerCallback = config.savePlayer;
  }

  /**
   * Initialize the command manager - load all commands.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.logger?.info('Initializing command manager');

    // Load commands from each permission level directory
    for (const [dirName, level] of Object.entries(LEVEL_DIRS)) {
      const dirPath = join(this.config.cmdsPath, dirName);
      await this.loadCommandsFromDirectory(dirPath, level);
    }

    // Start watching if enabled
    if (this.config.watchEnabled) {
      this.startWatching();
    }

    this.initialized = true;
    this.logger?.info({ commandCount: this.commands.size }, 'Command manager initialized');
  }

  /**
   * Load all commands from a directory.
   */
  private async loadCommandsFromDirectory(dirPath: string, level: PermissionLevel): Promise<void> {
    try {
      const stats = await stat(dirPath);
      if (!stats.isDirectory()) return;
    } catch {
      // Directory doesn't exist yet, that's ok
      return;
    }

    const files = await readdir(dirPath);

    for (const file of files) {
      if (file.startsWith('_') && file.endsWith('.ts')) {
        const filePath = join(dirPath, file);
        await this.loadCommand(filePath, level);
      }
    }
  }

  /**
   * Load a single command file.
   */
  private async loadCommand(filePath: string, level: PermissionLevel): Promise<void> {
    const absolutePath = resolve(filePath);

    try {
      // Clear from Node's module cache for hot-reload
      const fileUrl = pathToFileURL(absolutePath).href;

      // Add cache-busting query parameter for hot-reload
      const urlWithCacheBust = `${fileUrl}?t=${Date.now()}`;

      const module = await import(urlWithCacheBust);
      const command: Command = module.default || module;

      if (!command || !command.name || !command.execute) {
        this.logger?.warn({ filePath }, 'Invalid command file - missing name or execute');
        return;
      }

      // Get all names for this command
      const names = Array.isArray(command.name) ? command.name : [command.name];

      const loaded: LoadedCommand = {
        command,
        level,
        filePath: absolutePath,
        names,
      };

      // Remove old command if reloading
      const existingByFile = this.commandsByFile.get(absolutePath);
      if (existingByFile) {
        for (const name of existingByFile.names) {
          this.commands.delete(name.toLowerCase());
        }
      }

      // Register new command
      this.commandsByFile.set(absolutePath, loaded);
      for (const name of names) {
        this.commands.set(name.toLowerCase(), loaded);
      }

      this.logger?.debug({ names, level, filePath }, 'Loaded command');
    } catch (error) {
      this.logger?.error({ error, filePath }, 'Failed to load command');
    }
  }

  /**
   * Unload a command file.
   */
  private unloadCommand(filePath: string): void {
    const absolutePath = resolve(filePath);
    const loaded = this.commandsByFile.get(absolutePath);

    if (loaded) {
      for (const name of loaded.names) {
        this.commands.delete(name.toLowerCase());
      }
      this.commandsByFile.delete(absolutePath);
      this.logger?.debug({ filePath }, 'Unloaded command');
    }
  }

  /**
   * Start watching for file changes.
   */
  private startWatching(): void {
    for (const [dirName, level] of Object.entries(LEVEL_DIRS)) {
      const dirPath = join(this.config.cmdsPath, dirName);

      try {
        const watcher = watch(dirPath, async (eventType, filename) => {
          if (!filename || !filename.startsWith('_') || !filename.endsWith('.ts')) {
            return;
          }

          const filePath = join(dirPath, filename);

          if (eventType === 'rename') {
            // File added or removed
            try {
              await stat(filePath);
              // File exists - load/reload it
              this.logger?.info({ filename }, 'Command file added/changed, reloading');
              await this.loadCommand(filePath, level);
            } catch {
              // File removed
              this.logger?.info({ filename }, 'Command file removed, unloading');
              this.unloadCommand(filePath);
            }
          } else if (eventType === 'change') {
            // File modified
            this.logger?.info({ filename }, 'Command file changed, reloading');
            await this.loadCommand(filePath, level);
          }
        });

        this.watchers.push(watcher);
      } catch {
        // Directory might not exist, that's ok
      }
    }

    this.logger?.info('Command hot-reload watching enabled');
  }

  /**
   * Stop watching for file changes.
   */
  stopWatching(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }

  /**
   * Execute a command.
   * @param player The player executing the command
   * @param input The full input string
   * @param playerLevel The player's permission level
   * @returns true if command was found and executed, false otherwise
   */
  async execute(player: MudObject, input: string, playerLevel: PermissionLevel = PermissionLevel.Player): Promise<boolean> {
    const trimmed = input.trim();
    if (!trimmed) return false;

    // Parse verb and args
    const spaceIndex = trimmed.indexOf(' ');
    const verb = spaceIndex > 0 ? trimmed.substring(0, spaceIndex) : trimmed;
    const args = spaceIndex > 0 ? trimmed.substring(spaceIndex + 1).trim() : '';

    // Find the command
    const loaded = this.commands.get(verb.toLowerCase());
    if (!loaded) {
      return false;
    }

    // Check permission level
    if (playerLevel < loaded.level) {
      // Player doesn't have access to this command
      return false;
    }

    // Create context
    const playerWithReceive = player as MudObject & { receive?: (msg: string) => void };
    const savePlayerCallback = this.savePlayerCallback;
    const ctx: CommandContext = {
      player,
      input: trimmed,
      verb,
      args,
      send: (message: string) => {
        if (playerWithReceive.receive) {
          playerWithReceive.receive(message);
        }
      },
      sendLine: (message: string) => {
        if (playerWithReceive.receive) {
          playerWithReceive.receive(message + '\n');
        }
      },
      savePlayer: async () => {
        if (savePlayerCallback) {
          await savePlayerCallback(player);
        }
      },
    };

    // Execute
    try {
      const result = await loaded.command.execute(ctx);
      // If command explicitly returns false, it failed
      // void/undefined/true all count as success
      return result !== false;
    } catch (error) {
      this.logger?.error({ error, verb }, 'Error executing command');
      ctx.sendLine(`Error executing command: ${error instanceof Error ? error.message : String(error)}`);
      return false; // Command errored = failure
    }
  }

  /**
   * Get all available commands for a permission level.
   */
  getAvailableCommands(level: PermissionLevel): Command[] {
    const result: Command[] = [];
    const seen = new Set<Command>();

    for (const loaded of this.commands.values()) {
      if (loaded.level <= level && !seen.has(loaded.command)) {
        seen.add(loaded.command);
        result.push(loaded.command);
      }
    }

    return result.sort((a, b) => {
      const nameA = Array.isArray(a.name) ? (a.name[0] ?? '') : a.name;
      const nameB = Array.isArray(b.name) ? (b.name[0] ?? '') : b.name;
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Check if a command exists.
   */
  hasCommand(verb: string): boolean {
    return this.commands.has(verb.toLowerCase());
  }

  /**
   * Get command count.
   */
  get commandCount(): number {
    return this.commandsByFile.size;
  }

  /**
   * Reload all commands.
   */
  async reload(): Promise<void> {
    this.commands.clear();
    this.commandsByFile.clear();

    for (const [dirName, level] of Object.entries(LEVEL_DIRS)) {
      const dirPath = join(this.config.cmdsPath, dirName);
      await this.loadCommandsFromDirectory(dirPath, level);
    }

    this.logger?.info({ commandCount: this.commands.size }, 'Commands reloaded');
  }

  /**
   * Reload a single command by mudlib path.
   * @param mudlibPath The path like "/cmds/player/_look"
   * @returns Success status and any error message
   */
  async reloadCommand(mudlibPath: string): Promise<{ success: boolean; error?: string }> {
    // Parse the path to determine the directory and level
    const normalizedPath = mudlibPath.startsWith('/') ? mudlibPath.slice(1) : mudlibPath;
    const parts = normalizedPath.split('/');

    // Expected format: cmds/<level>/_command
    if (parts.length < 3 || parts[0] !== 'cmds') {
      return { success: false, error: 'Invalid command path format. Expected /cmds/<level>/_command' };
    }

    const levelDir = parts[1];
    if (!levelDir || !(levelDir in LEVEL_DIRS)) {
      return { success: false, error: `Unknown command level directory: ${levelDir}` };
    }

    const level = LEVEL_DIRS[levelDir] as PermissionLevel;
    const fileName = parts.slice(2).join('/') + '.ts';
    const filePath = join(this.config.cmdsPath, levelDir, fileName);

    try {
      await this.loadCommand(filePath, level);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get information about a command by name.
   * @param name The command name to look up
   * @returns Command info or undefined if not found
   */
  getCommandInfo(name: string): {
    names: string[];
    filePath: string;
    level: PermissionLevel;
    description: string;
    usage?: string | undefined;
  } | undefined {
    const loaded = this.commands.get(name.toLowerCase());
    if (!loaded) return undefined;

    const result: {
      names: string[];
      filePath: string;
      level: PermissionLevel;
      description: string;
      usage?: string | undefined;
    } = {
      names: loaded.names,
      filePath: loaded.filePath,
      level: loaded.level,
      description: loaded.command.description,
    };

    if (loaded.command.usage) {
      result.usage = loaded.command.usage;
    }

    return result;
  }

  /**
   * Dispose the command manager.
   */
  dispose(): void {
    this.stopWatching();
    this.commands.clear();
    this.commandsByFile.clear();
    this.initialized = false;
  }
}

// Singleton instance
let managerInstance: CommandManager | null = null;

/**
 * Get the global CommandManager instance.
 */
export function getCommandManager(config?: CommandManagerConfig): CommandManager {
  if (!managerInstance && config) {
    managerInstance = new CommandManager(config);
  }
  if (!managerInstance) {
    throw new Error('CommandManager not initialized - call with config first');
  }
  return managerInstance;
}

/**
 * Reset the global manager. Used for testing.
 */
export function resetCommandManager(): void {
  if (managerInstance) {
    managerInstance.dispose();
  }
  managerInstance = null;
}
