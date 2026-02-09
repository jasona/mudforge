import type { MudObject } from '../types.js';

/**
 * Minimal object loader surface used by EfunBridge.
 * Injected by Driver to avoid direct loader/bridge coupling.
 */
export interface ObjectLoaderFacade {
  cloneObject<T extends MudObject>(mudlibPath: string): Promise<T | undefined>;
  loadObject<T extends MudObject>(mudlibPath: string): Promise<T>;
  loadModule(mudlibPath: string): Promise<Record<string, unknown>>;
  reloadObject(mudlibPath: string): Promise<{
    success: boolean;
    error?: string;
    existingClones: number;
    migratedObjects: number;
  }>;
}
