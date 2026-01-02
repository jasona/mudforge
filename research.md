# Rule: Generating a Research Summary Document (RSD)

## Corporate Standards

This phase is governed by your organization's Corporate Standards. Before proceeding:

1. **Read the standards manifest**: Load `/standards/standards-manifest.yml` to determine which standards apply to this phase.

2. **Load applicable standards**: Based on the manifest's `phases.research.includes` list, read and apply each referenced standards file from `/standards/`:
   ```yaml
   # Example from standards-manifest.yml:
   phases:
     research:
       includes:
         - global/principles.md
         - global/security-privacy.md
         - domains/code-architecture.md
         - domains/content-voice.md
         - domains/design-ui.md
         - phases/research.md
   ```

3. **Apply standards throughout**: Research outputs must comply with all loaded standards rules.

4. **Document compliance**: Include a Standards Compliance section in the RSD output, noting:
   - Standards version (from `version` field in manifest)
   - Which standards files were applied
   - Compliance status for key rules
   - Any deviations with rationale

If the standards manifest or standards files are not available, proceed without them but note that standards should be established for team consistency.

---

## Goal

To guide an AI assistant in performing **structured research** before any requirements document (PRD, CRD, DRD) is created. The RSD gathers internal and external context, identifies constraints, risks, and opportunities, and provides **actionable input** to the subsequent Create phase.

The output is a clear, concise Research Summary Document (RSD) in Markdown format that directly informs better requirements.

## When to Use

Use this **before** creating:
- A **PRD** (new feature, refactor, integration, infrastructure change)
- A **CRD** (content, copy, messaging, documentation, articles)
- A **DRD** (UI/UX design, visual design, components)

The Research phase ensures requirements are grounded in reality—existing patterns, technical constraints, best practices, and user context—rather than assumptions.

## Process

1. **Receive Initial Prompt:** The user provides a brief description of what they want to build, write, or design.

2. **Ask Clarifying Questions (Required):** Before doing any research, ask **4–7 essential clarifying questions** to scope:
   - Project type(s)
   - Depth and breadth of research
   - Internal codebase / asset focus areas
   - External research priorities
   - Key constraints and success criteria for the research itself

   Questions must be:
   - **Numbered** (1, 2, 3, …)
   - **Multiple choice** with options labeled **A, B, C, D, …**

3. **Wait for User Responses:** Pause and wait for the user to answer the clarifying questions before proceeding.

4. **Plan Research Scope:** Based on the user's answers:
   - Determine which **tracks** apply: Product/Feature, Content, Design (one or more)
   - Decide **research depth**: quick scan vs. moderate vs. deep dive
   - Prioritize **internal vs. external** focus (or a balanced mix)
   - Identify **primary outputs** needed for the upcoming PRD/CRD/DRD

5. **Perform Internal Research:** Use available tools and context to explore:
   - Existing docs in `/tasks` (PRDs, CRDs, DRDs, task files) related to the topic
   - The codebase (for product/design projects):
     - Relevant services, modules, and components
     - Existing patterns and utilities that can be reused
     - Constraints, technical debt, and integration points
   - Existing content and guidelines (for content projects):
     - Brand/voice guidelines
     - Prior related content pieces
   - Existing design system (for design projects):
     - Design tokens, components, layout patterns
     - Accessibility and platform guidelines

6. **Perform External Research:** When appropriate, use web search and documentation to gather:
   - **Best practices & patterns** for the relevant domain, framework, or content type
   - **Reference implementations** and example architectures/UX flows
   - **Platform and framework guidelines** (e.g., React, Next.js, iOS/Android HIG, Material Design)
   - **Industry benchmarks and competitors** (only if explicitly requested or implied)
   - **Standards, compliance, and accessibility** considerations (WCAG, GDPR, HIPAA, etc.)

   Summarize external findings in your own words. Prefer:
   - Official documentation
   - Well-known, reputable sources
   - Up-to-date information

