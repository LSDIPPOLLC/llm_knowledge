# WIKI_SCHEMA.md

LLM Wiki schema for a personal knowledge base + agent memory system.

Inspired by Andrej Karpathy's LLM Wiki pattern: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## Project Structure

```
ideallm/
├── raw/                    # Immutable source documents (NEVER modify)
│   ├── articles/           # Web-clipped or manually added articles
│   ├── papers/             # Academic papers, technical reports
│   ├── notes/              # Personal notes, journal entries, reflections
│   └── assets/             # Downloaded images, figures, attachments
├── wiki/                   # LLM-generated wiki (YOU own this; LLM maintains it)
│   ├── index.md            # Master catalog of all wiki pages
│   ├── log.md              # Append-only activity timeline
│   ├── overview.md         # High-level synthesis of the knowledge base
│   ├── concepts/          # Concept pages (attention-mechanism.md, etc.)
│   ├── entities/           # Entity pages (openai.md, etc.)
│   ├── sources/            # Source summary pages (summary-*.md)
│   ├── comparisons/        # Comparison pages (gpt4-vs-claude.md, etc.)
│   └── reflections/        # Insights filed from queries
└── .claude/
    └── memory/             # Lightweight session memory files
```

## Core Principle

**The raw/ directory is the source of truth.** Unlike Karpathy's original pattern where raw sources are immutable, this wiki handles mutable sources (API docs, security standards, engineering specs) that change over time. The wiki must be kept in sync with raw.

**Wiki pages track their relationship to raw sources via versioned frontmatter. When raw changes, the wiki must be re-synced.**

## Page Conventions

### Wiki Page Frontmatter

Every wiki page MUST have YAML frontmatter:

```yaml
---
title: Page Title
type: concept | entity | source-summary | comparison | reflection
sources: [list of raw/ files referenced]
related: [list of wiki pages linked]
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high | medium | low
status: current | stale | deprecated
raw_version: "1.0.0"        # version of raw source this page was built from
last_verified: YYYY-MM-DD
replaced_by: wiki/path/to/replacement.md  # for deprecated pages only
---
```

**Status values:**
- `current` — Wiki content is in sync with raw sources
- `stale` — Raw has changed since this page was last verified/ingested
- `deprecated` — This page is superseded; see `replaced_by` for current content

### Raw File Frontmatter

Every raw file SHOULD have version metadata:

```yaml
---
title: Users API Reference
version: "2.1.0"
last_updated: 2026-04-15
---
```

The `version` field tracks when the raw content changes. This enables the sync workflow.

## Special Files

### wiki/index.md — Content Catalog

Updated on every ingest or sync. Lists all wiki pages organized by category:

```markdown
# Wiki Index

## Concepts
- [[attention-mechanism]] — Self-attention, multi-head attention, and variants (12 sources)
- [[mixture-of-experts]] — Sparse MoE architectures, routing strategies (8 sources)

## Entities
- [[openai]] — GPT series, organizational history (20 sources)
- [[anthropic]] — Claude series, constitutional AI (14 sources)

## Source Summaries
- [[summary-attention-revisited]] — 2026-03-15
- [[summary-moe-efficiency]] — 2026-04-01

## Comparisons
- [[moe-routing-strategies]] — Filed from query 2026-04-04

## Reflections
- [[insight-scaling-laws]] — Filed from query 2026-04-05

## Deprecated
- [[summary-old-api-v1]] — **DEPRECATED** — Replaced by [[summary-users-api-v2]]
```

**Deprecated section:** Pages that are superseded but kept for historical reference. Link to the replacement page.

### wiki/log.md — Activity Timeline

Append-only record of all wiki operations. Format: `## [YYYY-MM-DD] operation | Title`.

```markdown
# Activity Log

## [2026-04-15] ingest | Article Title
Source: raw/articles/example.md
Pages created: sources/summary-example.md
Pages updated: concepts/example-concept.md
Notes: Key insight or observation.

## [2026-04-15] query | Question asked
Pages read: index.md, concepts/example.md
Output: Synthesized answer with [[wiki-link]] citations
Filed as: wiki/reflections/example.md

## [2026-04-15] sync | raw/articles/users-api.md
Raw version: "2.0.0" → "3.0.0"
Pages marked stale: sources/summary-users-api.md
Pages updated: sources/summary-users-api-v2.md, concepts/user-auth.md
Pages deprecated: sources/summary-users-api.md (replaced_by: sources/summary-users-api-v2.md)

## [2026-04-15] deprecate | wiki/concepts/old-auth.md
Replaced by: wiki/concepts/new-auth.md
```

Parse with: `grep "^## " wiki/log.md | tail -10`

**Operation types:** `ingest`, `query`, `lint`, `sync`, `deprecate`, `edit`

## Operations

### Ingest Workflow

When you say "ingest [filename]" or "ingest [topic]":

1. Read the source file from raw/
2. Discuss key takeaways with you
3. Create/update a summary page in wiki/sources/
4. Update wiki/index.md with new page
5. Update all relevant concept and entity pages
6. Add links from existing pages that reference the new content
7. Append an entry to wiki/log.md

A single ingest may touch 10-15 wiki pages. Report what you did.

### Query Workflow

When you ask a question:

1. Read wiki/index.md to identify relevant pages
2. Read those pages
3. Synthesize an answer with [[wiki-link]] citations
4. If the answer is valuable, offer to file it as a new wiki page

Good answers filed back into the wiki compound just like ingested sources.

### Sync Workflow

When you say "sync raw" or "sync [filename]":

