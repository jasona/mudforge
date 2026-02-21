/**
 * PromptManager - Centralized AI prompt template management.
 *
 * Holds all hardcoded default templates, loads overrides from
 * mudlib/data/config/ai-prompts.json, and provides get/render/set/reset/reload API.
 *
 * Follows the singleton pattern used by other driver subsystems.
 */

import { renderTemplate } from '../shared/prompt-template.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { getEfunBridge } from './efun-bridge.js';

/**
 * All default prompt templates, keyed by prompt ID.
 * These are extracted from formerly inline prompts across the codebase.
 */
const DEFAULT_TEMPLATES: Record<string, string> = {
  // === efun-bridge: aiGenerate ===
  'generate.system': 'You are a helpful assistant for a {{gameTheme}} MUD game. Generate creative, atmospheric content.',

  // === efun-bridge: aiDescribe ===
  'describe.system': `You are a creative writer for a {{gameTheme}} MUD (text-based RPG) game.
Generate descriptions for game content. {{styleGuide}}

IMPORTANT RULES:
- Short description: 3-8 words, lowercase, no period (e.g., "a dusty old tavern")
- Long description: 2-4 sentences, present tense, second person where appropriate
- Use color codes like {cyan}, {yellow}, {red}, {green}, {bold}, {/} for emphasis sparingly
- Never break character or mention being an AI`,

  'describe.user': `Generate a {{type}} description.
Name: {{name}}
{{#if keywords}}Keywords/Theme: {{keywords}}{{/if}}
{{#if theme}}Theme: {{theme}}{{/if}}
{{#if existing}}Existing description to enhance: {{existing}}{{/if}}

Respond in this exact JSON format:
{"shortDesc": "...", "longDesc": "..."}`,

  // === efun-bridge: aiNpcResponse ===
  'npc.dialogue.system': `You are {{npcName}}, an NPC in a {{gameTheme}} MUD game.

PERSONALITY: {{personality}}
BACKGROUND: {{background}}
{{#if currentMood}}CURRENT MOOD: {{currentMood}}{{/if}}

SPEAKING STYLE:
- {{formalityDesc}}
- {{verbosityDesc}}
{{#if accent}}- Speech pattern: {{accent}}{{/if}}

KNOWLEDGE:
- You can discuss: {{topics}}
{{#if forbidden}}- NEVER discuss or reveal information about: {{forbidden}}{{/if}}
{{#if localKnowledge}}- Local knowledge: {{localKnowledge}}{{/if}}
{{#if worldLoreContext}}
WORLD LORE (use this knowledge naturally in conversation):
{{worldLoreContext}}{{/if}}

RULES:
- Stay completely in character as {{npcName}}
- Never break the fourth wall or mention being an AI
- Respond as if you are actually this character in the game world
- IMPORTANT: Keep responses under {{maxWords}} words - this is a strict limit for game dialogue
- Do not use quotation marks around your speech
- End your response at a natural stopping point`,

  // === _aidescribe.ts ===
  'aidescribe.user': `Generate descriptions for {{typeDescription}} in a {{gameTheme}} MUD game.

Name: "{{name}}"
{{#if theme}}Theme/Keywords: {{theme}}{{/if}}

{{#if loreContext}}WORLD LORE (use for consistency):
{{loreContext}}

{{/if}}Respond with a JSON object:
{
  "shortDesc": "A brief 3-8 word description",
  "longDesc": "A 2-4 sentence atmospheric description"
}

Requirements:
- shortDesc should be concise and evocative
- longDesc should be immersive and detailed
- If world lore is provided, incorporate relevant details naturally
- Match the tone and style of the game world

Respond with ONLY the JSON object, no markdown.`,

  // === _ainpc.ts ===
  'npc.generation.user': `Generate an NPC for a {{gameTheme}} MUD game.

Name: "{{npcName}}"
Role: {{role}}
{{#if personalityHints}}Personality hints: {{personalityHints}}{{/if}}

{{#if loreContext}}WORLD LORE (use for consistency and incorporate into NPC's knowledge):
{{loreContext}}

{{/if}}Respond with a JSON object containing:
{
  "shortDesc": "Brief 3-8 word description starting with lowercase (e.g., 'a grizzled old fisherman')",
  "longDesc": "2-3 sentence description of their appearance and demeanor",
  "personality": "2-3 sentence summary of their personality for AI context",
  "background": "2-3 sentence backstory (can include secrets)",
  "chatMessages": [
    { "message": "Idle thing they might say", "type": "say" },
    { "message": "action they might do", "type": "emote" }
  ],
  "responses": [
    { "trigger": "hello|hi|greetings", "response": "Their greeting response" },
    { "trigger": "help|assist", "response": "How they respond to requests for help" },
    { "trigger": "bye|farewell|goodbye", "response": "Their farewell" }
  ],
  "speakingStyle": {
    "formality": "casual or formal or archaic",
    "verbosity": "terse or normal or verbose",
    "accent": "Optional speech pattern notes"
  },
  "topics": ["things they know about and will discuss"],
  "forbidden": ["things they won't discuss or are secret"],
  "localKnowledge": ["specific facts about their area, job, or situation"]
}

Requirements:
- shortDesc should start lowercase, suitable for "You see [shortDesc]"
- chatMessages should have 3-5 varied entries mixing say and emote
- responses should have triggers as regex-friendly patterns
- speakingStyle.formality must be exactly one of: casual, formal, archaic
- speakingStyle.verbosity must be exactly one of: terse, normal, verbose
- topics should reflect their role and knowledge
- forbidden should include things that would break character
- localKnowledge should be specific facts they know
- If world lore is provided, incorporate relevant details into background and localKnowledge

Respond with ONLY the JSON object, no markdown or explanation.`,

  // === _airoom.ts ===
  'room.generation.user': `Generate a room for a {{gameTheme}} MUD game.

Theme: "{{theme}}"
{{#if exits}}Exits: {{exits}}{{/if}}
{{#if noExits}}No specific exits required{{/if}}

{{#if loreContext}}WORLD LORE (use for consistency):
{{loreContext}}

{{/if}}Respond with a JSON object containing:
{
  "shortDesc": "A brief 3-8 word description (e.g., 'A dusty abandoned mine shaft')",
  "longDesc": "A 2-4 sentence atmospheric description of what players see when entering",
  "terrain": "One of: {{terrainTypes}}",
  "suggestedItems": ["2-4 items that could be found here"],
  "suggestedNpcs": ["1-2 NPCs that might inhabit this area, or empty array if uninhabited"],
  "ambiance": "A short atmospheric message that could randomly display (e.g., 'A cold draft whistles through the tunnel.')"
}

Requirements:
- shortDesc should NOT start with "A" or "The" - just describe the place
- longDesc should be immersive and evocative
- terrain must be exactly one of the listed types
- suggestedItems should fit the theme
- suggestedNpcs can be empty for uninhabited areas
- ambiance should be a single atmospheric sentence
- If world lore is provided, incorporate relevant details naturally

Respond with ONLY the JSON object, no markdown or explanation.`,

  // === area-builder-gui.ts: layout generation ===
  'area.layout.user': `Generate a room layout for a MUD game area as JSON.

AREA DETAILS:
- Name: "{{areaName}}"
- Region: {{region}}/{{subregion}}
- Description: {{description}}
- Theme: {{areaTheme}}
- Grid Size: {{width}}x{{height}} ({{depth}} floor(s))

{{#if loreContext}}WORLD LORE (for consistency):
{{loreContext}}

{{/if}}REQUIREMENTS:
1. Generate 5-15 rooms that form a connected layout
2. Rooms should be placed on valid grid coordinates (x: 0-{{maxX}}, y: 0-{{maxY}}, z: 0-{{maxZ}})
3. Rooms should be connected via exits (north/south/east/west/up/down)
4. One room should be marked as the entrance
5. Choose appropriate terrain types for each room
6. Room IDs should be lowercase with underscores

Valid terrain types: {{terrainTypes}}

Respond with ONLY a JSON array of rooms:
[
  {
    "id": "entrance",
    "shortDesc": "Dark Cave Entrance",
    "terrain": "cave",
    "x": 5, "y": 9, "z": 0,
    "isEntrance": true,
    "exits": { "north": "tunnel_01" }
  },
  ...
]`,

  // === area-builder-gui.ts: room description ===
  'area.room.user': `Generate a room description for a {{gameTheme}} MUD game.

ROOM: "{{roomShortDesc}}"
TERRAIN: {{terrain}}
AREA: {{areaName}} ({{areaTheme}})
{{#if neighbors}}EXITS: {{neighbors}}{{/if}}
{{#if isEntrance}}This is the area entrance.{{/if}}

{{#if loreContext}}WORLD LORE:
{{loreContext}}

{{/if}}Generate a JSON object with:
{
  "shortDesc": "Brief 3-8 word description",
  "longDesc": "2-4 atmospheric sentences describing what players see"
}

Requirements:
- Match the terrain type and area theme
- Be immersive and evocative
- longDesc should be second person ("You see...", "The air smells...")

Respond with ONLY the JSON object.`,

  // === area-builder-gui.ts: NPC description ===
  'area.npc.user': `Generate an NPC description for a {{gameTheme}} MUD game.

NPC: "{{npcName}}"
LEVEL: {{level}}
GENDER: {{gender}}
AREA: {{areaName}} ({{areaTheme}})

{{#if loreContext}}WORLD LORE:
{{loreContext}}

{{/if}}Generate a JSON object with:
{
  "shortDesc": "A brief phrase starting lowercase (e.g., 'a grizzled old warrior')",
  "longDesc": "2-3 sentences describing the NPC's appearance and demeanor"
}

Requirements:
- shortDesc starts lowercase, suitable for "You see [shortDesc] standing here"
- longDesc is detailed and atmospheric
- Match the NPC's level and area theme

Respond with ONLY the JSON object.`,

  // === area-builder-gui.ts: item description ===
  'area.item.user': `Generate an item description for a {{gameTheme}} MUD game.

ITEM: "{{itemName}}"
TYPE: {{itemType}}
VALUE: {{value}} gold
AREA: {{areaName}} ({{areaTheme}})

{{#if loreContext}}WORLD LORE:
{{loreContext}}

{{/if}}Generate a JSON object with:
{
  "shortDesc": "A brief description (e.g., 'a rusty iron sword')",
  "longDesc": "2-3 sentences describing the item when examined"
}

Requirements:
- shortDesc starts lowercase
- longDesc is detailed and atmospheric
- Match the item type and area theme

Respond with ONLY the JSON object.`,

  // === portrait.ts: creature portrait ===
  'portrait.creature': `Create a small square portrait icon for a {{gameTheme}} RPG creature or beast:

{{description}}

Style requirements:
- Dark {{gameTheme}} art style with rich, moody colors
- Portrait composition focused on the creature's face and body
- This is an animal or beast, not a humanoid character
- Do not depict a werewolf, person, or humanoid hybrid unless explicitly described
- Show the creature in its natural form
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`,

  // === portrait.ts: humanoid NPC portrait ===
  'portrait.humanoid': `Create a small square portrait icon for a {{gameTheme}} RPG game character:

{{description}}

Style requirements:
- Dark {{gameTheme}} art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`,

  // === portrait.ts: player portrait ===
  'portrait.player': `Create a small square portrait icon for a {{gameTheme}} RPG player character:

{{description}}{{#if raceSection}}{{raceSection}}{{/if}}

Style requirements:
- Dark {{gameTheme}} art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`,

  // === portrait.ts: NPC portrait (same as humanoid but separate ID for customization) ===
  'portrait.npc': `Create a small square portrait icon for a {{gameTheme}} RPG game character:

{{description}}

Style requirements:
- Dark {{gameTheme}} art style with rich, moody colors
- Portrait/headshot composition focused on face/upper body
- Dramatic lighting with shadows
- Painterly texture suitable for a game UI
- Should look like a character portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`,

  // === portrait.ts: pet portrait ===
  'portrait.pet': `Create a small square portrait icon for a {{gameTheme}} RPG pet/companion:

{{description}}

Style requirements:
- Dark {{gameTheme}} art style with rich, warm colors
- Portrait composition focused on the creature's face/body
- Friendly but noble appearance
- Dramatic lighting with soft shadows
- Painterly texture suitable for a game UI
- Should look like a companion portrait from a classic RPG game
- 64x64 pixel icon style, bold and recognizable
- The artwork must fill the entire canvas from edge to edge
- No borders, margins, or empty space around the subject`,

  // === portrait.ts: weapon icon ===
  'portrait.weapon': `Create a {{gameTheme}} RPG weapon icon:
{{description}}

Style: Dark {{gameTheme}}, painterly, dramatic lighting{{#if qualityStyle}}{{qualityStyle}}{{/if}}
{{#if weaponType}}Weapon type: {{weaponType}}{{/if}}
{{#if damageType}}Damage type: {{damageType}}{{/if}}
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`,

  // === portrait.ts: armor icon ===
  'portrait.armor': `Create a {{gameTheme}} RPG armor piece icon:
{{description}}

Style: Dark {{gameTheme}}, painterly, dramatic lighting{{#if qualityStyle}}{{qualityStyle}}{{/if}}
{{#if armorType}}Armor type: {{armorType}}{{/if}}
{{#if slot}}Slot: {{slot}}{{/if}}
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`,

  // === portrait.ts: container icon ===
  'portrait.container': `Create a {{gameTheme}} RPG container icon:
{{description}}

Style: Dark {{gameTheme}}, painterly
State: {{state}}
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`,

  // === portrait.ts: corpse icon ===
  'portrait.corpse': `Create a dark {{gameTheme}} RPG corpse scene:
{{description}}

Style: Dark {{gameTheme}}, grim, somber atmosphere
- Fallen body or remains on the ground
- Moody, dramatic lighting with shadows
- Painterly texture suitable for a game UI
Square composition on a dark background
No text, clean dramatic design
Fill entire canvas edge to edge, no borders or margins`,

  // === portrait.ts: gold icon ===
  'portrait.gold': `Create a {{gameTheme}} RPG gold coins icon:
{{description}}

Style: Dark {{gameTheme}}, painterly, warm golden glow
- Shiny gold coins with {{gameTheme}} designs
- Dramatic lighting making the gold gleam
- Treasure/loot aesthetic
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`,

  // === portrait.ts: generic item icon ===
  'portrait.item': `Create a {{gameTheme}} RPG item icon:
{{description}}

Style: Dark {{gameTheme}}, painterly, dramatic lighting{{#if qualityStyle}}{{qualityStyle}}{{/if}}
{{#if baubleType}}Item type: {{baubleType}}{{/if}}
Square composition, item icon style on a dark background
No text, clean iconic design
Fill entire canvas edge to edge, no borders or margins`,
};

