/**
 * Colorlist command - Display all available colors and formatting options.
 *
 * Usage:
 *   colorlist           - Show all colors with examples
 *   colorlist basic     - Show only basic 16 colors
 *   colorlist extended  - Show extended named colors
 *   colorlist 256       - Show 256-color palette grid
 *   colorlist gray      - Show grayscale ramp
 *   colorlist styles    - Show text styles
 */

import type { MudObject } from '../../lib/std.js';
import { COLORS_256, colorize } from '../../lib/colors.js';
import { startPager } from '../../lib/pager.js';

interface CommandContext {
  player: MudObject;
  args: string;
  send(message: string): void;
  sendLine(message: string): void;
}

export const name = ['colorlist', 'colors'];
export const description = 'Display all available colors and formatting options';
export const usage = 'colorlist [basic|extended|256|gray|styles]';

export function execute(ctx: CommandContext): void {
  const args = ctx.args.trim().toLowerCase();

  let content: string[];

  switch (args) {
    case 'basic':
      content = generateBasicColors();
      break;
    case 'extended':
      content = generateExtendedColors();
      break;
    case '256':
      content = generate256Palette();
      break;
    case 'gray':
    case 'grey':
    case 'grayscale':
      content = generateGrayscale();
      break;
    case 'styles':
      content = generateStyles();
      break;
    default:
      content = generateFullList();
      break;
  }

  startPager(ctx.player, content, {
    title: 'Color Reference',
    linesPerPage: 22,
  });
}

/**
 * Generate the full color reference.
 */
