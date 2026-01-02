---
id: PHASE-EXEC
name: Task Execution Standards
version: 1.0.0
owner: "Engineering"
last_updated: "2026-01-02"
---

## Purpose

These standards ensure task execution produces high-quality, well-tested, properly documented work that adheres to all organizational standards.

## Musts (Non-Negotiable)

### Code Quality
- [EXEC-1] **Standards Compliance**: All code changes MUST comply with CODE-* rules in domains/code-architecture.md.
- [EXEC-2] **Tests Required**: Code changes MUST include tests covering primary success and failure paths.
- [EXEC-3] **Lint/Format Pass**: All code MUST pass linting and formatting checks before marking complete.

### Traceability
- [EXEC-4] **Reference Requirements**: PR titles/descriptions MUST reference the task ID and requirement ID.
- [EXEC-5] **Document Deviations**: Any deviations from standards MUST be documented with rationale in the PR.

### Progress Tracking
- [EXEC-6] **Mark Complete**: Tasks MUST be marked complete (`[x]`) immediately upon finishing.
- [EXEC-7] **Update Task File**: The task file MUST be updated after each sub-task completion.
- [EXEC-8] **Commit on Parent Complete**: Changes MUST be committed and pushed when a parent task is fully complete.

## Shoulds (Strong Recommendations)

### Code Changes
- [EXEC-10] **Small Commits**: SHOULD make small, focused commits aligned with sub-tasks.
- [EXEC-11] **Descriptive Commits**: Commit messages SHOULD be descriptive and reference task IDs.
- [EXEC-12] **Before/After**: For refactors, SHOULD provide before/after snippets in PR description.

### Documentation
- [EXEC-13] **Update Docs**: If behavior changes, SHOULD update relevant documentation.
- [EXEC-14] **Relevant Files Section**: SHOULD keep the Relevant Files section of task list updated.

### Risk Management
- [EXEC-15] **Rollback Strategy**: For significant changes, SHOULD document rollback strategy.
- [EXEC-16] **Flag Blockers**: SHOULD immediately flag blockers or unexpected complexity.

## Examples

### Good: Standards-Compliant PR
> "**PR Title:** feat(auth): Add email validation utility (Task 2.1, FR-3)
>
> **Description:**
> - Implements validateEmail utility per FR-3
> - Adds unit tests for valid/invalid cases
> - Follows CODE-2 (single-purpose function)
>
> **Testing:**
> - [x] Unit tests pass
> - [x] Manual verification complete"

### Bad: Missing Context
> "**PR Title:** Update auth
>
> **Description:** Fixed some stuff"

### Good: Documented Deviation
> "**Deviation from CODE-2:**
> Function `processUserRegistration` exceeds 50 lines.
> **Rationale:** Contains a state machine that would be less readable if split.
> **Mitigation:** Added detailed inline documentation."

### Good: Task Progress Update
```markdown
- [x] 2.0 Implement email validation
  - [x] 2.1 Create validateEmail utility
  - [x] 2.2 Add unit tests
  - [x] 2.3 Integrate into registration form
  - [ ] 2.4 Update API documentation  ← Currently working
```

## Execution Checklist

For each task:
- [ ] Code follows CODE-* standards
- [ ] Tests written and passing
- [ ] Linting/formatting passes
- [ ] PR references task and requirement IDs
- [ ] Any deviations documented
- [ ] Task marked complete in task file
- [ ] Relevant Files section updated
- [ ] Committed and pushed (on parent completion)

## References

- See domains/code-architecture.md for code standards
- See global/security-privacy.md for security requirements
- See global/accessibility.md for accessibility requirements
