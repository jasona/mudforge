# Web Client

MudForge includes a modern, browser-based client with a Linear.app-inspired design. Players connect through their web browser without needing to install any software.

## Features

- **Modern Dark Theme** - Clean, Linear.app-inspired interface with subtle grays and purple accents
- **Monospace Terminal** - JetBrains Mono/Fira Code font for optimal readability
- **Full Color Support** - ANSI colors and custom color codes rendered properly
- **Command History** - Navigate previous commands with arrow keys
- **Auto-Scroll** - Terminal automatically scrolls to show new content
- **Responsive Design** - Works on desktop and mobile browsers
- **Connection Status** - Visual indicator showing connected/disconnected state

## Connecting

1. Start the MudForge server:
   ```bash
   npm run dev
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

3. The client will automatically connect to the server.

## Interface Overview

```
+----------------------------------------------------------+
| MudForge                              [Connected]         |  <- Header
+----------------------------------------------------------+
|                                                          |
|  Welcome to MudForge!                                    |
|  A Modern MUD Experience                                 |
|                                                          |
|  What is your name?                                      |  <- Terminal
|  > Hero                                                  |
|  Welcome back, Hero! Enter your password:                |
|                                                          |
+----------------------------------------------------------+
| [Enter command...]                          [Send]       |  <- Input
+----------------------------------------------------------+
```

### Header

- **MudForge** - Application title with accent indicator
- **Status Badge** - Shows connection state:
  - Green "CONNECTED" - Active connection
  - Yellow "CONNECTING" - Attempting to connect
  - Red "DISCONNECTED" - No connection

### Terminal Area

- Displays all game output
- Supports color formatting
- Auto-scrolls to latest content
- Can be scrolled manually to review history

### Input Area

- Type commands and press Enter to send
- Send button for mouse/touch input
- Placeholder text guides new users

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send command |
| `Up Arrow` | Previous command in history |
| `Down Arrow` | Next command in history |
| `Escape` | Clear input field |

## Color Support

The client renders both ANSI escape codes and MudForge's custom color syntax:

### Custom Color Codes

```
{red}Red text{/}
{green}Green text{/}
{blue}Blue text{/}
{yellow}Yellow text{/}
{cyan}Cyan text{/}
{magenta}Magenta text{/}
{bold}Bold text{/}
{dim}Dim text{/}
```

The `{/}` code resets formatting to default.

### Supported Colors

| Code | Color |
|------|-------|
| `{black}` | Black |
| `{red}` | Red |
| `{green}` | Green |
| `{yellow}` | Yellow |
| `{blue}` | Blue |
| `{magenta}` | Magenta |
| `{cyan}` | Cyan |
| `{white}` | White |

### Formatting Codes

| Code | Effect |
|------|--------|
| `{bold}` | Bold text |
| `{dim}` | Dimmed text |
| `{italic}` | Italic text |
| `{underline}` | Underlined text |
| `{/}` | Reset all formatting |

## Design System

The client uses a Linear.app-inspired design system:

### Colors

```css
/* Background colors */
--bg-primary: #0d0d0f;      /* Main background */
--bg-secondary: #141416;    /* Header/footer */
--bg-tertiary: #1a1a1f;     /* Input fields */
--bg-terminal: #0a0a0c;     /* Terminal area */

/* Text colors */
--text-primary: #f5f5f5;    /* Main text */
--text-secondary: #8b8b8e;  /* Secondary text */
--text-tertiary: #5c5c60;   /* Dimmed text */

/* Accent */
--accent: #5e6ad2;          /* Purple accent */
--accent-hover: #7c85e0;    /* Hover state */

/* Status */
--success: #4ade80;         /* Connected */
--error: #f87171;           /* Disconnected */
--warning: #fbbf24;         /* Connecting */
```

### Typography

- **UI Elements**: Inter font family
- **Terminal**: JetBrains Mono, Fira Code, or system monospace
- **Base Size**: 14px with 1.6 line height

## Reconnection

If the connection is lost:

1. The status badge will show "DISCONNECTED" in red
2. The client will attempt to reconnect automatically
3. Once reconnected, log back in with your character name
4. You'll resume your existing game session

## Mobile Support

The client is responsive and works on mobile devices:

- Touch-friendly send button
- Appropriate font sizes for smaller screens
- Scrollable terminal area
- Full keyboard support on mobile

## Code Editor (Builders)

Builders have access to an in-game code editor:

```
edit /areas/myzone/room.ts
```

The editor provides:
- Syntax highlighting (monospace display)
- Line numbers
- Error display panel
- Save and close buttons

## Technical Details

### Client Architecture

```
src/client/
├── index.html          # HTML structure
├── styles.css          # Linear.app-inspired styles
├── index.ts            # Entry point
├── client.ts           # Main client class
├── terminal.ts         # Terminal rendering
├── input-handler.ts    # Keyboard/input handling
├── websocket-client.ts # WebSocket connection
└── editor.ts           # Code editor component
```

### WebSocket Protocol

The client communicates via WebSocket:

```
ws://localhost:3000/ws   # Development
wss://example.com/ws     # Production (with SSL)
```

Messages are plain text strings:
- **Client → Server**: Player commands
- **Server → Client**: Game output with color codes

### Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Customization

### Changing the Theme

Edit `src/client/styles.css` to modify the color scheme. The CSS variables in `:root` control all colors.

### Adding Custom Fonts

Add font imports to `styles.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Your+Font&display=swap');

:root {
  --font-mono: 'Your Font', monospace;
}
```

### Building the Client

After making changes:

```bash
npm run build:client
```

This compiles and bundles the client files to `dist/client/`.
