# Rule: Generating a Design Requirements Document (DRD)

## Corporate Standards

This phase is governed by your organization's Corporate Standards. Before proceeding:

1. **Read the standards manifest**: Load `/standards/standards-manifest.yml` to determine which standards apply to this phase.

2. **Load applicable standards**: Based on the manifest's `phases.create-drd.includes` list, read and apply each referenced standards file from `/standards/`:
   ```yaml
   # Example from standards-manifest.yml:
   phases:
     create-drd:
       includes:
         - global/principles.md
         - global/accessibility.md
         - domains/design-ui.md
         - phases/create-drd.md
   ```

3. **Apply standards throughout**: DRD outputs must comply with all loaded standards rules.

4. **Document compliance**: Include a Standards Compliance section in the DRD output, noting:
   - Standards version (from `version` field in manifest)
   - Which standards files were applied
   - Compliance status for key rules
   - Any deviations with rationale

If the standards manifest or standards files are not available, proceed without them but note that standards should be established for team consistency.

---

## Goal

To guide an AI assistant in creating a detailed Design Requirements Document (DRD) in Markdown format, based on an initial user prompt. The DRD should be clear, actionable, and suitable for a junior designer to understand and execute the design work.

## Process

1.  **Receive Initial Prompt:** The user provides a brief description or request for a new design, UI component, or visual asset.
2.  **Ask Clarifying Questions:** Before writing the DRD, the AI *must* ask only the most essential clarifying questions needed to write a clear DRD. Limit questions to 3-5 critical gaps in understanding. The goal is to understand the visual direction, user experience goals, and brand alignment. Make sure to provide options in letter/number lists so I can respond easily with my selections.
3.  **Generate DRD:** Based on the initial prompt and the user's answers to the clarifying questions, generate a DRD using the structure outlined below.
4.  **Save DRD:** Save the generated document as `drd-[design-name].md` inside the `/tasks` directory.

## Clarifying Questions (Guidelines)

Ask only the most critical questions needed to write a clear DRD. Focus on areas where the initial prompt is ambiguous or missing essential context. Common areas that may need clarification:

*   **Purpose/Context:** If unclear - "What is the primary purpose of this design and where will it be used?"
*   **Target Audience:** If vague - "Who is the intended audience for this design?"
*   **Visual Direction:** If unspecified - "What mood, tone, or style should this design convey?"
*   **Brand Alignment:** If applicable - "Should this follow existing brand guidelines or establish new visual direction?"
*   **Constraints:** If unstated - "Are there specific platforms, sizes, or accessibility requirements?"

**Important:** Only ask questions when the answer isn't reasonably inferable from the initial prompt. Prioritize questions that would significantly impact the DRD's clarity.

### Formatting Requirements

- **Number all questions** (1, 2, 3, etc.)
- **List options for each question as A, B, C, D, etc.** for easy reference
- Make it simple for the user to respond with selections like "1A, 2C, 3B"

### Example Format

```
1. What is the primary visual style for this design?
   A. Minimalist and clean
   B. Bold and vibrant
   C. Professional and corporate
   D. Playful and casual

2. What is the primary platform for this design?
   A. Web (desktop-first)
   B. Web (mobile-first)
   C. Native mobile app
   D. Cross-platform (responsive)

3. What level of interactivity is expected?
   A. Static design (no interactions)
   B. Basic interactions (hover states, simple transitions)
   C. Rich interactions (animations, micro-interactions)
   D. Complex interactions (multi-step flows, advanced animations)
```

## DRD Structure

The generated DRD should include the following sections:

1.  **Introduction/Overview:** Briefly describe the design deliverable and the problem it solves. State the design objective.
2.  **Goals:** List the specific, measurable objectives for this design work.
3.  **User Context:** Describe who will interact with this design, their needs, and the context of use.
4.  **Visual Requirements:** Detail the specific visual elements required:
    *   Color palette (primary, secondary, accent colors)
    *   Typography (fonts, sizes, hierarchy)
    *   Imagery style (photography, illustration, iconography)
    *   Spacing and layout principles
    *   Component specifications
5.  **Interaction & Behavior:** Describe how elements should behave:
    *   Hover/focus states
    *   Transitions and animations
    *   Responsive behavior
    *   Error and success states
6.  **Accessibility Requirements:** Specify accessibility standards:
    *   Color contrast requirements
    *   Screen reader considerations
    *   Keyboard navigation
    *   WCAG compliance level (A, AA, AAA)
7.  **Non-Goals (Out of Scope):** Clearly state what this design will *not* include to manage scope.
8.  **Brand & Style References:** Link to brand guidelines, mood boards, or reference designs if applicable.
9.  **Technical Constraints:** Mention any known technical constraints that affect design decisions (e.g., "Must work in browsers without CSS Grid support", "Maximum file size for assets").
10. **Deliverables:** List the expected outputs:
    *   File formats (Figma, Sketch, PNG, SVG, etc.)
    *   Asset specifications
    *   Documentation requirements
11. **Success Criteria:** How will the success of this design be measured? (e.g., "Passes WCAG AA accessibility audit", "Achieves 90%+ approval in user testing").
12. **Open Questions:** List any remaining questions or areas needing further clarification.

## Target Audience

Assume the primary reader of the DRD is a **junior designer**. Therefore, requirements should be explicit, unambiguous, and provide enough context for them to understand the design goals and constraints. Include visual references where helpful.

## Output

*   **Format:** Markdown (`.md`)
*   **Location:** `/tasks/`
*   **Filename:** `drd-[design-name]-[version].md`

## Final instructions

1. Do NOT start creating the design
2. Make sure to ask the user clarifying questions
3. Take the user's answers to the clarifying questions and improve the DRD
4. All output files must be versioned via the file name as outlined above in the `Output` section.
5. NEVER re-write, revise, or overwrite a file that is prefaced with `drd-`. Just advance the version and save a new version accordingly.
