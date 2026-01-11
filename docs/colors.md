# Color System Reference

MudForge provides a comprehensive 256-color system for styling text output. Colors are applied using token syntax in curly braces, which are automatically converted to ANSI escape sequences for terminal display.

## Quick Reference

```
{red}This is red text{/}
{bold}{gold}Bold gold text{/}
{bg:blue}Blue background{/}
{fg:208}256-color orange{/}
```

## Basic Colors (16-Color)

The standard ANSI 16-color palette, widely supported by all terminals.

### Normal Colors (Lowercase)

| Token | Color |
|-------|-------|
| `{black}` | Black |
| `{red}` | Red |
| `{green}` | Green |
| `{yellow}` | Yellow |
| `{blue}` | Blue |
| `{magenta}` | Magenta |
| `{cyan}` | Cyan |
| `{white}` | White |

### Bright Colors (Uppercase)

| Token | Color |
|-------|-------|
| `{BLACK}` | Bright Black (Gray) |
| `{RED}` | Bright Red |
| `{GREEN}` | Bright Green |
| `{YELLOW}` | Bright Yellow |
| `{BLUE}` | Bright Blue |
| `{MAGENTA}` | Bright Magenta |
| `{CYAN}` | Bright Cyan |
| `{WHITE}` | Bright White |

**Example:**
```
{red}Normal red{/} vs {RED}Bright red{/}
```

## Extended Named Colors (256-Color)

These colors use the 256-color palette for richer color options.

### Reds & Pinks

| Token | Index | Description |
|-------|-------|-------------|
| `{maroon}` | 52 | Dark red |
| `{crimson}` | 160 | Deep red |
| `{salmon}` | 209 | Light pinkish-red |
| `{coral}` | 203 | Orange-pink |
| `{rose}` | 211 | Light rose |
| `{pink}` | 218 | Pink |
| `{hotpink}` | 206 | Vivid pink |
| `{deeppink}` | 199 | Deep magenta-pink |

### Oranges & Yellows

| Token | Index | Description |
|-------|-------|-------------|
| `{orange}` | 208 | Orange |
| `{darkorange}` | 166 | Dark orange |
| `{gold}` | 220 | Gold |
| `{amber}` | 214 | Amber |
| `{peach}` | 223 | Peach |
| `{tan}` | 180 | Tan |
| `{khaki}` | 186 | Khaki |

### Greens

| Token | Index | Description |
|-------|-------|-------------|
| `{lime}` | 118 | Bright lime |
| `{chartreuse}` | 118 | Yellow-green |
| `{forest}` | 22 | Dark forest green |
| `{darkgreen}` | 28 | Dark green |
| `{olive}` | 58 | Olive |
| `{mint}` | 121 | Mint green |
| `{seafoam}` | 85 | Seafoam |
| `{emerald}` | 35 | Emerald |
| `{jade}` | 36 | Jade |

### Blues

| Token | Index | Description |
|-------|-------|-------------|
| `{navy}` | 17 | Navy blue |
| `{darkblue}` | 18 | Dark blue |
| `{royalblue}` | 63 | Royal blue |
| `{sky}` | 117 | Sky blue |
| `{azure}` | 39 | Azure |
| `{cornflower}` | 69 | Cornflower blue |
| `{steel}` | 67 | Steel blue |
| `{slate}` | 60 | Slate |
| `{powder}` | 152 | Powder blue |

### Purples

| Token | Index | Description |
|-------|-------|-------------|
| `{purple}` | 129 | Purple |
| `{violet}` | 135 | Violet |
| `{indigo}` | 54 | Indigo |
| `{lavender}` | 183 | Lavender |
| `{plum}` | 96 | Plum |
| `{orchid}` | 170 | Orchid |
| `{grape}` | 93 | Grape |

### Cyans & Teals

| Token | Index | Description |
|-------|-------|-------------|
| `{teal}` | 30 | Teal |
| `{aqua}` | 51 | Aqua |
| `{turquoise}` | 45 | Turquoise |
| `{darkcyan}` | 36 | Dark cyan |

### Browns

| Token | Index | Description |
|-------|-------|-------------|
| `{brown}` | 94 | Brown |
| `{chocolate}` | 130 | Chocolate |
| `{sienna}` | 131 | Sienna |
| `{rust}` | 130 | Rust |
| `{coffee}` | 58 | Coffee |
| `{sand}` | 186 | Sand |

### Grays

| Token | Index | Description |
|-------|-------|-------------|
| `{charcoal}` | 236 | Dark charcoal |
| `{darkgray}` / `{darkgrey}` | 240 | Dark gray |
| `{gray}` / `{grey}` | 244 | Medium gray |
| `{lightgray}` / `{lightgrey}` | 248 | Light gray |
| `{silver}` | 7 | Silver |

## 256-Color by Number

Access any color in the 256-color palette directly by index.

### Foreground

```
{fg:N}text{/}
```

Where `N` is 0-255.

