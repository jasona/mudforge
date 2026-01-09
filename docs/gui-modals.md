# GUI Modal System

The GUI modal system allows server-side code to display rich, interactive modal dialogs in the web client. Modals can contain forms, images, progress bars, tabbed interfaces, and more.

## Overview

The system is **schema-driven**: the server sends a JSON schema describing the modal's structure, and the client renders it. This keeps all logic server-side while enabling rich client experiences.

```
Server                              Client
  │                                   │
  │  ──── GUIOpenMessage ────────►    │  Renders modal
  │                                   │
  │  ◄─── GUISubmitMessage ───────    │  User submits
  │                                   │
  │  ──── GUICloseMessage ───────►    │  Closes modal
  │                                   │
```

## Quick Start

### Simple Confirmation Dialog

```typescript
import type { GUIOpenMessage, GUIClientMessage } from '../lib/gui-types.js';

// In a command or NPC interaction:
function showConfirmation(ctx: CommandContext): void {
  const message: GUIOpenMessage = {
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
        {
          type: 'paragraph',
          id: 'message',
          content: 'Are you sure you want to delete this item?',
        },
      ],
    },
    buttons: [
      { id: 'yes', label: 'Delete', action: 'submit', variant: 'danger' },
      { id: 'no', label: 'Cancel', action: 'cancel', variant: 'secondary' },
    ],
  };

  // Send to player
  efuns.guiSend(message);

  // Handle response
  const player = ctx.player as MudObject & {
    onGUIResponse?: (msg: GUIClientMessage) => void;
  };

  player.onGUIResponse = (response) => {
    if (response.action === 'submit' && response.buttonId === 'yes') {
      ctx.sendLine('Item deleted!');
    }
    player.onGUIResponse = undefined; // Clean up handler
  };
}
```

## Sending Modals

Use `efuns.guiSend()` to send GUI messages to the current player:

```typescript
efuns.guiSend(message);
```

The message must have an `action` property. For opening modals, use `action: 'open'`.

## Message Types

### Server → Client

| Action | Description |
|--------|-------------|
| `open` | Open a new modal |
| `update` | Update elements in an open modal |
| `close` | Close a modal programmatically |
| `error` | Show validation errors |

### Client → Server

| Action | Description |
|--------|-------------|
| `submit` | Form submission (submit button clicked) |
| `button` | Non-submit button clicked |
| `closed` | User closed modal (escape, X button, cancel) |

## Modal Configuration

The `modal` property configures the modal window itself:

```typescript
modal: {
  // Required
  id: string;           // Unique identifier
  title: string;        // Header title

  // Optional
  subtitle?: string;    // Subtitle below title
  size?: 'small' | 'medium' | 'large' | 'fullscreen' | 'auto';
  width?: string;       // Custom width (e.g., '500px')
  height?: string;      // Custom height
  closable?: boolean;   // Show close button (default: true)
  escapable?: boolean;  // Close on Escape key (default: true)

  // Styling
  backgroundColor?: string;
  backgroundImage?: string;
  headerStyle?: ElementStyle;
  bodyStyle?: ElementStyle;
  footerStyle?: ElementStyle;
}
```

### Size Reference

| Size | Width |
|------|-------|
| `small` | 400px |
| `medium` | 600px |
| `large` | 800px |
| `fullscreen` | 100% viewport |
| `auto` | Fits content |

## Layouts

Layouts are containers that organize child elements. Every modal needs a root layout.

### Vertical Layout

Stack children vertically (column):

```typescript
{
  type: 'vertical',
  gap: '16px',           // Space between children
  children: [
    { type: 'heading', id: 'h1', content: 'Title', level: 2 },
    { type: 'paragraph', id: 'p1', content: 'Some text...' },
  ],
}
```

### Horizontal Layout

Arrange children horizontally (row):

```typescript
{
  type: 'horizontal',
  gap: '12px',
  children: [
    { type: 'text', id: 'label', content: 'Name:' },
    { type: 'text', id: 'input', name: 'playerName', placeholder: 'Enter name' },
  ],
}
```

### Grid Layout

CSS Grid for complex arrangements:

```typescript
{
  type: 'grid',
  columns: 2,            // Number of columns (or CSS value like '1fr 2fr')
  gap: '12px',
  children: [
    { type: 'text', id: 'l1', content: 'Strength:' },
    { type: 'text', id: 'v1', content: '18' },
    { type: 'text', id: 'l2', content: 'Dexterity:' },
    { type: 'text', id: 'v2', content: '14' },
  ],
}
```

