# AI Tools

A collection of AI prompt templates for structured software development, content creation, and design workflows. These prompts guide AI assistants through a systematic **Research → Create → Generate → Execute** process.

## Overview

This toolkit helps you break down complex projects into manageable pieces by:

1. **Researching** the landscape (codebase, best practices, constraints) before writing requirements
2. **Creating** detailed requirement documents (PRD, CRD, or DRD) informed by research
3. **Generating** actionable task lists from those requirements
4. **Executing** tasks one-by-one with built-in checkpoints

All outputs are saved to a `/tasks` directory for tracking and reference.

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        RESEARCH PHASE                           │
│  Gather context before writing requirements:                    │
│  • Internal: codebase, existing docs, patterns, constraints     │
│  • External: best practices, reference implementations          │
│  • Output: Research Summary Document (RSD)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         CREATE PHASE                            │
│  Choose the appropriate requirements document:                  │
│  • PRD (Product) - Features & functionality                     │
│  • CRD (Content) - Copy, messaging, articles                    │
│  • DRD (Design)  - UI, visuals, components                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        GENERATE PHASE                           │
│  Convert requirements into a structured task list               │
│  • Parent tasks with sub-tasks                                  │
│  • Relevant files identified                                    │
│  • Checkboxes for progress tracking                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        EXECUTE PHASE                            │
│  Work through tasks systematically                              │
│  • One sub-task at a time                                       │
│  • User approval between steps                                  │
│  • Auto-commit on parent task completion                        │
└─────────────────────────────────────────────────────────────────┘
```

## Prompt Files

| File | Purpose | Output |
|------|---------|--------|
| `research.md` | Research Summary Document | `tasks/rsd-[project-name]-[version].md` |
| `create-prd.md` | Product Requirements Document | `tasks/prd-[feature-name]-[version].md` |
| `create-crd.md` | Content Requirements Document | `tasks/crd-[content-name]-[version].md` |
| `create-drd.md` | Design Requirements Document | `tasks/drd-[design-name]-[version].md` |
| `generate-tasks.md` | Task list generation | `tasks/tasks-[feature-name].md` |
| `execute-tasks.md` | Task execution guidelines | Updates the task list in place |

## Usage

### Step 0: Research (Recommended First Step)

Before writing requirements, use `research.md` to gather context about your project. This ensures your requirements are grounded in reality—existing patterns, technical constraints, and best practices.

**Example:**

NOTE: Most AI tools allow you to directly reference your file with the "@" preface. But, if not, you can paste in the contents as stated below.

```
[Paste contents of research.md]

I want to add a user authentication system with email/password login and OAuth support.
```

The AI will:
1. Ask 4-7 clarifying questions about research scope, depth, and focus
2. Analyze internal codebase for existing patterns, constraints, and reusable components
3. Research external best practices, reference implementations, and standards
4. Generate a Research Summary Document (RSD)
5. Save it to `/tasks/rsd-user-auth-v1.md`

The RSD includes:
- Existing context and assets in your codebase
- Best practices and reference implementations
- Constraints, risks, and dependencies
- Recommendations for which requirements doc to create next

### Step 1: Create a Requirements Document

Copy the contents of the appropriate `create-*.md` file into your AI assistant, then describe what you want to build. Reference your RSD if you completed the research phase.

**Example - Creating a PRD:**

```
[Paste contents of create-prd.md]

Based on the research in tasks/rsd-user-auth-v1.md, I want to add a user authentication system with email/password login and OAuth support.
```

The AI will:
1. Ask 3-5 clarifying questions with multiple-choice options
2. Generate a detailed requirements document
3. Save it to `/tasks/prd-user-auth-v1.md`

**Example - Creating a CRD:**

```
[Paste contents of create-crd.md]

I need onboarding email copy for new users who sign up for our SaaS product.
```

**Example - Creating a DRD:**

```
[Paste contents of create-drd.md]

Design a settings page with toggles for notifications, theme preferences, and account management.
```

### Step 2: Generate Tasks

Once you have a requirements document, use `generate-tasks.md` to create an actionable task list.

**Example:**

```
[Paste contents of generate-tasks.md]

Generate tasks based on: tasks/prd-user-auth-v1.md
```

The AI will:
1. Analyze the requirements document
2. Generate high-level parent tasks (including "Create feature branch")
3. Wait for your approval ("Go")
4. Break down each parent into detailed sub-tasks
5. Identify relevant files to create/modify
6. Save to `/tasks/tasks-user-auth.md`

**Sample output structure:**

```markdown
## Tasks

- [ ] 0.0 Create feature branch
  - [ ] 0.1 Create and checkout `feature/user-auth`
