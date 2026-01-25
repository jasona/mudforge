# Area Builder GUI

The Area Builder GUI is a comprehensive visual interface for creating and editing game areas (dungeons, towns, wilderness regions). It provides a multi-tab editor with advanced features including room layout visualization, NPC/item management, and AI-powered content generation.

## Getting Started

### Opening the Area Builder

```
areas gui
```

This opens the Area Selector modal showing all areas you own or collaborate on.

### Creating a New Area

1. Click **New Area** in the Area Selector
2. Fill in the required fields:
   - **Region**: Top-level category (e.g., `valdoria`)
   - **Subregion**: Specific area name (e.g., `dark_caves`)
   - **Area Name**: Display name (e.g., "The Dark Caves")
   - **Description**: Optional flavor text
   - **Theme Keywords**: Comma-separated keywords for AI generation (e.g., `dark, mysterious, underground`)
   - **Grid Size**: Width × Height × Depth (floors)
3. Click **Create Area**

The area ID is generated as `region:subregion` (e.g., `valdoria:dark_caves`).

## Editor Tabs

### Layout Tab

The Layout tab provides a visual grid representation of your area.

**Features:**
- ASCII grid showing all rooms on the current floor
- Room cells with exit connection indicators
- Floor selector for multi-level areas
- Click empty cell to create a room
- Click existing room to select it
- Double-click room to open editor

**Controls:**
- **Floor Select**: Switch between z-levels
- **+ Add Room**: Create room at selected position
- **AI Generate Layout**: Auto-generate room layout (only available for empty areas)

**Grid Legend:**
- Filled cells = rooms
- Exit circles on edges show connections
- Green highlight = entrance room
- Blue highlight = selected room

### Rooms Tab

The Rooms tab provides detailed room editing in a two-column layout.

**Left Panel - Room List:**
- Searchable list of all rooms
- Shows room ID, short description, terrain
- Entrance room highlighted in green

**Right Panel - Room Editor:**

| Field | Description |
|-------|-------------|
| Short Description | Brief name (3-8 words) |
| Long Description | Full multi-paragraph description |
| Terrain | Environment type (affects gameplay) |
| Coordinates | Grid position (X, Y, Z) |
| Is Entrance | Marks as area entry point |
| Map Icon | Optional POI override character |

**Exits Section:**
- Internal exits connect to rooms within the area
- External exits connect to other published areas
- Use the External Exit Picker for cross-area connections

**Room Assignment:**
- Assign NPCs to spawn in this room
- Assign items to appear in this room

**Actions:**
- **AI Describe**: Generate descriptions using AI
- **Save Room**: Commit changes
- **Delete Room**: Remove room (at bottom)

### NPCs Tab

The NPCs tab manages all non-player characters in the area.

**Basic NPC Fields:**
- Name, short/long descriptions
- Gender (male/female/neutral)
- Level and NPC type (normal/elite/boss/miniboss)
- Keywords for targeting

**Chat System:**
- Chat chance (0-100%)
- Random chats (things NPC says unprompted)
- Responses (replies to player input with regex patterns)

**Combat Configuration:**
- Base XP reward
- Gold drop (fixed or min-max range)
- Damage range
- Armor value
- Loot table with drop chances

**Advanced Options:**
- Wandering behavior
- Respawn time
- Quest associations
- Spawn items

**Specialized NPC Types:**

| Type | Additional Fields |
|------|-------------------|
| Merchant | Shop name, buy/sell rates, stock items |
| Trainer | Trainable stats, cost multiplier |
| Pet Merchant | Pet stock list |

### Items Tab

The Items tab manages all objects in the area.

**Basic Item Fields:**
- Name, descriptions, keywords
- Type (weapon/armor/container/consumable/key/quest/misc)
- Weight and gold value

**Type-Specific Properties:**

**Weapons:**
- Item level, damage range, damage type
- Handedness (one/two-handed)
- Attack speed modifier, accuracy bonus

**Armor:**
- Item level, armor value, equipment slot
- Size, dodge bonus, block bonus

**Containers:**
- Capacity (weight limit)

**Consumables:**
- Heal/mana amounts, potion tier

### Settings Tab

The Settings tab manages area metadata and publishing.

**Editable Fields:**
- Area name
- Description
- Theme keywords

**Read-Only Display:**
- Grid size
- Status and version

**Actions:**