### Form Layout

Optimized for form fields with consistent label spacing:

```typescript
{
  type: 'form',
  gap: '12px',
  children: [
    { type: 'text', id: 'name', name: 'name', label: 'Character Name' },
    { type: 'select', id: 'class', name: 'class', label: 'Class', options: [...] },
  ],
}
```

### Tabs Layout

Tabbed interface for multi-section content:

```typescript
{
  type: 'tabs',
  children: [
    {
      type: 'vertical',
      tabLabel: 'Stats',      // Tab button text
      tabId: 'tab-stats',
      children: [
        { type: 'heading', id: 'h1', content: 'Statistics', level: 3 },
        // ... stats content
      ],
    },
    {
      type: 'vertical',
      tabLabel: 'Equipment',
      tabId: 'tab-equip',
      children: [
        { type: 'heading', id: 'h2', content: 'Equipment', level: 3 },
        // ... equipment content
      ],
    },
  ],
}
```

## Input Elements

Input elements collect data from the user. All inputs require `id` and `name` properties.

### Text Input

```typescript
{
  type: 'text',
  id: 'username',
  name: 'username',
  label: 'Username',
  placeholder: 'Enter username...',
  value: '',                    // Default value
  validation: [
    { type: 'required', message: 'Username is required' },
    { type: 'minLength', value: 3, message: 'At least 3 characters' },
  ],
}
```

### Password Input

```typescript
{
  type: 'password',
  id: 'password',
  name: 'password',
  label: 'Password',
  placeholder: 'Enter password...',
}
```

### Number Input

```typescript
{
  type: 'number',
  id: 'amount',
  name: 'amount',
  label: 'Quantity',
  min: 1,
  max: 100,
  step: 1,
  value: 1,
}
```

### Textarea

```typescript
{
  type: 'textarea',
  id: 'description',
  name: 'description',
  label: 'Description',
  placeholder: 'Enter description...',
  rows: 4,
}
```

### Select (Dropdown)

```typescript
{
  type: 'select',
  id: 'class',
  name: 'characterClass',
  label: 'Choose a Class',
  options: [
    { value: 'warrior', label: 'Warrior' },
    { value: 'mage', label: 'Mage' },
    { value: 'rogue', label: 'Rogue' },
    { value: 'cleric', label: 'Cleric', disabled: true },  // Disabled option
  ],
  value: 'warrior',  // Default selection
}
```

### Radio Buttons

```typescript
{
  type: 'radio',
  id: 'difficulty',
  name: 'difficulty',
  label: 'Difficulty',
  options: [
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
  ],
  value: 'normal',  // Default selection
}
```

### Checkbox

```typescript
{
  type: 'checkbox',
  id: 'agree',
  name: 'agreeToTerms',
  label: 'I agree to the terms and conditions',
  value: false,  // Default state
}
```

### Slider

```typescript
{
  type: 'slider',
  id: 'volume',
  name: 'volume',
  label: 'Volume',
  min: 0,
  max: 100,
  step: 5,
  value: 50,
}
```

### Hidden Field

Store data without displaying it:

```typescript
{
  type: 'hidden',
  id: 'itemId',
  name: 'itemId',
  value: 'sword-123',
}
```

### Button (Inline)

Buttons inside the layout (not footer):

```typescript
{
  type: 'button',
  id: 'buy-btn',
  name: 'action',
  label: 'Buy Now',
  action: 'custom',
  customAction: 'buy-item',
  variant: 'primary',
}
```

## Display Elements

Display elements show content but don't collect input.

### Heading

```typescript
{
  type: 'heading',
  id: 'title',
  content: 'Welcome!',
  level: 2,  // 1-6, like h1-h6
}
```

### Paragraph

```typescript
{
  type: 'paragraph',
  id: 'intro',
  content: 'This is a longer block of text that describes something important.',
}
```

### Text (Inline)

```typescript
{
  type: 'text',
  id: 'label',
  content: 'Gold: 1,234',
  style: { color: '#f4d03f', fontWeight: 'bold' },
}
```

### Divider

Horizontal line separator:

```typescript
{
  type: 'divider',
  id: 'div1',
}
```

### Progress Bar