export class PromptManager {
  private defaults: Record<string, string>;
  private overrides: Record<string, string> = {};
  private mudlibPath: string;

  constructor(mudlibPath: string) {
    this.defaults = { ...DEFAULT_TEMPLATES };
    this.mudlibPath = mudlibPath;
  }

  /**
   * Load overrides from the JSON file on disk.
   * Safe to call at any time; missing file is not an error.
   */
  async loadOverrides(): Promise<void> {
    try {
      const filePath = join(this.mudlibPath, 'data', 'config', 'ai-prompts.json');
      const content = await readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as Record<string, string>;
      this.overrides = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && key in this.defaults) {
          this.overrides[key] = value;
        }
      }
    } catch {
      // File doesn't exist or is invalid - use defaults only
      this.overrides = {};
    }
  }

  /**
   * Save current overrides to disk.
   */
  private async saveOverrides(): Promise<void> {
    const filePath = join(this.mudlibPath, 'data', 'config', 'ai-prompts.json');
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(this.overrides, null, 2), 'utf-8');
  }

  /**
   * Get the effective template for a prompt ID (override if set, else default).
   */
  get(id: string): string | undefined {
    return this.overrides[id] ?? this.defaults[id];
  }

  /**
   * Get the hardcoded default template for a prompt ID.
   */
  getDefault(id: string): string | undefined {
    return this.defaults[id];
  }

  /**
   * Get all registered prompt IDs.
   */
  getIds(): string[] {
    return Object.keys(this.defaults).sort();
  }

  /**
   * Check whether a prompt ID has an active override.
   */
  hasOverride(id: string): boolean {
    return id in this.overrides;
  }

  /**
   * Get the game theme from config, with "fantasy" as fallback.
   */
  private getGameTheme(): string {
    try {
      const bridge = getEfunBridge();
      return bridge.getMudConfig<string>('game.theme') ?? 'fantasy';
    } catch {
      return 'fantasy';
    }
  }

  /**
   * Render a prompt template with variables.
   * Auto-injects {{gameTheme}} from config unless explicitly provided.
   */
  render(id: string, vars: Record<string, string | undefined> = {}): string | undefined {
    const template = this.get(id);
    if (template === undefined) return undefined;
    // Auto-inject gameTheme from config if not explicitly provided
    if (!('gameTheme' in vars)) {
      vars = { ...vars, gameTheme: this.getGameTheme() };
    }
    return renderTemplate(template, vars);
  }

  /**
   * Set an override for a prompt template.
   */
  async set(id: string, template: string): Promise<{ success: boolean; error?: string }> {
    if (!(id in this.defaults)) {
      return { success: false, error: `Unknown prompt ID: ${id}` };
    }
    this.overrides[id] = template;
    try {
      await this.saveOverrides();
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to save: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Reset a prompt template to its default (remove override).
   */
  async reset(id: string): Promise<{ success: boolean; error?: string }> {
    if (!(id in this.defaults)) {
      return { success: false, error: `Unknown prompt ID: ${id}` };
    }
    if (!(id in this.overrides)) {
      return { success: true }; // Already at default
    }
    delete this.overrides[id];
    try {
      if (Object.keys(this.overrides).length === 0) {
        // Don't write an empty file - just let it be absent
        try {
          const { unlink } = await import('fs/promises');
          await unlink(join(this.mudlibPath, 'data', 'config', 'ai-prompts.json'));
        } catch {
          // File already absent
        }
      } else {
        await this.saveOverrides();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to save: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Reload overrides from disk.
   */
  async reload(): Promise<void> {
    await this.loadOverrides();
  }
}

// Singleton
let promptManager: PromptManager | null = null;

/**
 * Initialize the PromptManager singleton.
 * Called once during driver boot.
 */
export async function initializePromptManager(mudlibPath: string): Promise<PromptManager> {
  promptManager = new PromptManager(mudlibPath);
  await promptManager.loadOverrides();
  return promptManager;
}

/**
 * Get the PromptManager singleton.
 * Returns null if not yet initialized.
 */
export function getPromptManager(): PromptManager | null {
  return promptManager;
}

/**
 * Reset the PromptManager (for testing).
 */
export function resetPromptManager(): void {
  promptManager = null;
}