| Button | Function |
|--------|----------|
| Validate Area | Check for errors before publishing |
| Publish Area | Generate TypeScript files |
| Force Republish All | Regenerate all files |

## Publishing Workflow

### Validation

Before publishing, the system validates:

**Errors (block publishing):**
- No rooms defined
- No entrance room marked
- Missing short/long descriptions
- Missing terrain type
- Invalid coordinates
- Broken exit references
- Invalid external exit paths

**Warnings (non-blocking):**
- Missing NPC descriptions
- Orphan rooms (unreachable)
- Invalid stat values

### Publishing Process

1. Click **Validate Area** to check for issues
2. Fix any errors shown
3. Click **Publish Area** (or **Republish** if already published)
4. System generates TypeScript files in `/areas/region/subregion/`
5. Restart driver or use `update` command to load changes

### Generated Files

```
/areas/region/subregion/
├── entrance.ts          # Room extending Room class
├── hallway.ts           # Additional rooms
├── guard.ts             # NPC extending NPC/Merchant/etc
├── sword.ts             # Item extending Weapon/Armor/etc
└── ...
```

## AI Features

AI features require `CLAUDE_API_KEY` in your `.env` file.

### AI Generate Layout

Available only for empty areas. Generates 5-15 connected rooms based on:
- Area name and description
- Theme keywords
- Grid dimensions
- World lore (if matching themes found)

### AI Describe

Available for rooms, NPCs, and items:
- **Single**: Click "AI Describe" on selected entity
- **Bulk**: Click "AI Generate All" to describe all entities

The AI considers:
- Entity type and properties
- Area theme and description
- Existing descriptions for consistency
- World lore context

## Import Functionality

Import existing TypeScript area files into the builder:

```
areas import /areas/region/subregion [options]
```

**Options:**
- `--preview`: Show what would import without saving
- `--force`: Overwrite existing draft
- `--name <name>`: Custom area name

**What Gets Imported:**
- Rooms with coordinates, terrain, exits
- NPCs with stats, chats, merchant configs
- Items with properties and stats
- Custom code blocks (preserved on republish)

**Auto-Layout:**
If rooms lack coordinates, the importer uses BFS from the entrance to assign positions based on exit directions.

## Collaboration

### Adding Collaborators

Only the area owner can add collaborators:

```
areas addcollab <area-id> <player-name>
```

### Collaborator Permissions

- **Owner**: Full access (edit, delete, publish, manage collaborators)
- **Collaborator**: Edit only (cannot delete or publish)

### Removing Collaborators

```
areas rmcollab <area-id> <player-name>
```

## Exit System

### Internal Exits

Connect rooms within the same area:
- Select direction dropdown
- Choose target room from list
- Bidirectional by default (north creates south return)

### External Exits

Connect to other published areas:
1. Click "Set External Exit" for a direction
2. Choose from:
   - Published areas browser
   - Draft areas browser
   - Manual path entry
3. Format: `/areas/region/subregion/room_id`

External exits take priority over internal exits if both are set for the same direction.

## Tips and Best Practices

1. **Start with Layout**: Use AI Generate Layout for quick prototyping, then refine
2. **Mark Entrance First**: Always set one room as the entrance before publishing
3. **Use Themes**: Good theme keywords improve AI-generated content
4. **Validate Often**: Check validation before major changes
5. **Incremental Publishing**: Only changed entities are regenerated
6. **Preserve Custom Code**: Imported custom methods survive republishing
7. **Test Externally**: Verify external exits work after both areas are published

## Command Reference

| Command | Description |
|---------|-------------|
| `areas gui` | Open Area Builder GUI |
| `areas list` | List your areas (CLI) |
| `areas import <path>` | Import existing area |
| `areas publish <id>` | Publish area (CLI) |
| `areas delete <id>` | Delete draft area |
| `areas addcollab <id> <player>` | Add collaborator |
| `areas rmcollab <id> <player>` | Remove collaborator |

## Troubleshooting

**"No entrance room marked"**
- Select a room and check "Is Entrance" checkbox

**"Invalid external exit path"**
- Paths must start with `/areas/`
- Target area must be published

**"Room coordinates outside grid"**
- Adjust coordinates or increase grid size in Settings

**AI features not working**
- Verify `CLAUDE_API_KEY` is set in `.env`
- Check `efuns.aiAvailable()` returns true
