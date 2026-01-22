# Giphy Integration

MudForge integrates with the Giphy API to allow players to share animated GIFs on communication channels. This guide covers setup, usage, configuration, and technical details.

## Overview

The Giphy integration provides:

- **GIF Sharing on Channels**: Share GIFs using `;` prefix syntax (e.g., `ooc ;funny cats`)
- **Popup Modal Display**: GIFs appear as visual popups for all channel members
- **Auto-Close Timer**: Modals automatically dismiss after configurable timeout
- **Clickable Links**: Re-open GIFs via `[View GIF]` links in the comm panel
- **Rate Limiting**: Per-player rate limits prevent spam
- **Content Filtering**: Configurable content rating filter (G, PG, PG-13, R)

## Quick Start

### 1. Get a Giphy API Key

1. Visit [Giphy Developers](https://developers.giphy.com/)
2. Create an account and app
3. Copy your API key

### 2. Configure Environment

Add to your `.env` file:

```env
GIPHY_API_KEY=your_api_key_here
```

### 3. Restart Server

```bash
npm run dev
```

### 4. Share a GIF

In-game, use the `;` prefix on any channel:

```
ooc ;funny cats
ooc ;celebration dance
newbie ;thumbs up
```

## Message Flow

```
Player                     Server                      All Channel Members
   │                          │                               │
   │  "ooc ;funny cats"       │                               │
   │  ────────────────────►   │                               │
   │                          │  Giphy API                    │
   │                          │  ────────►                    │
   │                          │  ◄────────                    │
   │                          │  GIF URL                      │
   │                          │                               │
   │                          │  Broadcast text + modal       │
   │                          │  ────────────────────────────►│
   │                          │                               │  Show popup
   │                          │                               │  (auto-close)
   │                          │                               │
   │                          │  Comm panel message           │
   │                          │  ────────────────────────────►│
   │                          │                               │  [View GIF]
   │                          │                               │  link
```

## User Guide

### Sharing GIFs

Use the `;` prefix followed by a search query on any channel:

```
ooc ;cats being silly
ooc ;happy dance
guild ;victory celebration
```

**What happens:**
1. Server searches Giphy for your query
2. First result is displayed as a popup modal to all channel members
3. A text message appears in the terminal and comm panel
4. Modal auto-closes after 5 seconds (configurable)

### Terminal Output

When someone shares a GIF, you'll see:

```
[OOC] PlayerName shares a GIF: 'funny cats'
```

### Comm Panel

The comm panel shows the same message with a clickable `[View GIF]` link:

```
[OOC] PlayerName: shares a GIF: 'funny cats' [View GIF]
```

Click `[View GIF]` to re-open the popup for another 5 seconds.

### GIF Modal

The popup modal displays:
- Header: "{SenderName} shares on {Channel}:"
- The animated GIF image (max 400x300)
- Search query in italics
- "Powered by GIPHY" attribution
- Close button

### Rate Limiting

By default, players can share 3 GIFs per minute. If you exceed this:

```
You've shared too many GIFs. Try again in X seconds.
```

## Configuration

### In-Game Settings

Administrators can configure Giphy settings using the `config` command:

```
config giphy.enabled          # View current setting
config set giphy.enabled false    # Disable GIF sharing
config set giphy.autoCloseSeconds 10  # Change auto-close time
config set giphy.rating pg-13     # Change content rating
config set giphy.playerRateLimitPerMinute 5  # Change rate limit
```

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `giphy.enabled` | boolean | `true` | Master enable/disable for GIF sharing |
| `giphy.autoCloseSeconds` | number | `5` | Seconds before popup auto-closes (0 = manual close only) |
| `giphy.rating` | string | `'pg'` | Content rating filter |
| `giphy.playerRateLimitPerMinute` | number | `3` | Max GIF shares per player per minute |

### Content Ratings

| Rating | Description |
|--------|-------------|
| `g` | General audiences - suitable for all ages |
| `pg` | Parental guidance suggested (default) |
| `pg-13` | Parents strongly cautioned |
| `r` | Restricted - adult content |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GIPHY_API_KEY` | Your Giphy API key (required for feature to work) |

## The `gif` Command

Players can re-open cached GIFs manually:

```
gif <id>
```

This is primarily used internally when clicking `[View GIF]` links, but can be used directly if you have a GIF ID.

**Note:** GIFs are cached for 1 hour. After that, the ID expires.

## Efuns Reference

### giphyAvailable()

Check if Giphy GIF sharing is configured and available.

```typescript
if (efuns.giphyAvailable()) {
  // Giphy is ready to use
}
```

Returns `false` if:
- `GIPHY_API_KEY` is not set
- `giphy.enabled` config is `false`

### giphySearch(query)

Search for a GIF on Giphy.

```typescript
const result = await efuns.giphySearch('funny cats');

if (result.success) {
  console.log(result.url);    // GIF URL
  console.log(result.title);  // GIF title
} else {
  console.log(result.error);  // Error message
}
```

**Parameters:**
- `query: string` - Search terms (max 100 characters)

**Returns:**
```typescript
{
  success: boolean;
  url?: string;      // GIF URL (fixed_height variant)
  title?: string;    // GIF title from Giphy
  error?: string;    // Error message if failed
}
```

**Possible Errors:**
- `"Giphy not configured"` - No API key
- `"GIF sharing is currently disabled"` - Feature disabled
- `"Search query is empty"` - Empty query string
- `"You've shared too many GIFs..."` - Rate limited
- `"No GIFs found for 'query'"` - No results
- `"Giphy API error: XXX"` - API returned error

### giphyGenerateId()

Generate a unique ID for caching a GIF.

```typescript
const gifId = efuns.giphyGenerateId();
// e.g., "gif_lxyz123_abc456"
```

### giphyCacheGif(id, data)

Cache a GIF for later retrieval via clickable links.

```typescript
efuns.giphyCacheGif('gif_abc123', {
  url: 'https://media.giphy.com/...',
  title: 'Funny Cat',
  senderName: 'PlayerName',
  channelName: 'OOC',
  query: 'funny cats',
});
```

**Parameters:**
- `id: string` - Unique GIF ID (from `giphyGenerateId()`)
- `data: object` - GIF data to cache:
  - `url: string` - GIF URL
  - `title: string` - GIF title
  - `senderName: string` - Who shared it
  - `channelName: string` - Which channel
  - `query: string` - Original search query

**Cache Duration:** 1 hour

### giphyGetCachedGif(id)

Retrieve a cached GIF by ID.

```typescript
const gif = efuns.giphyGetCachedGif('gif_abc123');

if (gif) {
  console.log(gif.url);         // GIF URL
  console.log(gif.senderName);  // Who shared it
  console.log(gif.channelName); // Which channel
  console.log(gif.query);       // Search query
  console.log(gif.expiresAt);   // Expiration timestamp
}
```

Returns `undefined` if:
- GIF ID doesn't exist
- Cache has expired (1 hour TTL)

## Modal Library

### openGiphyModal(player, options)

Open a GIF modal for a player.

```typescript
import { openGiphyModal } from '../lib/giphy-modal.js';

openGiphyModal(player, {
  gifUrl: 'https://media.giphy.com/...',
  senderName: 'PlayerName',
  channelName: 'OOC',
  searchQuery: 'funny cats',
  autoCloseMs: 5000,  // 5 seconds
});
```

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `gifUrl` | string | URL of the GIF to display |
| `senderName` | string | Name shown in header |
| `channelName` | string | Channel name shown in header |
| `searchQuery` | string | Search query shown in italics |
| `autoCloseMs` | number | Auto-close timeout in milliseconds (0 = no auto-close) |

### closeGiphyModal(player)

Manually close a GIF modal for a player.

```typescript
import { closeGiphyModal } from '../lib/giphy-modal.js';

closeGiphyModal(player);
```

## Channel Integration

The Giphy integration is built into the channel system. When a message starts with `;`, the channel daemon:

1. Validates the channel and player access
2. Checks if Giphy is enabled
3. Searches Giphy for the query
4. Generates a unique GIF ID and caches the result
5. Broadcasts to all channel members:
   - Text message to terminal
   - Comm panel message with `[View GIF]` link
   - GIF modal popup

### Code Flow

```
channels.ts:send()
    │
    ├── message.startsWith(':') → sendEmote()
    │
    └── message.startsWith(';') → sendGiphy()
                                     │
                                     ├── Check giphyAvailable()
                                     ├── Call giphySearch()
                                     ├── Generate GIF ID
                                     ├── Cache GIF data
                                     └── broadcastGif()
                                            │
                                            ├── Format terminal message
                                            ├── Send comm panel message
                                            └── Open modal for each member
```

## Client Integration

### Comm Panel

The comm panel (`src/client/comm-panel.ts`) handles GIF links:

1. Messages with `gifId` render `[View GIF]` links
2. Clicking a link triggers `onGifClick` callback
3. Client sends `gif <id>` command to server
4. Server looks up cached GIF and opens modal

### CSS Styling

The `[View GIF]` link uses the `.gif-link` class. You can customize its appearance in `src/client/styles.css`:

```css
.gif-link {
  color: #4ade80;
  text-decoration: underline;
  cursor: pointer;
}

.gif-link:hover {
  color: #86efac;
}
```

## Error Handling

### No API Key

If `GIPHY_API_KEY` is not set:
- `giphyAvailable()` returns `false`
- Players see: "GIF sharing is currently disabled."
- Server logs: "Giphy client initialized" is NOT shown on startup

### Rate Limiting

When a player exceeds their rate limit:
- Request is rejected immediately (no API call)
- Player sees: "You've shared too many GIFs. Try again in X seconds."
- Rate limit window: 1 minute sliding window

### API Errors

If the Giphy API returns an error:
- Player sees: "Giphy API error: {status code}"
- Error is not logged to server (to avoid spam)

### No Results

If no GIFs match the search:
- Player sees: "No GIFs found for 'query'"
- Not cached (allows immediate retry with different query)

### Expired Cache

If a `[View GIF]` link is clicked after 1 hour:
- Player sees: "That GIF is no longer available."
- They can ask the original sharer to share again

## Security Considerations

### Content Filtering

- Default rating is `pg` (parental guidance)
- Administrators can adjust via `config set giphy.rating`
- All content comes from Giphy's filtered API

### URL Validation

- Only URLs from `giphy.com` domain are accepted
- Malformed responses are rejected

### Input Sanitization

- Search queries are trimmed and limited to 100 characters
- Special characters are URL-encoded for API requests

### Rate Limiting

- Per-player rate limiting prevents abuse
- Default: 3 GIFs per minute per player
- Configurable via `giphy.playerRateLimitPerMinute`

## Performance

### Caching

The system uses two caches:

1. **Search Cache** (5 minutes TTL)
   - Caches Giphy API responses by query
   - Reduces API calls for repeated searches
   - Max 500 entries (auto-cleanup)

2. **GIF Cache** (1 hour TTL)
   - Stores GIF data for clickable links
   - Max 1000 entries (auto-cleanup)

### API Calls

- One API call per unique search (within cache window)
- Rate limiting is checked before making API calls
- Failed searches are not cached (allows retry)

## Troubleshooting

### GIFs Not Working

1. Check `efuns.giphyAvailable()` returns `true`
2. Verify `GIPHY_API_KEY` is set in `.env`
3. Check `config giphy.enabled` is `true`
4. Look for errors in server logs

### Modal Not Appearing

1. Verify player is on the channel
2. Check player hasn't disabled GUI modals
3. Ensure WebSocket connection is active

### [View GIF] Not Clickable

1. Check browser console for JavaScript errors
2. Verify client bundle is up to date (`npm run build`)
3. Ensure comm panel is properly initialized

### Rate Limit Issues

Adjust rate limit:
```
config set giphy.playerRateLimitPerMinute 10
```

Or temporarily disable for testing:
```
config set giphy.enabled false
```

## Example: Custom GIF Integration

You can use the Giphy efuns for custom integrations beyond channels:

```typescript
// Custom command to share a celebration GIF
export async function celebrateCommand(ctx: CommandContext): Promise<void> {
  if (!efuns.giphyAvailable()) {
    ctx.sendLine('GIF sharing is not available.');
    return;
  }

  const result = await efuns.giphySearch('celebration party');

  if (!result.success || !result.url) {
    ctx.sendLine(`{yellow}${result.error || 'Could not find a GIF.'}{/}`);
    return;
  }

  // Get auto-close time from config
  const autoCloseSeconds = efuns.getMudConfig<number>('giphy.autoCloseSeconds') ?? 5;

  // Show GIF to player
  openGiphyModal(ctx.player, {
    gifUrl: result.url,
    senderName: 'System',
    channelName: 'Celebration',
    searchQuery: 'celebration party',
    autoCloseMs: autoCloseSeconds * 1000,
  });

  ctx.sendLine('{green}Congratulations! Here\'s a celebration GIF!{/}');
}
```

## Architecture

### Files

| File | Purpose |
|------|---------|
| `src/driver/giphy-client.ts` | Giphy API client, caching, rate limiting |
| `src/driver/config.ts` | Driver configuration (includes giphyApiKey) |
| `mudlib/daemons/config.ts` | Mud-wide config settings |
| `mudlib/daemons/channels.ts` | Channel daemon with Giphy integration |
| `mudlib/lib/giphy-modal.ts` | GIF popup modal |
| `mudlib/cmds/player/_gif.ts` | Command to re-open cached GIFs |
| `mudlib/efuns.d.ts` | Type declarations for efuns |
| `src/driver/efun-bridge.ts` | Efuns implementation |
| `src/client/comm-panel.ts` | Client comm panel with GIF links |
| `src/client/client.ts` | Client wiring for GIF click callback |

### Data Flow

```
Player Input: "ooc ;cats"
       │
       ▼
channels.ts:send()
       │
       ▼
channels.ts:sendGiphy()
       │
       ├──► efuns.giphySearch("cats")
       │           │
       │           ▼
       │    giphy-client.ts:search()
       │           │
       │           ├──► Check rate limit
       │           ├──► Check search cache
       │           └──► Giphy API (if not cached)
       │                    │
       │           ◄────────┘
       │
       ├──► efuns.giphyGenerateId()
       ├──► efuns.giphyCacheGif()
       │
       └──► channels.ts:broadcastGif()
                  │
                  ├──► player.receive() [terminal]
                  ├──► efuns.sendComm() [comm panel]
                  └──► openGiphyModal() [popup]
```

## Related Documentation

- [Channels System](daemons.md#channel-daemon) - Channel daemon details
- [GUI Modals](gui-modals.md) - Modal system documentation
- [Client Features](client.md) - Client-side features
- [Efuns Reference](efuns.md) - Complete efuns API
- [Configuration](mudlib-guide.md#configuration) - Config daemon guide