function generateFullList(): string[] {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('{bold}{cyan}=== MudForge Color System ==={/}'));
  lines.push('');

  // Styles
  lines.push(colorize('{bold}{yellow}TEXT STYLES{/}'));
  lines.push(colorize('  {bold}bold{/}        {bold}This is bold text{/}'));
  lines.push(colorize('  {dim}dim{/}         {dim}This is dim text{/}'));
  lines.push(colorize('  {italic}italic{/}      {italic}This is italic text{/}'));
  lines.push(colorize('  {underline}underline{/}   {underline}This is underlined text{/}'));
  lines.push(colorize('  {reverse}reverse{/}     {reverse}This is reversed text{/}'));
  lines.push('');

  // Basic 16 colors
  lines.push(colorize('{bold}{yellow}BASIC COLORS (16-color){/}'));
  lines.push('');
  lines.push('  Normal:');
  lines.push(colorize('    {black}black{/}   {red}red{/}   {green}green{/}   {yellow}yellow{/}   {blue}blue{/}   {magenta}magenta{/}   {cyan}cyan{/}   {white}white{/}'));
  lines.push('');
  lines.push('  Bright (uppercase):');
  lines.push(colorize('    {BLACK}BLACK{/}   {RED}RED{/}   {GREEN}GREEN{/}   {YELLOW}YELLOW{/}   {BLUE}BLUE{/}   {MAGENTA}MAGENTA{/}   {CYAN}CYAN{/}   {WHITE}WHITE{/}'));
  lines.push('');

  // Extended named colors
  lines.push(colorize('{bold}{yellow}EXTENDED NAMED COLORS (256-color){/}'));
  lines.push('');

  // Reds/Pinks
  lines.push('  Reds/Pinks:');
  lines.push(colorize('    {maroon}maroon{/}  {crimson}crimson{/}  {salmon}salmon{/}  {coral}coral{/}  {rose}rose{/}  {pink}pink{/}  {hotpink}hotpink{/}  {deeppink}deeppink{/}'));
  lines.push('');

  // Oranges/Yellows
  lines.push('  Oranges/Yellows:');
  lines.push(colorize('    {orange}orange{/}  {darkorange}darkorange{/}  {gold}gold{/}  {amber}amber{/}  {peach}peach{/}  {tan}tan{/}  {khaki}khaki{/}'));
  lines.push('');

  // Greens
  lines.push('  Greens:');
  lines.push(colorize('    {lime}lime{/}  {forest}forest{/}  {darkgreen}darkgreen{/}  {olive}olive{/}  {mint}mint{/}  {seafoam}seafoam{/}  {emerald}emerald{/}  {jade}jade{/}'));
  lines.push('');

  // Blues
  lines.push('  Blues:');
  lines.push(colorize('    {navy}navy{/}  {darkblue}darkblue{/}  {royalblue}royalblue{/}  {sky}sky{/}  {azure}azure{/}  {cornflower}cornflower{/}  {steel}steel{/}  {powder}powder{/}'));
  lines.push('');

  // Purples
  lines.push('  Purples:');
  lines.push(colorize('    {purple}purple{/}  {violet}violet{/}  {indigo}indigo{/}  {lavender}lavender{/}  {plum}plum{/}  {orchid}orchid{/}  {grape}grape{/}'));
  lines.push('');

  // Cyans/Teals
  lines.push('  Cyans/Teals:');
  lines.push(colorize('    {teal}teal{/}  {aqua}aqua{/}  {turquoise}turquoise{/}  {darkcyan}darkcyan{/}'));
  lines.push('');

  // Browns
  lines.push('  Browns:');
  lines.push(colorize('    {brown}brown{/}  {chocolate}chocolate{/}  {sienna}sienna{/}  {rust}rust{/}  {coffee}coffee{/}  {sand}sand{/}'));
  lines.push('');

  // Grays
  lines.push('  Grays:');
  lines.push(colorize('    {charcoal}charcoal{/}  {darkgray}darkgray{/}  {gray}gray{/}  {lightgray}lightgray{/}  {silver}silver{/}  {slate}slate{/}'));
  lines.push('');

  // 256-color by number
  lines.push(colorize('{bold}{yellow}256-COLOR BY NUMBER{/}'));
  lines.push('');
  lines.push(colorize('  Use {cyan}{fg:N}{/} for foreground, {cyan}{bg:N}{/} for background (N = 0-255)'));
  lines.push('');
  lines.push('  Examples:');
  lines.push(colorize('    {fg:196}Color 196{/}  {fg:208}Color 208{/}  {fg:226}Color 226{/}  {fg:46}Color 46{/}  {fg:51}Color 51{/}  {fg:21}Color 21{/}  {fg:129}Color 129{/}'));
  lines.push('');

  // RGB
  lines.push(colorize('{bold}{yellow}RGB COLORS{/}'));
  lines.push('');
  lines.push(colorize('  Use {cyan}{rgb:R,G,B}{/} for foreground, {cyan}{bgrgb:R,G,B}{/} for background'));
  lines.push('');
  lines.push('  Examples:');
  lines.push(colorize('    {rgb:255,0,0}rgb:255,0,0{/}  {rgb:0,255,0}rgb:0,255,0{/}  {rgb:0,0,255}rgb:0,0,255{/}  {rgb:255,128,0}rgb:255,128,0{/}  {rgb:128,0,255}rgb:128,0,255{/}'));
  lines.push('');

  // Grayscale
  lines.push(colorize('{bold}{yellow}GRAYSCALE{/}'));
  lines.push('');
  lines.push(colorize('  Use {cyan}{gray:N}{/} for foreground, {cyan}{bggray:N}{/} for background (N = 0-23)'));
  lines.push('');
  let grayLine = '    ';
  for (let i = 0; i < 24; i += 2) {
    grayLine += colorize(`{gray:${i}}${i.toString().padStart(2)}{/} `);
  }
  lines.push(grayLine);
  lines.push('');

  // Background colors
  lines.push(colorize('{bold}{yellow}BACKGROUND COLORS{/}'));
  lines.push('');
  lines.push(colorize('  Use {cyan}{bg:colorname}{/} or {cyan}{bg:N}{/} for backgrounds'));
  lines.push('');
  lines.push(colorize('    {bg:red} red {/}  {bg:green} green {/}  {bg:blue} blue {/}  {bg:yellow}{black} yellow {/}  {bg:magenta} magenta {/}  {bg:cyan}{black} cyan {/}'));
  lines.push(colorize('    {bg:orange}{black} orange {/}  {bg:pink}{black} pink {/}  {bg:purple} purple {/}  {bg:teal} teal {/}  {bg:gold}{black} gold {/}'));
  lines.push('');

  // Reset
  lines.push(colorize('{bold}{yellow}RESET{/}'));
  lines.push('');
  lines.push(colorize('  Use {cyan}{/}{/} or {cyan}{reset}{/} to reset all formatting'));
  lines.push('');

  // Usage tips
  lines.push(colorize('{bold}{yellow}USAGE TIPS{/}'));
  lines.push('');
  lines.push('  In code or descriptions, wrap colors in curly braces:');
  lines.push(colorize('    "The {red}dragon{/} breathes {orange}fire{/}!"'));
  lines.push('');
  lines.push('  Combine styles and colors:');
  lines.push(colorize('    "{bold}{gold}LEGENDARY SWORD{/}" = {bold}{gold}LEGENDARY SWORD{/}'));
  lines.push('');
  lines.push(colorize('{dim}Use "colorlist 256" to see the full 256-color palette grid{/}'));
  lines.push('');

  return lines;
}

