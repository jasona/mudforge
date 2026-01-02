---
id: PHASE-PRD
name: PRD Creation Standards
version: 1.0.0
owner: "Product"
last_updated: "2026-01-02"
---

## Purpose

These standards ensure Product Requirements Documents are clear, complete, and implementable by engineering teams.

## Musts (Non-Negotiable)

### Structure
- [PRD-1] **Standard Sections**: PRDs MUST include: Overview, Problem Statement, Goals, Non-Goals, User Stories, Functional Requirements, Success Metrics.
- [PRD-2] **Numbered Requirements**: Functional requirements MUST be numbered for easy reference (e.g., FR-1, FR-2).
- [PRD-3] **Testable Requirements**: Requirements MUST be specific and testable; avoid vague language like "should be fast" or "user-friendly."

### Traceability
- [PRD-4] **Link to User Need**: Each requirement MUST trace back to at least one user need or business goal.
- [PRD-5] **Research Reference**: PRDs MUST reference the RSD (Research Summary Document) they're based on, if one exists.

### Completeness
- [PRD-6] **Open Questions**: PRDs MUST have an Open Questions section documenting unresolved decisions.
- [PRD-7] **Assumptions**: PRDs MUST list key assumptions that, if wrong, would change the requirements.

## Shoulds (Strong Recommendations)

### Scope Management
- [PRD-10] **Non-Goals Section**: SHOULD include explicit Non-Goals to prevent scope creep.
- [PRD-11] **MVP vs Future**: SHOULD clearly distinguish MVP requirements from future enhancements.
- [PRD-12] **Priority Indicators**: Requirements SHOULD indicate priority (Must Have, Should Have, Nice to Have).

### Clarity
- [PRD-13] **User Journey Examples**: SHOULD include 1-2 example user journeys showing the feature in action.
- [PRD-14] **Edge Cases**: SHOULD document known edge cases and how they should be handled.
- [PRD-15] **Error States**: SHOULD specify expected behavior for error conditions.

### Technical Guidance
- [PRD-16] **Technical Considerations**: SHOULD include a Technical Considerations section noting known constraints or suggestions.
- [PRD-17] **Dependencies**: SHOULD identify dependencies on other teams, systems, or features.

## Examples

### Good: Testable Requirement
> "FR-3: The system shall return search results within 500ms for queries under 100 characters on a standard connection."

### Bad: Vague Requirement
> "FR-3: Search should be fast."

### Good: Traced to User Need
> "FR-5: Users can filter results by date range.
> *Traces to: User Story 2 - 'As a user, I want to find recent documents quickly.'*"

### Bad: Untraceable Requirement
> "FR-5: Add date filter." *(Why? For whom?)*

### Good: Clear Non-Goal
> "Non-Goal: This feature will NOT support bulk operations in v1. Users needing bulk operations should use the API."

## PRD Checklist

Before finalizing a PRD:
- [ ] All standard sections present
- [ ] Requirements numbered and testable
- [ ] Each requirement traces to user need
- [ ] Non-goals explicitly stated
- [ ] Open questions documented
- [ ] Assumptions listed
- [ ] Success metrics defined
- [ ] Research (RSD) referenced if available

## References

- See global/principles.md for core product principles
- See domains/code-architecture.md for technical considerations
- See global/terminology.md for approved terminology
