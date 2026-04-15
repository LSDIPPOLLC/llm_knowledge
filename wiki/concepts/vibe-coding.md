---
title: Vibe Coding
type: concept
sources: [raw/articles/2026-04-15-vibe-coding-guide.md]
related: [concepts/agentic-engineering, entities/andrej-karpathy, sources/summary-vibe-coding-guide-2026]
created: 2026-04-15
updated: 2026-04-15
confidence: high
---

# Vibe Coding

Software development practice where you describe what you want in plain language and let an AI model generate the code.

## Definition

Coined by Andrej Karpathy on February 2, 2025:
> "There's a new kind of coding I call 'vibe coding', where you fully give in to the vibes, embrace exponentials, and forget that the code even exists."

## Key Distinction

Simon Willison: If an LLM wrote the code and you reviewed, tested, and understood it — that's software development, not vibe coding. Vibe coding = accepting AI-generated code without full review.

## Key Statistics

| Metric | Value |
|--------|-------|
| US developers using AI daily | 92% |
| Global code AI-generated | 41% |
| Non-developers using vibe coding | 63% |
| Productivity gains (seniors) | 81% |
| AI code with security flaws | ~24.7% |

## Workflow

1. **Describe intent** — natural language, voice, or screenshot
2. **AI plans architecture** — analyzes codebase, plans multi-file changes
3. **Code generation & execution** — frontend, backend, DB, auth, APIs
4. **Iterate on results** — test, refine with follow-up prompts

## Best Practices

1. Always review auth/payments/infrastructure code manually
2. Write tests first, let AI implement to pass them
3. Use structured prompts (specific about frameworks, patterns, edge cases)
4. Commit frequently (AI makes sweeping changes)
5. Monitor token quota

## Security Risks

- ~24.7% of AI code has security flaws
- 1.7x more major issues than human code
- 2.74x higher security vulnerability rate
- Hardcoded secrets, SQL injection, deprecated libraries, hallucinated dependencies

## Criticism

- Technical debt: code you don't understand is code you can't maintain
- Debugging paradox: 63% of devs spent more time debugging AI code than writing it themselves
- Skill erosion: 40% of juniors deployed code without full understanding
- $1.5 trillion projected technical debt by 2027

## Evolution

Karpathy (2026) declared vibe coding "passé" and introduced [[agentic-engineering]]: orchestrating teams of specialized agents with quality gates and human oversight, not blindly accepting AI output.
