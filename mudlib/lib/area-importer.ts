/**
 * Area Importer - Imports existing published areas into the area builder.
 *
 * Parses TypeScript files from a published area directory and converts them
 * back into DraftRoom, DraftNPC, and DraftItem objects for editing in the GUI.
 *
 * Usage:
 *   const result = await importAreaFromPath('/areas/valdoria/aldric', {
 *     name: 'Town of Aldric',
 *     importerName: 'builder',
 *   });
 */

import type {
  AreaDefinition,
  DraftRoom,
  DraftNPC,
  DraftItem,
  NPCChat,
  NPCResponse,
  NPCCombatConfig,
  GridSize,
  CustomCodeBlock,
  MerchantConfig,
  MerchantStockItem,
  TrainerConfig,
  BaseStats,
  PetMerchantConfig,
  PetStockEntry,
  StatName,
} from './area-types.js';
import type { TerrainType } from './terrain.js';

/**
 * Entity types detected from file content.
 */
export type EntityType = 'room' | 'npc' | 'weapon' | 'armor' | 'item' | 'merchant' | 'container' | 'unknown';

/**
 * Result of importing an area.
 */
export interface ImportResult {
  success: boolean;
  error?: string;
  areaId?: string;
  stats: {
    roomsImported: number;
    npcsImported: number;
    itemsImported: number;
    filesSkipped: string[];
    parseErrors: Array<{ file: string; error: string }>;
  };
  warnings: string[];
}

/**
 * Options for importing an area.
 */
export interface ImportOptions {
  /** Custom area name (defaults to subregion name) */
  name?: string;
  /** Overwrite existing draft if present */
  force?: boolean;
  /** Just return stats without saving */
  preview?: boolean;
}

/**
 * Parsed file info before conversion to draft entities.
 */
interface ParsedFile {
  path: string;
  id: string;
  type: EntityType;
  content: string;
  customCode?: string;
}

/**
 * Direction offsets for auto-layout BFS.
 */
const DIRECTION_OFFSETS: Record<string, { dx: number; dy: number; dz: number }> = {
  north: { dx: 0, dy: -1, dz: 0 },
  south: { dx: 0, dy: 1, dz: 0 },
  east: { dx: 1, dy: 0, dz: 0 },
  west: { dx: -1, dy: 0, dz: 0 },
  northeast: { dx: 1, dy: -1, dz: 0 },
  northwest: { dx: -1, dy: -1, dz: 0 },
  southeast: { dx: 1, dy: 1, dz: 0 },
  southwest: { dx: -1, dy: 1, dz: 0 },
  up: { dx: 0, dy: 0, dz: 1 },
  down: { dx: 0, dy: 0, dz: -1 },
};

/**
 * Valid terrain types.
 */
const VALID_TERRAINS: TerrainType[] = [
  'town', 'road', 'grassland', 'forest', 'mountain', 'cave', 'dungeon',
  'water', 'swamp', 'desert', 'snow', 'beach', 'indoor', 'castle', 'temple',
];

/**
 * Detect entity type from file content by checking class inheritance.
 * Handles both direct base classes and common derived classes.
 */
