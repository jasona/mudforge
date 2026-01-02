---
id: ACCESS
name: Accessibility Standards
version: 1.0.0
owner: "Design/Engineering"
last_updated: "2026-01-02"
---

## Purpose

Accessibility ensures our products and content are usable by everyone, including people with disabilities. These standards align with WCAG 2.1 guidelines.

## Target Compliance Level

Our target is **WCAG 2.1 Level AA** compliance for all user-facing products and content.

## Musts (Non-Negotiable)

- [ACCESS-1] **Color Contrast**: Text MUST have a contrast ratio of at least 4.5:1 against its background (3:1 for large text).
- [ACCESS-2] **Keyboard Navigation**: All interactive elements MUST be accessible via keyboard alone (Tab, Enter, Escape, Arrow keys).
- [ACCESS-3] **Alt Text**: All meaningful images MUST have descriptive alt text; decorative images MUST have empty alt (`alt=""`).
- [ACCESS-4] **Form Labels**: All form inputs MUST have associated labels; placeholder text is not a substitute for labels.
- [ACCESS-5] **Focus Indicators**: Interactive elements MUST have visible focus indicators; do not remove browser default focus styles without replacement.
- [ACCESS-6] **Semantic HTML**: Use semantic HTML elements (button, nav, main, article) instead of generic divs with ARIA roles where possible.
- [ACCESS-7] **Error Identification**: Form errors MUST be clearly identified and described in text, not just by color.

## Shoulds (Strong Recommendations)

- [ACCESS-10] **Skip Links**: Long pages SHOULD provide "skip to main content" links.
- [ACCESS-11] **Heading Hierarchy**: Pages SHOULD use a logical heading structure (h1 → h2 → h3) without skipping levels.
- [ACCESS-12] **Touch Targets**: Interactive elements SHOULD have touch targets of at least 44x44 pixels on mobile.
- [ACCESS-13] **Motion Preferences**: Animations SHOULD respect `prefers-reduced-motion` user settings.
- [ACCESS-14] **Screen Reader Testing**: New features SHOULD be tested with at least one screen reader (VoiceOver, NVDA, or JAWS).

## Examples

### Good: Accessible Button
```html
<button type="submit" aria-label="Submit contact form">
  Send Message
</button>
```

### Bad: Inaccessible "Button"
```html
<!-- Missing keyboard support, no semantic meaning -->
<div onclick="submit()">Send Message</div>
```

### Good: Form with Labels
```html
<label for="email">Email Address</label>
<input type="email" id="email" name="email" required>
```

### Bad: Placeholder as Label
```html
<!-- Placeholder disappears on focus, not accessible -->
<input type="email" placeholder="Email Address">
```

## Testing Tools

- axe DevTools (browser extension)
- WAVE (web accessibility evaluation tool)
- Lighthouse accessibility audit
- Screen readers: VoiceOver (Mac), NVDA (Windows), TalkBack (Android)

## References

- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- A11y Project Checklist: https://www.a11yproject.com/checklist/
- Link to your component library accessibility docs