**Examples:**
```
{fg:196}Bright red (196){/}
{fg:46}Bright green (46){/}
{fg:21}Blue (21){/}
```

### Background

```
{bg:N}text{/}
```

**Examples:**
```
{bg:196}Red background{/}
{bg:226}Yellow background{/}
```

### 256-Color Palette Layout

The 256-color palette is organized as:

| Range | Description |
|-------|-------------|
| 0-7 | Standard colors (black, red, green, yellow, blue, magenta, cyan, white) |
| 8-15 | Bright colors |
| 16-231 | 6x6x6 color cube (216 colors) |
| 232-255 | Grayscale ramp (24 shades) |

#### Color Cube Formula

For indices 16-231, colors are arranged in a 6x6x6 cube:

```
index = 16 + (36 * r) + (6 * g) + b
```

Where `r`, `g`, `b` are 0-5.

## RGB Colors

Specify colors using RGB values (0-255 per channel). These are automatically mapped to the nearest 256-color palette entry.

### Foreground RGB

```
{rgb:R,G,B}text{/}
```

**Examples:**
```
{rgb:255,0,0}Pure red{/}
{rgb:0,255,0}Pure green{/}
{rgb:128,0,255}Purple{/}
{rgb:255,165,0}Orange{/}
```

### Background RGB

```
{bgrgb:R,G,B}text{/}
```

**Example:**
```
{bgrgb:0,0,128}Navy background{/}
```

## Grayscale

Access the 24-shade grayscale ramp (palette indices 232-255).

### Foreground Grayscale

```
{gray:N}text{/}
```

Where `N` is 0-23 (0 = darkest, 23 = lightest).

**Examples:**
```
{gray:0}Nearly black{/}
{gray:12}Medium gray{/}
{gray:23}Nearly white{/}
```

### Background Grayscale

```
{bggray:N}text{/}
```

**Example:**
```
{bggray:4}Dark gray background{/}
```

## Background Colors

Any named color can be used as a background with the `bg:` prefix.

### Basic Backgrounds

```
{bg:red}Red background{/}
{bg:green}Green background{/}
{bg:blue}Blue background{/}
```

### Extended Color Backgrounds

```
{bg:orange}Orange background{/}
{bg:purple}Purple background{/}
{bg:gold}Gold background{/}
```

### Bright Backgrounds (Uppercase)

```
{bg:RED}Bright red background{/}
{bg:YELLOW}Bright yellow background{/}
```

## Text Styles

Apply formatting styles to text.

| Token | Shortcut | Effect |
|-------|----------|--------|
| `{bold}` | `{b}` | **Bold text** |
| `{dim}` | | Dimmed text |
| `{italic}` | `{i}` | *Italic text* |
| `{underline}` | `{u}` | Underlined text |
| `{reverse}` | | Swapped foreground/background |
| `{hidden}` | | Hidden text (still takes space) |

**Examples:**
```
{bold}Bold text{/}
{italic}Italic text{/}
{underline}Underlined text{/}
{dim}Dimmed text{/}
```

## Combining Styles

Multiple styles and colors can be combined by stacking tokens.

```
{bold}{red}Bold red text{/}
{underline}{blue}Underlined blue{/}
{bold}{italic}{gold}Bold italic gold{/}
{bg:navy}{white}White on navy{/}
```

## Reset Token

Use `{/}` or `{reset}` to reset all formatting back to default.

```
{red}Red {green}green {blue}blue{/} normal
```

**Important:** Always reset formatting after styled text to prevent styles from bleeding into subsequent output.

## Newline Token

Insert a newline in text:

```
{n}     - Newline
{newline} - Newline (verbose)
```

---

# Developer Reference

## Using Colors in Code

### Import the Color Module

```typescript
import { colorize, stripColors, color, semantic } from '../lib/colors.js';
```

### colorize(text: string): string

Process a string containing color tokens and convert them to ANSI escape sequences.

```typescript
const output = colorize('{red}Error:{/} Something went wrong');
player.receive(output);
```

### stripColors(text: string): string

Remove all color tokens from text, leaving plain text.

```typescript
const plain = stripColors('{red}Error:{/} Something went wrong');
// Result: 'Error: Something went wrong'
```

### stripAnsi(text: string): string

Remove ANSI escape codes from text (for already-processed strings).

```typescript
const plain = stripAnsi('\x1b[31mError:\x1b[0m Something');
// Result: 'Error: Something'
```

### Color Helper Functions

The `color` object provides wrapper functions for common colors:

```typescript
import { color } from '../lib/colors.js';

// Basic colors
color.red('Error message');     // Returns "\x1b[31mError message\x1b[0m"
color.green('Success');
color.yellow('Warning');

// Styles
color.bold('Important');
color.dim('Secondary info');
color.underline('Emphasized');

// 256-color helpers
color.fg(208)('Orange text');   // Returns function, then applies
color.bg(21)('Blue background');
color.rgb(255, 128, 0)('Custom color');
color.gray(12)('Medium gray');

// Extended named colors
color.orange('Orange');
color.gold('Gold');
color.purple('Purple');
color.pink('Pink');
```

