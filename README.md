# ideallm

Personal knowledge base and agent memory system powered by an LLM wiki.

## Overview

This project uses Andrej Karpathy's **LLM Wiki pattern** — a personal knowledge base where an AI compiles sources into a structured, interlinked wiki. The wiki sits between you and your raw sources, accumulating knowledge over time rather than rediscovering it on every query.

The wiki serves two purposes:
1. **Personal Knowledge Base** — Tracking research, articles, papers, books, ideas
2. **Agent Memory** — Persistent memory across sessions; accumulates knowledge about projects, decisions, patterns

See `WIKI_SCHEMA.md` for the full schema documentation.

## Project Structure

```
ideallm/
├── CLAUDE.md              # Behavioral guidelines for the AI agent
├── WIKI_SCHEMA.md         # LLM Wiki schema (operations, conventions)
├── raw/                   # Source of truth (wiki must stay in sync with raw)
│   ├── articles/          # Web-clipped or manually added articles
│   ├── papers/            # Academic papers, technical reports
│   ├── notes/             # Personal notes, journal entries, reflections
│   └── assets/            # Downloaded images, figures, attachments
├── wiki/                  # LLM-generated wiki (YOU own this; LLM maintains it)
│   ├── index.md           # Master catalog of all wiki pages
│   ├── log.md             # Append-only activity timeline
│   ├── overview.md        # High-level synthesis of the knowledge base
│   ├── concepts/          # Concept pages
│   ├── entities/          # Entity pages (people, organizations)
│   ├── sources/           # Source summary pages
│   ├── comparisons/       # Comparison pages
│   └── reflections/       # Insights filed from queries
└── .claude/
    ├── memory/            # Lightweight session memory files
    ├── domains.md         # Topic-to-page index for quick discovery
    └── wiki_query.py      # Terminal search tool
```

## Wiki Page Frontmatter

Every wiki page has YAML frontmatter for tracking:

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

## Wiki Operations

### Ingest a Source

Drop a file into `raw/` and tell the AI to process it:

```
> ingest raw/articles/my-article.md
```

The AI will:
1. Read the source
2. Discuss key takeaways with you
3. Create/update a summary page in `wiki/sources/`
4. Update `wiki/index.md` with new page
5. Update all relevant concept and entity pages
6. Add links from existing pages that reference the new content
7. Append an entry to `wiki/log.md`

### Query the Wiki

Ask questions and the AI synthesizes answers from the wiki:

```
> What does our wiki say about scaling laws?
```

The AI reads `wiki/index.md`, identifies relevant pages, synthesizes an answer with `[[wiki-link]]` citations. Good answers can be filed back into the wiki as new pages.

### Sync the Wiki

When raw sources change, sync the wiki to keep it current:

```
> sync raw/articles/my-article.md
```

This detects version changes, marks affected pages as `stale`, re-ingests the changed source, deprecates old pages, and updates frontmatter.

### Deprecate a Page

Mark a page as superseded:

```
> deprecate wiki/concepts/old-auth.md
```

This adds `status: deprecated`, `replaced_by` frontmatter, a deprecation banner, and updates `wiki/index.md`.

### Lint the Wiki

Health-check for issues:

```
> lint
```

Checks for:
- Contradictions between pages
- Orphan pages with no inbound links
- Missing pages for concepts mentioned but lacking their own page
- **Stale pages** — pages with `status: stale` that need re-ingesting
- **Deprecated pages** — superseded pages still linked

### Search the Wiki

```bash
# Search all wiki content
python .claude/wiki_query.py "vime coding"

# Search specific areas
python .claude/wiki_query.py "agentic engineering" --pages
python .claude/wiki_query.py "scaling laws" --sources
python .claude/wiki_query.py "karpathy" --recent

# Output as JSON
python .claude/wiki_query.py "moe" --json
```

## Obsidian

Open the `wiki/` directory in Obsidian as a vault for:
- **Graph view** — visualize page connections
- **Web Clipper** — clip articles directly to `raw/`
- **Dataview** — query frontmatter as a database

```bash
obsidian /path/to/ideallm/wiki
```

## Tool Stack (Optional)

- **Obsidian** — Recommended viewer (graph view, web clipper, dataview plugins)
- **qmd** — Local search for large wikis (BM25 + vector + LLM re-ranking)
- **Marp** — Generate slide decks from wiki content
- **Git** — Version control for the wiki (use branches to explore reorganizations)

## Behavioral Guidelines

`CLAUDE.md` contains behavioral guidelines derived from Karpathy's principles:
1. **Think Before Coding** — surface assumptions, don't hide confusion
2. **Simplicity First** — minimum code, nothing speculative
3. **Surgical Changes** — touch only what you must
4. **Goal-Driven Execution** — define success criteria, loop until verified

## Getting Started

1. Open in Obsidian: `obsidian /path/to/ideallm/wiki`
2. Add sources to `raw/` (articles, papers, notes)
3. Tell the AI to ingest: `> ingest raw/articles/filename.md`
4. Query the wiki: `> What does our wiki say about...?`
5. Run lint: `> lint` to check wiki health
6. Run sync: `> sync` when raw sources change

## Resources

- [Karpathy's LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [Antigravity: Vibe Coding Guide](https://antigravity.codes/blog/vibe-coding-guide)
- [Antigravity: LLM Wiki Pattern](https://antigravity.codes/blog/karpathy-llm-wiki-idea-file)
