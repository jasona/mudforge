---
id: DESIGN
name: Modern UI Design Standards (Linear-Style)
version: 1.0.0
owner: "Design"
last_updated: "2026-01-02"
---

## Purpose

These standards ensure our UI achieves a modern, minimal, professional aesthetic inspired by Linear.app—clean, fast, focused, and beautiful. Every design decision should prioritize clarity, speed, and user focus.

## Design Philosophy

Our design is:
- **Minimal**: Remove everything that doesn't serve the user's goal
- **Fast**: Design for perceived and actual speed; instant feedback
- **Focused**: One primary action per view; clear hierarchy
- **Dark-First**: Dark mode as the primary experience; light mode as alternative
- **Keyboard-First**: Power users navigate entirely by keyboard

## Musts (Non-Negotiable)

### Visual Foundation
- [DESIGN-1] **Dark Mode Primary**: Dark mode MUST be the default and primary design; use deep, rich backgrounds (not pure black).
- [DESIGN-2] **Subtle Gradients**: Backgrounds MUST use subtle gradients or noise textures to add depth; avoid flat solid colors.
- [DESIGN-3] **Muted Color Palette**: Primary UI MUST use muted, desaturated colors; reserve vibrant colors for accents and status indicators only.
- [DESIGN-4] **Generous Whitespace**: MUST use generous spacing; let content breathe; avoid cramped layouts.

### Typography
- [DESIGN-5] **System Font Stack**: MUST use a modern system font stack (Inter, SF Pro, or system-ui) for crisp rendering.
- [DESIGN-6] **Limited Type Scale**: MUST use a constrained type scale (4-5 sizes max); consistency over variety.
- [DESIGN-7] **Medium Font Weights**: Body text MUST use medium weight (500) for better legibility on dark backgrounds.

### Interaction
- [DESIGN-8] **Instant Feedback**: All interactions MUST provide immediate visual feedback (<100ms perceived response).
- [DESIGN-9] **Keyboard Shortcuts**: Primary actions MUST have keyboard shortcuts; display hints on hover.
- [DESIGN-10] **Command Palette**: Applications MUST include a command palette (Cmd/Ctrl+K) for quick navigation.

## Shoulds (Strong Recommendations)

### Visual Polish
- [DESIGN-11] **Glassmorphism Accents**: SHOULD use subtle backdrop blur and transparency for overlays and modals.
- [DESIGN-12] **Glow Effects**: SHOULD use subtle glow effects on primary actions and active states.
- [DESIGN-13] **Smooth Animations**: SHOULD use smooth, purposeful animations (150-300ms, ease-out curves).
- [DESIGN-14] **Micro-interactions**: SHOULD include subtle micro-interactions (hover lifts, button depressions).

### Layout
- [DESIGN-15] **Sidebar Navigation**: SHOULD use a collapsible left sidebar for primary navigation.
- [DESIGN-16] **Contextual Panels**: SHOULD use right-side panels for detail views and editing.
- [DESIGN-17] **Inline Editing**: SHOULD prefer inline editing over modal dialogs where possible.
- [DESIGN-18] **Sticky Headers**: SHOULD use sticky headers with blur effect for context.

### Components
- [DESIGN-19] **Borderless Inputs**: Form inputs SHOULD be borderless with subtle background differentiation.
- [DESIGN-20] **Icon-Forward**: SHOULD lead with icons; text labels secondary or on hover.
- [DESIGN-21] **Grouped Actions**: SHOULD group related actions in toolbars; avoid scattered buttons.

## Color System

### Background Hierarchy (Dark Mode)
| Token | Hex | Use |
|-------|-----|-----|
| bg-base | #0A0A0B | Page background |
| bg-surface | #111113 | Cards, panels |
| bg-elevated | #18181B | Modals, popovers |
| bg-hover | #1F1F23 | Hover states |
| bg-active | #27272A | Active/selected states |

### Text Colors
| Token | Hex | Use |
|-------|-----|-----|
| text-primary | #FAFAFA | Primary text, headings |
| text-secondary | #A1A1AA | Secondary text, labels |
| text-tertiary | #71717A | Placeholder, disabled |
| text-muted | #52525B | Hints, timestamps |

### Accent Colors
| Token | Hex | Use |
|-------|-----|-----|
| accent-primary | #6366F1 | Primary actions (indigo) |
| accent-primary-hover | #818CF8 | Hover state |
| accent-success | #22C55E | Success states |
| accent-warning | #F59E0B | Warning states |
| accent-error | #EF4444 | Error states, destructive |

### Borders & Dividers
| Token | Hex | Use |
|-------|-----|-----|
| border-subtle | #27272A | Subtle separators |
| border-default | #3F3F46 | Default borders |
| border-focus | #6366F1 | Focus rings |

## Typography Scale

