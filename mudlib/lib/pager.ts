/**
 * Pager - Linux-style paging for displaying long content.
 *
 * Provides page-by-page display of content with navigation controls.
 * Similar to 'less' or 'more' in Linux.
 *
 * Controls:
 *   Enter/Space/j - Next page
 *   b/k           - Previous page
 *   q             - Quit
 *   g             - Go to beginning
 *   G             - Go to end
 *   /<pattern>    - Search forward
 *   n             - Next search result
 *   <number>      - Go to line number
 */

import type { MudObject } from '../std/object.js';

/**
 * Player interface for paging.
 */
interface PagerPlayer extends MudObject {
  name: string;
  setInputHandler(handler: ((input: string) => void | Promise<void>) | null): void;
  receive(message: string): void;
}

/**
 * Pager options.
 */
export interface PagerOptions {
  /** Lines per page (default: 20) */
  linesPerPage?: number;
  /** Title to display at top (optional) */
  title?: string;
  /** Show line numbers (default: false) */
  showLineNumbers?: boolean;
  /** Callback when pager exits */
  onExit?: () => void;
}

/**
 * Pager state.
 */
interface PagerState {
  lines: string[];
  currentLine: number;
  linesPerPage: number;
  title: string | null;
  showLineNumbers: boolean;
  searchPattern: string | null;
  searchMatches: number[];
  searchIndex: number;
  onExit: (() => void) | null;
}

/**
 * Start a pager for the given content.
 *
 * @param player The player to show content to
 * @param content The content to display (string or array of lines)
 * @param options Pager options
 */
export function startPager(
  player: MudObject,
  content: string | string[],
  options: PagerOptions = {}
): void {
  const pagerPlayer = player as PagerPlayer;

  // Parse content into lines
  const lines = Array.isArray(content) ? content : content.split('\n');

  // Set up state
  const state: PagerState = {
    lines,
    currentLine: 0,
    linesPerPage: options.linesPerPage ?? 20,
    title: options.title ?? null,
    showLineNumbers: options.showLineNumbers ?? false,
    searchPattern: null,
    searchMatches: [],
    searchIndex: -1,
    onExit: options.onExit ?? null,
  };

  // If content fits on one page, just display it without paging
  if (lines.length <= state.linesPerPage) {
    displayAllContent(pagerPlayer, state);
    if (state.onExit) {
      state.onExit();
    }
    return;
  }

  // Show first page
  displayPage(pagerPlayer, state);

  // Set up input handler
  pagerPlayer.setInputHandler((input: string) => {
    handlePagerInput(pagerPlayer, state, input);
  });
}

/**
 * Display all content without paging (for short content).
 */
function displayAllContent(player: PagerPlayer, state: PagerState): void {
  if (state.title) {
    player.receive(`{cyan}${state.title}{/}\n`);
  }

  for (let i = 0; i < state.lines.length; i++) {
    const line = state.lines[i];
    if (state.showLineNumbers) {
      const lineNum = (i + 1).toString().padStart(4);
      player.receive(`{dim}${lineNum}{/}  ${line}\n`);
    } else {
      player.receive(`${line}\n`);
    }
  }
}

/**
 * Display a page of content.
 */
function displayPage(player: PagerPlayer, state: PagerState): void {
  // Clear line and show title on first page
  if (state.currentLine === 0 && state.title) {
    player.receive(`{cyan}${state.title}{/}\n`);
  }

  // Calculate end line
  const endLine = Math.min(state.currentLine + state.linesPerPage, state.lines.length);

  // Display lines
  for (let i = state.currentLine; i < endLine; i++) {
    const line = state.lines[i];
    if (state.showLineNumbers) {
      const lineNum = (i + 1).toString().padStart(4);
      player.receive(`{dim}${lineNum}{/}  ${line}\n`);
    } else {
      player.receive(`${line}\n`);
    }
  }

  // Show prompt
  showPagerPrompt(player, state);
}

/**
 * Show the pager prompt.
 */
function showPagerPrompt(player: PagerPlayer, state: PagerState): void {
  const endLine = Math.min(state.currentLine + state.linesPerPage, state.lines.length);
  const percent = Math.round((endLine / state.lines.length) * 100);

  if (endLine >= state.lines.length) {
    player.receive(`{inverse} (END) {/} {dim}Press q to exit, b for previous page{/} `);
  } else {
    player.receive(
      `{inverse} --More-- (${percent}%) {/} {dim}Enter/Space/j=next, b=prev, q=quit{/} `
    );
  }
}

/**
 * Handle pager input.
 */
