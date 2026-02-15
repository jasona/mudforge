# src/client/gui/ - Server-Driven Modal System

Server sends GUI messages to client which renders modals, forms, and interactive UI.

## Files

- `gui-types.ts` - Type definitions: ModalConfig, ModalSize, LayoutType, FormElement, ValidationRule, ElementStyle
- `gui-modal.ts` (~18K) - Modal rendering engine. Creates/manages modal DOM elements with header, body, footer.
- `gui-elements.ts` (~19K) - Form element renderers (text, textarea, select, checkbox, radio, button, label, image)
- `gui-renderer.ts` (~10K) - Layout rendering (vertical, horizontal, grid, tabs, form)
- `gui-layout.ts` (~5K) - Layout calculation and positioning
- `gui-validation.ts` (~4K) - Client-side form validation (required, minLength, maxLength, min, max, pattern, email, custom)

## Modal Sizes

small, medium, large, fullscreen, auto

## Layout Types

vertical, horizontal, grid, tabs, form

## Key Pattern

Server builds modal config on mudlib side (using files in `mudlib/lib/` like `look-modal.ts`, `shop-modal.ts`, etc.), sends via `\x00[GUI]<json>`, client renders the DOM. Button clicks send action back to server.