```typescript
{
  type: 'progress',
  id: 'hp-bar',
  content: 'Health',        // Optional label
  progress: 75,             // 0-100
  progressColor: '#e74c3c', // Custom color
}
```

### Image

```typescript
{
  type: 'image',
  id: 'portrait',
  src: '/assets/images/portrait.png',
  alt: 'Character portrait',
  style: { width: '100px', height: '100px', borderRadius: '50%' },
}
```

### Spacer

Add empty space:

```typescript
{
  type: 'spacer',
  id: 'space1',
  style: { height: '20px' },
}
```

### HTML (Raw)

Render raw HTML (use carefully):

```typescript
{
  type: 'html',
  id: 'custom',
  content: '<strong>Bold</strong> and <em>italic</em>',
}
```

## Footer Buttons

Buttons in the modal footer:

```typescript
buttons: [
  {
    id: 'submit',
    label: 'Save',
    action: 'submit',       // Sends form data
    variant: 'primary',
  },
  {
    id: 'delete',
    label: 'Delete',
    action: 'custom',
    customAction: 'delete-item',
    variant: 'danger',
  },
  {
    id: 'cancel',
    label: 'Cancel',
    action: 'cancel',       // Closes modal
    variant: 'secondary',
  },
]
```

### Button Actions

| Action | Behavior |
|--------|----------|
| `submit` | Validates form, sends `GUISubmitMessage` with form data |
| `cancel` | Closes modal, sends `GUIClosedMessage` with reason `'cancel'` |
| `custom` | Sends `GUIButtonMessage` with `customAction` and current form data |

### Button Variants

| Variant | Use Case |
|---------|----------|
| `primary` | Main action (blue) |
| `secondary` | Alternative action (gray) |
| `danger` | Destructive action (red) |
| `success` | Positive action (green) |
| `ghost` | Minimal styling (transparent) |

## Validation

Client-side validation provides immediate feedback. The server should still validate on submit.

```typescript
{
  type: 'text',
  id: 'email',
  name: 'email',
  label: 'Email',
  validation: [
    { type: 'required', message: 'Email is required' },
    { type: 'email', message: 'Please enter a valid email' },
  ],
}
```

### Validation Rules

| Type | Value | Description |
|------|-------|-------------|
| `required` | - | Field must have a value |
| `minLength` | number | Minimum string length |
| `maxLength` | number | Maximum string length |
| `min` | number | Minimum numeric value |
| `max` | number | Maximum numeric value |
| `pattern` | regex | Value must match pattern |
| `email` | - | Must be valid email format |

## Handling Responses

Set up a response handler on the player object:

```typescript
import type { GUIClientMessage } from '../lib/gui-types.js';

// In your command
const player = ctx.player as MudObject & {
  onGUIResponse?: (message: GUIClientMessage) => void;
};

player.onGUIResponse = (message) => {
  switch (message.action) {
    case 'submit':
      // Form was submitted
      const data = message.data;
      ctx.sendLine(`Received: ${JSON.stringify(data)}`);

      // Process form data
      const name = data.playerName as string;
      const amount = data.amount as number;

      // Close modal when done (optional - submit auto-closes by default)
      break;

    case 'button':
      // Custom button was clicked
      if (message.customAction === 'buy-item') {
        ctx.sendLine('Buying item...');
      }
      break;

    case 'closed':
      // User closed modal (escape, X, cancel button)
      ctx.sendLine(`Modal closed: ${message.reason}`);
      break;
  }

  // Clean up handler when done
  player.onGUIResponse = undefined;
};
```

### Response Message Properties

**GUISubmitMessage:**
```typescript
{
  action: 'submit',
  modalId: string,
  buttonId: string,
  data: Record<string, unknown>,  // Form data keyed by input names
}
```

**GUIButtonMessage:**
```typescript
{
  action: 'button',
  modalId: string,
  buttonId: string,
  customAction?: string,
  data?: Record<string, unknown>,  // Current form data
}
```

**GUIClosedMessage:**
```typescript
{
  action: 'closed',
  modalId: string,
  reason: 'escape' | 'close-button' | 'backdrop' | 'cancel',
}
```

## Styling

Every element supports inline styles via the `style` property:

```typescript
{
  type: 'text',
  id: 'gold',
  content: 'Gold: 1,234',
  style: {
    color: '#f4d03f',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'right',
    padding: '8px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '4px',
  },
}
```

