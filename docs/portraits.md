# Portrait System

The portrait system generates and caches AI-created images for NPCs, players, and items. Portraits appear in the engage dialogue panel, combat target display, and equipment sidebar.

## Overview

The portrait daemon (`mudlib/daemons/portrait.ts`) provides:

- AI image generation via `efuns.aiImageGenerate()` (Gemini)
- Three-tier caching: in-memory, disk, and HTTP serving
- Fallback SVG silhouettes when AI generation is unavailable
- Concurrency-limited generation (max 2 simultaneous API calls)
- Object image support for weapons, armor, containers, and other items

## API

### Singleton Access

```typescript
import { getPortraitDaemon } from '../daemons/portrait.js';

const daemon = getPortraitDaemon();
```

### Core Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getPortrait(target)` | `Promise<string>` | Get portrait as data URI or avatar ID |
| `getPortraitUrl(target)` | `Promise<string>` | Get HTTP URL if disk-cached, otherwise data URI |
| `getFallbackPortrait()` | `string` | Get fallback SVG silhouette data URI |
| `normalizeDataUri(uri)` | `string` | Strip ancillary PNG chunks to reduce size |
| `getObjectImage(obj, type, ctx?)` | `Promise<string>` | Get image for any MudObject |
| `getObjectImageUrl(obj, type, ctx?)` | `Promise<string>` | Get HTTP URL for object image |
| `getFallbackImage(type)` | `string` | Get type-appropriate fallback image |
| `cacheItemImage(item, type?)` | `Promise<void>` | Fire-and-forget image caching for equipped items |
| `clearCache()` | `void` | Clear the in-memory cache |
| `cacheSize` | `number` | Number of cached portraits |

### Object Image Types

```typescript
type ObjectImageType =
  | 'player'    // Player character portraits
  | 'npc'       // NPC portraits
  | 'pet'       // Pet/companion portraits
  | 'weapon'    // Weapon icons
  | 'armor'     // Armor piece icons
  | 'container' // Container icons (chest, bag)
  | 'item'      // Generic item icons
  | 'corpse'    // Corpse scene images
  | 'gold';     // Gold pile icons
```

## Caching Strategy

### Three-Tier Cache

1. **In-memory** (`Map<string, CachedPortrait>`) - Fastest, cleared on restart
2. **Disk** (JSON files in `mudlib/data/`) - Persistent across restarts
3. **HTTP** (`/api/images/` endpoints) - Client can load via `<img>` tag

### Cache Key Generation

Cache keys use FNV-1a hashing to create 16-character hex identifiers from object paths:

- **NPC portraits**: Hash of `{objectPath}_{engageKind}` stored at `/data/portraits/{hash}.json`
- **Object images**: Hash of object path, stored at `/data/images/{type}/{type}_{hash}.json`
- **Special objects**: Materials key by `materialId+quality`, resource nodes by `nodeDefinitionId+size`, pets by `templateType`, corpses by `ownerName`, gold by size category

### Deduplication

Concurrent requests for the same cache key are deduplicated via a pending-generation map. Only one API call is made even if multiple systems request the same portrait simultaneously.

## AI Generation

When no cached image exists and `efuns.aiImageAvailable()` returns true, the daemon generates a new image:

- **Prompt**: Built from the object's `longDesc`/`shortDesc` plus type-specific style requirements
- **Style**: Dark fantasy, painterly, 64x64 icon style, dramatic lighting
- **Format**: Square (1:1 aspect ratio)
- **Quality hints**: Legendary/epic/rare items get additional glow/aura style directives
- **Concurrency**: Limited to 2 simultaneous generations to prevent API flooding

### NPC Portrait Prompts

Two prompt variants based on `engageKind`:

- **humanoid**: Portrait/headshot focused on face and upper body
- **creature**: Full-body portrait emphasizing animal/beast form

### Object Image Prompts

Type-specific prompts for weapons, armor, containers, corpses, gold piles, and generic items. Each includes the object description and relevant context (damage type, armor slot, quality tier).

## Fallback Images

When AI generation is unavailable or fails:

- **Living beings** (player, NPC, pet): Dark silhouette SVG with question mark
- **Items** (weapon, armor, container, item, corpse, gold): Dark treasure chest SVG

Fallback images are pre-encoded as base64 SVGs for zero-latency display.

## HTTP Serving

Disk-cached images are served via HTTP endpoints:

| Endpoint | Description |
|----------|-------------|
| `/api/images/portrait/{hash}` | NPC portrait images |
| `/api/images/object/{hash}` | Object images (weapons, armor, etc.) |

The client can use `portraitUrl` from the engage message to load portraits via `<img>` tag instead of embedding the full data URI in the WebSocket payload.

## Size Constraints

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_ENGAGE_PORTRAIT_CHARS` | 2,400,000 | Max data URI size for engage panel |
| `MAX_COMBAT_PORTRAIT_CHARS` | 300,000 | Max portrait size in combat messages |
| `EQUIPMENT_IMAGE_CHUNK_CHARS` | 60,000 | Chunk size for equipment image streaming |

Oversized portraits are logged and replaced with the fallback silhouette.

## PNG Optimization

The daemon strips ancillary PNG chunks (non-critical metadata) from generated images to reduce payload size. This is done transparently via `normalizeDataUri()` and `normalizeEncodedImage()`.

## Key Source Files

- `mudlib/daemons/portrait.ts` - Portrait daemon implementation
- `src/client/npc-portraits.ts` - Client-side portrait rendering
- `src/client/engage-panel.ts` - Engage panel portrait display
- `mudlib/std/player.ts` - Equipment image caching

## Related Docs

- [Engage System](engage-system.md) - NPC dialogue overlay
- [Protocol Messages](client-gui-protocol-messages.md) - EQUIPMENT and COMBAT portrait payloads
- [NPC Creation Guide](npcs.md) - NPC `engageKind` property