/**
 * Generate basic 16 colors only.
 */
function generateBasicColors(): string[] {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('{bold}{cyan}=== Basic 16 Colors ==={/}'));
  lines.push('');

  lines.push(colorize('{bold}Normal Colors:{/}'));
  lines.push('');

  const normal = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
  for (const c of normal) {
    const padded = c.padEnd(10);
    lines.push(colorize(`  {${c}}${padded}{/}  {${c}}████████{/}  Token: {cyan}{${c}}{/}`));
  }

  lines.push('');
  lines.push(colorize('{bold}Bright Colors:{/} (use UPPERCASE)'));
  lines.push('');

  const bright = ['BLACK', 'RED', 'GREEN', 'YELLOW', 'BLUE', 'MAGENTA', 'CYAN', 'WHITE'];
  for (const c of bright) {
    const padded = c.padEnd(10);
    lines.push(colorize(`  {${c}}${padded}{/}  {${c}}████████{/}  Token: {cyan}{${c}}{/}`));
  }

  lines.push('');

  return lines;
}

/**
 * Generate extended named colors.
 */
function generateExtendedColors(): string[] {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('{bold}{cyan}=== Extended Named Colors (256-color) ==={/}'));
  lines.push('');

  // Group colors by category
  const categories: Record<string, string[]> = {
    'Reds/Pinks': ['maroon', 'crimson', 'salmon', 'coral', 'rose', 'pink', 'hotpink', 'deeppink'],
    'Oranges/Yellows': ['orange', 'darkorange', 'gold', 'amber', 'peach', 'tan', 'khaki'],
    'Greens': ['lime', 'chartreuse', 'forest', 'darkgreen', 'olive', 'mint', 'seafoam', 'emerald', 'jade'],
    'Blues': ['navy', 'darkblue', 'royalblue', 'sky', 'azure', 'cornflower', 'steel', 'slate', 'powder'],
    'Purples': ['purple', 'violet', 'indigo', 'lavender', 'plum', 'orchid', 'grape'],
    'Cyans/Teals': ['teal', 'aqua', 'turquoise', 'darkcyan'],
    'Browns': ['brown', 'chocolate', 'sienna', 'rust', 'coffee', 'sand'],
    'Grays': ['charcoal', 'darkgray', 'gray', 'lightgray', 'silver'],
  };

  for (const [category, colors] of Object.entries(categories)) {
    lines.push(colorize(`{bold}{yellow}${category}:{/}`));
    lines.push('');

    for (const c of colors) {
      const index = COLORS_256[c] ?? 0;
      const padded = c.padEnd(12);
      lines.push(colorize(`  {${c}}${padded}{/}  {${c}}████████{/}  Index: {dim}${index.toString().padStart(3)}{/}  Token: {cyan}{${c}}{/}`));
    }
    lines.push('');
  }

  return lines;
}

/**
 * Generate 256-color palette grid.
 */
