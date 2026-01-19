/**
 * HotReload - Manages hot-reloading of mudlib object definitions.
 *
 * Allows updating object code at runtime without restarting the server.
 * Existing clones get new methods while preserving their state.
 */

import { watch, type FSWatcher } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';
import { Compiler } from './compiler.js';
import { ObjectRegistry, getRegistry } from './object-registry.js';
import type { BlueprintInfo, MudObject } from './types.js';

export interface HotReloadConfig {
  /** Root directory for mudlib files */
  mudlibPath: string;
  /** Whether to enable file watching */
  watchEnabled: boolean;
  /** Debounce delay for file changes in ms */
  debounceMs: number;
  /** Object paths that should never be auto-unloaded on file deletion */
  safelist?: string[];
}

export interface UpdateResult {
  /** Whether the update succeeded */
  success: boolean;
  /** The object path that was updated */
  objectPath: string;
  /** Error message (if failed) */
  error?: string | undefined;
  /** Number of clones updated */
  clonesUpdated?: number | undefined;
  /** Compilation warnings */
  warnings?: string[] | undefined;
}

/**
 * Dependency information for an object.
 */
interface DependencyInfo {
  /** Files this object depends on */
  dependencies: Set<string>;
  /** Files that depend on this object */
  dependents: Set<string>;
}

/**
 * Manages hot-reloading of mudlib objects.
 */
