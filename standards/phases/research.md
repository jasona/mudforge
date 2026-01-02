---
id: PHASE-RESEARCH
name: Research Phase Standards
version: 1.0.0
owner: "Engineering/Product"
last_updated: "2026-01-02"
---

## Purpose

These standards ensure research outputs are thorough, well-sourced, and actionable for the subsequent Create phase.

## Musts (Non-Negotiable)

### Structure & Clarity
- [R-1] **State Research Goal**: Research outputs MUST clearly state the research goal and constraints at the beginning.
- [R-2] **Distinguish Facts from Inferences**: MUST clearly distinguish between facts from sources and your own inferences or recommendations.
- [R-3] **Cite Sources**: All external sources MUST be cited with URL and brief description; group them in a Sources section.

### Accuracy & Integrity
- [R-4] **Flag Uncertainties**: MUST explicitly call out major uncertainties, conflicting information, or areas with limited data.
- [R-5] **No PII**: MUST NOT include customer-identifiable data, real user data, or production secrets in examples or research notes.
- [R-6] **Current Information**: Research MUST prioritize current/recent sources; flag when information may be outdated.

### Actionability
- [R-7] **Recommendations**: Research MUST conclude with actionable recommendations for the Create phase.
- [R-8] **Scope Clarity**: MUST clearly state what was researched and what was out of scope.

## Shoulds (Strong Recommendations)

### Source Quality
- [R-10] **Primary Sources**: SHOULD prefer primary sources (official docs, standards bodies, vendor documentation) over secondary sources (blogs, tutorials).
- [R-11] **Multiple Sources**: SHOULD corroborate important findings with multiple sources when possible.
- [R-12] **Recency**: SHOULD note the date/version of documentation referenced.

### Synthesis
- [R-13] **So-What Summary**: SHOULD provide a "So what for our product?" summary connecting findings to our context.
- [R-14] **Comparison Tables**: SHOULD use comparison tables when evaluating multiple options.
- [R-15] **Risk Identification**: SHOULD proactively identify risks and constraints that could impact implementation.

## Examples

### Good: Clear Source Attribution
> "According to the React 18 documentation (https://react.dev/blog/2022/03/29/react-v18), concurrent rendering is opt-in via createRoot. This aligns with our current setup."

### Bad: Unsourced Claim
> "React 18 requires significant refactoring to use concurrent mode." *(No source, potentially inaccurate)*

### Good: Flagging Uncertainty
> "Note: Information on pricing is from a 2024 blog post; current pricing may differ. Recommend verifying before final decision."

### Bad: Presenting Uncertain Info as Fact
> "The service costs $99/month." *(May be outdated, presented without caveat)*

## Research Output Checklist

Before completing research:
- [ ] Research goal clearly stated
- [ ] Internal context analyzed (codebase, existing docs)
- [ ] External best practices researched
- [ ] All sources cited
- [ ] Uncertainties and gaps flagged
- [ ] Actionable recommendations provided
- [ ] Scope and limitations documented

## References

- See global/principles.md for core research principles
- See domains/ for domain-specific research focus areas
