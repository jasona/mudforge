# Area Builder Tool - Implementation Plan

## Overview
A comprehensive visual area building tool for builders, featuring:
- Multi-tab GUI with grid-based room layout editor
- AI-powered area generation wizard
- Central AreaDaemon for metadata, ownership, and draft storage
- Publish workflow to generate actual .ts files

---

## Phase 1: Foundation (Daemon + Data Types)

### 1.1 Create `mudlib/lib/area-types.ts`

```typescript
export type AreaStatus = 'draft' | 'review' | 'published';

export interface DraftRoom {
  id: string;
  shortDesc: string;
  longDesc: string;
  terrain: string;
  x: number; y: number; z: number;
  exits: Record<string, string>;  // direction -> target roomId
  npcs: string[];
  items: string[];
  mapIcon?: string;
}

export interface DraftNPC {
  id: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  level: number;
  health: number;
  chats?: Array<{ message: string; type: 'say' | 'emote' }>;
  aiContext?: NPCAIContext;
}

export interface AreaDefinition {
  id: string;              // "region:subregion"
  name: string;
  region: string;
  subregion: string;
  description: string;
  theme: string;
  owner: string;
  collaborators: string[];
  status: AreaStatus;
  gridSize: { width: number; height: number; depth: number };
  rooms: DraftRoom[];
  npcs: DraftNPC[];
  items: DraftItem[];
  loreReferences: string[];
  createdAt: number;
  updatedAt: number;
}
```

### 1.2 Create `mudlib/daemons/area.ts` - AreaDaemon

```typescript
export class AreaDaemon extends MudObject {
  private _areas: Map<string, AreaDefinition>;

  // CRUD
  createArea(builder: string, options: CreateAreaOptions): AreaDefinition;
  getArea(areaId: string): AreaDefinition | undefined;
  updateArea(areaId: string, updates: Partial<AreaDefinition>): boolean;
  deleteArea(areaId: string): boolean;

  // Ownership
  getAreasForBuilder(builder: string): AreaDefinition[];
  canBuilderAccess(builder: string, areaId: string): boolean;
  addCollaborator(areaId: string, collaborator: string): boolean;

  // Room management
  addRoom(areaId: string, room: DraftRoom): string;
  updateRoom(areaId: string, roomId: string, updates: Partial<DraftRoom>): boolean;
  deleteRoom(areaId: string, roomId: string): boolean;
  connectRooms(areaId: string, room1: string, dir: string, room2: string): boolean;

  // Persistence
  async load(): Promise<void>;  // from /data/areas/drafts.json
  async save(): Promise<void>;
}
```

### 1.3 Create `mudlib/cmds/builder/_areas.ts`

```
areas              - List your areas
areas new          - Open new area wizard (GUI)
areas edit <id>    - Open area editor (GUI)
areas delete <id>  - Delete draft area
areas publish <id> - Publish area to game
```

---

## Phase 2: Area Selector GUI

### 2.1 Create `mudlib/lib/area-builder-gui.ts`

**Area Selector Modal:**
- List of builder's areas with status badges (draft/published)
- Create New Area button → launches wizard
- Edit button → opens multi-tab editor
- Delete button with confirmation

**GUI Structure:**
```typescript
function buildAreaSelectorModal(areas: AreaDefinition[]): GUIOpenMessage {
  return {
    action: 'open',
    modal: { id: 'area-selector', title: 'Area Builder', size: 'large' },
    layout: {
      type: 'vertical',
      children: [
        // Area list as grid
        // Action buttons
      ]
    }
  };
}
```

---

## Phase 3: Multi-Tab Area Editor

### 3.1 Tab Structure

**Tab 1: Layout** - Visual grid editor
- ASCII/Unicode grid display (using `html` element for monospace)
- Click coordinates to add/select rooms
- Visual exit connections
- Z-level selector

**Tab 2: Rooms** - Room list and property editor
- Select room from list
- Edit: shortDesc, longDesc, terrain, exits
- AI Generate Description button
- Assign NPCs/Items

**Tab 3: NPCs** - NPC management
- Add/edit/delete NPCs
- Configure: name, descriptions, stats, dialogue
- AI Generate button

**Tab 4: Items** - Item management
- Add/edit/delete items
- Type-specific property editors

**Tab 5: Settings** - Area metadata
- Name, description, theme
- Lore references (multi-select from LoreDaemon)
- Collaborator management
- Validate & Publish buttons

### 3.2 Grid Rendering

```typescript
function renderGrid(area: AreaDefinition, selectedRoom?: string): string {
  // Build ASCII grid with room markers and exit lines
  // Example output:
  // ┌───┬───┬───┐
  // │ A │───│ B │
  // └───┴─│─┴───┘
  //       │
  // ┌───┬─│─┬───┐
  // │   │ C │   │
  // └───┴───┴───┘
}
```

---

## Phase 4: New Area Wizard (AI-Powered)

