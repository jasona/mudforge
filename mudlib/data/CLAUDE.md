# mudlib/data/ - Persistent Data Storage

All data persisted via efun `writeFile()`/`readFile()` as JSON.

## Directory Structure

```
data/
├── players/        - Player character saves ({name}.json)
├── areas/          - World area definitions
├── config/         - Mud-wide configuration (settings.json)
├── lore/           - Lore entries and world history
├── bots/           - NPC bot configurations
├── announcements/  - Server announcements
├── images/         - Image asset metadata (JSON, not binary)
│   ├── armor/      - armor_{hash}.json
│   ├── item/       - item_{hash}.json
│   ├── weapon/     - weapon_{hash}.json
│   ├── misc/       - misc_{hash}.json
│   └── npc/        - NPC portrait metadata
└── portraits/      - Character portrait metadata ({hash}.json)
```

## Key Data Files

- `players/{name}.json` - Complete PlayerSaveData (stats, inventory, equipment, guilds, exploration, etc.)
- `config/settings.json` - Runtime configuration from ConfigDaemon
- `combat/grudges.json` - NPC aggro/grudge records (24h expiry)

## Important Notes

- Player data files contain sensitive information (password hashes, email)
- Image files are metadata JSON, not binary image data
- Hash-based filenames for deduplication
- Atomic writes (temp file + rename) prevent corruption
