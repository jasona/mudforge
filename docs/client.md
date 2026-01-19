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
- **Floating Stats Panel** - Draggable HP/MP/XP bars with real-time updates
- **Interactive Map Panel** - Floating, resizable map showing explored areas
- **Sound Panel** - Compact audio controls with per-category volume and mute
- **Visual IDE Editor** - Full-featured code editor for builders with syntax highlighting

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

## Stats Panel

The Stats Panel is a floating, draggable widget that displays your character's vital statistics in real-time.

### Features

- **Real-time Updates** - HP, MP, and XP bars update automatically during gameplay
- **Draggable** - Click and drag the header to reposition anywhere on screen
- **Collapsible** - Click the collapse button to minimize when not needed
- **Persistent Position** - Your preferred position is saved between sessions
- **Visual Progress Bars** - Color-coded bars for easy status monitoring

### Display Elements

```
+---------------------------+
|  Stats Panel         [-]  |  <- Header with collapse button
+---------------------------+
|  HP  [████████░░░] 80/100 |  <- Health bar (red/green)
|  MP  [██████░░░░░] 60/100 |  <- Mana bar (blue)
|  XP  [████░░░░░░░] 40%    |  <- Experience bar (gold)
+---------------------------+
```

### Bar Colors

| Stat | Color | Meaning |
|------|-------|---------|
| HP | Green | Healthy (>50%) |
| HP | Yellow | Wounded (25-50%) |
| HP | Red | Critical (<25%) |
| MP | Blue | Mana level |
| XP | Gold | Progress to next level |

### Controls

- **Drag**: Click the header and drag to reposition
- **Collapse**: Click `[-]` to minimize, `[+]` to expand
- **Auto-hide**: Panel hides when disconnected

## Map Panel

The Map Panel displays an interactive ASCII-art view of explored areas.

### Features

- **Auto-Discovery** - Rooms appear as you explore them
- **Draggable & Resizable** - Position and size to your preference
- **Current Location** - Your position is highlighted
- **Exit Indicators** - See available exits from each room
- **Collapsible** - Minimize when not needed

### Display Elements

```
+----------------------------------+
|  Map                        [-]  |
+----------------------------------+
|                                  |
|     [Tavern]----[Market]         |
|         |          |             |
|     [Square]---[Temple]          |
|         |                        |
|      [Gate]                      |
|                                  |
+----------------------------------+
```

### Legend

| Symbol | Meaning |
|--------|---------|
| `[Name]` | Visited room |
| `[*Name*]` | Current location |
| `----` | East-West connection |
| `|` | North-South connection |
| `?` | Unexplored exit |

### Controls

- **Drag**: Click header to move
- **Resize**: Drag edges to resize
- **Collapse**: Click `[-]` to minimize
- **Center**: Double-click to center on current location

## Sound Panel

The Sound Panel is a compact widget in the bottom-right corner for controlling game audio. See [Sound System](sound-system.md) for the complete developer guide.

### Features

- **Per-Category Toggles** - Enable/disable sound types independently
- **Volume Control** - Master volume slider (0-100%)
- **Activity Indicator** - Shows which sound category just played
- **Persistent Settings** - Preferences saved to browser localStorage

### Display Elements

```
+-----------------------------+
|  ⚔️ Combat       |  🔊     |  <- Compact view
+-----------------------------+

+-----------------------------+
|  🔊 Ready        |  🔊     |  <- Click to expand
+-----------------------------+
|  Volume  ═══●═══════  70%  |  <- Volume slider
+-----------------------------+
| ⚔️ Combat   ✨ Spell       |
| 💪 Skill    🧪 Potion      |  <- Category toggles
| 📜 Quest    🎉 Celebration |
| 💬 Discuss  ⚠️ Alert       |
| 🌿 Ambient  🖱️ Interface   |
+-----------------------------+
```

### Sound Categories

| Category | Icon | Default | Sounds |
|----------|------|---------|--------|
| Combat | ⚔️ | On | Hits, misses, blocks |
| Spell | ✨ | On | Spell casting, magic |
| Skill | 💪 | On | Skill use, abilities |
| Potion | 🧪 | On | Item consumption |
| Quest | 📜 | On | Quest events |
| Celebration | 🎉 | On | Level up, achievements |
| Discussion | 💬 | On | Chat, tells, channels |
| Alert | ⚠️ | On | Warnings, low HP |
| Ambient | 🌿 | Off | Room ambience |
| Interface | 🖱️ | Off | UI clicks |

### Controls

- **Click indicator**: Expand/collapse the settings panel
- **Click mute button**: Toggle all sounds on/off
- **Drag volume slider**: Adjust master volume
- **Click category buttons**: Toggle individual categories

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

Builders have access to two in-game editors:

### Visual IDE Editor

The `ide` command opens a full-featured code editor in the browser:

```
ide /areas/myzone/room.ts
ide here                      # Edit current room's source file
ide ~/myfile.ts               # Edit in home directory
```

Features:
- **Syntax Highlighting** - Full TypeScript/JavaScript highlighting
- **Line Numbers** - Easy code navigation
- **Search & Replace** - `Ctrl+F` for find/replace
- **Auto-Indent** - Smart indentation and bracket matching
- **Real-Time Errors** - Compile errors displayed after save
- **Keyboard Shortcuts** - `Ctrl+S` save, `Escape` close

### Line Editor

The `ed` command provides a classic line-based editor:

```
ed /areas/myzone/room.ts
ed here                       # Edit current room
```

Features:
- Line-by-line editing
- Print, insert, delete, substitute commands
- Works in terminal without browser features
- Classic MUD editor feel

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