7. **Generate RSD:** Organize findings into the RSD structure defined below, tailored to the project type(s). Make it:
   - **Actionable** (clearly tied to decisions the PRD/CRD/DRD should make)
   - **Prioritized** (what matters most vs. nice-to-have context)
   - **Scoped** (call out what you did *not* research due to depth/time constraints)

8. **Save RSD:** Save the generated document as `rsd-[project-name]-[version].md` inside the `/tasks` directory.

---

## Clarifying Questions (Guidelines)

Ask only the most impactful questions that change **what** or **where** you research. 4–7 questions is typical.

**Always cover:**
- Project type(s)
- Desired research depth
- Primary focus/goal of research
- Codebase / asset scope
- External research priorities
- Constraints and success criteria

### Formatting Requirements

- **Number all questions** (1, 2, 3, …)
- **List options for each question as A, B, C, D, etc.** for easy reference
- Make it easy for the user to respond with selections such as: `1A, 2C, 3B, 4D`

### Example Clarifying Questions

Use this as a base and adapt options to the user's initial prompt:

```
1. What type(s) of project is this research for?
   A. Product / feature (functionality or technical work)
   B. Content (copy, documentation, articles, messaging)
   C. Design (UI/UX, components, visual design)
   D. A combination of Product and Content
   E. A combination of Product and Design
   F. A combination of Content and Design
   G. All three (Product, Content, and Design)

2. What depth of research do you need?
   A. Quick scan (high-level summary, identify key patterns and constraints)
   B. Moderate depth (balanced analysis with key details and recommendations)
   C. Deep dive (thorough, detailed, comprehensive exploration)

3. Where should the research focus most?
   A. Internal codebase / existing system analysis
   B. External best practices, patterns, and examples
   C. Both equally
   D. Primarily business/user context and goals

4. What best describes the current state of this area?
   A. Entirely new (no related implementation exists yet)
   B. Existing implementation that needs extension or improvement
   C. Migration / replacement of an existing solution
   D. Unsure – part of research should determine this

5. Are there key constraints or priorities to emphasize?
   A. Performance and scalability
   B. Time-to-market / delivery speed
   C. Maintainability and code quality
   D. Security, compliance, or privacy
   E. Brand consistency and tone/voice
   F. Accessibility and UX standards
   G. Multiple of the above (please specify)

6. What internal resources should be emphasized?
   A. Existing PRDs/CRDs/DRDs or docs in `/tasks`
   B. Specific services, modules, or components in the codebase
   C. Existing content assets (blog posts, docs, landing pages)
   D. Design system / component library
   E. Let me decide based on what's available

7. Any specific external research priorities?
   A. Framework/library best practices (e.g., React, Next.js, Node.js)
   B. Competitor products / similar experiences
   C. Industry standards and compliance (e.g., WCAG, HIPAA, GDPR)
   D. Content/SEO best practices
   E. Design/UX patterns (e.g., navigation, forms, onboarding)
   F. Minimal external research – focus on internal context
```

You may add or adjust questions when the initial prompt is ambiguous (e.g., ask for target audience, platforms, or critical technologies if those are missing).

---

## Research Categories by Project Type

Use the project type(s) answers to emphasize different categories.

### Common to All Projects

For **any** project type, cover:

- **Problem & Goals (High-Level)**
  - What problem is being solved and for whom
  - Business and user goals implied by the brief

- **Existing Related Work (Internal)**
  - Relevant PRDs/CRDs/DRDs in `/tasks`
  - Related tasks or features already implemented
  - Any reusable assets (components, content blocks, layouts)

- **Constraints & Assumptions**
  - Known technical, organizational, brand, or legal constraints
  - Timebox and scope signals from the user's answers

- **Risks & Unknowns**
  - Areas where there is little information or conflicting guidance
  - Assumptions that would significantly affect the future PRD/CRD/DRD

### Product / Feature (PRD-oriented)

Emphasize:

