/**
 * AdapterFactory - Singleton factory for persistence adapters.
 *
 * Creates and manages the global PersistenceAdapter instance based on
 * configuration. Defaults to FilesystemAdapter; dynamically imports
 * SupabaseAdapter when configured to avoid requiring its dependency.
 */

import type { PersistenceAdapter } from './adapter.js';
import { FilesystemAdapter } from './filesystem-adapter.js';

/**
 * Adapter configuration.
 */
export interface AdapterConfig {
  adapter: 'filesystem' | 'supabase';
  dataPath: string;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

let adapterInstance: PersistenceAdapter | null = null;

/**
 * Get the global PersistenceAdapter instance.
 * Creates one on first call using the provided config.
 */
export function getAdapter(config?: Partial<AdapterConfig>): PersistenceAdapter {
  if (!adapterInstance) {
    const adapterType = config?.adapter ?? (process.env['PERSISTENCE_ADAPTER'] as 'filesystem' | 'supabase') ?? 'filesystem';
    const dataPath = config?.dataPath ?? process.env['DATA_PATH'] ?? './mudlib/data';

    if (adapterType === 'supabase') {
      // SupabaseAdapter is created synchronously but requires initialize() to connect
      throw new Error(
        'Supabase adapter must be created via createAdapter() which is async. ' +
        'Call createAdapter() during startup instead of getAdapter().'
      );
    }

    adapterInstance = new FilesystemAdapter({ dataPath });
  }
  return adapterInstance;
}

/**
 * Create the global PersistenceAdapter instance asynchronously.
 * Required for Supabase adapter which needs dynamic import.
 */
export async function createAdapter(config?: Partial<AdapterConfig>): Promise<PersistenceAdapter> {
  if (adapterInstance) {
    return adapterInstance;
  }

  const adapterType = config?.adapter ?? (process.env['PERSISTENCE_ADAPTER'] as 'filesystem' | 'supabase') ?? 'filesystem';
  const dataPath = config?.dataPath ?? process.env['DATA_PATH'] ?? './mudlib/data';

  if (adapterType === 'supabase') {
    const supabaseUrl = config?.supabaseUrl ?? process.env['SUPABASE_URL'] ?? '';
    const supabaseServiceKey = config?.supabaseServiceKey ?? process.env['SUPABASE_SERVICE_KEY'] ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for the Supabase adapter');
    }

    const { SupabaseAdapter } = await import('./supabase-adapter.js');
    adapterInstance = new SupabaseAdapter({ supabaseUrl, supabaseServiceKey });
  } else {
    adapterInstance = new FilesystemAdapter({ dataPath });
  }

  return adapterInstance;
}

/**
 * Reset the global adapter. Used for testing.
 */
export function resetAdapter(): void {
  adapterInstance = null;
}

/**
 * Set the global adapter directly. Used for testing.
 */
export function setAdapter(adapter: PersistenceAdapter): void {
  adapterInstance = adapter;
}