export function detectEntityType(content: string): EntityType {
  // === Room types ===
  if (/extends\s+Room\b/.test(content)) {
    return 'room';
  }

  // === Merchant/Shop NPC types (check before NPC since they extend NPC) ===
  // Direct Merchant class
  if (/extends\s+Merchant\b/.test(content)) {
    return 'merchant';
  }
  // Derived merchant types
  if (/extends\s+PetMerchant\b/.test(content)) {
    return 'merchant';
  }

  // === NPC types ===
  if (/extends\s+NPC\b/.test(content)) {
    return 'npc';
  }
  // Derived NPC types
  if (/extends\s+Trainer\b/.test(content)) {
    return 'npc';
  }

  // === Weapon types ===
  if (/extends\s+Weapon\b/.test(content)) {
    return 'weapon';
  }

  // === Armor types ===
  if (/extends\s+Armor\b/.test(content)) {
    return 'armor';
  }

  // === Container types ===
  if (/extends\s+Container\b/.test(content)) {
    return 'container';
  }

  // === Consumable/Potion types ===
  if (/extends\s+HealingPotion\b/.test(content)) {
    return 'item'; // Will be marked as consumable type
  }
  if (/extends\s+ManaPotion\b/.test(content)) {
    return 'item';
  }
  if (/extends\s+Consumable\b/.test(content)) {
    return 'item';
  }
  if (/extends\s+Potion\b/.test(content)) {
    return 'item';
  }

  // === Base Item type ===
  if (/extends\s+Item\b/.test(content)) {
    return 'item';
  }

  // === Fallback: try to detect from code patterns ===
  // If it has setNPC, it's probably an NPC
  if (/this\.setNPC\s*\(/.test(content) || /\.setLevel\s*\(\d+\)/.test(content)) {
    return 'npc';
  }
  // If it has setWeapon, it's a weapon
  if (/this\.setWeapon\s*\(/.test(content)) {
    return 'weapon';
  }
  // If it has setArmor, it's armor
  if (/this\.setArmor\s*\(/.test(content)) {
    return 'armor';
  }
  // If it has setTerrain or addExit, it's a room
  if (/this\.setTerrain\s*\(/.test(content) || /this\.addExit\s*\(/.test(content)) {
    return 'room';
  }

  return 'unknown';
}

/**
 * Extract a string value from a pattern like: this.prop = 'value' or this.prop = `value`
 */
function extractStringValue(content: string, pattern: RegExp): string | undefined {
  const match = content.match(pattern);
  if (!match) return undefined;

  // Handle both single quotes, double quotes, and template literals
  const value = match[1];
  if (!value) return undefined;

  // Unescape common escape sequences
  return value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\`/g, '`')
    .replace(/\\\\/g, '\\');
}

/**
 * Extract a number value from a pattern.
 */
function extractNumberValue(content: string, pattern: RegExp): number | undefined {
  const match = content.match(pattern);
  if (!match || !match[1]) return undefined;
  const num = parseFloat(match[1]);
  return isNaN(num) ? undefined : num;
}

/**
 * Extract map coordinates from setMapCoordinates call.
 */
function extractMapCoordinates(content: string): { x: number; y: number; z: number; area?: string } | undefined {
  // Match: this.setMapCoordinates({ x: 1, y: 0, z: 0, area: '/areas/valdoria/aldric' })
  const match = content.match(/setMapCoordinates\s*\(\s*\{([^}]+)\}\s*\)/);
  if (!match) return undefined;

  const coordStr = match[1];
  const x = parseInt(coordStr.match(/x\s*:\s*(-?\d+)/)?.[1] ?? '', 10);
  const y = parseInt(coordStr.match(/y\s*:\s*(-?\d+)/)?.[1] ?? '', 10);
  const z = parseInt(coordStr.match(/z\s*:\s*(-?\d+)/)?.[1] ?? '', 10);
  const areaMatch = coordStr.match(/area\s*:\s*['"`]([^'"`]+)['"`]/);

  if (isNaN(x) || isNaN(y) || isNaN(z)) return undefined;

  return { x, y, z, area: areaMatch?.[1] };
}

/**
 * Extract terrain type from setTerrain call.
 */
function extractTerrain(content: string): TerrainType {
  const match = content.match(/setTerrain\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  if (match && VALID_TERRAINS.includes(match[1] as TerrainType)) {
    return match[1] as TerrainType;
  }
  return 'indoor'; // Default
}

/**
 * Extract map icon from mapIcon assignment.
 */
function extractMapIcon(content: string): string | undefined {
  const match = content.match(/(?:this\.)?(?:mapIcon|setMapIcon)\s*(?:=|(?:\s*\())\s*['"`]([^'"`]+)['"`]/);
  return match?.[1];
}

/**
 * Extract all addExit calls.
 */
function extractExits(content: string, areaPath: string): { exits: Record<string, string>; externalExits: Record<string, string> } {
  const exits: Record<string, string> = {};
  const externalExits: Record<string, string> = {};

  // Match: this.addExit('dir', '/path/to/room')
  const exitRegex = /addExit\s*\(\s*['"`](\w+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let match;

  while ((match = exitRegex.exec(content)) !== null) {
    const direction = match[1].toLowerCase();
    const path = match[2];

    // Check if it's within the same area
    if (path.startsWith(areaPath + '/')) {
      // Extract the room ID (last part of path)
      const roomId = path.substring(areaPath.length + 1);
      exits[direction] = roomId;
    } else {
      // External exit
      externalExits[direction] = path;
    }
  }

  return { exits, externalExits };
}

/**
 * Extract setNpcs array.
 */
function extractNpcsArray(content: string, areaPath: string): string[] {
  // Match: this.setNpcs(['/path1', '/path2'])
  const match = content.match(/setNpcs\s*\(\s*\[([^\]]*)\]\s*\)/);
  if (!match) return [];

  const arrayContent = match[1];
  const paths = arrayContent.match(/['"`]([^'"`]+)['"`]/g) ?? [];

  return paths.map(p => {
    const path = p.replace(/['"`]/g, '');
    // Convert to local ID if within area
    if (path.startsWith(areaPath + '/')) {
      return path.substring(areaPath.length + 1);
    }
    return path; // External reference
  });
}

/**
 * Extract setItems array.
 */
function extractItemsArray(content: string, areaPath: string): string[] {
  // Match: this.setItems(['/path1', '/path2'])
  const match = content.match(/setItems\s*\(\s*\[([^\]]*)\]\s*\)/);
  if (!match) return [];

  const arrayContent = match[1];
  const paths = arrayContent.match(/['"`]([^'"`]+)['"`]/g) ?? [];

  return paths.map(p => {
    const path = p.replace(/['"`]/g, '');
    // Convert to local ID if within area
    if (path.startsWith(areaPath + '/')) {
      return path.substring(areaPath.length + 1);
    }
    return path; // External reference
  });
}

/**
 * Extract simple addAction calls (verb, description, response format).
 */
function extractSimpleActions(content: string): Array<{ verb: string; description: string; response: string }> {
  const actions: Array<{ verb: string; description: string; response: string }> = [];

  // Match: this.addAction('verb', 'description', 'response')
  const actionRegex = /addAction\s*\(\s*['"`](\w+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let match;

  while ((match = actionRegex.exec(content)) !== null) {
    actions.push({
      verb: match[1],
      description: match[2],
      response: match[3],
    });
  }

  return actions;
}

/**
 * Extract isEntrance property.
 */
function extractIsEntrance(content: string): boolean {
  // Check for explicit isEntrance assignment or common entrance indicators
  if (/isEntrance\s*=\s*true/.test(content)) {
    return true;
  }
  // Check if the file/class name suggests entrance
  if (/class\s+\w*[Ee]ntrance\w*\s+extends/.test(content)) {
    return true;
  }
  return false;
}

/**
 * Extract custom code that couldn't be parsed.
 */
function extractCustomCode(content: string): string | undefined {
  const customParts: string[] = [];

  // Note: Merchant, Trainer, and PetMerchant configurations are now properly
  // extracted and stored in the draft system via subclass-specific fields.

  // Check for lifecycle methods
  if (/override\s+async\s+onCreate/.test(content)) {
    customParts.push('// Has custom onCreate() method');
  }
  if (/override\s+async\s+onEnter/.test(content)) {
    customParts.push('// Has custom onEnter() method');
  }
  if (/override\s+async\s+onLeave/.test(content)) {
    customParts.push('// Has custom onLeave() method');
  }

  // Check for complex action handlers (method-based)
  const methodBasedActions = content.match(/addAction\s*\(\s*['"`](\w+)['"`]\s*,\s*this\.\w+\.bind\(this\)\s*\)/g);
  if (methodBasedActions) {
    customParts.push(`// Has ${methodBasedActions.length} method-based action handlers`);
  }

  // Check for shop/merchant setup
  if (/addStock\s*\(/.test(content)) {
    customParts.push('// Has shop inventory setup (Merchant)');
  }
  if (/setMerchant\s*\(/.test(content)) {
    customParts.push('// Has merchant configuration');
  }
  if (/setPetMerchant\s*\(/.test(content)) {
    customParts.push('// Has pet merchant configuration');
  }
  if (/addPetStock\s*\(/.test(content)) {
    customParts.push('// Has pet stock setup');
  }

  // Check for aggressive setup
  if (/setAggressive\s*\(/.test(content)) {
    customParts.push('// Has aggression configuration');
  }

  // Check for stat overrides
  if (/setBaseStat\s*\(/.test(content)) {
    customParts.push('// Has custom stat assignments (setBaseStat)');
  }
  if (/setBaseStats\s*\(/.test(content)) {
    customParts.push('// Has custom stat assignments (setBaseStats)');
  }

  return customParts.length > 0 ? customParts.join('\n') : undefined;
}

/**
 * Standard imports that the GUI generates - these should not be captured as custom.
 */
const STANDARD_IMPORTS = [
  /from\s+['"]\.\.\/.*\/std\.js['"]/,
  /from\s+['"]\.\.\/.*\/std\/index\.js['"]/,
  /from\s+['"]\.\.\/lib\/std\.js['"]/,
];

/**
 * Standard Room property assignments that the GUI handles.
 */
const STANDARD_ROOM_PATTERNS = [
  /this\.shortDesc\s*=/,
  /this\.longDesc\s*=/,
  /this\.setMapCoordinates\s*\(/,
  /this\.setTerrain\s*\(/,
  /this\.mapIcon\s*=/,
  /this\.setMapIcon\s*\(/,
  /this\.addExit\s*\(/,
  /this\.setNpcs\s*\(/,
  /this\.setItems\s*\(/,
  /this\.addAction\s*\(/,
  /this\.isEntrance\s*=/,
  /this\.setupRoom\s*\(\)/,
  /super\s*\(\)/,
];

/**
 * Standard NPC property assignments that the GUI handles.
 */
const STANDARD_NPC_PATTERNS = [
  /this\.name\s*=/,
  /this\.shortDesc\s*=/,
  /this\.longDesc\s*=/,
  /this\.setNPC\s*\(/,
  /this\.setLevel\s*\(/,
  /this\.maxHealth\s*=/,
  /this\.health\s*=/,
  /this\.gender\s*=/,
  /this\.addId\s*\(/,
  /this\.setIds\s*\(/,
  /this\.keywords\s*=/,
  /this\.chatChance\s*=/,
  /this\.chats\s*=/,
  /this\.responses\s*=/,
  /this\.combatConfig\s*=/,
  /this\.wandering\s*=/,
  /this\.respawnTime\s*=/,
  /this\.questsOffered\s*=/,
  /this\.questsTurnedIn\s*=/,
  /this\.setQuestsOffered\s*\(/,
  /this\.setQuestsTurnedIn\s*\(/,
  /this\.setSpawnItems\s*\(/,
  /this\.items\s*=/,
  /this\.aiContext\s*=/,
  /this\.aiEnabled\s*=/,
  /this\.setAIContext\s*\(/,
  /super\s*\(\)/,
  // Merchant patterns
  /this\.setMerchant\s*\(/,
  /this\.addStock\s*\(/,
  /this\._shopName\s*=/,
  /this\._shopDescription\s*=/,
  /this\._buyRate\s*=/,
  /this\._sellRate\s*=/,
  /this\._shopGold\s*=/,
  /this\._acceptedTypes\s*=/,
  /this\._charismaEffect\s*=/,
  // Trainer patterns
  /this\.setTrainerConfig\s*\(/,
  /this\.setBaseStats\s*\(/,
  /this\._canTrainLevel\s*=/,
  /this\._trainableStats\s*=/,
  /this\._costMultiplier\s*=/,
  /this\._greeting\s*=/,
  // PetMerchant patterns
  /this\.setPetMerchant\s*\(/,
  /this\.addPetStock\s*\(/,
  /this\.setupPetStock\s*\(/,
];

/**
 * Standard Item property assignments that the GUI handles.
 */
const STANDARD_ITEM_PATTERNS = [
  /this\.shortDesc\s*=/,
  /this\.longDesc\s*=/,
  /this\.setWeapon\s*\(/,
  /this\.setArmor\s*\(/,
  /this\.addId\s*\(/,
  /this\.weight\s*=/,
  /this\.value\s*=/,
  /this\.damageType\s*=/,
  /this\.handedness\s*=/,
  /this\.setItemLevel\s*\(/,
  /this\.minDamage\s*=/,
  /this\.maxDamage\s*=/,
  /this\.toHit\s*=/,
  /this\.attackSpeed\s*=/,
  /this\.slot\s*=/,
  /this\.size\s*=/,
  /this\.armor\s*=/,
  /this\.toDodge\s*=/,
  /this\.toBlock\s*=/,
  /this\.capacity\s*=/,
  /super\s*\(\)/,
  /super\s*\(['"`]\w+['"`]\)/, // For potions: super('greater')
];

/**
 * Find matching brace for a given opening brace position.
 */
function findMatchingBrace(content: string, start: number): number {
  let depth = 1;
  let i = start + 1;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    i++;
  }
  return depth === 0 ? i - 1 : -1;
}

/**
 * Extract all methods from a class body.
 */
function extractMethods(content: string): Array<{ name: string; code: string; isConstructor: boolean }> {
  const methods: Array<{ name: string; code: string; isConstructor: boolean }> = [];

  // Find the class body
  const classMatch = content.match(/class\s+\w+\s+extends\s+\w+\s*\{/);
  if (!classMatch) return methods;

  const classStart = classMatch.index! + classMatch[0].length - 1;
  const classEnd = findMatchingBrace(content, classStart);
  if (classEnd < 0) return methods;

  const classBody = content.substring(classStart + 1, classEnd);

  // Match methods: [modifiers] methodName(...) [: returnType] { ... }
  // This regex finds method signatures
  const methodRegex = /(?:^|\n)\s*((?:private|public|protected|static|async|override)\s+)*(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/g;

  let match;
  while ((match = methodRegex.exec(classBody)) !== null) {
    const methodName = match[2];
    const methodStart = match.index + match[0].length - 1;
    const braceStart = classBody.indexOf('{', match.index + match[0].length - 1);

    if (braceStart < 0) continue;

    // Find the method's closing brace
    const methodEnd = findMatchingBrace(classBody, braceStart);
    if (methodEnd < 0) continue;

    // Extract the full method including signature
    const fullMethodStart = match.index;
    const fullMethodCode = classBody.substring(fullMethodStart, methodEnd + 1).trim();

    methods.push({
      name: methodName,
      code: fullMethodCode,
      isConstructor: methodName === 'constructor',
    });
  }

  return methods;
}

/**
 * Extract custom code blocks from file content.
 * Returns blocks that can be re-injected during publishing.
 */
function extractCustomCodeBlocks(
  content: string,
  entityType: 'room' | 'npc' | 'item',
): CustomCodeBlock[] {
  const blocks: CustomCodeBlock[] = [];
  let position = 0;

  // 1. Extract non-standard imports
  const importRegex = /^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
  let importMatch;
  while ((importMatch = importRegex.exec(content)) !== null) {
    const importLine = importMatch[0];
    // Check if it's a standard import
    const isStandard = STANDARD_IMPORTS.some(pattern => pattern.test(importLine));
    if (!isStandard) {
      blocks.push({
        type: 'import',
        name: importLine.match(/from\s+['"]([^'"]+)['"]/)?.[1] ?? 'unknown',
        code: importLine.trim(),
        position: position++,
      });
    }
  }

  // 2. Extract methods (except constructor)
  const methods = extractMethods(content);

  for (const method of methods) {
    if (method.isConstructor) {
      // For constructor, extract non-standard lines as constructor-tail
      const constructorBody = method.code;

      // Find the body content between braces
      const bodyStart = constructorBody.indexOf('{');
      const bodyEnd = constructorBody.lastIndexOf('}');
      if (bodyStart >= 0 && bodyEnd > bodyStart) {
        const body = constructorBody.substring(bodyStart + 1, bodyEnd);
        const lines = body.split('\n');

        // Determine which patterns to use based on entity type
        let standardPatterns: RegExp[];
        switch (entityType) {
          case 'room':
            standardPatterns = STANDARD_ROOM_PATTERNS;
            break;
          case 'npc':
            standardPatterns = STANDARD_NPC_PATTERNS;
            break;
          case 'item':
            standardPatterns = STANDARD_ITEM_PATTERNS;
            break;
        }

        // Collect non-standard lines, tracking nesting depth to avoid
        // capturing lines inside multi-line constructs like setMerchant({...})
        // or template literals like longDesc = `...`
        const customLines: string[] = [];
        let parenDepth = 0;
        let braceDepth = 0;
        let bracketDepth = 0;
        let inTemplateLiteral = false;
        let inMultiLineConstruct = false;

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === '') continue;

          // Count delimiters in this line (simple counting, doesn't handle strings perfectly)
          // Also track template literal backticks
          let i = 0;
          while (i < trimmedLine.length) {
            const char = trimmedLine[i];
            // Skip escaped characters
            if (char === '\\' && i + 1 < trimmedLine.length) {
              i += 2;
              continue;
            }
            if (char === '`') {
              inTemplateLiteral = !inTemplateLiteral;
            } else if (!inTemplateLiteral) {
              // Only count delimiters outside template literals
              if (char === '(') parenDepth++;
              else if (char === ')') parenDepth--;
              else if (char === '{') braceDepth++;
              else if (char === '}') braceDepth--;
              else if (char === '[') bracketDepth++;
              else if (char === ']') bracketDepth--;
            }
            i++;
          }

          // Check if this line matches any standard pattern
          const isStandard = standardPatterns.some(pattern => pattern.test(trimmedLine));

          // If we match a standard pattern, check if it starts a multi-line construct
          if (isStandard) {
            // If we have unclosed parens/braces/brackets or are in a template literal, we're in a multi-line construct
            if (parenDepth > 0 || braceDepth > 0 || bracketDepth > 0 || inTemplateLiteral) {
              inMultiLineConstruct = true;
            }
            continue;
          }

          // Skip lines that are inside a multi-line standard construct
          if (inMultiLineConstruct) {
            // Check if construct is closed
            if (parenDepth <= 0 && braceDepth <= 0 && bracketDepth <= 0 && !inTemplateLiteral) {
              inMultiLineConstruct = false;
              parenDepth = 0;
              braceDepth = 0;
              bracketDepth = 0;
            }
            continue;
          }

          // Also check for simple comments that are just formatting
          const isSimpleComment = /^\/\/\s*(Exits|NPCs|Items|Custom actions|Preserved custom|Shop inventory)?\s*$/.test(trimmedLine);

          // Skip lines that look like object property assignments (inside object literals)
          const isObjectProperty = /^\w+\s*:\s*.+[,}]?\s*$/.test(trimmedLine) && !trimmedLine.startsWith('this.');

          // Skip closing braces/brackets that are leftovers
          const isClosingDelimiter = /^[}\])\s,;]*$/.test(trimmedLine);

          if (!isSimpleComment && !isObjectProperty && !isClosingDelimiter) {
            customLines.push(line);
          }
        }

        if (customLines.length > 0) {
          // Remove leading/trailing empty lines and normalize indentation
          const customCode = customLines.join('\n').trim();
          if (customCode) {
            blocks.push({
              type: 'constructor-tail',
              code: customCode,
              position: position++,
            });
          }
        }
      }
    } else {
      // Non-constructor methods - preserve completely
      // The generator will filter out methods that would duplicate generated ones
      blocks.push({
        type: 'method',
        name: method.name,
        code: method.code,
        position: position++,
      });
    }
  }

  // 3. Extract class-level properties (outside constructor)
  // Look for property declarations like: private _foo: string = 'bar';
  const classMatch = content.match(/class\s+\w+\s+extends\s+\w+\s*\{/);
  if (classMatch) {
    const classStart = classMatch.index! + classMatch[0].length;
    const classEnd = findMatchingBrace(content, classStart - 1);
    if (classEnd > 0) {
      const classBody = content.substring(classStart, classEnd);

      // Find property declarations (lines that aren't methods)
      const propRegex = /(?:^|\n)\s*((?:private|public|protected|static|readonly)\s+)+(\w+)\s*(?::\s*[^=;]+)?(?:\s*=\s*[^;]+)?;/g;
      let propMatch;
      while ((propMatch = propRegex.exec(classBody)) !== null) {
        const propCode = propMatch[0].trim();
        const propName = propMatch[2];

        // Skip if it looks like a method (has parentheses after name)
        if (/\w+\s*\(/.test(propCode)) continue;

        blocks.push({
          type: 'property',
          name: propName,
          code: propCode,
          position: position++,
        });
      }
    }
  }

  return blocks;
}

/**
 * Parse a room file into a DraftRoom.
 */
function parseRoom(file: ParsedFile, areaPath: string): DraftRoom | null {
  const content = file.content;

  // Extract shortDesc
  let shortDesc = extractStringValue(content, /this\.shortDesc\s*=\s*['"`]([^'"`]+)['"`]/)
    ?? extractStringValue(content, /this\.shortDesc\s*=\s*`([^`]+)`/);

  // Strip color codes from shortDesc for cleaner data
  if (shortDesc) {
    shortDesc = shortDesc.replace(/\{[^}]+\}/g, '');
  }

  if (!shortDesc) {
    return null;
  }

  // Extract longDesc (handle template literals)
  let longDesc = '';
  const longDescMatch = content.match(/this\.longDesc\s*=\s*`([\s\S]*?)`\s*;/);
  if (longDescMatch) {
    longDesc = longDescMatch[1].replace(/\\`/g, '`');
  } else {
    const simpleLongDesc = extractStringValue(content, /this\.longDesc\s*=\s*['"]([^'"]+)['"]/);
    longDesc = simpleLongDesc ?? '';
  }

  // Extract coordinates
  const coords = extractMapCoordinates(content);
  const x = coords?.x ?? 0;
  const y = coords?.y ?? 0;
  const z = coords?.z ?? 0;

  // Extract terrain
  const terrain = extractTerrain(content);

  // Extract map icon
  const mapIcon = extractMapIcon(content);

  // Extract exits
  const { exits, externalExits } = extractExits(content, areaPath);

  // Extract NPCs and items
  const npcs = extractNpcsArray(content, areaPath);
  const items = extractItemsArray(content, areaPath);

  // Extract simple actions
  const actions = extractSimpleActions(content);

  // Extract isEntrance
  const isEntrance = extractIsEntrance(content);

  // Extract custom code
  const customCode = extractCustomCode(content);

  const room: DraftRoom = {
    id: file.id,
    shortDesc,
    longDesc,
    terrain,
    x,
    y,
    z,
    exits,
    npcs,
    items,
    updatedAt: Date.now(),
  };

  if (mapIcon) room.mapIcon = mapIcon;
  if (isEntrance) room.isEntrance = true;
  if (Object.keys(externalExits).length > 0) room.externalExits = externalExits;
  if (actions.length > 0) room.actions = actions;
  if (customCode) room.customCode = customCode;

  // Extract preservable custom code blocks
  const customCodeBlocks = extractCustomCodeBlocks(content, 'room');
  if (customCodeBlocks.length > 0) {
    room.customCodeBlocks = customCodeBlocks;
  }

  return room;
}

/**
 * Extract setNPC configuration object.
 */
function extractSetNPCConfig(content: string): Record<string, unknown> {
  // Match: this.setNPC({ ... })
  const match = content.match(/setNPC\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return {};

  const configStr = match[1];
  const config: Record<string, unknown> = {};

  // Extract simple string properties
  const stringProps = ['name', 'shortDesc', 'gender'];
  for (const prop of stringProps) {
    const propMatch = configStr.match(new RegExp(`${prop}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`));
    if (propMatch) {
      config[prop] = propMatch[1];
    }
  }

  // Extract longDesc (may be multi-line template literal)
  const longDescMatch = configStr.match(/longDesc\s*:\s*`([\s\S]*?)`/);
  if (longDescMatch) {
    config['longDesc'] = longDescMatch[1];
  } else {
    const simpleLongDesc = configStr.match(/longDesc\s*:\s*['"]([^'"]+)['"]/);
    if (simpleLongDesc) {
      config['longDesc'] = simpleLongDesc[1];
    }
  }

  // Extract number properties
  const numProps = ['chatChance', 'respawnTime', 'wanderChance'];
  for (const prop of numProps) {
    const propMatch = configStr.match(new RegExp(`${prop}\\s*:\\s*(\\d+)`));
    if (propMatch) {
      config[prop] = parseInt(propMatch[1], 10);
    }
  }

  // Extract boolean properties
  const boolProps = ['wandering', 'wanderAreaRestricted'];
  for (const prop of boolProps) {
    if (new RegExp(`${prop}\\s*:\\s*true`).test(configStr)) {
      config[prop] = true;
    } else if (new RegExp(`${prop}\\s*:\\s*false`).test(configStr)) {
      config[prop] = false;
    }
  }

  // Extract chats array
  const chatsMatch = configStr.match(/chats\s*:\s*\[([\s\S]*?)\]/);
  if (chatsMatch) {
    const chats: NPCChat[] = [];
    const chatRegex = /\{\s*message\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*type\s*:\s*['"`](\w+)['"`](?:\s*,\s*chance\s*:\s*(\d+))?\s*\}/g;
    let chatMatch;
    while ((chatMatch = chatRegex.exec(chatsMatch[1])) !== null) {
      const chat: NPCChat = {
        message: chatMatch[1],
        type: chatMatch[2] as 'say' | 'emote' | 'yell',
      };
      if (chatMatch[3]) {
        chat.chance = parseInt(chatMatch[3], 10);
      }
      chats.push(chat);
    }
    if (chats.length > 0) {
      config['chats'] = chats;
    }
  }

  // Extract lootTable
  const lootMatch = configStr.match(/lootTable\s*:\s*\[([\s\S]*?)\]/);
  if (lootMatch) {
    const lootItems: Array<{ itemPath: string; chance: number }> = [];
    const lootRegex = /\{\s*itemPath\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*chance\s*:\s*(\d+)\s*\}/g;
    let lootItem;
    while ((lootItem = lootRegex.exec(lootMatch[1])) !== null) {
      lootItems.push({
        itemPath: lootItem[1],
        chance: parseInt(lootItem[2], 10),
      });
    }
    if (lootItems.length > 0) {
      config['lootTable'] = lootItems;
    }
  }

  return config;
}

/**
 * Extract addId calls.
 */
function extractKeywords(content: string): string[] {
  const keywords: string[] = [];

  // Match: this.addId('keyword')
  const addIdRegex = /addId\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let match;
  while ((match = addIdRegex.exec(content)) !== null) {
    keywords.push(match[1]);
  }

  // Match: this.setIds(['keyword1', 'keyword2'])
  const setIdsMatch = content.match(/setIds\s*\(\s*\[([^\]]+)\]\s*\)/);
  if (setIdsMatch) {
    const idsStr = setIdsMatch[1];
    const ids = idsStr.match(/['"`]([^'"`]+)['"`]/g);
    if (ids) {
      for (const id of ids) {
        keywords.push(id.replace(/['"`]/g, ''));
      }
    }
  }

  return keywords;
}

/**
 * Extract setLevel call.
 */
function extractLevel(content: string): { level: number; npcType?: string } {
  // Match: this.setLevel(5) or this.setLevel(5, 'boss')
  const match = content.match(/setLevel\s*\(\s*(\d+)(?:\s*,\s*['"`](\w+)['"`])?\s*\)/);
  if (match) {
    return {
      level: parseInt(match[1], 10),
      npcType: match[2],
    };
  }
  return { level: 1 };
}

/**
 * Extract addChat calls.
 */
function extractChats(content: string): NPCChat[] {
  const chats: NPCChat[] = [];

  // Match: this.addChat('message', 'type')
  const chatRegex = /addChat\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`](\w+)['"`](?:\s*,\s*(\d+))?\s*\)/g;
  let match;
  while ((match = chatRegex.exec(content)) !== null) {
    const chat: NPCChat = {
      message: match[1],
      type: match[2] as 'say' | 'emote' | 'yell',
    };
    if (match[3]) {
      chat.chance = parseInt(match[3], 10);
    }
    chats.push(chat);
  }

  return chats;
}

/**
 * Extract addResponse calls.
 */
function extractResponses(content: string): NPCResponse[] {
  const responses: NPCResponse[] = [];

  // Match: this.addResponse(/pattern/i, 'response', 'type')
  // or: this.addResponse(/pattern/i, (speaker) => `response`, 'type')
  const responseRegex = /addResponse\s*\(\s*\/([^/]+)\/\w*\s*,\s*(?:['"`]([^'"`]+)['"`]|\([^)]*\)\s*=>\s*(?:['"`]([^'"`]+)['"`]|`([^`]+)`))\s*,\s*['"`](\w+)['"`]\s*\)/g;
  let match;
  while ((match = responseRegex.exec(content)) !== null) {
    const pattern = match[1];
    const response = match[2] || match[3] || match[4] || '';
    const type = match[5] as 'say' | 'emote';
    responses.push({ pattern, response, type });
  }

  return responses;
}

/**
 * Extract combatConfig.
 */
function extractCombatConfig(content: string): NPCCombatConfig | undefined {
  // Match: this.combatConfig = { ... }
  const match = content.match(/combatConfig\s*=\s*\{([^}]+)\}/);
  if (!match) return undefined;

  const configStr = match[1];
  const config: NPCCombatConfig = { baseXP: 0 };

  const baseXP = configStr.match(/baseXP\s*:\s*(\d+)/);
  if (baseXP) config.baseXP = parseInt(baseXP[1], 10);

  const gold = configStr.match(/gold\s*:\s*(\d+)/);
  if (gold) config.gold = parseInt(gold[1], 10);

  const goldDrop = configStr.match(/goldDrop\s*:\s*\{\s*min\s*:\s*(\d+)\s*,\s*max\s*:\s*(\d+)\s*\}/);
  if (goldDrop) {
    config.goldDrop = {
      min: parseInt(goldDrop[1], 10),
      max: parseInt(goldDrop[2], 10),
    };
  }

  const damage = configStr.match(/damage\s*:\s*\{\s*min\s*:\s*(\d+)\s*,\s*max\s*:\s*(\d+)\s*\}/);
  if (damage) {
    config.damage = {
      min: parseInt(damage[1], 10),
      max: parseInt(damage[2], 10),
    };
  }

  const armor = configStr.match(/armor\s*:\s*(\d+)/);
  if (armor) config.armor = parseInt(armor[1], 10);

  return config.baseXP > 0 || config.gold || config.goldDrop || config.damage || config.armor ? config : undefined;
}

/**
 * Extract quest-related arrays.
 */
function extractQuestArrays(content: string): { questsOffered?: string[]; questsTurnedIn?: string[] } {
  const result: { questsOffered?: string[]; questsTurnedIn?: string[] } = {};

  // Match: this.setQuestsOffered(['quest1', 'quest2'])
  const offeredMatch = content.match(/setQuestsOffered\s*\(\s*\[([^\]]*)\]\s*\)/);
  if (offeredMatch) {
    const quests = offeredMatch[1].match(/['"`]([^'"`]+)['"`]/g);
    if (quests) {
      result.questsOffered = quests.map(q => q.replace(/['"`]/g, ''));
    }
  }

  // Match: this.setQuestsTurnedIn(['quest1', 'quest2'])
  const turnedInMatch = content.match(/setQuestsTurnedIn\s*\(\s*\[([^\]]*)\]\s*\)/);
  if (turnedInMatch) {
    const quests = turnedInMatch[1].match(/['"`]([^'"`]+)['"`]/g);
    if (quests) {
      result.questsTurnedIn = quests.map(q => q.replace(/['"`]/g, ''));
    }
  }

  return result;
}

/**
 * Extract setMerchant configuration from content.
 */
function extractMerchantConfig(content: string): MerchantConfig | null {
  const match = content.match(/setMerchant\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return null;

  const configStr = match[1];
  const config: MerchantConfig = {
    shopName: 'Shop',
    buyRate: 0.5,
    sellRate: 1.0,
    shopGold: 1000,
  };

  // Extract string properties
  const shopNameMatch = configStr.match(/shopName\s*:\s*['"`]([^'"`]+)['"`]/);
  if (shopNameMatch) config.shopName = shopNameMatch[1];

  const shopDescMatch = configStr.match(/shopDescription\s*:\s*['"`]([^'"`]+)['"`]/);
  if (shopDescMatch) config.shopDescription = shopDescMatch[1];

  // Extract number properties
  const buyRateMatch = configStr.match(/buyRate\s*:\s*([\d.]+)/);
  if (buyRateMatch) config.buyRate = parseFloat(buyRateMatch[1]);

  const sellRateMatch = configStr.match(/sellRate\s*:\s*([\d.]+)/);
  if (sellRateMatch) config.sellRate = parseFloat(sellRateMatch[1]);

  const shopGoldMatch = configStr.match(/shopGold\s*:\s*(\d+)/);
  if (shopGoldMatch) config.shopGold = parseInt(shopGoldMatch[1], 10);

  const charismaMatch = configStr.match(/charismaEffect\s*:\s*([\d.]+)/);
  if (charismaMatch) config.charismaEffect = parseFloat(charismaMatch[1]);

  // Extract acceptedTypes array
  const typesMatch = configStr.match(/acceptedTypes\s*:\s*\[([^\]]*)\]/);
  if (typesMatch) {
    const types = typesMatch[1].match(/['"`]([^'"`]+)['"`]/g);
    if (types) {
      config.acceptedTypes = types.map(t => t.replace(/['"`]/g, ''));
    }
  }

  // Extract restockEnabled
  if (/restockEnabled\s*:\s*true/.test(configStr)) {
    config.restockEnabled = true;
  }

  return config;
}

/**
 * Extract addStock calls from merchant content.
 */
function extractMerchantStock(content: string): MerchantStockItem[] {
  const items: MerchantStockItem[] = [];

  // Match: this.addStock('/path', 'Name', price, quantity, 'category');
  const stockRegex = /this\.addStock\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*,\s*(\d+)\s*,\s*(-?\d+)\s*(?:,\s*['"`]([^'"`]+)['"`])?\s*\)/g;

  let match;
  while ((match = stockRegex.exec(content)) !== null) {
    items.push({
      itemPath: match[1],
      name: match[2],
      price: parseInt(match[3], 10),
      quantity: parseInt(match[4], 10),
      category: match[5],
    });
  }

  return items;
}

/**
 * Extract setTrainerConfig configuration from content.
 */
function extractTrainerConfig(content: string): TrainerConfig | null {
  const match = content.match(/setTrainerConfig\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return null;

  const configStr = match[1];
  const config: TrainerConfig = {};

  // Extract canTrainLevel
  if (/canTrainLevel\s*:\s*true/.test(configStr)) {
    config.canTrainLevel = true;
  } else if (/canTrainLevel\s*:\s*false/.test(configStr)) {
    config.canTrainLevel = false;
  }

  // Extract costMultiplier
  const costMatch = configStr.match(/costMultiplier\s*:\s*([\d.]+)/);
  if (costMatch) config.costMultiplier = parseFloat(costMatch[1]);

  // Extract greeting
  const greetingMatch = configStr.match(/greeting\s*:\s*['"`]([^'"`]+)['"`]/);
  if (greetingMatch) config.greeting = greetingMatch[1];

  // Extract trainableStats array
  const statsMatch = configStr.match(/trainableStats\s*:\s*\[([^\]]*)\]/);
  if (statsMatch) {
    const stats = statsMatch[1].match(/['"`]([^'"`]+)['"`]/g);
    if (stats) {
      config.trainableStats = stats.map(s => s.replace(/['"`]/g, '')) as StatName[];
    }
  }

  return config;
}

/**
 * Extract setBaseStats configuration from content.
 */
function extractBaseStats(content: string): BaseStats | null {
  const match = content.match(/setBaseStats\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return null;

  const configStr = match[1];
  const stats: BaseStats = {};

  const statNames: (keyof BaseStats)[] = ['strength', 'intelligence', 'wisdom', 'charisma', 'dexterity', 'constitution', 'luck'];
  for (const stat of statNames) {
    const statMatch = configStr.match(new RegExp(`${stat}\\s*:\\s*(\\d+)`));
    if (statMatch) {
      stats[stat] = parseInt(statMatch[1], 10);
    }
  }

  return Object.keys(stats).length > 0 ? stats : null;
}

/**
 * Extract setPetMerchant configuration from content.
 */
function extractPetMerchantConfig(content: string): PetMerchantConfig | null {
  const match = content.match(/setPetMerchant\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return null;

  const configStr = match[1];
  const config: PetMerchantConfig = {
    shopName: 'Pet Shop',
  };

  // Extract string properties
  const shopNameMatch = configStr.match(/shopName\s*:\s*['"`]([^'"`]+)['"`]/);
  if (shopNameMatch) config.shopName = shopNameMatch[1];

  const shopDescMatch = configStr.match(/shopDescription\s*:\s*['"`]([^'"`]+)['"`]/);
  if (shopDescMatch) config.shopDescription = shopDescMatch[1];

  return config;
}

/**
 * Extract addPetStock calls from pet merchant content.
 */
function extractPetStock(content: string): PetStockEntry[] {
  const items: PetStockEntry[] = [];

  // Match: this.addPetStock('type', template, priceOverride, 'description');
  // This is simplified - templates are usually from petDaemon
  const stockRegex = /this\.addPetStock\s*\(\s*['"`]([^'"`]+)['"`]/g;

  let match;
  while ((match = stockRegex.exec(content)) !== null) {
    items.push({
      type: match[1],
    });
  }

  return items;
}

/**
 * Parse an NPC file into a DraftNPC.
 */
function parseNPC(file: ParsedFile, areaPath: string): DraftNPC | null {
  const content = file.content;

  // Try to extract from setNPC config first
  const npcConfig = extractSetNPCConfig(content);

  // Extract name (from setNPC or direct assignment)
  let name = npcConfig['name'] as string | undefined;
  if (!name) {
    name = extractStringValue(content, /this\.name\s*=\s*['"`]([^'"`]+)['"`]/);
  }
  if (!name) {
    // Use file id as fallback
    name = file.id.replace(/_/g, ' ');
  }

  // Extract shortDesc
  let shortDesc = npcConfig['shortDesc'] as string | undefined;
  if (!shortDesc) {
    shortDesc = extractStringValue(content, /this\.shortDesc\s*=\s*['"`]([^'"`]+)['"`]/);
  }
  if (!shortDesc) shortDesc = name;

  // Extract longDesc
  let longDesc = npcConfig['longDesc'] as string | undefined;
  if (!longDesc) {
    const longDescMatch = content.match(/this\.longDesc\s*=\s*`([\s\S]*?)`\s*;/);
    if (longDescMatch) {
      longDesc = longDescMatch[1];
    }
  }
  if (!longDesc) longDesc = '';

  // Extract level and type
  const { level, npcType } = extractLevel(content);

  // Extract maxHealth
  let maxHealth = extractNumberValue(content, /this\.maxHealth\s*=\s*(\d+)/);
  if (!maxHealth) {
    // Calculate from level using auto-balance formula
    const multipliers: Record<string, number> = { normal: 1.0, miniboss: 1.5, elite: 2.0, boss: 3.0 };
    const mult = multipliers[npcType ?? 'normal'] ?? 1.0;
    maxHealth = Math.round((50 + level * 15) * mult);
  }

  // Extract health (default to maxHealth)
  const health = extractNumberValue(content, /this\.health\s*=\s*(\d+)/) ?? maxHealth;

  // Extract gender
  let gender = npcConfig['gender'] as 'male' | 'female' | 'neutral' | undefined;
  if (!gender) {
    const genderMatch = content.match(/this\.gender\s*=\s*['"`](\w+)['"`]/);
    if (genderMatch && ['male', 'female', 'neutral'].includes(genderMatch[1])) {
      gender = genderMatch[1] as 'male' | 'female' | 'neutral';
    }
  }

  // Extract keywords
  const keywords = extractKeywords(content);

  // Extract chatChance
  const chatChance = (npcConfig['chatChance'] as number | undefined)
    ?? extractNumberValue(content, /this\.chatChance\s*=\s*(\d+)/);

  // Extract chats (from setNPC or addChat calls)
  let chats = npcConfig['chats'] as NPCChat[] | undefined;
  if (!chats || chats.length === 0) {
    chats = extractChats(content);
  }

  // Extract responses
  const responses = extractResponses(content);

  // Extract combat config
  const combatConfig = extractCombatConfig(content);

  // Extract loot table and convert to combat config format
  const lootTable = npcConfig['lootTable'] as Array<{ itemPath: string; chance: number }> | undefined;
  if (lootTable && lootTable.length > 0 && !combatConfig?.lootTable) {
    const cc = combatConfig ?? { baseXP: level * 10 };
    cc.lootTable = lootTable.map(l => ({
      itemId: l.itemPath,
      chance: l.chance,
    }));
  }

  // Extract wandering
  const wandering = (npcConfig['wandering'] as boolean | undefined)
    ?? /this\.wandering\s*=\s*true/.test(content);

  // Extract respawnTime
  const respawnTime = (npcConfig['respawnTime'] as number | undefined)
    ?? extractNumberValue(content, /this\.respawnTime\s*=\s*(\d+)/);

  // Extract quests
  const { questsOffered, questsTurnedIn } = extractQuestArrays(content);

  // Extract custom code
  const customCode = extractCustomCode(content);

  const npc: DraftNPC = {
    id: file.id,
    name,
    shortDesc,
    longDesc,
    level,
    maxHealth,
    health,
    updatedAt: Date.now(),
  };

  if (npcType) npc.npcType = npcType as 'normal' | 'elite' | 'boss' | 'miniboss';
  if (gender) npc.gender = gender;
  if (keywords.length > 0) npc.keywords = keywords;
  if (chatChance !== undefined) npc.chatChance = chatChance;
  if (chats && chats.length > 0) npc.chats = chats;
  if (responses.length > 0) npc.responses = responses;
  if (combatConfig) npc.combatConfig = combatConfig;
  if (wandering) npc.wandering = wandering;
  if (respawnTime !== undefined) npc.respawnTime = respawnTime;
  if (questsOffered) npc.questsOffered = questsOffered;
  if (questsTurnedIn) npc.questsTurnedIn = questsTurnedIn;
  if (customCode) npc.customCode = customCode;

  // Detect NPC subclass and extract configuration
  if (/extends\s+Merchant\b/.test(content) || /setMerchant\s*\(/.test(content)) {
    npc.subclass = 'merchant';
    const merchantConfig = extractMerchantConfig(content);
    if (merchantConfig) npc.merchantConfig = merchantConfig;
    const merchantStock = extractMerchantStock(content);
    if (merchantStock.length > 0) npc.merchantStock = merchantStock;
  } else if (/extends\s+Trainer\b/.test(content) || /setTrainerConfig\s*\(/.test(content)) {
    npc.subclass = 'trainer';
    const trainerConfig = extractTrainerConfig(content);
    if (trainerConfig) npc.trainerConfig = trainerConfig;
    const baseStats = extractBaseStats(content);
    if (baseStats) npc.baseStats = baseStats;
  } else if (/extends\s+PetMerchant\b/.test(content) || /setPetMerchant\s*\(/.test(content)) {
    npc.subclass = 'petMerchant';
    const petMerchantConfig = extractPetMerchantConfig(content);
    if (petMerchantConfig) npc.petMerchantConfig = petMerchantConfig;
    const petStock = extractPetStock(content);
    if (petStock.length > 0) npc.petStock = petStock;
  } else {
    npc.subclass = 'npc';
  }

  // Extract preservable custom code blocks
  const customCodeBlocks = extractCustomCodeBlocks(content, 'npc');
  if (customCodeBlocks.length > 0) {
    npc.customCodeBlocks = customCodeBlocks;
  }

  return npc;
}

/**
 * Extract setWeapon configuration.
 */
function extractWeaponConfig(content: string): Record<string, unknown> {
  const match = content.match(/setWeapon\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return {};

  const configStr = match[1];
  const config: Record<string, unknown> = {};

  // String properties
  const stringProps = ['shortDesc', 'damageType', 'handedness', 'size'];
  for (const prop of stringProps) {
    const propMatch = configStr.match(new RegExp(`${prop}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`));
    if (propMatch) {
      config[prop] = propMatch[1];
    }
  }

  // longDesc (may be multi-line)
  const longDescMatch = configStr.match(/longDesc\s*:\s*`([\s\S]*?)`/);
  if (longDescMatch) {
    config['longDesc'] = longDescMatch[1];
  }

  // Number properties
  const numProps = ['itemLevel', 'minDamage', 'maxDamage', 'toHit', 'attackSpeed'];
  for (const prop of numProps) {
    const propMatch = configStr.match(new RegExp(`${prop}\\s*:\\s*(-?[\\d.]+)`));
    if (propMatch) {
      config[prop] = parseFloat(propMatch[1]);
    }
  }

  return config;
}

/**
 * Extract setArmor configuration.
 */
function extractArmorConfig(content: string): Record<string, unknown> {
  const match = content.match(/setArmor\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!match) return {};

  const configStr = match[1];
  const config: Record<string, unknown> = {};

  // String properties
  const stringProps = ['shortDesc', 'slot', 'size'];
  for (const prop of stringProps) {
    const propMatch = configStr.match(new RegExp(`${prop}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`));
    if (propMatch) {
      config[prop] = propMatch[1];
    }
  }

  // longDesc (may be multi-line)
  const longDescMatch = configStr.match(/longDesc\s*:\s*`([\s\S]*?)`/);
  if (longDescMatch) {
    config['longDesc'] = longDescMatch[1];
  }

  // Number properties
  const numProps = ['itemLevel', 'armor', 'toDodge', 'toBlock', 'weight'];
  for (const prop of numProps) {
    const propMatch = configStr.match(new RegExp(`${prop}\\s*:\\s*(-?[\\d.]+)`));
    if (propMatch) {
      config[prop] = parseFloat(propMatch[1]);
    }
  }

  return config;
}

/**
 * Parse a weapon file into a DraftItem.
 */
function parseWeapon(file: ParsedFile): DraftItem | null {
  const content = file.content;
  const config = extractWeaponConfig(content);

  const shortDesc = (config['shortDesc'] as string) ?? file.id.replace(/_/g, ' ');

  let longDesc = config['longDesc'] as string | undefined;
  if (!longDesc) {
    const match = content.match(/this\.longDesc\s*=\s*`([\s\S]*?)`\s*;/);
    longDesc = match?.[1] ?? '';
  }

  const keywords = extractKeywords(content);

  const weight = extractNumberValue(content, /this\.weight\s*=\s*(\d+)/);
  const value = extractNumberValue(content, /this\.value\s*=\s*(\d+)/);

  const item: DraftItem = {
    id: file.id,
    name: shortDesc.replace(/^an?\s+/i, ''), // Remove leading "a" or "an"
    shortDesc,
    longDesc: longDesc ?? '',
    type: 'weapon',
    properties: {},
    updatedAt: Date.now(),
  };

  // Set weapon properties
  const props: Record<string, unknown> = {};
  if (config['itemLevel'] !== undefined) props.itemLevel = config['itemLevel'];
  if (config['minDamage'] !== undefined) props.minDamage = config['minDamage'];
  if (config['maxDamage'] !== undefined) props.maxDamage = config['maxDamage'];
  if (config['damageType']) props.damageType = config['damageType'];
  if (config['handedness']) props.handedness = config['handedness'];
  if (config['attackSpeed'] !== undefined) props.attackSpeed = config['attackSpeed'];
  if (config['toHit'] !== undefined) props.toHit = config['toHit'];

  item.properties = props;

  if (keywords.length > 0) item.keywords = keywords;
  if (weight !== undefined) item.weight = weight;
  if (value !== undefined) item.value = value;

  // Extract preservable custom code blocks
  const customCodeBlocks = extractCustomCodeBlocks(content, 'item');
  if (customCodeBlocks.length > 0) {
    item.customCodeBlocks = customCodeBlocks;
  }

  return item;
}

/**
 * Parse an armor file into a DraftItem.
 */
function parseArmor(file: ParsedFile): DraftItem | null {
  const content = file.content;
  const config = extractArmorConfig(content);

  const shortDesc = (config['shortDesc'] as string) ?? file.id.replace(/_/g, ' ');

  let longDesc = config['longDesc'] as string | undefined;
  if (!longDesc) {
    const match = content.match(/this\.longDesc\s*=\s*`([\s\S]*?)`\s*;/);
    longDesc = match?.[1] ?? '';
  }

  const keywords = extractKeywords(content);

  const weight = (config['weight'] as number | undefined)
    ?? extractNumberValue(content, /this\.weight\s*=\s*(\d+)/);
  const value = extractNumberValue(content, /this\.value\s*=\s*(\d+)/);

  const item: DraftItem = {
    id: file.id,
    name: shortDesc.replace(/^an?\s+/i, ''),
    shortDesc,
    longDesc: longDesc ?? '',
    type: 'armor',
    properties: {},
    updatedAt: Date.now(),
  };

  // Set armor properties
  const props: Record<string, unknown> = {};
  if (config['itemLevel'] !== undefined) props.itemLevel = config['itemLevel'];
  if (config['armor'] !== undefined) props.armor = config['armor'];
  if (config['slot']) props.slot = config['slot'];
  if (config['size']) props.size = config['size'];
  if (config['toDodge'] !== undefined) props.toDodge = config['toDodge'];
  if (config['toBlock'] !== undefined) props.toBlock = config['toBlock'];

  item.properties = props;

  if (keywords.length > 0) item.keywords = keywords;
  if (weight !== undefined) item.weight = weight;
  if (value !== undefined) item.value = value;

  // Extract preservable custom code blocks
  const customCodeBlocks = extractCustomCodeBlocks(content, 'item');
  if (customCodeBlocks.length > 0) {
    item.customCodeBlocks = customCodeBlocks;
  }

  return item;
}

/**
 * Parse a consumable/potion file into a DraftItem.
 * These often extend HealingPotion, ManaPotion, etc. with just a tier.
 */
function parseConsumable(file: ParsedFile): DraftItem | null {
  const content = file.content;

  // Detect the potion type and tier from class extension and super() call
  const isHealingPotion = /extends\s+HealingPotion\b/.test(content);
  const isManaPotion = /extends\s+ManaPotion\b/.test(content);

  // Extract tier from super('tier') call
  const tierMatch = content.match(/super\s*\(\s*['"`](\w+)['"`]\s*\)/);
  const tier = tierMatch?.[1] ?? 'standard';

  // Generate descriptive name from file ID and tier
  const baseName = file.id.replace(/_/g, ' ');

  let shortDesc = `a ${baseName}`;
  let itemType: 'consumable' | 'misc' = 'consumable';
  const properties: Record<string, unknown> = {};

  if (isHealingPotion) {
    // Healing amounts by tier (approximate, matches the base class)
    const healAmounts: Record<string, number> = {
      lesser: 15,
      standard: 30,
      greater: 50,
      major: 80,
    };
    properties.healAmount = healAmounts[tier] ?? 30;
    properties.potionTier = tier;
  } else if (isManaPotion) {
    const manaAmounts: Record<string, number> = {
      lesser: 15,
      standard: 30,
      greater: 50,
      major: 80,
    };
    properties.manaAmount = manaAmounts[tier] ?? 30;
    properties.potionTier = tier;
  }

  const keywords = extractKeywords(content);

  // Add sensible default keywords for potions
  if (keywords.length === 0) {
    keywords.push('potion');
    if (isHealingPotion) {
      keywords.push('healing', 'health');
    } else if (isManaPotion) {
      keywords.push('mana', 'magic');
    }
  }

  const item: DraftItem = {
    id: file.id,
    name: baseName,
    shortDesc,
    longDesc: `A ${tier} quality potion.`,
    type: itemType,
    properties,
    keywords,
    updatedAt: Date.now(),
  };

  // Store info about original class for reference
  if (isHealingPotion || isManaPotion) {
    item.customCode = `// Originally extends ${isHealingPotion ? 'HealingPotion' : 'ManaPotion'}('${tier}')`;
  }

  // Extract preservable custom code blocks
  const customCodeBlocks = extractCustomCodeBlocks(content, 'item');
  if (customCodeBlocks.length > 0) {
    item.customCodeBlocks = customCodeBlocks;
  }

  return item;
}

/**
 * Parse a generic item file into a DraftItem.
 */
function parseItem(file: ParsedFile): DraftItem | null {
  const content = file.content;

  // Check if this is a consumable/potion type
  if (/extends\s+(HealingPotion|ManaPotion|Consumable|Potion)\b/.test(content)) {
    return parseConsumable(file);
  }

  const shortDesc = extractStringValue(content, /this\.shortDesc\s*=\s*['"`]([^'"`]+)['"`]/)
    ?? file.id.replace(/_/g, ' ');

  let longDesc = '';
  const longDescMatch = content.match(/this\.longDesc\s*=\s*`([\s\S]*?)`\s*;/);
  if (longDescMatch) {
    longDesc = longDescMatch[1];
  }

  const keywords = extractKeywords(content);
  const weight = extractNumberValue(content, /this\.weight\s*=\s*(\d+)/);
  const value = extractNumberValue(content, /this\.value\s*=\s*(\d+)/);

  const item: DraftItem = {
    id: file.id,
    name: shortDesc.replace(/^an?\s+/i, ''),
    shortDesc,
    longDesc,
    type: 'misc',
    updatedAt: Date.now(),
  };

  if (keywords.length > 0) item.keywords = keywords;
  if (weight !== undefined) item.weight = weight;
  if (value !== undefined) item.value = value;

  // Extract preservable custom code blocks
  const customCodeBlocks = extractCustomCodeBlocks(content, 'item');
  if (customCodeBlocks.length > 0) {
    item.customCodeBlocks = customCodeBlocks;
  }

  return item;
}

/**
 * Parse a container file into a DraftItem.
 */
function parseContainer(file: ParsedFile): DraftItem | null {
  const item = parseItem(file);
  if (item) {
    item.type = 'container';
    const content = file.content;
    const capacity = extractNumberValue(content, /this\.capacity\s*=\s*(\d+)/);
    if (capacity !== undefined) {
      item.properties = { capacity };
    }
  }
  return item;
}

/**
 * Auto-layout rooms that are missing coordinates using BFS.
 */
function autoLayoutRooms(rooms: DraftRoom[]): { rooms: DraftRoom[]; gridSize: GridSize } {
  // Find rooms with coordinates
  const roomsWithCoords = rooms.filter(r => r.x !== 0 || r.y !== 0 || r.z !== 0);
  const roomsWithoutCoords = rooms.filter(r => r.x === 0 && r.y === 0 && r.z === 0);

  if (roomsWithoutCoords.length === 0) {
    // All rooms have coordinates
    const minX = Math.min(...rooms.map(r => r.x));
    const maxX = Math.max(...rooms.map(r => r.x));
    const minY = Math.min(...rooms.map(r => r.y));
    const maxY = Math.max(...rooms.map(r => r.y));
    const minZ = Math.min(...rooms.map(r => r.z));
    const maxZ = Math.max(...rooms.map(r => r.z));

    // Normalize coordinates to start from 0
    for (const room of rooms) {
      room.x -= minX;
      room.y -= minY;
      room.z -= minZ;
    }

    return {
      rooms,
      gridSize: {
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        depth: maxZ - minZ + 1,
      },
    };
  }

  // Create a map of room IDs for quick lookup
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  const occupied = new Set<string>();

  // Start from a room with coordinates, or use the entrance, or first room
  let startRoom = roomsWithCoords[0];
  if (!startRoom) {
    const entrance = rooms.find(r => r.isEntrance);
    startRoom = entrance ?? rooms[0];
    if (startRoom) {
      startRoom.x = 0;
      startRoom.y = 0;
      startRoom.z = 0;
    }
  }

  if (!startRoom) {
    return { rooms, gridSize: { width: 1, height: 1, depth: 1 } };
  }

  // BFS to assign coordinates
  const queue: DraftRoom[] = [startRoom];
  const visited = new Set<string>([startRoom.id]);
  occupied.add(`${startRoom.x},${startRoom.y},${startRoom.z}`);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Process each exit
    for (const [dir, targetId] of Object.entries(current.exits)) {
      if (visited.has(targetId)) continue;

      const targetRoom = roomMap.get(targetId);
      if (!targetRoom) continue;

      const offset = DIRECTION_OFFSETS[dir];
      if (!offset) continue;

      // Calculate new position
      let newX = current.x + offset.dx;
      let newY = current.y + offset.dy;
      let newZ = current.z + offset.dz;

      // Check for collision and find alternative if needed
      let attempts = 0;
      while (occupied.has(`${newX},${newY},${newZ}`) && attempts < 10) {
        // Try adjacent positions
        newX += offset.dx || 1;
        newY += offset.dy || 1;
        attempts++;
      }

      targetRoom.x = newX;
      targetRoom.y = newY;
      targetRoom.z = newZ;

      visited.add(targetId);
      occupied.add(`${newX},${newY},${newZ}`);
      queue.push(targetRoom);
    }
  }

  // Normalize coordinates
  const allRooms = Array.from(roomMap.values());
  const minX = Math.min(...allRooms.map(r => r.x));
  const maxX = Math.max(...allRooms.map(r => r.x));
  const minY = Math.min(...allRooms.map(r => r.y));
  const maxY = Math.max(...allRooms.map(r => r.y));
  const minZ = Math.min(...allRooms.map(r => r.z));
  const maxZ = Math.max(...allRooms.map(r => r.z));

  for (const room of allRooms) {
    room.x -= minX;
    room.y -= minY;
    room.z -= minZ;
  }

  return {
    rooms: allRooms,
    gridSize: {
      width: Math.max(maxX - minX + 1, 10),
      height: Math.max(maxY - minY + 1, 10),
      depth: Math.max(maxZ - minZ + 1, 1),
    },
  };
}

/**
 * Scan a directory for .ts files recursively.
 */
async function scanDirectory(basePath: string, currentPath: string = ''): Promise<string[]> {
  const files: string[] = [];
  const fullPath = currentPath ? `${basePath}/${currentPath}` : basePath;

  try {
    const entries = await efuns.readDir(fullPath);

    for (const entry of entries) {
      if (entry.startsWith('.') || entry.startsWith('_')) continue;

      const entryPath = currentPath ? `${currentPath}/${entry}` : entry;
      const fullEntryPath = `${basePath}/${entryPath}`;

      // Check if it's a directory by trying to read it
      try {
        const subEntries = await efuns.readDir(fullEntryPath);
        if (Array.isArray(subEntries)) {
          // It's a directory, recurse
          const subFiles = await scanDirectory(basePath, entryPath);
          files.push(...subFiles);
        }
      } catch {
        // Not a directory, check if it's a .ts file
        if (entry.endsWith('.ts')) {
          files.push(entryPath);
        }
      }
    }
  } catch {
    // Directory read failed
  }

  return files;
}

/**
 * Import an area from a published path.
 */
export async function importAreaFromPath(
  sourcePath: string,
  importerName: string,
  options: ImportOptions = {},
): Promise<{ area: AreaDefinition; result: ImportResult }> {
  const warnings: string[] = [];
  const parseErrors: Array<{ file: string; error: string }> = [];
  const filesSkipped: string[] = [];

  // Validate path format
  if (!sourcePath.startsWith('/areas/')) {
    return {
      area: null as unknown as AreaDefinition,
      result: {
        success: false,
        error: 'Path must start with /areas/',
        stats: { roomsImported: 0, npcsImported: 0, itemsImported: 0, filesSkipped: [], parseErrors: [] },
        warnings: [],
      },
    };
  }

  // Extract region and subregion from path
  const pathParts = sourcePath.replace('/areas/', '').split('/');
  if (pathParts.length < 2) {
    return {
      area: null as unknown as AreaDefinition,
      result: {
        success: false,
        error: 'Path must include region and subregion (e.g., /areas/valdoria/aldric)',
        stats: { roomsImported: 0, npcsImported: 0, itemsImported: 0, filesSkipped: [], parseErrors: [] },
        warnings: [],
      },
    };
  }

  const region = pathParts[0];
  const subregion = pathParts[1];
  const areaId = `${region}:${subregion}`;

  // Scan for .ts files
  const tsFiles = await scanDirectory(sourcePath);

  if (tsFiles.length === 0) {
    return {
      area: null as unknown as AreaDefinition,
      result: {
        success: false,
        error: `No .ts files found in ${sourcePath}`,
        stats: { roomsImported: 0, npcsImported: 0, itemsImported: 0, filesSkipped: [], parseErrors: [] },
        warnings: [],
      },
    };
  }

  // Parse each file
  const parsedFiles: ParsedFile[] = [];

  for (const file of tsFiles) {
    const filePath = `${sourcePath}/${file}`;
    try {
      const content = await efuns.readFile(filePath);
      const type = detectEntityType(content);

      if (type === 'unknown') {
        filesSkipped.push(file);
        warnings.push(`Skipped ${file}: Could not detect entity type`);
        continue;
      }

      // Generate ID from file path (handle subdirectories)
      const id = file.replace('.ts', '').replace(/\//g, '/');

      parsedFiles.push({ path: filePath, id, type, content });
    } catch (error) {
      parseErrors.push({ file, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Convert parsed files to draft entities
  const rooms: DraftRoom[] = [];
  const npcs: DraftNPC[] = [];
  const items: DraftItem[] = [];

  for (const file of parsedFiles) {
    try {
      switch (file.type) {
        case 'room': {
          const room = parseRoom(file, sourcePath);
          if (room) rooms.push(room);
          else warnings.push(`Could not parse room: ${file.id}`);
          break;
        }
        case 'npc':
        case 'merchant': {
          const npc = parseNPC(file, sourcePath);
          if (npc) {
            npcs.push(npc);
            // Specialized NPC types (Merchant, Trainer, PetMerchant) are now fully supported
            // and their configurations are preserved in the subclass-specific fields
          } else {
            warnings.push(`Could not parse NPC: ${file.id}`);
          }
          break;
        }
        case 'weapon': {
          const weapon = parseWeapon(file);
          if (weapon) items.push(weapon);
          else warnings.push(`Could not parse weapon: ${file.id}`);
          break;
        }
        case 'armor': {
          const armor = parseArmor(file);
          if (armor) items.push(armor);
          else warnings.push(`Could not parse armor: ${file.id}`);
          break;
        }
        case 'container': {
          const container = parseContainer(file);
          if (container) items.push(container);
          else warnings.push(`Could not parse container: ${file.id}`);
          break;
        }
        case 'item': {
          const item = parseItem(file);
          if (item) items.push(item);
          else warnings.push(`Could not parse item: ${file.id}`);
          break;
        }
      }
    } catch (error) {
      parseErrors.push({ file: file.id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Auto-layout rooms if needed
  const { rooms: layoutRooms, gridSize } = autoLayoutRooms(rooms);

  // Determine entrance room
  let hasEntrance = layoutRooms.some(r => r.isEntrance);
  if (!hasEntrance && layoutRooms.length > 0) {
    // Check for rooms named "entrance" or similar
    const entranceRoom = layoutRooms.find(r =>
      r.id.toLowerCase().includes('entrance') ||
      r.id.toLowerCase().includes('gate') ||
      r.id.toLowerCase().includes('start')
    );
    if (entranceRoom) {
      entranceRoom.isEntrance = true;
      hasEntrance = true;
    } else {
      // Default to first room
      layoutRooms[0].isEntrance = true;
      hasEntrance = true;
      warnings.push(`No entrance room found, defaulting to ${layoutRooms[0].id}`);
    }
  }

  // Create area name from options or subregion
  const areaName = options.name ?? subregion
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // Build the area definition
  const now = Date.now();
  const area: AreaDefinition = {
    id: areaId,
    name: areaName,
    region,
    subregion,
    description: `Imported from ${sourcePath}`,
    theme: '',
    owner: importerName.toLowerCase(),
    collaborators: [],
    status: 'draft',
    version: 1,
    gridSize,
    rooms: layoutRooms,
    npcs,
    items,
    tags: ['imported'],
    loreReferences: [],
    createdAt: now,
    updatedAt: now,
    publishedPath: sourcePath,
  };

  return {
    area,
    result: {
      success: true,
      areaId,
      stats: {
        roomsImported: layoutRooms.length,
        npcsImported: npcs.length,
        itemsImported: items.length,
        filesSkipped,
        parseErrors,
      },
      warnings,
    },
  };
}

export default {
  detectEntityType,
  importAreaFromPath,
};
