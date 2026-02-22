-- MudForge Persistence Schema
-- Used by SupabaseAdapter for cloud-based game data storage.

-- Player data with indexed core fields + JSONB for extended data
CREATE TABLE players (
  name TEXT PRIMARY KEY,
  level INTEGER NOT NULL DEFAULT 1,
  race TEXT NOT NULL DEFAULT 'human',
  location TEXT,
  last_login TIMESTAMPTZ,
  play_time INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_players_level ON players (level);
CREATE INDEX idx_players_last_login ON players (last_login);

-- World state (single row, potentially large)
CREATE TABLE world_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions (single row)
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lore entries (properly normalized, high volume)
CREATE TABLE lore_entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  related_lore TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lore_category ON lore_entries (category);
CREATE INDEX idx_lore_priority ON lore_entries (priority DESC);

-- Announcements (growing list)
CREATE TABLE announcements (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPC grudges (high churn, auto-expiring)
CREATE TABLE grudges (
  npc_path TEXT NOT NULL,
  player_name TEXT NOT NULL,
  total_damage INTEGER DEFAULT 0,
  flee_count INTEGER DEFAULT 0,
  intensity INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (npc_path, player_name)
);
CREATE INDEX idx_grudges_last_seen ON grudges (last_seen);

-- Bot personalities (per-bot files)
CREATE TABLE bots (
  bot_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emotes (soul daemon)
CREATE TABLE emotes (
  verb TEXT PRIMARY KEY,
  rules JSONB NOT NULL
);

-- Portraits metadata (binary data in Supabase Storage bucket)
CREATE TABLE portraits (
  cache_key TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  storage_path TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Object images metadata (binary data in Supabase Storage bucket)
CREATE TABLE object_images (
  cache_key TEXT NOT NULL,
  object_type TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/png',
  storage_path TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (object_type, cache_key)
);
CREATE INDEX idx_object_images_type ON object_images (object_type);

-- Generic game state (small singleton daemon configs)
CREATE TABLE game_state (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