- **Internal System / Codebase Analysis**
  - Relevant services, modules, APIs, data models
  - Integration points, boundaries, and existing abstractions
  - Performance, reliability, security considerations
  - Existing feature flags or configuration patterns
  - Technical debt that may impact implementation

- **Technical Best Practices & Reference Implementations (External)**
  - Patterns recommended for the specific stack/framework
  - Architectural patterns (e.g., CQRS, event-driven) only if clearly relevant
  - Example implementations that match the scale and constraints

- **Operational & Lifecycle Considerations**
  - Monitoring, logging, and observability norms
  - Migration and backward compatibility considerations
  - Testing strategies and coverage expectations

### Content (CRD-oriented)

Emphasize:

- **Audience & Positioning**
  - Who the content is for (personas, roles, segments)
  - Their level of expertise, pain points, and jobs-to-be-done

- **Brand, Tone, and Style (Internal)**
  - Existing brand/voice guidelines
  - Prior content examples to mimic or avoid
  - Formatting standards (headings, callouts, code blocks, CTA placement)

- **Content Strategy & SEO (External)**
  - Common structures for this content type (tutorials, docs, landing pages)
  - Keyword/SEO best practices when relevant
  - Compliance or legal caveats for the domain (e.g., financial, medical claims)

### Design (DRD-oriented)

Emphasize:

- **Existing Design System & Components (Internal)**
  - Tokens (color, spacing, typography)
  - Core components (buttons, forms, modals, layout)
  - Interaction patterns (navigation, feedback, error states)
  - Accessibility practices already in use

- **Platform & UX Guidelines (External)**
  - Web vs. mobile vs. desktop conventions
  - Official HIGs or design frameworks (e.g., Material Design, Apple HIG)
  - Accessibility standards (WCAG 2.x) at the relevant level

- **Information Architecture & Flows**
  - Related existing flows and screens
  - Common patterns for this type of interaction (onboarding, settings, search)

---

## RSD Structure

The generated RSD should include the following sections. Omit or minimize sections that are clearly not relevant based on project type and depth.