### 4.1 Wizard Steps

**Step 1: Basic Info**
- Area name, region, subregion, description

**Step 2: Theme & Style**
- Theme keywords (e.g., "dark, mysterious, underground")
- Lore references from LoreDaemon
- Mood selector

**Step 3: Layout Configuration**
- Grid size (width × height × depth)
- Layout style: Linear | Hub | Maze | Open
- Room count estimate

**Step 4: Features**
- Key locations checkboxes (entrance, boss room, treasure, etc.)
- NPC density slider
- Environmental hazards toggle

**Step 5: AI Generation Preview**
- Generate layout using AI + lore context
- Display preview grid
- Regenerate / Accept / Cancel

### 4.2 AI Generation

```typescript
async generateAreaLayout(options: WizardOptions): Promise<GeneratedLayout> {
  const loreContext = getLoreDaemon().buildContext(options.loreReferences, 1500);

  const prompt = `Generate a MUD area layout as JSON...
    Name: ${options.name}
    Theme: ${options.theme}
    Size: ${options.gridSize}
    Style: ${options.layoutStyle}

    WORLD LORE:
    ${loreContext}

    Return JSON: { rooms: [{ id, shortDesc, longDesc, x, y, z, exits, terrain }] }`;

  const result = await efuns.aiGenerate(prompt, undefined, {
    maxTokens: 2000,
    useContinuation: true
  });
  return parseGeneratedLayout(result.text);
}
```

---

## Phase 5: File Generation & Publishing

### 5.1 Create `mudlib/lib/area-generator.ts`

**Room File Template:**
```typescript
function generateRoomFile(area: AreaDefinition, room: DraftRoom): string {
  return `import { Room } from '../../../lib/std.js';

export class ${pascalCase(room.id)} extends Room {
  constructor() {
    super();
    this.shortDesc = '${room.shortDesc}';
    this.longDesc = \`${room.longDesc}\`;
    this.setMapCoordinates({ x: ${room.x}, y: ${room.y}, z: ${room.z}, area: '/areas/${area.region}/${area.subregion}' });
    this.setTerrain('${room.terrain}');
    this.setupRoom();
  }

  private setupRoom(): void {
    ${Object.entries(room.exits).map(([dir, target]) =>
      `this.addExit('${dir}', '/areas/${area.region}/${area.subregion}/${target}');`
    ).join('\n    ')}
  }
}

export default ${pascalCase(room.id)};`;
}
```

### 5.2 Publish Workflow

```typescript
async publishArea(areaId: string): Promise<PublishResult> {
  const area = this.getArea(areaId);
  const basePath = `/areas/${area.region}/${area.subregion}`;

  // 1. Create directory
  await efuns.makeDir(basePath, true);

  // 2. Generate room files
  for (const room of area.rooms) {
    await efuns.writeFile(`${basePath}/${room.id}.ts`, generateRoomFile(area, room));
  }

  // 3. Generate NPC files
  for (const npc of area.npcs) {
    await efuns.writeFile(`${basePath}/${npc.id}.ts`, generateNPCFile(area, npc));
  }

  // 4. Update status
  area.status = 'published';
  await this.save();

  return { success: true, path: basePath };
}
```

---

## File Structure

```
mudlib/
  daemons/
    area.ts              # AreaDaemon (central manager)
  lib/
    area-types.ts        # Type definitions
    area-builder-gui.ts  # GUI construction functions
    area-generator.ts    # File generation utilities
  cmds/
    builder/
      _areas.ts          # Main command (list, new, edit, publish)
  data/
    areas/
      drafts.json        # Draft area storage
```

---

## Implementation Order

1. **Phase 1**: area-types.ts, AreaDaemon, _areas command (CLI only)
2. **Phase 2**: Area selector GUI modal
3. **Phase 3**: Multi-tab editor with room list (no grid yet)
4. **Phase 4**: Visual grid editor with click-to-add
5. **Phase 5**: New area wizard with AI generation
6. **Phase 6**: File generation and publish workflow
7. **Phase 7**: Polish - validation, undo/redo, error handling

---

## Verification

1. **Daemon works**: `eval getAreaDaemon().createArea('test', {...})`
2. **GUI opens**: `areas new` shows wizard
3. **Grid edits**: Click adds rooms, exits connect
4. **AI generates**: Wizard produces reasonable layouts using lore
5. **Publish creates files**: Check `/areas/<region>/<subregion>/` for .ts files
6. **Published area loads**: Restart driver, verify rooms accessible

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `mudlib/daemons/lore.ts` | Daemon pattern with singleton, persistence |
| `mudlib/lib/gui-types.ts` | GUI type definitions |
| `mudlib/lib/quest-gui.ts` | Complex modal construction pattern |
| `mudlib/areas/valdoria/aldric/center.ts` | Room implementation example |
| `mudlib/cmds/builder/_aidescribe.ts` | AI + lore integration pattern |
