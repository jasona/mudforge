/**
 * SupabaseAdapter - Supabase-based persistence adapter.
 *
 * Maps generic persistence operations to dedicated Supabase tables.
 * Namespaces are routed to specific tables for optimal querying,
 * with a fallback generic game_state table for simple configs.
 *
 * Requires @supabase/supabase-js as a dependency (dynamically imported
 * by adapter-factory.ts to avoid requiring it when not in use).
 */

import type { PersistenceAdapter, PermissionsData } from './adapter.js';
import type { PlayerSaveData, WorldState } from './serializer.js';

// Supabase client type (imported dynamically to avoid hard dependency)
type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;

/**
 * Supabase adapter configuration.
 */
export interface SupabaseAdapterConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  storageBucket?: string;
}

/**
 * Supabase-based persistence adapter.
 */
export class SupabaseAdapter implements PersistenceAdapter {
  private client: SupabaseClient | null = null;
  private config: SupabaseAdapterConfig;
  private storageBucket: string;

  constructor(config: SupabaseAdapterConfig) {
    this.config = config;
    this.storageBucket = config.storageBucket ?? 'game-media';
  }

  // ========== Lifecycle ==========

  async initialize(): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js');
    this.client = createClient(this.config.supabaseUrl, this.config.supabaseServiceKey);
  }

  async shutdown(): Promise<void> {
    this.client = null;
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('SupabaseAdapter not initialized. Call initialize() first.');
    }
    return this.client;
  }

  // ========== Player Persistence ==========

  async savePlayer(data: PlayerSaveData): Promise<void> {
    const client = this.getClient();
    const state = data.state;
    const props = state?.properties ?? {};

    const { error } = await client
      .from('players')
      .upsert({
        name: data.name.toLowerCase(),
        level: (props.level as number) ?? 1,
        race: (props.race as string) ?? 'human',
        location: data.location,
        last_login: new Date().toISOString(),
        play_time: (props.playTime as number) ?? 0,
        data,
        saved_at: new Date(data.savedAt).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'name' });

    if (error) throw new Error(`Failed to save player ${data.name}: ${error.message}`);
  }

  async loadPlayer(name: string): Promise<PlayerSaveData | null> {
    const client = this.getClient();
    const safeName = name.toLowerCase();

    const { data, error } = await client
      .from('players')
      .select('data')
      .eq('name', safeName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to load player ${name}: ${error.message}`);
    }

    return (data?.data as PlayerSaveData) ?? null;
  }

  async playerExists(name: string): Promise<boolean> {
    const client = this.getClient();
    const safeName = name.toLowerCase();

    const { count, error } = await client
      .from('players')
      .select('name', { count: 'exact', head: true })
      .eq('name', safeName);

    if (error) throw new Error(`Failed to check player ${name}: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async listPlayers(): Promise<string[]> {
    const client = this.getClient();

    const { data, error } = await client
      .from('players')
      .select('name');

    if (error) throw new Error(`Failed to list players: ${error.message}`);
    return (data ?? []).map((row: Record<string, unknown>) => row.name as string);
  }

  async deletePlayer(name: string): Promise<boolean> {
    const client = this.getClient();
    const safeName = name.toLowerCase();

    const { error, count } = await client
      .from('players')
      .delete({ count: 'exact' })
      .eq('name', safeName);

    if (error) throw new Error(`Failed to delete player ${name}: ${error.message}`);
    return (count ?? 0) > 0;
  }

  // ========== World State ==========

  async saveWorldState(state: WorldState): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('world_state')
      .upsert({
        id: 1,
        version: state.version,
        data: state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) throw new Error(`Failed to save world state: ${error.message}`);
  }

  async loadWorldState(): Promise<WorldState | null> {
    const client = this.getClient();

    const { data, error } = await client
      .from('world_state')
      .select('data')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to load world state: ${error.message}`);
    }

    return (data?.data as WorldState) ?? null;
  }

  // ========== Permissions ==========

  async savePermissions(data: PermissionsData): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('permissions')
      .upsert({
        id: 1,
        data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) throw new Error(`Failed to save permissions: ${error.message}`);
  }

  async loadPermissions(): Promise<PermissionsData | null> {
    const client = this.getClient();

    const { data, error } = await client
      .from('permissions')
      .select('data')
      .eq('id', 1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to load permissions: ${error.message}`);
    }

    return (data?.data as PermissionsData) ?? null;
  }

  // ========== Generic Data Store ==========

  async saveData(namespace: string, key: string, data: unknown): Promise<void> {
    const table = this.resolveTable(namespace);

    if (table === 'game_state') {
      await this.saveGameState(namespace, key, data);
    } else if (table === 'portraits' || table === 'object_images') {
      await this.saveImageData(namespace, key, data);
    } else if (table === 'bots') {
      await this.saveBotData(key, data);
    } else if (table === 'emotes') {
      await this.saveEmoteData(data);
    } else if (table === 'lore_entries') {
      await this.saveLoreData(data);
    } else if (table === 'announcements') {
      await this.saveAnnouncementData(data);
    } else if (table === 'grudges') {
      await this.saveGrudgeData(data);
    }
  }

  async loadData<T = unknown>(namespace: string, key: string): Promise<T | null> {
    const table = this.resolveTable(namespace);

    if (table === 'game_state') {
      return this.loadGameState<T>(namespace, key);
    } else if (table === 'portraits' || table === 'object_images') {
      return this.loadImageData<T>(namespace, key);
    } else if (table === 'bots') {
      return this.loadBotData<T>(key);
    } else if (table === 'emotes') {
      return this.loadEmoteData<T>();
    } else if (table === 'lore_entries') {
      return this.loadLoreData<T>();
    } else if (table === 'announcements') {
      return this.loadAnnouncementData<T>();
    } else if (table === 'grudges') {
      return this.loadGrudgeData<T>();
    }

    return null;
  }

  async dataExists(namespace: string, key: string): Promise<boolean> {
    const table = this.resolveTable(namespace);
    const client = this.getClient();

    if (table === 'portraits') {
      const { count } = await client
        .from('portraits')
        .select('cache_key', { count: 'exact', head: true })
        .eq('cache_key', key);
      return (count ?? 0) > 0;
    } else if (table === 'object_images') {
      const objectType = namespace.replace('images-', '');
      const { count } = await client
        .from('object_images')
        .select('cache_key', { count: 'exact', head: true })
        .eq('object_type', objectType)
        .eq('cache_key', key);
      return (count ?? 0) > 0;
    } else if (table === 'bots') {
      const { count } = await client
        .from('bots')
        .select('bot_id', { count: 'exact', head: true })
        .eq('bot_id', key);
      return (count ?? 0) > 0;
    } else if (table === 'game_state') {
      const compositeKey = `${namespace}.${key}`;
      const { count } = await client
        .from('game_state')
        .select('key', { count: 'exact', head: true })
        .eq('key', compositeKey);
      return (count ?? 0) > 0;
    }

    return false;
  }

  async deleteData(namespace: string, key: string): Promise<boolean> {
    const table = this.resolveTable(namespace);
    const client = this.getClient();

    if (table === 'bots') {
      const { count, error } = await client
        .from('bots')
        .delete({ count: 'exact' })
        .eq('bot_id', key);
      if (error) throw new Error(`Failed to delete bot ${key}: ${error.message}`);
      return (count ?? 0) > 0;
    } else if (table === 'portraits') {
      // Also delete from storage
      const { data: row } = await client.from('portraits').select('storage_path').eq('cache_key', key).single();
      if (row?.storage_path) {
        await client.storage.from(this.storageBucket).remove([row.storage_path]);
      }
      const { count, error } = await client.from('portraits').delete({ count: 'exact' }).eq('cache_key', key);
      if (error) throw new Error(`Failed to delete portrait ${key}: ${error.message}`);
      return (count ?? 0) > 0;
    } else if (table === 'game_state') {
      const compositeKey = `${namespace}.${key}`;
      const { count, error } = await client.from('game_state').delete({ count: 'exact' }).eq('key', compositeKey);
      if (error) throw new Error(`Failed to delete game state ${compositeKey}: ${error.message}`);
      return (count ?? 0) > 0;
    }

    return false;
  }

  async listKeys(namespace: string): Promise<string[]> {
    const table = this.resolveTable(namespace);
    const client = this.getClient();

    if (table === 'bots') {
      const { data, error } = await client.from('bots').select('bot_id');
      if (error) throw new Error(`Failed to list bots: ${error.message}`);
      return (data ?? []).map((row: Record<string, unknown>) => row.bot_id as string);
    } else if (table === 'portraits') {
      const { data, error } = await client.from('portraits').select('cache_key');
      if (error) throw new Error(`Failed to list portraits: ${error.message}`);
      return (data ?? []).map((row: Record<string, unknown>) => row.cache_key as string);
    } else if (table === 'object_images') {
      const objectType = namespace.replace('images-', '');
      const { data, error } = await client.from('object_images').select('cache_key').eq('object_type', objectType);
      if (error) throw new Error(`Failed to list object images: ${error.message}`);
      return (data ?? []).map((row: Record<string, unknown>) => row.cache_key as string);
    } else if (table === 'game_state') {
      const prefix = `${namespace}.`;
      const { data, error } = await client.from('game_state').select('key').like('key', `${prefix}%`);
      if (error) throw new Error(`Failed to list game state keys: ${error.message}`);
      return (data ?? []).map((row: Record<string, unknown>) => (row.key as string).slice(prefix.length));
    }

    return [];
  }

  // ========== Namespace-to-Table Routing ==========

  private resolveTable(namespace: string): string {
    if (namespace === 'portraits') return 'portraits';
    if (namespace.startsWith('images-')) return 'object_images';
    if (namespace === 'bots') return 'bots';
    if (namespace === 'emotes') return 'emotes';
    if (namespace === 'lore') return 'lore_entries';
    if (namespace === 'announcements') return 'announcements';
    if (namespace === 'combat') return 'grudges';
    // config, grapevine, intermud, moderation, areas → game_state
    return 'game_state';
  }

  // ========== Table-Specific Implementations ==========

  private async saveGameState(namespace: string, key: string, data: unknown): Promise<void> {
    const client = this.getClient();
    const compositeKey = `${namespace}.${key}`;

    const { error } = await client
      .from('game_state')
      .upsert({
        key: compositeKey,
        data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw new Error(`Failed to save game state ${compositeKey}: ${error.message}`);
  }

  private async loadGameState<T>(namespace: string, key: string): Promise<T | null> {
    const client = this.getClient();
    const compositeKey = `${namespace}.${key}`;

    const { data, error } = await client
      .from('game_state')
      .select('data')
      .eq('key', compositeKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to load game state ${compositeKey}: ${error.message}`);
    }

    return (data?.data as T) ?? null;
  }

  private async saveBotData(botId: string, data: unknown): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from('bots')
      .upsert({
        bot_id: botId,
        data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'bot_id' });

    if (error) throw new Error(`Failed to save bot ${botId}: ${error.message}`);
  }

  private async loadBotData<T>(botId: string): Promise<T | null> {
    const client = this.getClient();

    const { data, error } = await client
      .from('bots')
      .select('data')
      .eq('bot_id', botId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to load bot ${botId}: ${error.message}`);
    }

    return (data?.data as T) ?? null;
  }

  private async saveEmoteData(data: unknown): Promise<void> {
    const client = this.getClient();
    const emotes = data as Record<string, unknown>;
    const rows = Object.entries(emotes).map(([verb, rules]) => ({ verb, rules }));

    // Clear and re-insert all emotes
    await client.from('emotes').delete().neq('verb', '');
    if (rows.length > 0) {
      const { error } = await client.from('emotes').insert(rows);
      if (error) throw new Error(`Failed to save emotes: ${error.message}`);
    }
  }

  private async loadEmoteData<T>(): Promise<T | null> {
    const client = this.getClient();

    const { data, error } = await client.from('emotes').select('verb, rules');

    if (error) throw new Error(`Failed to load emotes: ${error.message}`);
    if (!data || data.length === 0) return null;

    const result: Record<string, unknown> = {};
    for (const row of data) {
      result[row.verb as string] = row.rules;
    }
    return result as T;
  }

  private async saveLoreData(data: unknown): Promise<void> {
    const client = this.getClient();
    const loreData = data as { entries?: Array<Record<string, unknown>> };
    const entries = loreData.entries ?? [];

    // Clear and re-insert
    await client.from('lore_entries').delete().neq('id', '');
    if (entries.length > 0) {
      const rows = entries.map((entry) => ({
        id: entry.id as string,
        category: entry.category as string,
        title: entry.title as string,
        content: entry.content as string,
        tags: (entry.tags as string[]) ?? [],
        related_lore: (entry.relatedLore as string[]) ?? [],
        priority: (entry.priority as number) ?? 5,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await client.from('lore_entries').insert(rows);
      if (error) throw new Error(`Failed to save lore entries: ${error.message}`);
    }
  }

  private async loadLoreData<T>(): Promise<T | null> {
    const client = this.getClient();

    const { data, error } = await client.from('lore_entries').select('*');

    if (error) throw new Error(`Failed to load lore entries: ${error.message}`);
    if (!data || data.length === 0) return null;

    const entries = data.map((row: Record<string, unknown>) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      content: row.content,
      tags: row.tags ?? [],
      relatedLore: row.related_lore ?? [],
      priority: row.priority ?? 5,
    }));

    return { entries } as T;
  }

  private async saveAnnouncementData(data: unknown): Promise<void> {
    const client = this.getClient();
    const announcementData = data as { announcements?: Array<Record<string, unknown>>; nextId?: number };
    const announcements = announcementData.announcements ?? [];

    // Store nextId in game_state
    if (announcementData.nextId !== undefined) {
      await this.saveGameState('announcements', '_meta', { nextId: announcementData.nextId });
    }

    // Clear and re-insert
    await client.from('announcements').delete().gte('id', 0);
    if (announcements.length > 0) {
      const rows = announcements.map((a) => ({
        id: a.id as number,
        title: a.title as string,
        content: a.content as string,
        author: a.author as string,
        created_at: a.createdAt ? new Date(a.createdAt as number).toISOString() : new Date().toISOString(),
        updated_at: a.updatedAt ? new Date(a.updatedAt as number).toISOString() : new Date().toISOString(),
      }));
      const { error } = await client.from('announcements').insert(rows);
      if (error) throw new Error(`Failed to save announcements: ${error.message}`);
    }
  }

  private async loadAnnouncementData<T>(): Promise<T | null> {
    const client = this.getClient();

    const { data, error } = await client.from('announcements').select('*').order('id', { ascending: true });

    if (error) throw new Error(`Failed to load announcements: ${error.message}`);

    // Load nextId from game_state
    const meta = await this.loadGameState<{ nextId?: number }>('announcements', '_meta');

    const announcements = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      author: row.author,
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : undefined,
    }));

    return {
      announcements,
      nextId: meta?.nextId,
    } as T;
  }

  private async saveGrudgeData(data: unknown): Promise<void> {
    const client = this.getClient();
    const grudgeData = data as { grudges?: Record<string, Array<Record<string, unknown>>> };
    const grudgesMap = grudgeData.grudges ?? {};

    // Clear and re-insert
    await client.from('grudges').delete().neq('npc_path', '');

    const rows: Array<Record<string, unknown>> = [];
    for (const [npcPath, entries] of Object.entries(grudgesMap)) {
      for (const entry of entries) {
        rows.push({
          npc_path: npcPath,
          player_name: entry.playerName as string,
          total_damage: entry.totalDamage as number ?? 0,
          flee_count: entry.fleeCount as number ?? 0,
          intensity: entry.intensity as number ?? 0,
          last_seen: new Date((entry.lastSeen as number) ?? Date.now()).toISOString(),
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await client.from('grudges').insert(rows);
      if (error) throw new Error(`Failed to save grudges: ${error.message}`);
    }
  }

  private async loadGrudgeData<T>(): Promise<T | null> {
    const client = this.getClient();

    const { data, error } = await client.from('grudges').select('*');

    if (error) throw new Error(`Failed to load grudges: ${error.message}`);
    if (!data || data.length === 0) return null;

    const grudges: Record<string, Array<Record<string, unknown>>> = {};
    for (const row of data) {
      const npcPath = row.npc_path as string;
      if (!grudges[npcPath]) grudges[npcPath] = [];
      grudges[npcPath].push({
        npcPath,
        playerName: row.player_name,
        totalDamage: row.total_damage,
        fleeCount: row.flee_count,
        intensity: row.intensity,
        lastSeen: new Date(row.last_seen as string).getTime(),
      });
    }

    return { grudges } as T;
  }

  private async saveImageData(namespace: string, key: string, data: unknown): Promise<void> {
    const client = this.getClient();
    const imageData = data as { image?: string; mimeType?: string; generatedAt?: number };

    if (!imageData.image) return;

    // Upload binary to storage
    const isPortrait = namespace === 'portraits';
    const objectType = namespace.replace('images-', '');
    const storagePath = isPortrait
      ? `portraits/${key}.png`
      : `images/${objectType}/${key}.png`;

    const buffer = Buffer.from(imageData.image, 'base64');
    const mimeType = imageData.mimeType ?? 'image/png';

    await client.storage
      .from(this.storageBucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    // Save metadata
    if (isPortrait) {
      const { error } = await client
        .from('portraits')
        .upsert({
          cache_key: key,
          mime_type: mimeType,
          storage_path: storagePath,
          generated_at: imageData.generatedAt
            ? new Date(imageData.generatedAt).toISOString()
            : new Date().toISOString(),
        }, { onConflict: 'cache_key' });
      if (error) throw new Error(`Failed to save portrait metadata ${key}: ${error.message}`);
    } else {
      const { error } = await client
        .from('object_images')
        .upsert({
          cache_key: key,
          object_type: objectType,
          mime_type: mimeType,
          storage_path: storagePath,
          generated_at: imageData.generatedAt
            ? new Date(imageData.generatedAt).toISOString()
            : new Date().toISOString(),
        }, { onConflict: 'object_type,cache_key' });
      if (error) throw new Error(`Failed to save object image metadata ${key}: ${error.message}`);
    }
  }

  private async loadImageData<T>(namespace: string, key: string): Promise<T | null> {
    const client = this.getClient();
    const isPortrait = namespace === 'portraits';

    // Get metadata
    let storagePath: string | null = null;
    let mimeType = 'image/png';
    let generatedAt: string | null = null;

    if (isPortrait) {
      const { data, error } = await client
        .from('portraits')
        .select('storage_path, mime_type, generated_at')
        .eq('cache_key', key)
        .single();
      if (error || !data) return null;
      storagePath = data.storage_path as string;
      mimeType = (data.mime_type as string) ?? 'image/png';
      generatedAt = data.generated_at as string;
    } else {
      const objectType = namespace.replace('images-', '');
      const { data, error } = await client
        .from('object_images')
        .select('storage_path, mime_type, generated_at')
        .eq('object_type', objectType)
        .eq('cache_key', key)
        .single();
      if (error || !data) return null;
      storagePath = data.storage_path as string;
      mimeType = (data.mime_type as string) ?? 'image/png';
      generatedAt = data.generated_at as string;
    }

    if (!storagePath) return null;

    // Download from storage
    const { data: fileData, error: downloadError } = await client.storage
      .from(this.storageBucket)
      .download(storagePath);

    if (downloadError || !fileData) return null;

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const image = buffer.toString('base64');

    return {
      image,
      mimeType,
      generatedAt: generatedAt ? new Date(generatedAt).getTime() : Date.now(),
    } as T;
  }
}