1. **Identify changed raw files** — If no filename given, scan all raw files for version changes
2. **Detect version changes** — Compare raw file's current `version` with wiki pages' recorded `raw_version`
3. **Mark affected pages as stale** — Set `status: stale` on all wiki pages that reference changed raw files
4. **Re-ingest changed sources** — Run the ingest workflow for each changed raw file, creating new/updated summary pages with new version
5. **Deprecate old pages** — Mark old pages as `status: deprecated`, set `replaced_by` to new page
6. **Update frontmatter** — Set `status: current`, `raw_version: <new>`, `last_verified: <today>` on updated pages
7. **Update wiki/index.md** — Move deprecated pages to Deprecated section
8. **Append to wiki/log.md** — Record sync operation with details

Example:

```
> sync raw/articles/users-api.md

Comparing versions:
  raw/articles/users-api.md: "2.0.0" → "3.0.0"
  wiki/sources/summary-users-api.md: built from "2.0.0" (STALE)

Pages affected:
  - wiki/sources/summary-users-api.md (stale) → deprecated
  - wiki/concepts/user-auth.md (stale) → updated

Re-ingesting raw/articles/users-api.md...

Done. 2 pages updated, 1 deprecated.
```

### Deprecate Workflow

When you say "deprecate [page]":

1. Read the page to understand what it covers
2. Determine if there's a replacement page (ask if unclear)
3. Add `status: deprecated` frontmatter
4. Add `replaced_by: wiki/path/to/replacement.md` if applicable
5. Prepend `[DEPRECATED]` to the title
6. Add deprecation banner at the top:

```markdown
> **DEPRECATED** as of YYYY-MM-DD — see [[replacement]] for current documentation
```

7. Update `wiki/index.md` to move page to Deprecated section
8. Append deprecate entry to `wiki/log.md`

### Lint Workflow

When you say "lint" or "lint the wiki":

1. Check for contradictions between pages
2. Find orphan pages with no inbound links
3. List concepts mentioned but lacking their own page
4. **Check for stale pages** — pages with `status: stale` that need re-ingesting
5. **Check for deprecated pages** — pages with `status: deprecated` (flag for awareness)
6. Suggest questions to investigate next

Report findings in a structured format:

```
## Lint Report [YYYY-MM-DD]

STALE PAGES (3):
- wiki/sources/summary-users-api.md (raw_version: "2.0.0", raw is now "3.0.0")
- wiki/concepts/user-auth.md (raw_version: "2.0.0", raw is now "3.0.0")

DEPRECATED PAGES (2):
- wiki/concepts/old-auth.md (replaced_by: wiki/concepts/new-auth.md)
- wiki/sources/summary-deprecated-api.md (replaced_by: wiki/sources/summary-current-api.md)

ORPHANS (1):
- wiki/concepts/tokenization.md (no inbound links)

MISSING PAGES (4):
- "RLHF" mentioned 12 times, no concept page
- "KV Cache" referenced in 5 sources, no page
```

## Use Cases

This wiki serves two purposes:

1. **Personal Knowledge Base** — Tracking research, articles, papers, books, ideas on topics of interest
2. **Agent Memory** — Persistent memory across sessions; the wiki accumulates knowledge about the project, decisions, patterns

## Tool Stack (Optional)

- **Obsidian** — Recommended viewer (graph view, web clipper, dataview plugins)
- **qmd** — Local search for large wikis (BM25 + vector + LLM re-ranking)
- **Marp** — Generate slide decks from wiki content
- **Git** — Version control for the wiki (use branches to explore reorganizations)

## Wiki Query Tool

Use `.claude/wiki_query.py` to search the wiki from a terminal or via bash tool.

### Usage

```bash
# Search all wiki content
python .claude/wiki_query.py "vibe coding"

# Search specific areas
python .claude/wiki_query.py "agentic engineering" --pages
python .claude/wiki_query.py "scaling laws" --sources
python .claude/wiki_query.py "karpathy" --recent

# Output as JSON (for piping to other tools)
python .claude/wiki_query.py "moe" --json
```

### Options

| Option | Description |
|--------|-------------|
| `<term>` | Search term (required, or pass via stdin) |
| `--domains` | Search domain index only |
| `--pages` | Search wiki pages only |
| `--sources` | Search raw sources only |
| `--recent` | Search recent activity in log |
| `--json` | Output as JSON |

### When to Use

- **Before starting a new project** on a domain: `python .claude/wiki_query.py "<domain>" --json`
- **When asked about a topic**: Search wiki first, then optionally enrich with web search
- **During ingest**: Update domain index to maintain discoverability

### Exit Codes

- `0` — Matches found
- `1` — No matches found

## Domain Index

`.claude/domains.md` maps topics to relevant wiki pages for quick discovery.

### Format

```markdown
# Domain Index

## AI Development
- [[concepts/vibe-coding]] — AI code generation paradigm (1 source)
- [[concepts/agentic-engineering]] — Orchestrating AI agents (1 source)
- [[entities/andrej-karpathy]] — Coined vibe coding, agentic engineering

## [Topic Name]
- [[wiki/path/to/page]] — Description (N sources)
```

### Maintenance

- **On ingest**: Update domain index with new topics covered by the source
- **On lint**: Flag topics mentioned but missing from domain index
- **Manually**: Add topics as they emerge from queries

### Discovery Workflow

When asked about a domain:

1. Read `.claude/domains.md` to see if domain is indexed
2. If found, read the relevant wiki pages directly
3. If not found, run `wiki_query.py` to search broadly
4. If valuable knowledge exists, offer to update the domain index

## Schema Evolution

Co-evolve this schema with the LLM as you discover what works. Update page types, frontmatter fields, and workflows based on experience. The schema is not static — it adapts to your domain.
