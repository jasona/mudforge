# GUI Modal System Implementation Plan

## Overview

A server-driven GUI modal system allowing the MUD server to prompt clients to display interactive modals with rich layouts, input elements, images, and bidirectional data communication.

## Protocol Design

### Wire Protocol
Following existing patterns (MAP, STATS, IDE), GUI messages use `\x00[GUI]` binary prefix:
```
Server -> Client: \x00[GUI]{"action":"open","modal":{...}}\n
Client -> Server: \x00[GUI]{"action":"submit","modalId":"...",...}\n
```

### Message Types

**Server -> Client:**
- `open` - Open a modal with layout schema
- `update` - Update elements/data in open modal
- `close` - Close modal programmatically
- `error` - Show validation errors

**Client -> Server:**
- `submit` - Form submission with data
- `button` - Button click event
- `closed` - User closed modal (escape/X button)

## Schema Structure

```typescript
GUIOpenMessage {
  action: 'open'
  modal: ModalConfig      // title, size, background, closable
  layout: LayoutContainer // nested layout structure
  buttons?: ModalButton[] // footer buttons
  data?: Record<string, unknown> // initial form values
}
```

### Modal Sizes
- `small` (400px), `medium` (600px), `large` (800px), `fullscreen`, `auto`

### Layout Types
- `vertical` - Flexbox column
- `horizontal` - Flexbox row
- `grid` - CSS Grid with configurable columns
- `tabs` - Tabbed content panels
- `form` - Form-optimized vertical layout

### Input Elements
- `text`, `password`, `number` - Text inputs
- `textarea` - Multi-line text
- `select` - Dropdown selection
- `radio` - Radio button group
- `checkbox` - Checkbox input
- `slider` - Range input
- `button` - Action button
- `hidden` - Hidden data field

### Display Elements
- `text`, `heading`, `paragraph` - Text content
- `image` - Image display (supports backgrounds)
- `icon` - Icon display
- `divider` - Visual separator
- `progress` - Progress bar
- `spacer` - Layout spacing

### Styling
Each element supports inline styles:
- `width`, `height`, `padding`, `margin`
- `backgroundColor`, `color`, `fontSize`
- `textAlign`, `border`, `borderRadius`
- `flex`, `gridColumn`, `gridRow`

## Files to Create/Modify

### New Files

1. **`/mudlib/lib/gui-types.ts`** - Shared type definitions
   - ModalConfig, LayoutContainer, InputElement, DisplayElement
   - GUIServerMessage, GUIClientMessage union types
   - ValidationRule, ElementStyle, ModalButton

2. **`/src/client/gui/gui-modal.ts`** - Main modal manager
   - Opens/closes/updates modals
   - Manages escape key handling
   - Sends responses to server

3. **`/src/client/gui/gui-renderer.ts`** - DOM rendering engine
   - Renders schema to DOM elements
   - Tracks elements for updates
   - Collects form data

4. **`/src/client/gui/gui-layout.ts`** - Layout container renderers
   - Vertical, horizontal, grid layouts
   - Tab panel implementation

5. **`/src/client/gui/gui-elements.ts`** - Element renderers
   - Input element factories
   - Display element factories

6. **`/src/client/gui/gui-validation.ts`** - Client-side validation
   - Required, minLength, maxLength, pattern rules

### Files to Modify

1. **`/src/network/connection.ts`** (lines 228-239 pattern)
   - Add `GUIMessage` interface
   - Add `sendGUI(message: GUIMessage)` method

2. **`/src/client/websocket-client.ts`**
   - Add `\x00[GUI]` prefix parsing in onmessage handler
   - Emit `gui-message` events
   - Add `sendGUIMessage()` method

3. **`/src/client/client.ts`**
   - Import and initialize GUIModal
   - Wire up `gui-message` event handler

4. **`/src/client/styles.css`**
   - Add `.gui-modal-*` styles (overlay, header, body, footer)
   - Add `.gui-field`, `.gui-input`, `.gui-select` styles
   - Add `.gui-btn-*` variants
   - Add `.gui-tab-*` styles
   - Add `.gui-progress`, `.gui-slider` styles

5. **`/mudlib/efuns.d.ts`**
   - Add `guiOpen(message: GUIServerMessage): void`

6. **`/src/driver/efun-bridge.ts`**
   - Implement `guiOpen` efun

7. **`/mudlib/std/player.ts`**
   - Add `sendGUI` to Connection interface
   - Optional: Add convenience methods for common dialogs

### Optional: Asset Infrastructure

8. **`/mudlib/assets/images/gui/`** - Create directory structure
   - `backgrounds/` - Modal background images
   - `icons/` - UI icons
   - `portraits/` - Character portraits

9. **`/src/network/server.ts`** (if images needed)
   - Add static file route for `/assets/`

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create `gui-types.ts` with all type definitions
2. Add `sendGUI` to Connection class
3. Add GUI parsing to WebSocketClient
4. Add `guiOpen` efun

### Phase 2: Client Renderer
1. Create `gui-modal.ts` modal manager
2. Create `gui-renderer.ts` DOM rendering
3. Create `gui-layout.ts` layout renderers
4. Create `gui-elements.ts` element renderers
5. Create `gui-validation.ts`

### Phase 3: Styling & Integration
1. Add CSS styles for all GUI components
2. Integrate into MudClient
3. Wire up bidirectional messaging

### Phase 4: Server Helpers
1. Add GUI response handling to Player
2. Create builder helpers for common patterns

### Phase 5: Testing & Examples
1. Create test modal command
2. Build example use cases (shop, dialog, form)

## Example Usage (Server-Side)

```typescript
// Simple confirmation dialog
efuns.guiOpen({
  action: 'open',
  modal: {
    id: 'confirm-delete',
    title: 'Confirm Delete',
    size: 'small',
    closable: true,
  },
  layout: {
    type: 'vertical',
    gap: '16px',
    children: [
      { id: 'msg', type: 'paragraph', content: 'Are you sure?' },
    ],
  },
  buttons: [
    { id: 'yes', label: 'Delete', action: 'submit', variant: 'danger' },
    { id: 'no', label: 'Cancel', action: 'cancel' },
  ],
});
```

## Key Design Decisions

1. **Schema-driven rendering** - Server sends declarative JSON, client renders
2. **Binary prefix protocol** - Follows existing MAP/STATS/IDE pattern
3. **Callback-based responses** - Server registers handlers for modal responses
4. **Client-side validation** - Immediate feedback, server validates on submit
5. **No framework dependency** - Vanilla TypeScript matching existing client
6. **CSS variables** - Consistent with existing theming system
