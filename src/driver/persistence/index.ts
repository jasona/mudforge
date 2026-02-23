/**
 * Persistence Layer - Pluggable persistence for MUD data.
 *
 * Provides serialization, storage, and loading of player and world data.
 * Supports filesystem (default) and Supabase backends via adapter pattern.
 */

export * from './adapter.js';
export * from './adapter-factory.js';
export * from './serializer.js';
export * from './file-store.js';
export * from './filesystem-adapter.js';
export * from './loader.js';
