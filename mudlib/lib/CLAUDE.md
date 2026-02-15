# mudlib/lib/ - Utility Library (36 files, ~700KB)

## GUI Modal Files (Server-Side)

These build modal configs sent to client via `\x00[GUI]<json>`:

- `area-builder-gui.ts` (6291 lines) - Area builder interface
- `area-importer.ts` (2327 lines) - Area data importer
- `look-modal.ts` (1523 lines) - Room/object examination
- `shop-modal.ts` (1364 lines) - Merchant shop transactions
- `stat-modal.ts` (1220 lines) - Character statistics
- `inventory-modal.ts` (1123 lines) - Player inventory management
- `score-modal.ts` (19K) - Character stats/score display
- `mercenary-modal.ts` (20K) - Mercenary hiring
- `who-modal.ts` (14K) - Player list
- `announcement-modal.ts` (10K) - Server announcements
- `quest-gui.ts` (9K) - Quest interface
- `snoop-modal.ts` (9K) - Admin snooping
- `setup-modal.ts` (8K) - Initial setup
- `giphy-modal.ts` (2K) - GIF selection

## Type Definition Files

- `gui-types.ts` (12K) - GUI message types
- `area-types.ts` (15K) - Area builder types
- `map-types.ts` (6K) - Map rendering types
- `shop-types.ts` (6K) - Shop transaction types
- `mercenary-types.ts` (5K) - Mercenary system types
- `sound-types.ts` (2K) - Audio system types
- `ai-types.ts` (3K) - AI integration types

## Utility Modules

- `colors.ts` (653 lines) - Color/text rendering with `{red}`, `{bold}`, etc.
- `std.ts` / `index.ts` - Barrel re-exports of std classes
- `path-utils.ts` - Object path utilities
- `player-config.ts` - Player configuration persistence
- `help-loader.ts` - Dynamic help system loading
- `pager.ts` (8K) - Text paging utility (for long output)
- `message-composer.ts` (7K) - Message formatting
- `text-utils.ts` - Text processing helpers
- `chat-colors.ts` - Chat color codes
- `item-utils.ts` - Item finding/parsing utilities
- `portrait-service.ts` - Character portrait service
- `permissions.ts` - Permission level constants
- `combat-events.ts` - Combat event types

## Import Pattern

Most mudlib code imports from `../../lib/std.js` to access base classes:
```typescript
import { Room, Item, NPC, Living, Weapon, Armor } from '../../lib/std.js';
```