function handlePagerInput(player: PagerPlayer, state: PagerState, input: string): void {
  const cmd = input.trim().toLowerCase();

  // Quit
  if (cmd === 'q' || cmd === 'quit') {
    exitPager(player, state);
    return;
  }

  // Next page (Enter, Space, j, or 'n' without search)
  if (cmd === '' || cmd === ' ' || cmd === 'j' || (cmd === 'n' && !state.searchPattern)) {
    const nextLine = state.currentLine + state.linesPerPage;
    if (nextLine < state.lines.length) {
      state.currentLine = nextLine;
      displayPage(player, state);
    } else {
      // Already at end
      player.receive('\n{dim}(END - press q to quit){/}\n');
      showPagerPrompt(player, state);
    }
    return;
  }

  // Previous page
  if (cmd === 'b' || cmd === 'p' || cmd === 'k') {
    const prevLine = state.currentLine - state.linesPerPage;
    state.currentLine = Math.max(0, prevLine);
    displayPage(player, state);
    return;
  }

  // Go to beginning
  if (cmd === 'g') {
    state.currentLine = 0;
    displayPage(player, state);
    return;
  }

  // Go to end
  if (cmd === 'g' && input === 'G') {
    // Capital G
    state.currentLine = Math.max(0, state.lines.length - state.linesPerPage);
    displayPage(player, state);
    return;
  }

  // Handle capital G separately
  if (input.trim() === 'G') {
    state.currentLine = Math.max(0, state.lines.length - state.linesPerPage);
    displayPage(player, state);
    return;
  }

  // Search
  if (cmd.startsWith('/')) {
    const pattern = input.trim().slice(1);
    if (pattern) {
      searchForward(player, state, pattern);
    } else {
      player.receive('\n{yellow}Empty search pattern{/}\n');
      showPagerPrompt(player, state);
    }
    return;
  }

  // Next search result
  if (cmd === 'n' && state.searchPattern) {
    nextSearchResult(player, state);
    return;
  }

  // Go to line number
  const lineNum = parseInt(cmd, 10);
  if (!isNaN(lineNum) && lineNum > 0) {
    const targetLine = Math.min(lineNum - 1, state.lines.length - 1);
    state.currentLine = Math.max(0, targetLine);
    displayPage(player, state);
    return;
  }

  // Help
  if (cmd === 'h' || cmd === '?') {
    showPagerHelp(player);
    showPagerPrompt(player, state);
    return;
  }

  // Unknown command - just show prompt again
  showPagerPrompt(player, state);
}

/**
 * Search forward in content.
 */
function searchForward(player: PagerPlayer, state: PagerState, pattern: string): void {
  state.searchPattern = pattern;
  state.searchMatches = [];

  // Find all matches
  const lowerPattern = pattern.toLowerCase();
  for (let i = 0; i < state.lines.length; i++) {
    if (state.lines[i].toLowerCase().includes(lowerPattern)) {
      state.searchMatches.push(i);
    }
  }

  if (state.searchMatches.length === 0) {
    player.receive(`\n{yellow}Pattern not found: ${pattern}{/}\n`);
    showPagerPrompt(player, state);
    return;
  }

  // Find first match after current position
  state.searchIndex = state.searchMatches.findIndex((line) => line >= state.currentLine);
  if (state.searchIndex === -1) {
    state.searchIndex = 0; // Wrap to beginning
  }

  state.currentLine = state.searchMatches[state.searchIndex];
  player.receive(
    `\n{green}Found ${state.searchMatches.length} match(es). Showing match ${state.searchIndex + 1}:{/}\n`
  );
  displayPage(player, state);
}

/**
 * Go to next search result.
 */
function nextSearchResult(player: PagerPlayer, state: PagerState): void {
  if (!state.searchPattern || state.searchMatches.length === 0) {
    player.receive('\n{yellow}No previous search{/}\n');
    showPagerPrompt(player, state);
    return;
  }

  state.searchIndex = (state.searchIndex + 1) % state.searchMatches.length;
  state.currentLine = state.searchMatches[state.searchIndex];
  player.receive(
    `\n{dim}Match ${state.searchIndex + 1} of ${state.searchMatches.length}{/}\n`
  );
  displayPage(player, state);
}

/**
 * Show pager help.
 */
function showPagerHelp(player: PagerPlayer): void {
  player.receive(`
{cyan}Pager Controls:{/}
  {bold}Enter/Space/j{/} - Next page
  {bold}b/k{/}           - Previous page
  {bold}g{/}             - Go to beginning
  {bold}G{/}             - Go to end
  {bold}/<pattern>{/}    - Search for pattern
  {bold}n{/}             - Next search result
  {bold}<number>{/}      - Go to line number
  {bold}q{/}             - Quit
  {bold}h / ?{/}         - Show this help
`);
}

/**
 * Exit the pager.
 */
function exitPager(player: PagerPlayer, state: PagerState): void {
  player.setInputHandler(null);
  player.receive('\n');
  if (state.onExit) {
    state.onExit();
  }
}

export default { startPager };