### Available Style Properties

| Property | Type | Example |
|----------|------|---------|
| `width` | string | `'100px'`, `'50%'` |
| `height` | string | `'200px'` |
| `padding` | string | `'8px'`, `'8px 16px'` |
| `margin` | string | `'0 auto'` |
| `backgroundColor` | string | `'#333'`, `'rgba(0,0,0,0.5)'` |
| `color` | string | `'#fff'`, `'red'` |
| `fontSize` | string | `'14px'`, `'1.2em'` |
| `fontWeight` | string | `'bold'`, `'600'` |
| `textAlign` | string | `'left'`, `'center'`, `'right'` |
| `border` | string | `'1px solid #666'` |
| `borderRadius` | string | `'4px'`, `'50%'` |
| `flex` | string | `'1'`, `'0 0 auto'` |
| `gap` | string | `'12px'` |
| `opacity` | number | `0.5` |

## Complete Examples

### Character Creation Form

```typescript
const message: GUIOpenMessage = {
  action: 'open',
  modal: {
    id: 'create-character',
    title: 'Create Character',
    subtitle: 'Design your hero',
    size: 'medium',
    closable: false,  // Must complete
  },
  layout: {
    type: 'form',
    gap: '16px',
    children: [
      {
        type: 'text',
        id: 'name',
        name: 'characterName',
        label: 'Character Name',
        placeholder: 'Enter a name...',
        validation: [
          { type: 'required', message: 'Name is required' },
          { type: 'minLength', value: 2, message: 'At least 2 characters' },
          { type: 'maxLength', value: 20, message: 'Max 20 characters' },
        ],
      },
      {
        type: 'select',
        id: 'class',
        name: 'class',
        label: 'Class',
        options: [
          { value: 'warrior', label: 'Warrior - Master of weapons' },
          { value: 'mage', label: 'Mage - Wielder of magic' },
          { value: 'rogue', label: 'Rogue - Shadow assassin' },
        ],
      },
      {
        type: 'radio',
        id: 'gender',
        name: 'gender',
        label: 'Gender',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'neutral', label: 'Neutral' },
        ],
        value: 'neutral',
      },
      {
        type: 'divider',
        id: 'div1',
      },
      {
        type: 'heading',
        id: 'stats-heading',
        content: 'Starting Stats',
        level: 4,
      },
      {
        type: 'horizontal',
        gap: '16px',
        children: [
          {
            type: 'vertical',
            gap: '8px',
            style: { flex: '1' },
            children: [
              { type: 'slider', id: 'str', name: 'strength', label: 'Strength', min: 8, max: 18, value: 10 },
              { type: 'slider', id: 'dex', name: 'dexterity', label: 'Dexterity', min: 8, max: 18, value: 10 },
            ],
          },
          {
            type: 'vertical',
            gap: '8px',
            style: { flex: '1' },
            children: [
              { type: 'slider', id: 'con', name: 'constitution', label: 'Constitution', min: 8, max: 18, value: 10 },
              { type: 'slider', id: 'int', name: 'intelligence', label: 'Intelligence', min: 8, max: 18, value: 10 },
            ],
          },
        ],
      },
    ],
  },
  buttons: [
    { id: 'create', label: 'Create Character', action: 'submit', variant: 'primary' },
  ],
};
```

### Shop Interface

```typescript
const message: GUIOpenMessage = {
  action: 'open',
  modal: {
    id: 'shop',
    title: 'Blacksmith Shop',
    subtitle: 'Fine weapons and armor',
    size: 'large',
    headerStyle: {
      backgroundColor: '#2d1b0e',
      color: '#f4d03f',
    },
  },
  layout: {
    type: 'vertical',
    gap: '16px',
    children: [
      {
        type: 'text',
        id: 'gold',
        content: `Your Gold: ${player.gold.toLocaleString()}`,
        style: { textAlign: 'right', color: '#f4d03f', fontWeight: 'bold' },
      },
      {
        type: 'grid',
        columns: 2,
        gap: '12px',
        children: shopItems.map((item, i) => ({
          type: 'horizontal',
          gap: '12px',
          style: {
            padding: '12px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
          },
          children: [
            {
              type: 'vertical',
              style: { flex: '1' },
              gap: '4px',
              children: [
                { type: 'text', id: `name-${i}`, content: item.name, style: { fontWeight: 'bold' } },
                { type: 'text', id: `desc-${i}`, content: item.description, style: { fontSize: '12px', color: '#888' } },
                { type: 'text', id: `price-${i}`, content: `${item.price} gold`, style: { color: '#f4d03f' } },
              ],
            },
            {
              type: 'button',
              id: `buy-${i}`,
              name: 'buyItem',
              label: 'Buy',
              action: 'custom',
              customAction: `buy:${item.id}`,
              variant: 'primary',
              disabled: player.gold < item.price,
            },
          ],
        })),
      },
    ],
  },
  buttons: [
    { id: 'close', label: 'Leave Shop', action: 'cancel', variant: 'secondary' },
  ],
};
```