- [ ] 1.0 Set up authentication database schema
  - [ ] 1.1 Create users table migration
  - [ ] 1.2 Add email and password_hash columns
  - [ ] 1.3 Create sessions table migration
- [ ] 2.0 Implement email/password authentication
  - [ ] 2.1 Create signup endpoint
  - [ ] 2.2 Create login endpoint
  - [ ] 2.3 Add password hashing utility
...
```

### Step 3: Execute Tasks

Use `execute-tasks.md` to work through the task list systematically.

**Example:**

```
[Paste contents of execute-tasks.md]

Execute the tasks in: tasks/tasks-user-auth.md
```

The AI will:
1. Read the task list and find the next uncompleted sub-task
2. Implement that sub-task
3. Mark it complete (`[x]`)
4. **Stop and wait for your approval** before continuing
5. Commit and push when a parent task is fully complete

**Interaction flow:**

```
AI: I've completed sub-task 1.1 (Create users table migration).
    Ready for the next sub-task?

You: y

AI: Working on sub-task 1.2 (Add email and password_hash columns)...
```

## Corporate Standards (Team Scaling)

The `/standards/` directory contains organizational standards that ensure consistency across team members. When rolling this out to a team:

### Standards Structure

```
standards/
├── standards-manifest.yml    # Central config + version
├── README.md                 # How to use standards
├── global/                   # Apply to ALL phases
│   ├── principles.md         # Core values
│   ├── security-privacy.md   # Security rules
│   ├── accessibility.md      # A11y requirements
│   └── terminology.md        # Approved terms
├── domains/                  # Domain-specific
│   ├── code-architecture.md  # Code standards
│   ├── content-voice.md      # Voice/tone
│   └── design-ui.md          # Design system
├── phases/                   # Phase-specific
│   └── [phase].md            # Per-phase rules
└── teams/                    # Team overlays
    └── [team].md             # Team-specific
```

### How Standards Work

1. **Each prompt file references applicable standards** from `/standards/`
2. **AI outputs include compliance info** (version, applied rules, deviations)
3. **Teams customize** by editing standard files or adding team overlays
4. **Version control** tracks changes centrally

### Getting Started with Standards

1. **Review and customize** `/standards/global/` for your organization
2. **Update domain standards** in `/standards/domains/` for your tech stack and brand
3. **Distribute** the entire repo to your team
4. **Update centrally** and pull changes to keep everyone aligned

See `/standards/README.md` for detailed setup instructions.

## Quick Reference

| What you want to do | Use this file |
|---------------------|---------------|
| Research before requirements | `research.md` |
| Plan a new feature | `create-prd.md` |
| Plan content/copy | `create-crd.md` |
| Plan a design | `create-drd.md` |
| Break requirements into tasks | `generate-tasks.md` |
| Execute tasks step-by-step | `execute-tasks.md` |
| Customize team standards | `/standards/` directory |

## Directory Structure

```
ai-tools/
├── README.md
├── research.md          # Research summary template (Step 0)
├── create-prd.md        # Product requirements template
├── create-crd.md        # Content requirements template
├── create-drd.md        # Design requirements template
├── generate-tasks.md    # Task generation rules
├── execute-tasks.md     # Task execution rules
├── standards/           # Corporate standards (for teams)
│   ├── standards-manifest.yml
│   ├── README.md
│   ├── global/          # Global standards
│   ├── domains/         # Domain-specific standards
│   ├── phases/          # Phase-specific standards
│   └── teams/           # Team overlays
└── tasks/               # Output directory (created automatically)
    ├── rsd-*.md         # Research summary docs
    ├── prd-*.md         # Product requirement docs
    ├── crd-*.md         # Content requirement docs
    ├── drd-*.md         # Design requirement docs
    └── tasks-*.md       # Generated task lists
```

## Tips

- **Start with research**: The Research phase surfaces constraints and patterns early, leading to better requirements
- **Customize your standards**: Edit `/standards/` files to match your organization's conventions before team rollout
- **Version your documents**: All docs are versioned (`-v1`, `-v2`) so you can iterate without losing history
- **Don't skip the clarifying questions**: They help produce more accurate research and requirements
- **Review parent tasks before proceeding**: Say "Go" only when the high-level plan looks right
- **Take your time during execution**: The pause-and-approve pattern prevents runaway changes
- **Keep the task file updated**: It serves as documentation of what was done
- **Document deviations**: When you must deviate from standards, document why in your PR

## Credits

Huge credits to Ryan Carson (ryancarson.com) who did most of this foundational work, and his demo on the "How I AI" podcast for lighting me on fire for this stuff.

## License

MIT