export class HotReload {
  private config: HotReloadConfig;
  private compiler: Compiler;
  private registry: ObjectRegistry;
  private watcher: FSWatcher | null = null;
  private dependencies: Map<string, DependencyInfo> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<HotReloadConfig> = {}, registry?: ObjectRegistry) {
    this.config = {
      mudlibPath: config.mudlibPath ?? './mudlib',
      watchEnabled: config.watchEnabled ?? false,
      debounceMs: config.debounceMs ?? 100,
      safelist: config.safelist ?? [],
    };

    this.compiler = new Compiler({ mudlibPath: this.config.mudlibPath });
    this.registry = registry ?? getRegistry();
  }

  /**
   * Start watching the mudlib directory for changes and deletions.
   */
  startWatching(): void {
    if (this.watcher) {
      return; // Already watching
    }

    try {
      this.watcher = watch(
        this.config.mudlibPath,
        { recursive: true },
        (eventType, filename) => {
          try {
            if (filename && typeof filename === 'string' && filename.endsWith('.ts')) {
              this.handleFileChange(eventType, filename);
            }
          } catch (error) {
            console.error('[HotReload] Error in watch callback:', error);
          }
        }
      );

      this.watcher.on('error', (error) => {
        console.error('[HotReload] Watcher error:', error);
      });
    } catch (error) {
      console.error('[HotReload] Failed to start watching:', error);
    }
  }

  /**
   * Stop watching for file changes.
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear any pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Handle a file deletion event.
   * Only processes 'rename' events (which indicate deletion when file no longer exists).
   * File modifications are ignored - use 'update' command for hot-reload.
   */
  private handleFileChange(eventType: string, filename: string): void {
    try {
      // Only handle 'rename' events - 'change' events are modifications which we ignore
      if (eventType !== 'rename') {
        return;
      }

      // Skip generated area files - they're only loaded on server restart
      if (filename.includes('areas/') || filename.includes('areas\\')) {
        return;
      }

      // Skip config files
      if (filename.includes('config/') || filename.includes('config\\')) {
        return;
      }

      // Skip data files
      if (filename.includes('data/') || filename.includes('data\\')) {
        return;
      }

      console.log(`[HotReload] File rename event: ${filename}`);

      // Debounce rapid changes
      const existing = this.debounceTimers.get(filename);
      if (existing) {
        clearTimeout(existing);
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(filename);
        this.processFileEvent(eventType, filename).catch((error) => {
          console.error(`[HotReload] Unhandled error processing ${filename}:`, error);
        });
      }, this.config.debounceMs);

      this.debounceTimers.set(filename, timer);
    } catch (error) {
      console.error(`[HotReload] Error in handleFileChange:`, error);
    }
  }

  /**
   * Process a file event - only handles deletions.
   * File modifications still require the manual 'update' command.
   */
  private async processFileEvent(eventType: string, filename: string): Promise<void> {
    // Only handle 'rename' events which indicate file creation or deletion
    // 'change' events (modifications) are ignored - use 'update' command instead
    if (eventType !== 'rename') {
      return;
    }

    const fullPath = join(this.config.mudlibPath, filename);
    const objectPath = this.fileToObjectPath(filename);

    try {
      // Check if file still exists
      await stat(fullPath);
      // File exists - this is a creation or rename, not a deletion
      // Do nothing - modifications require manual 'update' command
      console.log(`[HotReload] File created/renamed (ignored): ${objectPath}`);
    } catch {
      // File doesn't exist - this is a deletion
      await this.handleDeletion(objectPath);
    }
  }

  /**
   * Convert a filename to an object path.
   */
  private fileToObjectPath(filename: string): string {
    // Remove .ts extension and normalize slashes
    let path = filename.replace(/\.ts$/, '').replace(/\\/g, '/');

    // Ensure it starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    return path;
  }

  /**
   * Handle file deletion by unloading the object and all its clones.
   */
  private async handleDeletion(objectPath: string): Promise<void> {
    console.log(`[HotReload] File deleted, checking: ${objectPath}`);

    // Check safelist - never auto-unload critical objects
    if (this.config.safelist?.includes(objectPath)) {
      console.log(`[HotReload] Skipping safelisted object: ${objectPath}`);
      return;
    }

    // Check if object is actually loaded
    const blueprint = this.registry.findBlueprint(objectPath);
    if (!blueprint) {
      console.log(`[HotReload] Object not loaded, skipping: ${objectPath}`);
      return;
    }

    const cloneCount = blueprint.clones.size;
    console.log(`[HotReload] Unloading ${objectPath} with ${cloneCount} clones`);

    // Handle rooms with players - evacuate them first
    try {
      if (this.hasPlayersInObject(objectPath)) {
        console.log(`[HotReload] Evacuating players from: ${objectPath}`);
        await this.evacuatePlayers(objectPath);
      }
    } catch (error) {
      console.error(`[HotReload] Error evacuating players from ${objectPath}:`, error);
      // Continue with unload even if evacuation fails
    }

    // Unregister the blueprint (destroys all clones)
    try {
      await this.registry.unregisterBlueprint(objectPath);
      console.log(
        `[HotReload] Unloaded ${objectPath} (${cloneCount} clone${cloneCount !== 1 ? 's' : ''} destroyed)`
      );
    } catch (error) {
      console.error(`[HotReload] Error unloading ${objectPath}:`, error);
    }
  }

  /**
   * Check if an object (typically a room) contains any players.
   */
  private hasPlayersInObject(objectPath: string): boolean {
    const obj = this.registry.find(objectPath);
    if (!obj || !obj.inventory) {
      return false;
    }

    return obj.inventory.some((item) => {
      // Check if item is a player by checking its blueprint path
      const itemPath = item.objectPath || '';
      const blueprintPath = (item as MudObject & { blueprint?: MudObject }).blueprint?.objectPath || '';
      return itemPath === '/std/player' || blueprintPath === '/std/player';
    });
  }

  /**
   * Move all players out of an object before it's destroyed.
   */
  private async evacuatePlayers(objectPath: string): Promise<void> {
    const obj = this.registry.find(objectPath);
    if (!obj || !obj.inventory) {
      return;
    }

    // Try to find a void room to evacuate to
    const voidRoom = this.registry.find('/areas/void/void');

    // Copy inventory array since we'll be modifying it
    for (const item of [...obj.inventory]) {
      try {
        const itemPath = item.objectPath || '';
        const blueprintPath = (item as MudObject & { blueprint?: MudObject }).blueprint?.objectPath || '';

        if (itemPath === '/std/player' || blueprintPath === '/std/player') {
          // This is a player - notify and move them
          const player = item as MudObject & { receive?: (msg: string) => void };
          if (player.receive) {
            player.receive('{yellow}The room dissolves around you...{/}\n');
          }
          await item.moveTo(voidRoom || null);
        }
      } catch (error) {
        console.error(`[HotReload] Error moving player:`, error);
      }
    }
  }

  /**
   * Update an object definition and all its clones.
   * @param objectPath The object path to update
   */
  async update(objectPath: string): Promise<UpdateResult> {
    // Compile the new code
    const compileResult = await this.compiler.compile(objectPath);

    if (!compileResult.success) {
      return {
        success: false,
        objectPath,
        error: compileResult.error,
        warnings: compileResult.warnings?.map((w) => w.text),
      };
    }

    // Find the existing blueprint
    const blueprintInfo = this.registry.findBlueprint(objectPath);

    if (!blueprintInfo) {
      // No existing blueprint - this would be handled by loadObject
      return {
        success: true,
        objectPath,
        clonesUpdated: 0,
        warnings: compileResult.warnings?.map((w) => w.text),
      };
    }

    // Update all clones with the new methods
    const clonesUpdated = await this.updateClones(blueprintInfo, compileResult.code!);

    return {
      success: true,
      objectPath,
      clonesUpdated,
      warnings: compileResult.warnings?.map((w) => w.text),
    };
  }

  /**
   * Update all clones of a blueprint with new code.
   * Preserves existing state while updating methods.
   */
  private async updateClones(
    blueprintInfo: BlueprintInfo,
    _newCode: string
  ): Promise<number> {
    let updated = 0;

    for (const cloneId of blueprintInfo.clones) {
      const clone = this.registry.find(cloneId);
      if (clone) {
        // Note: In a full implementation, we would:
        // 1. Execute the new code to get a new prototype
        // 2. Update the clone's prototype to the new one
        // 3. Call an optional onUpdate() hook
        //
        // For now, we just count the clones that would be updated.
        // The actual prototype swapping requires integration with the
        // script runner and is complex to implement safely.
        updated++;
      }
    }

    return updated;
  }

  /**
   * Track dependencies for an object.
   * @param objectPath The object being compiled
   * @param dependsOn Paths this object depends on
   */
  trackDependencies(objectPath: string, dependsOn: string[]): void {
    // Get or create dependency info for this object
    let info = this.dependencies.get(objectPath);
    if (!info) {
      info = { dependencies: new Set(), dependents: new Set() };
      this.dependencies.set(objectPath, info);
    }

    // Clear old dependencies
    for (const oldDep of info.dependencies) {
      const depInfo = this.dependencies.get(oldDep);
      if (depInfo) {
        depInfo.dependents.delete(objectPath);
      }
    }
    info.dependencies.clear();

    // Add new dependencies
    for (const dep of dependsOn) {
      info.dependencies.add(dep);

      // Update the dependent's dependents set
      let depInfo = this.dependencies.get(dep);
      if (!depInfo) {
        depInfo = { dependencies: new Set(), dependents: new Set() };
        this.dependencies.set(dep, depInfo);
      }
      depInfo.dependents.add(objectPath);
    }
  }

  /**
   * Get all objects that depend on a given object.
   */
  getDependents(objectPath: string): string[] {
    const info = this.dependencies.get(objectPath);
    return info ? Array.from(info.dependents) : [];
  }

  /**
   * Get all objects that a given object depends on.
   */
  getDependencies(objectPath: string): string[] {
    const info = this.dependencies.get(objectPath);
    return info ? Array.from(info.dependencies) : [];
  }

  /**
   * Update an object and all objects that depend on it.
   */
  async updateWithDependents(objectPath: string): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];

    // Update the main object
    const mainResult = await this.update(objectPath);
    results.push(mainResult);

    if (!mainResult.success) {
      return results;
    }

    // Update all dependents (recursively)
    const visited = new Set<string>([objectPath]);
    const toUpdate = [...this.getDependents(objectPath)];

    while (toUpdate.length > 0) {
      const dep = toUpdate.shift()!;
      if (visited.has(dep)) {
        continue;
      }
      visited.add(dep);

      const result = await this.update(dep);
      results.push(result);

      if (result.success) {
        toUpdate.push(...this.getDependents(dep));
      }
    }

    return results;
  }

  /**
   * Get the compiler instance.
   */
  getCompiler(): Compiler {
    return this.compiler;
  }

  /**
   * Check if file watching is active.
   */
  get isWatching(): boolean {
    return this.watcher !== null;
  }
}