### NPC Dialog with Choices

```typescript
const message: GUIOpenMessage = {
  action: 'open',
  modal: {
    id: 'dialog',
    title: 'Guard Captain',
    size: 'medium',
  },
  layout: {
    type: 'vertical',
    gap: '16px',
    children: [
      {
        type: 'horizontal',
        gap: '16px',
        children: [
          {
            type: 'image',
            id: 'portrait',
            src: '/assets/npc/guard-captain.png',
            alt: 'Guard Captain',
            style: { width: '80px', height: '80px', borderRadius: '8px' },
          },
          {
            type: 'paragraph',
            id: 'dialog-text',
            content: '"Halt, traveler! The road ahead is dangerous. Bandits have been spotted in the northern forest. I could use someone brave to investigate..."',
            style: { flex: '1', fontStyle: 'italic' },
          },
        ],
      },
      {
        type: 'divider',
        id: 'div1',
      },
      {
        type: 'vertical',
        gap: '8px',
        children: [
          {
            type: 'button',
            id: 'accept',
            name: 'choice',
            label: 'I\'ll investigate the bandits.',
            action: 'custom',
            customAction: 'accept-quest',
            variant: 'primary',
            style: { width: '100%' },
          },
          {
            type: 'button',
            id: 'info',
            name: 'choice',
            label: 'Tell me more about these bandits.',
            action: 'custom',
            customAction: 'more-info',
            variant: 'secondary',
            style: { width: '100%' },
          },
          {
            type: 'button',
            id: 'decline',
            name: 'choice',
            label: 'I have other matters to attend to.',
            action: 'custom',
            customAction: 'decline-quest',
            variant: 'ghost',
            style: { width: '100%' },
          },
        ],
      },
    ],
  },
  buttons: [],  // No footer buttons - choices are inline
};
```

## Updating Open Modals

Send updates to modify an open modal without closing it:

```typescript
// Update progress bar
efuns.guiSend({
  action: 'update',
  modalId: 'crafting',
  updates: {
    elements: {
      'progress-bar': { progress: 75 },
      'status-text': { content: 'Crafting... 75%' },
    },
  },
});

// Update gold display after purchase
efuns.guiSend({
  action: 'update',
  modalId: 'shop',
  updates: {
    elements: {
      'gold': { content: `Your Gold: ${player.gold.toLocaleString()}` },
    },
  },
});
```

## Closing Modals Programmatically

```typescript
efuns.guiSend({
  action: 'close',
  modalId: 'quest-dialog',
  reason: 'Quest accepted',
});
```

## Showing Validation Errors

Display server-side validation errors:

```typescript
efuns.guiSend({
  action: 'error',
  modalId: 'registration',
  errors: {
    username: 'This username is already taken',
    email: 'Please use a valid email address',
  },
  globalError: 'Please fix the errors above.',
});
```

## Testing

Use the `testgui` command (builder+) to see examples:

```
testgui              - Main test with various elements
testgui form         - All input types
testgui shop         - Shop interface demo
testgui confirm      - Confirmation dialog
testgui tabs         - Tabbed interface
testgui progress     - Progress bars
```

## Type Definitions

Full type definitions are in `/mudlib/lib/gui-types.ts`. Import them for TypeScript support:

```typescript
import type {
  GUIOpenMessage,
  GUIUpdateMessage,
  GUICloseMessage,
  GUIErrorMessage,
  GUIClientMessage,
  GUISubmitMessage,
  GUIButtonMessage,
  GUIClosedMessage,
  ModalConfig,
  LayoutContainer,
  InputElement,
  DisplayElement,
  ModalButton,
  ElementStyle,
  ValidationRule,
} from '../lib/gui-types.js';
```