| Token | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| display | 32px | 600 | 1.2 | Page titles |
| heading-1 | 24px | 600 | 1.3 | Section headers |
| heading-2 | 18px | 600 | 1.4 | Subsections |
| body | 14px | 500 | 1.5 | Primary content |
| body-small | 13px | 500 | 1.5 | Secondary content |
| caption | 12px | 500 | 1.4 | Labels, metadata |
| mono | 13px | 500 | 1.5 | Code, IDs (monospace) |

## Spacing Scale

Use an 4px base unit:

| Token | Value | Use |
|-------|-------|-----|
| space-1 | 4px | Tight inline spacing |
| space-2 | 8px | Icon gaps, tight groups |
| space-3 | 12px | Input padding, list gaps |
| space-4 | 16px | Card padding, section gaps |
| space-6 | 24px | Large section spacing |
| space-8 | 32px | Page margins |
| space-12 | 48px | Major section breaks |

## Component Standards

### Buttons
```
Primary:    bg-accent-primary, text-white, subtle glow on hover
Secondary:  bg-transparent, border-default, text-secondary
Ghost:      bg-transparent, text-secondary, bg-hover on hover
Danger:     bg-error (muted), text-white, for destructive actions
```
- All buttons: rounded-md (6px), height 32-36px, horizontal padding 12-16px
- Icon-only buttons: 32x32px, rounded-md

### Inputs
```
Default:    bg-surface, no border, text-primary, placeholder text-tertiary
Focus:      ring-2 ring-accent-primary, subtle glow
Error:      ring-2 ring-error
```
- Height: 36px
- Padding: 12px horizontal
- Border-radius: 6px

### Cards/Panels
```
Background: bg-surface
Border:     1px border-subtle OR no border with shadow
Radius:     8-12px
Padding:    16-24px
```

### Modals
```
Overlay:    bg-black/60 with backdrop-blur-sm
Modal:      bg-elevated, rounded-xl (12px), shadow-2xl
Width:      400-600px for forms, up to 800px for complex content
```

### Sidebar
```
Width:      240-280px expanded, 64px collapsed
Background: bg-base or slightly darker
Items:      Full-width, 32-36px height, rounded-md
Active:     bg-hover, text-primary, left accent bar
```

### Tables/Lists
```
Row height: 40-48px
Hover:      bg-hover
Selected:   bg-active, subtle left border accent
Dividers:   1px border-subtle between rows (optional)
```

## Animation Guidelines

### Timing
| Type | Duration | Easing |
|------|----------|--------|
| Micro (hover, focus) | 100-150ms | ease-out |
| UI transitions | 200-300ms | ease-out |
| Modals/overlays | 200ms | ease-out |
| Page transitions | 300-400ms | ease-in-out |

### Motion Principles
- **Purposeful**: Every animation should communicate state or provide feedback
- **Fast**: Default to the faster end of ranges; snappy > smooth
- **Subtle**: Avoid large movements; prefer opacity and scale
- **Reduced Motion**: Respect `prefers-reduced-motion`; disable non-essential animations

## Keyboard Navigation

### Required Shortcuts
| Action | Shortcut |
|--------|----------|
| Command palette | Cmd/Ctrl + K |
| Search | Cmd/Ctrl + / or / |
| New item | Cmd/Ctrl + N |
| Save | Cmd/Ctrl + S |
| Close/Cancel | Escape |
| Navigate lists | Arrow keys |
| Select | Enter |

### Focus Management
- Visible focus rings on all interactive elements
- Logical tab order following visual layout
- Focus trap in modals
- Return focus to trigger element when closing overlays

## Examples

### Good: Linear-Style Issue Card
```
┌────────────────────────────────────────────┐
│ 🔵 Issue Title Here                    #123│
│                                            │
│ Secondary description text in muted color  │
│                                            │
│ 👤 Assignee    📅 Due Date    🏷️ Label    │
└────────────────────────────────────────────┘

- bg-surface on bg-base
- Subtle hover: bg-hover + slight translateY(-1px)
- Status indicator as colored dot
- Metadata in text-tertiary with icons
```

### Good: Command Palette
```
┌─────────────────────────────────────────────┐
│ 🔍 Type a command or search...              │
├─────────────────────────────────────────────┤
│ 📝 Create new issue                    ⌘ N  │
│ 🔍 Search issues                       ⌘ /  │
│ ⚙️ Settings                            ⌘ ,  │
│ 👤 Switch workspace                    ⌘ ⇧ W│
└─────────────────────────────────────────────┘

- Backdrop blur overlay
- Auto-focus search input
- Arrow key navigation
- Keyboard shortcut hints right-aligned
```

### Bad: Cluttered Modal
```
- Too many form fields visible at once
- Multiple primary buttons
- No clear hierarchy
- Bright colors competing for attention
```

## References

- Linear.app: https://linear.app (primary inspiration)
- Vercel Dashboard: https://vercel.com (component patterns)
- Raycast: https://raycast.com (keyboard-first design)
- Tailwind UI Dark: https://tailwindui.com (component reference)
- Radix UI: https://radix-ui.com (accessible primitives)