```markdown
# Research Summary Document (RSD): [Project Name] v[version]

## 1. Project Overview

- **User brief:** (short restatement of the initial request)
- **Project type(s):** Product / Content / Design
- **Research depth:** Quick / Moderate / Deep
- **Primary research focus:** Internal / External / Both

---

## 2. Existing Context & Assets (Internal)

### 2.1 Related Requirements & Docs
- Existing PRDs/CRDs/DRDs or documentation:
  - `[path/filename]` – brief description of relevance
  - ...

### 2.2 Codebase / System Context (for Product/Design)
- Relevant services, modules, and components:
  - `[path/module]` – role and relevance
- Key integration points and dependencies
- Notable constraints or technical debt patterns
- Reusable utilities or patterns identified

### 2.3 Content & Brand Context (for Content)
- Relevant content or templates:
  - `[path/filename]` – style and key takeaways
- Brand/voice guidelines summary
- Known style/formatting conventions

### 2.4 Design System Context (for Design)
- Key components and tokens:
  - `[component/token]` – notes on usage
- Existing patterns to reuse or align with

---

## 3. User & Business Context

- **Target user(s) / audience:** (personas, roles, segments)
- **User goals & pain points:** (summarized findings)
- **Business goals:** (revenue, activation, retention, efficiency, etc.)
- **Success signals for this initiative:** (what "good" looks like)

---

## 4. External Research: Best Practices & References

### 4.1 Domain & Framework Best Practices
- Summary of recommended approaches for this tech/domain
- Notable dos and don'ts
- Key patterns to consider

### 4.2 Reference Implementations / Examples
- **Example 1:** [source/name] – key ideas applicable here
- **Example 2:** [source/name] – key ideas applicable here

### 4.3 Standards, Compliance, and Accessibility
- Applicable standards (e.g., WCAG 2.1 AA, GDPR, HIPAA)
- Specific implications for this project

---

## 5. Constraints, Risks, and Dependencies

### 5.1 Constraints
- **Technical:** (stack, architecture, performance, scaling limits)
- **Organizational:** (timeline, team capacity, process requirements)
- **Brand / Legal / Compliance:** (restrictions, required approvals)

### 5.2 Risks
- **[Risk 1]:** Impact & likelihood, suggested mitigation
- **[Risk 2]:** Impact & likelihood, suggested mitigation

### 5.3 Dependencies & Assumptions
- Other systems, teams, or decisions this depends on
- Key assumptions the PRD/CRD/DRD should confirm or reject

---

## 6. Opportunities & Ideas

- **Reuse opportunities:** Existing code, components, or content to leverage
- **Quick wins:** Obvious improvements with low effort
- **Differentiation ideas:** Where exceeding "standard" adds value
- **Future extensions:** (clearly labeled as optional/future scope)

---

## 7. Key Findings by Track

### 7.1 Product / Feature Findings (if applicable)
1. [Key finding most relevant to PRD]
2. [Key finding]
3. [Key finding]

### 7.2 Content Findings (if applicable)
1. [Key finding most relevant to CRD]
2. [Key finding]
3. [Key finding]

### 7.3 Design Findings (if applicable)
1. [Key finding most relevant to DRD]
2. [Key finding]
3. [Key finding]

---

## 8. Recommendations for the Create Phase

### 8.1 Recommended Requirements Document(s)
- **Create next:** PRD / CRD / DRD (or combination)
- **Suggested filename(s):** `prd-[name]-v1.md`, `crd-[name]-v1.md`, `drd-[name]-v1.md`

### 8.2 Scope Recommendations
- **MVP scope (must have):**
  - Item 1
  - Item 2
- **Stretch / Deferred:**
  - Item 1
  - Item 2

### 8.3 Key Questions the Requirements Doc Should Answer
1. [Question that emerged from research]
2. [Question that emerged from research]
3. [Question that emerged from research]

### 8.4 Suggested Decisions to Lock In Now
- **Decision 1:** (e.g., reuse existing auth module vs. build new)
- **Decision 2:** (e.g., target mobile-first vs. desktop-first)

---

## 9. Open Questions & Gaps

- Unanswered questions that may block precise requirements
- Areas where further stakeholder input is needed
- Additional research that might be warranted later
- Information that was out of scope for this research depth

---

## 10. Sources & References

- [Source 1]: URL or document path
- [Source 2]: URL or document path
- ...
```

---

## Target Audience

Assume the primary readers of the RSD are:
- The **user** who will use it to inform their requirements decisions
- The **AI assistant** that will create the subsequent PRD/CRD/DRD

Therefore, findings should be explicit, actionable, and clearly tied to decisions that need to be made in the Create phase.

## Output

- **Format:** Markdown (`.md`)
- **Location:** `/tasks/`
- **Filename:** `rsd-[project-name]-[version].md`

Version the RSD like other docs:
- `rsd-user-auth-v1.md`, `rsd-user-auth-v2.md`, etc.

---

## Final Instructions

1. **Do NOT write requirements in the RSD.** Focus on context, findings, constraints, risks, and opportunities that will **inform** a later PRD/CRD/DRD. The RSD is research, not specification.

2. **Always ask clarifying questions first.** Wait for user answers before starting any research or generating the RSD.

3. **Be explicit about confidence and scope.** Call out where information is incomplete, approximate, or where assumptions were made.

4. **Tailor depth to user's selection.** A "quick scan" should be notably shorter and higher-level than a "deep dive."

5. **Do not overwrite existing RSDs.** Always increment the version number when creating a new RSD for the same project.

6. **Make the RSD directly actionable for the Create phase.** End with clear recommendations for which requirements document(s) to create next and what questions they must answer.

7. **NEVER re-write, revise, or overwrite a file that is prefaced with `rsd-`.** Just advance the version and save a new version accordingly.
