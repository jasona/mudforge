---
id: PHASE-DRD
name: DRD Creation Standards
version: 1.0.0
owner: "Design"
last_updated: "2026-01-02"
---

## Purpose

These standards ensure Design Requirements Documents produce designs that are consistent, accessible, and implementable.

## Musts (Non-Negotiable)

### Structure
- [DRD-1] **Standard Sections**: DRDs MUST include: Overview, User Context, Visual Requirements, Interaction/Behavior, Accessibility, Deliverables.
- [DRD-2] **Design System Reference**: MUST reference existing design system components; new components require justification.
- [DRD-3] **Accessibility Requirements**: MUST specify accessibility requirements per ACCESS-* rules in global/accessibility.md.

### Responsiveness
- [DRD-4] **Breakpoints Defined**: MUST specify behavior for at least mobile and desktop breakpoints.
- [DRD-5] **Touch Targets**: Interactive elements MUST meet minimum touch target requirements (44x44px mobile).

### Consistency
- [DRD-6] **Token Usage**: MUST specify design tokens (colors, spacing, typography) rather than hardcoded values.
- [DRD-7] **Pattern Alignment**: MUST align with established UI patterns in the design system.

## Shoulds (Strong Recommendations)

### Completeness
- [DRD-10] **All States**: SHOULD specify all states: default, hover, active, focus, disabled, loading, error, success.
- [DRD-11] **Empty States**: SHOULD include empty state designs.
- [DRD-12] **Edge Cases**: SHOULD address edge cases (long text, missing images, slow loading).

### Interaction
- [DRD-13] **Animation Specs**: If animations are used, SHOULD specify timing, easing, and purpose.
- [DRD-14] **Keyboard Navigation**: SHOULD specify keyboard navigation flow for complex interactions.
- [DRD-15] **Reduced Motion**: SHOULD note reduced-motion alternatives if animations are used.

### Handoff
- [DRD-16] **Annotations**: SHOULD include annotations for spacing, sizing, and interaction details.
- [DRD-17] **Asset Specifications**: SHOULD specify asset formats and export requirements.
- [DRD-18] **Developer Notes**: SHOULD include implementation notes for developers.

## Examples

### Good: Design System Reference
> "**Button Component:** Use the existing `Button` component with `variant='primary'` and `size='medium'`. See Figma component library: [link]."

### Bad: Net-New Without Justification
> "**Button:** Create a new button with rounded corners and gradient background." *(Why not use existing component?)*

### Good: Complete State Specification
> "**Input Field States:**
> - Default: neutral-200 border, neutral-900 text
> - Focus: primary-500 border (2px), focus ring
> - Error: error-500 border, error message below
> - Disabled: neutral-100 background, neutral-400 text, no interaction"

### Bad: Missing States
> "**Input Field:** Standard text input with placeholder." *(What about focus, error, disabled?)*

### Good: Responsive Specification
> "**Layout:**
> - Mobile (<768px): Single column, stacked cards
> - Tablet (768-1024px): Two-column grid
> - Desktop (>1024px): Three-column grid with sidebar"

## DRD Checklist

Before finalizing a DRD:
- [ ] All standard sections present
- [ ] Design system components referenced
- [ ] Accessibility requirements specified
- [ ] All breakpoints defined
- [ ] All states designed (default, hover, focus, disabled, error, loading, success)
- [ ] Empty states included
- [ ] Design tokens used (not hardcoded values)
- [ ] Deliverables and asset specs defined

## References

- See domains/design-ui.md for design system standards
- See global/accessibility.md for accessibility requirements
- See global/principles.md for core principles
