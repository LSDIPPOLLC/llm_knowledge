---
title: Agentic Engineering
type: concept
sources: [raw/articles/2026-04-15-vibe-coding-guide.md]
related: [concepts/vibe-coding, entities/andrej-karpathy, sources/summary-vibe-coding-guide-2026]
created: 2026-04-15
updated: 2026-04-15
confidence: high
---

# Agentic Engineering

Post-vibe-coding paradigm where humans orchestrate teams of specialized AI agents rather than blindly accepting AI output.

## Definition

Coined by Andrej Karpathy (2026):
> "'Agentic engineering': 'agentic' because the new default is that you are not writing the code directly 99% of the time, you are orchestrating agents who do and acting as oversight — 'engineering' to emphasize that there is an art & science and expertise to it."

## Vibe Coding vs Agentic Engineering

| Aspect | Vibe Coding | Agentic Engineering |
|--------|-------------|---------------------|
| Human role | Prompt and accept | Orchestrate and oversee |
| AI output | Accepted blindly | Validated with quality gates |
| Multi-agent | No | Yes (parallel execution) |
| Testing | Often skipped | Automated at every step |
| Production readiness | Prototyping only | Production-ready |

## Key Principles

1. **Orchestration over generation** — orchestrate specialized agents, don't just generate code
2. **Quality gates** — automated tests, linting, security scans at every step
3. **Human oversight** — critical checkpoints where humans review, not just at the end
4. **Agent teams** — multiple agents working in parallel on different parts of a feature

## Tools Supporting Agentic Engineering

- **Google Antigravity** — Manager View for multi-agent parallel execution
- **Claude Code** — agent teams, 200K+ token context
- **OpenAI Codex CLI** — Skills & Automations, worktrees

## IBM's Prediction

Ismael Faro predicts evolution toward "Objective-Validation Protocol" — users define goals and validate outputs while collections of agents autonomously execute the work.

## See Also

- [[vibe-coding]] — the precursor paradigm
- [[andrej-karpathy]] — coined both terms