### Semantic Color Functions

The `semantic` object provides contextual color functions for consistent styling:

```typescript
import { semantic } from '../lib/colors.js';

// Room elements
semantic.roomTitle('The Great Hall');
semantic.exits('[north, south]');

// Objects
semantic.item('a golden sword');
semantic.npc('the shopkeeper');
semantic.player('Hero');

// Combat
semantic.damage('25 damage');
semantic.heal('+15 HP');
semantic.combat('Combat begins!');

// System messages
semantic.error('File not found');
semantic.warning('Low health');
semantic.success('Quest completed');
semantic.info('Hint: try looking around');

// Communication
semantic.say('Hello there');
semantic.shout('HELP!');
semantic.whisper('psst...');
semantic.emote('waves hello');

// Guild colors
semantic.fighter('Warrior text');
semantic.mage('Arcane text');
semantic.thief('Shadow text');
semantic.cleric('Holy text');

// Item rarity
semantic.common('Common Item');
semantic.uncommon('Uncommon Item');
semantic.rare('Rare Item');
semantic.epic('Epic Item');
semantic.legendary('Legendary Item');
semantic.mythic('Mythic Item');
```

### Text Utilities

#### visibleLength(text: string): number

Get the visible length of text, excluding ANSI codes. Useful for alignment.

```typescript
import { visibleLength } from '../lib/colors.js';

const text = colorize('{red}Hello{/}');
console.log(visibleLength(text)); // 5 (not counting ANSI codes)
```

#### padEnd(text: string, length: number, char?: string): string

Pad text to a visible length (right-side padding).

```typescript
import { padEnd } from '../lib/colors.js';

const padded = padEnd(colorize('{red}Hi{/}'), 10);
// "Hi        " (with ANSI codes preserved)
```

#### padStart(text: string, length: number, char?: string): string

Pad text to a visible length (left-side padding).

#### wordWrap(text: string, width: number): string

Wrap text to a specified width, preserving ANSI codes across line breaks.

```typescript
import { wordWrap } from '../lib/colors.js';

const wrapped = wordWrap(colorize('{red}Very long text...{/}'), 40);
```

### Special Effects

#### rainbow(text: string): string

Apply a rainbow color effect to text.

```typescript
import { rainbow } from '../lib/colors.js';

player.receive(rainbow('Congratulations!'));
```

#### colorGradient(startColor: number, endColor: number, steps: number): number[]

Generate a gradient between two 256-color indices.

```typescript
import { colorGradient, getFg256 } from '../lib/colors.js';

const gradient = colorGradient(196, 226, 5); // Red to yellow
// Returns: [196, 202, 208, 214, 220, 226]
```

### Low-Level Functions

#### getFg256(n: number): string

Get the ANSI escape code for a 256-color foreground.

```typescript
import { getFg256 } from '../lib/colors.js';

const code = getFg256(208); // "\x1b[38;5;208m"
```

#### getBg256(n: number): string

Get the ANSI escape code for a 256-color background.

#### getColorIndex(name: string): number | undefined

Get the 256-color index for a named color.

```typescript
import { getColorIndex } from '../lib/colors.js';

const index = getColorIndex('orange'); // 208
```

#### rgbToColor(r: number, g: number, b: number): number

Convert RGB values to the nearest 256-color palette index.

```typescript
import { rgbToColor } from '../lib/colors.js';

const index = rgbToColor(255, 128, 0); // Returns nearest 256-color
```

---

## In-Game Commands

### colorlist

Display the color reference in-game:

```
colorlist           - Full color reference
colorlist basic     - Basic 16 colors only
colorlist extended  - Extended named colors
colorlist 256       - 256-color palette grid
colorlist gray      - Grayscale ramp
colorlist styles    - Text styles
```

Aliases: `colors`

---

## Client Support

The MudForge web client fully supports:

- Basic 16 ANSI colors
- Bright colors (90-97, 100-107)
- 256-color palette (38;5;N and 48;5;N sequences)
- True RGB colors (38;2;R;G;B and 48;2;R;G;B sequences)
- All text styles (bold, dim, italic, underline, reverse, hidden)

Colors are rendered using CSS with inline styles for 256-color and RGB values.

---

## Best Practices

1. **Always reset**: End colored text with `{/}` to prevent style bleeding.

2. **Use semantic colors**: Prefer `semantic.error()` over `{red}` for consistent theming.

3. **Test visibility**: Some color combinations have poor contrast. Test on both light and dark backgrounds.

4. **Limit rainbow/gradients**: Special effects can be distracting. Use sparingly for special moments.

5. **Consider accessibility**: Don't rely on color alone to convey meaning. Combine with text or symbols.

6. **Performance**: For high-frequency output, pre-colorize static strings rather than calling `colorize()` repeatedly.
