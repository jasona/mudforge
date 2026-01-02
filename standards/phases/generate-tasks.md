---
id: PHASE-TASKS
name: Task Generation Standards
version: 1.0.0
owner: "Engineering"
last_updated: "2026-01-02"
---

## Purpose

These standards ensure generated task lists are appropriately sized, traceable, and actionable for implementation.

## Musts (Non-Negotiable)

### Task Structure
- [TASKS-1] **Right-Sized Tasks**: Tasks MUST be sized for 0.5-1 day of work maximum; break down larger work.
- [TASKS-2] **Clear Deliverable**: Each task MUST have a clear deliverable or outcome, not just an activity.
- [TASKS-3] **Requirement Traceability**: Tasks MUST map back to requirement IDs (e.g., PRD FR-2, CRD-3).

### Completeness
- [TASKS-4] **Quality Gates Included**: Testing, code review, and documentation tasks MUST be explicit tasks, not afterthoughts.
- [TASKS-5] **Dependencies Noted**: Task dependencies MUST be noted where order matters.

### File Identification
- [TASKS-6] **Relevant Files**: Task lists MUST include a Relevant Files section identifying files to create or modify.
- [TASKS-7] **Test Files Included**: For code tasks, corresponding test files MUST be identified.

## Shoulds (Strong Recommendations)

### Organization
- [TASKS-10] **Logical Grouping**: Tasks SHOULD be grouped logically under parent tasks.
- [TASKS-11] **Progressive Complexity**: SHOULD order tasks from simpler/foundational to complex/dependent.
- [TASKS-12] **Branch Task First**: SHOULD include feature branch creation as the first task.

### Clarity
- [TASKS-13] **Action Verbs**: Task descriptions SHOULD start with action verbs (Create, Add, Update, Remove, Implement).
- [TASKS-14] **Specific Scope**: SHOULD be specific about scope (e.g., "Add email validation" not "Handle validation").
- [TASKS-15] **Acceptance Hints**: SHOULD include hints for how to verify the task is complete.

### Risk Management
- [TASKS-16] **Spike Tasks**: Exploratory/research work SHOULD be separate "spike" tasks from implementation.
- [TASKS-17] **Risk Flags**: High-risk or uncertain tasks SHOULD be flagged for extra review.

## Examples

### Good: Right-Sized, Traceable Task
> "- [ ] 2.1 Create `validateEmail` utility function with regex validation (FR-3)
>   - Input: email string
>   - Output: boolean
>   - Test: Add unit tests for valid/invalid email formats"

### Bad: Too Large, No Traceability
> "- [ ] 2.1 Build the authentication system"

### Good: Quality Gate as Explicit Task
> "- [ ] 3.4 Write integration tests for user registration flow
> - [ ] 3.5 Update API documentation with new endpoints
> - [ ] 3.6 Code review and address feedback"

### Bad: Quality Gates Missing
> "- [ ] 3.4 Complete user registration feature" *(No testing, docs, or review tasks)*

### Good: Clear Dependency
> "- [ ] 4.1 Create database migration for users table
> - [ ] 4.2 Implement User model (depends on 4.1)
> - [ ] 4.3 Create user repository (depends on 4.2)"

## Task Template

```markdown
- [ ] X.0 Parent Task Title (traces to: [requirement ID])
  - [ ] X.1 Sub-task with specific deliverable
  - [ ] X.2 Sub-task with specific deliverable
  - [ ] X.3 Write tests for X.1-X.2
  - [ ] X.4 Update documentation
```

## Task Generation Checklist

Before finalizing task list:
- [ ] All tasks are 0.5-1 day sized
- [ ] Each task has clear deliverable
- [ ] Tasks trace to requirements
- [ ] Testing tasks included
- [ ] Documentation tasks included
- [ ] Review tasks included
- [ ] Dependencies noted
- [ ] Relevant files identified

## References

- See global/principles.md for incremental delivery principles
- See domains/code-architecture.md for testing standards
