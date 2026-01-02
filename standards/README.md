# Corporate Standards System

This directory contains your organization's standards that are automatically applied to all AI-assisted workflow phases. Standards ensure consistency across team members and projects.

## How It Works

1. **Standards are organized** into global, domain-specific, and phase-specific files
2. **Each workflow phase** references the applicable standards via `standards-manifest.yml`
3. **AI outputs include** a standards version stamp and compliance checklist
4. **Deviations are documented** explicitly with rationale

## Directory Structure

```
standards/
├── standards-manifest.yml    # Central configuration + version
├── README.md                 # This file
│
├── global/                   # Applies to ALL phases
│   ├── principles.md         # Core values and principles
│   ├── security-privacy.md   # Security and data handling
│   ├── accessibility.md      # Accessibility requirements
│   └── terminology.md        # Approved terms and glossary
│
├── domains/                  # Domain-specific, reused across phases
│   ├── code-architecture.md  # Code style and architecture
│   ├── content-voice.md      # Tone, voice, and messaging
│   └── design-ui.md          # Design system and UI patterns
│
├── phases/                   # Phase-specific standards
│   ├── research.md
│   ├── create-prd.md
│   ├── create-crd.md
│   ├── create-drd.md
│   ├── generate-tasks.md
│   └── execute-tasks.md
│
└── teams/                    # Optional team-specific overlays
    └── (your-team.md)
```

## Getting Started

### 1. Customize Global Standards

Edit the files in `/standards/global/` to reflect your organization's:
- Core principles and values
- Security and privacy requirements
- Accessibility standards
- Approved terminology

### 2. Define Domain Standards

Edit the files in `/standards/domains/` for:
- **Code & Architecture**: Coding conventions, patterns, testing requirements
- **Content & Voice**: Tone, brand voice, writing guidelines
- **Design & UI**: Component usage, spacing, visual standards

### 3. Review Phase Standards

The `/standards/phases/` files contain phase-specific rules. These are mostly ready to use but can be customized.

### 4. (Optional) Add Team Overlays

If different teams need additional rules, create files in `/standards/teams/` and reference them in `standards-manifest.yml`.

## Standard File Format

Each standards file follows a consistent template:

```markdown
---
id: UNIQUE-ID
name: Human-Readable Name
version: 1.0.0
owner: "Team or Person"
last_updated: "YYYY-MM-DD"
---

## Purpose
Why these standards exist.

## Musts (Non-Negotiable)
- [ID-1] Requirement that MUST be followed.
- [ID-2] Another mandatory requirement.

## Shoulds (Strong Recommendations)
- [ID-10] Strongly recommended practice.
- [ID-11] Another recommendation.

## Examples
Concrete examples of good vs. bad practices.

## References
Links to detailed documentation.
```

### Rule ID Convention

- Use a prefix matching the file (e.g., `CODE-1`, `VOICE-3`, `DESIGN-5`)
- Musts: numbered 1-9
- Shoulds: numbered 10+
- This makes rules easy to reference in reviews and deviations

## Using Standards with AI Prompts

When using any prompt file (research.md, create-prd.md, etc.):

1. **Reference your standards**: Include `@standards/` files or paste relevant standards into your prompt
2. **AI will apply standards**: The prompts instruct the AI to comply with referenced standards
3. **Outputs are stamped**: Generated documents include standards version and compliance info

### Example Usage

```
@research.md @standards/global/principles.md @standards/domains/code-architecture.md

Research authentication best practices for our Node.js API.
```

## Compliance in Outputs

Every generated document in `/tasks/` should include:

```markdown
---
standards_version: 1.0.0
applied_standards:
  - global/principles.md
  - domains/code-architecture.md
---

## Standards Compliance

### Applied Rules
- [CODE-1] ✓ Followed ESLint configuration
- [CODE-4] ✓ Included unit tests

### Deviations
- [CODE-2] Deviated: Function exceeds 50 lines due to complex state machine.
  Rationale: Breaking it up would reduce readability; added detailed comments instead.
```

## Versioning

Standards use semantic versioning in `standards-manifest.yml`:

- **Patch** (1.0.1): Clarifications, typo fixes
- **Minor** (1.1.0): New Shoulds, new examples
- **Major** (2.0.0): New Musts, changed Musts, removed rules

### Update Process

1. Propose changes via PR to `/standards/`
2. Get review from standards owner(s)
3. Merge and bump version in `standards-manifest.yml`
4. Communicate changes to the team

## Quick Reference

| Question | Answer |
|----------|--------|
| Where are standards defined? | `/standards/` directory |
| What version are we on? | Check `standards-manifest.yml` |
| How do I add a team-specific rule? | Add to `/standards/teams/your-team.md` |
| How do I propose a change? | PR to `/standards/` with rationale |
| Who owns standards? | See `owner` field in manifest |

## Tips

- **Keep standards concise**: Each file should be 1-2 pages max
- **Use concrete examples**: Show good vs. bad, not just abstract rules
- **Make Musts testable**: If you can't verify it, it's probably a Should
- **Review periodically**: Remove outdated rules, add emerging patterns
- **Train new members**: Walk through standards during onboarding
