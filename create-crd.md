# Rule: Generating a Content Requirements Document (CRD)

## Corporate Standards

This phase is governed by your organization's Corporate Standards. Before proceeding:

1. **Read the standards manifest**: Load `/standards/standards-manifest.yml` to determine which standards apply to this phase.

2. **Load applicable standards**: Based on the manifest's `phases.create-crd.includes` list, read and apply each referenced standards file from `/standards/`:
   ```yaml
   # Example from standards-manifest.yml:
   phases:
     create-crd:
       includes:
         - global/principles.md
         - global/terminology.md
         - domains/content-voice.md
         - phases/create-crd.md
   ```

3. **Apply standards throughout**: CRD outputs must comply with all loaded standards rules.

4. **Document compliance**: Include a Standards Compliance section in the CRD output, noting:
   - Standards version (from `version` field in manifest)
   - Which standards files were applied
   - Compliance status for key rules
   - Any deviations with rationale

If the standards manifest or standards files are not available, proceed without them but note that standards should be established for team consistency.

---

## Goal

To guide an AI assistant in creating a detailed Content Requirements Document (CRD) in Markdown format, based on an initial user prompt. The CRD should be clear, actionable, and suitable for a junior content creator or copywriter to understand and produce the content.

## Process

1.  **Receive Initial Prompt:** The user provides a brief description or request for new content, copy, or messaging.
2.  **Ask Clarifying Questions:** Before writing the CRD, the AI *must* ask only the most essential clarifying questions needed to write a clear CRD. Limit questions to 3-5 critical gaps in understanding. The goal is to understand the content purpose, audience, tone, and key messages. Make sure to provide options in letter/number lists so I can respond easily with my selections.
3.  **Generate CRD:** Based on the initial prompt and the user's answers to the clarifying questions, generate a CRD using the structure outlined below.
4.  **Save CRD:** Save the generated document as `crd-[content-name].md` inside the `/tasks` directory.

## Clarifying Questions (Guidelines)

Ask only the most critical questions needed to write a clear CRD. Focus on areas where the initial prompt is ambiguous or missing essential context. Common areas that may need clarification:

*   **Purpose/Goal:** If unclear - "What is the primary goal of this content? (inform, persuade, entertain, convert)"
*   **Target Audience:** If vague - "Who is the intended audience and what do they care about?"
*   **Tone & Voice:** If unspecified - "What tone should this content have?"
*   **Key Messages:** If unstated - "What are the 2-3 most important points to communicate?"
*   **Call to Action:** If applicable - "What action should the reader take after consuming this content?"

**Important:** Only ask questions when the answer isn't reasonably inferable from the initial prompt. Prioritize questions that would significantly impact the CRD's clarity.

### Formatting Requirements

- **Number all questions** (1, 2, 3, etc.)
- **List options for each question as A, B, C, D, etc.** for easy reference
- Make it simple for the user to respond with selections like "1A, 2C, 3B"

### Example Format

```
1. What is the primary goal of this content?
   A. Educate/inform the reader
   B. Persuade or convince
   C. Drive a specific action (signup, purchase, etc.)
   D. Build brand awareness/trust

2. What tone best fits this content?
   A. Professional and authoritative
   B. Friendly and conversational
   C. Urgent and action-oriented
   D. Empathetic and supportive

3. What is the expected content length?
   A. Short-form (under 300 words)
   B. Medium-form (300-800 words)
   C. Long-form (800-2000 words)
   D. Comprehensive (2000+ words)
```

## CRD Structure

The generated CRD should include the following sections:

1.  **Introduction/Overview:** Briefly describe the content piece and its purpose. State the content objective.
2.  **Goals:** List the specific, measurable objectives for this content.
3.  **Target Audience:** Detail the intended reader:
    *   Demographics and psychographics
    *   Pain points and motivations
    *   Current knowledge level on the topic
    *   Where they are in the customer journey (if applicable)
4.  **Key Messages:** List the core messages that must be communicated:
    *   Primary message (the one takeaway)
    *   Supporting messages (2-3 secondary points)
    *   Proof points or evidence to include
5.  **Tone & Voice:** Define the content's personality:
    *   Voice characteristics (e.g., authoritative, friendly, witty)
    *   Tone for this piece (e.g., urgent, reassuring, celebratory)
    *   Words/phrases to use
    *   Words/phrases to avoid
6.  **Content Structure:** Outline the expected format:
    *   Content type (blog post, email, landing page, UI copy, etc.)
    *   Suggested outline or sections
    *   Word count or length guidelines
    *   Headline/subject line requirements
7.  **SEO & Keywords (if applicable):** Specify search optimization requirements:
    *   Primary keyword(s)
    *   Secondary keywords
    *   Meta description requirements
    *   Internal/external linking guidelines
8.  **Call to Action:** Define the desired reader action:
    *   Primary CTA
    *   Secondary CTA (if applicable)
    *   CTA placement and frequency
9.  **Non-Goals (Out of Scope):** Clearly state what this content will *not* cover to manage scope.
10. **Brand & Style References:** Link to brand voice guidelines, style guides, or reference content if applicable.
11. **Technical Requirements:** Mention any platform-specific constraints:
    *   Character limits
    *   Formatting restrictions
    *   Localization/translation needs
    *   Accessibility considerations (alt text, reading level)
12. **Deliverables:** List the expected outputs:
    *   File format (Google Doc, Markdown, CMS draft, etc.)
    *   Number of variations (if A/B testing)
    *   Supporting assets needed (images, graphics)
13. **Success Metrics:** How will the success of this content be measured? (e.g., "Achieve 5% click-through rate", "Rank on page 1 for target keyword", "Reduce support tickets by 20%").
14. **Open Questions:** List any remaining questions or areas needing further clarification.

## Target Audience

Assume the primary reader of the CRD is a **junior content creator or copywriter**. Therefore, requirements should be explicit, unambiguous, and provide enough context for them to understand the content goals, audience, and brand voice. Include examples where helpful.

## Output

*   **Format:** Markdown (`.md`)
*   **Location:** `/tasks/`
*   **Filename:** `crd-[content-name]-[version].md`

## Final instructions

1. Do NOT start writing the content
2. Make sure to ask the user clarifying questions
3. Take the user's answers to the clarifying questions and improve the CRD
4. All output files must be versioned via the file name as outlined above in the `Output` section.
5. NEVER re-write, revise, or overwrite a file that is prefaced with `crd-`. Just advance the version and save a new version accordingly.