function generate256Palette(): string[] {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('{bold}{cyan}=== 256-Color Palette ==={/}'));
  lines.push('');

  // Standard 16 colors (0-15)
  lines.push(colorize('{bold}Standard Colors (0-15):{/}'));
  lines.push('');

  let line = '  ';
  for (let i = 0; i < 8; i++) {
    line += colorize(`{bg:${i}}  {/}`);
  }
  line += '  ';
  for (let i = 8; i < 16; i++) {
    line += colorize(`{bg:${i}}  {/}`);
  }
  lines.push(line);

  line = '  ';
  for (let i = 0; i < 8; i++) {
    line += colorize(`{dim}${i.toString().padStart(2)}{/}`);
  }
  line += '  ';
  for (let i = 8; i < 16; i++) {
    line += colorize(`{dim}${i.toString().padStart(2)}{/}`);
  }
  lines.push(line);
  lines.push('');

  // 6x6x6 color cube (16-231)
  lines.push(colorize('{bold}Color Cube (16-231):{/}'));
  lines.push('');

  for (let green = 0; green < 6; green++) {
    let row1 = '  ';
    let row2 = '  ';

    for (let red = 0; red < 6; red++) {
      for (let blue = 0; blue < 6; blue++) {
        const index = 16 + 36 * red + 6 * green + blue;
        row1 += colorize(`{bg:${index}} {/}`);
      }
      row1 += ' ';
    }
    lines.push(row1);

    // Show index numbers for first row of each section
    if (green === 0) {
      for (let red = 0; red < 6; red++) {
        const start = 16 + 36 * red;
        row2 += colorize(`{dim}${start.toString().padStart(3)}-${(start + 5).toString().padStart(3)}{/} `);
      }
      lines.push(row2);
    }
  }
  lines.push('');

  // Grayscale (232-255)
  lines.push(colorize('{bold}Grayscale (232-255):{/}'));
  lines.push('');

  line = '  ';
  for (let i = 232; i <= 255; i++) {
    line += colorize(`{bg:${i}} {/}`);
  }
  lines.push(line);

  line = '  ';
  for (let i = 232; i <= 255; i += 4) {
    line += colorize(`{dim}${i.toString().padStart(3)}{/} `);
  }
  lines.push(line);
  lines.push('');

  lines.push(colorize('{dim}Use {fg:N} or {bg:N} to use these colors (N = 0-255){/}'));
  lines.push('');

  return lines;
}

/**
 * Generate grayscale ramp.
 */
function generateGrayscale(): string[] {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('{bold}{cyan}=== Grayscale Ramp ==={/}'));
  lines.push('');
  lines.push(colorize('Use {cyan}{gray:N}{/} for foreground, {cyan}{bggray:N}{/} for background (N = 0-23)'));
  lines.push('');

  // Visual ramp
  let bgLine = '  ';
  for (let i = 0; i < 24; i++) {
    bgLine += colorize(`{bggray:${i}}  {/}`);
  }
  lines.push(bgLine);
  lines.push('');

  // Numbered
  for (let i = 0; i < 24; i++) {
    const index = 232 + i;
    const padded = i.toString().padStart(2);
    lines.push(colorize(`  {gray:${i}}Gray ${padded}{/}  {gray:${i}}████████{/}  256-index: {dim}${index}{/}  Token: {cyan}{gray:${i}}{/}`));
  }
  lines.push('');

  return lines;
}

/**
 * Generate text styles.
 */
function generateStyles(): string[] {
  const lines: string[] = [];

  lines.push('');
  lines.push(colorize('{bold}{cyan}=== Text Styles ==={/}'));
  lines.push('');

  const styles = [
    ['bold', 'Bold text for emphasis'],
    ['dim', 'Dimmed text for less important info'],
    ['italic', 'Italic text for flavor'],
    ['underline', 'Underlined text'],
    ['reverse', 'Reversed foreground/background'],
    ['hidden', 'Hidden text (still takes space)'],
  ];

  for (const [style, desc] of styles) {
    lines.push(colorize(`  {bold}${style.padEnd(12)}{/}  {${style}}Example text{/}`));
    lines.push(colorize(`                ${desc}`));
    lines.push(colorize(`                Token: {cyan}{${style}}{/}`));
    lines.push('');
  }

  lines.push(colorize('{bold}Combining Styles:{/}'));
  lines.push('');
  lines.push(colorize('  {bold}{red}Bold Red{/}         Token: {cyan}{bold}{red}text{/}{/}'));
  lines.push(colorize('  {underline}{blue}Underline Blue{/}   Token: {cyan}{underline}{blue}text{/}{/}'));
  lines.push(colorize('  {bold}{italic}{gold}Bold Italic Gold{/} Token: {cyan}{bold}{italic}{gold}text{/}{/}'));
  lines.push('');

  lines.push(colorize('{bold}Reset:{/}'));
  lines.push('');
  lines.push(colorize('  Use {cyan}{/}{/} or {cyan}{reset}{/} to reset all formatting'));
  lines.push('');

  return lines;
}

export default { name, description, usage, execute };
