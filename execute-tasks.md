# Task List Management 

## Corporate Standards

This phase is governed by your organization's Corporate Standards. Before proceeding:

1. **Read the standards manifest**: Load `/standards/standards-manifest.yml` to determine which standards apply to this phase.

2. **Load applicable standards**: Based on the manifest's `phases.execute-tasks.includes` list, read and apply each referenced standards file from `/standards/`:
   ```yaml
   # Example from standards-manifest.yml:
   phases:
     execute-tasks:
       includes:
         - global/principles.md
         - global/security-privacy.md
         - global/accessibility.md
         - domains/code-architecture.md
         - phases/execute-tasks.md
   ```

3. **Apply standards throughout**: All work must comply with all loaded standards rules.

4. **Document compliance**: Note in PR descriptions:
   - Standards version (from `version` field in manifest)
   - Which standards files were applied
   - Compliance status for key rules
   - Any deviations with rationale

If the standards manifest or standards files are not available, proceed without them but note that standards should be established for team consistency.

---

Guidelines for managing task lists in markdown files to track progress on completing a PRD

## Task Implementation
- **One sub-task at a time:** Do **NOT** start the next subtask until you ask the user for permission and they say "yes" or "y"
- **Completion protocol:**
  1. When you finish a **sub-task**, immediately mark it as completed by changing `[ ]` to `[x]`.
  2. If **all** subtasks underneath a parent task are now `[x]`, also mark the **parent task** as completed.
- Stop after each sub-task and wait for the user's go-ahead.

## Task List Maintenance

1. **Update the task list as you work:**
   - Mark tasks and subtasks as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Maintain the "Relevant Files" section:**
   - List every file created or modified.
   - Give each file a one-line description of its purpose.

## AI Instruction

When working with task lists, the AI must:

1. Regularly update the task list file after finishing any significant work.
2. Follow the completed protocol:
   - Mark each finished **sub-task** `[x]`.
   - Mark the **parent task** `[x]` once **all** its subtasks are `[x]`.
   - When the **parent task** is finished commit and push to git (assume git has already been setup and initialized for this directory).
3. Add newly discovered tasks.
4. Keep "Relevant Files" accurate and up to date.
5. Before starting work, check with sub-task is next.
6. After implementing a sub-task, update the file and then pause for user approval.
