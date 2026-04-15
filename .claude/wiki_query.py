#!/usr/bin/env python3
"""
wiki_query.py - Search the LLM Wiki for relevant knowledge

Usage:
    ./wiki_query.py <search_term>           Search all wiki content
    ./wiki_query.py <search_term> --domains  Search domain index only
    ./wiki_query.py <search_term> --pages    Search wiki pages only
    ./wiki_query.py <search_term> --sources  Search raw sources only
    ./wiki_query.py <search_term> --recent    Search recent activity
    ./wiki_query.py <search_term> --json     Output as JSON

Examples:
    ./wiki_query.py "vibe coding"
    ./wiki_query.py "agentic engineering" --pages
    echo "scaling laws" | ./wiki_query.py --json
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Optional

# Project root (parent of .claude/)
PROJECT_ROOT = Path(__file__).parent.parent
WIKI_DIR = PROJECT_ROOT / "wiki"
RAW_DIR = PROJECT_ROOT / "raw"
DOMAINS_FILE = PROJECT_ROOT / ".claude" / "domains.md"


def search_file(
    file_path: Path,
    term: str,
    context_lines: int = 2,
    project_root: Optional[Path] = None,
) -> list[dict]:
    """Search a single file for the term, return matching lines with context."""
    matches = []
    project_root = project_root or PROJECT_ROOT
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        for i, line in enumerate(lines):
            if term.lower() in line.lower():
                start = max(0, i - context_lines)
                end = min(len(lines), i + context_lines + 1)
                context = "".join(lines[start:end])
                matches.append(
                    {
                        "line_number": i + 1,
                        "line": line.strip(),
                        "context": context,
                        "file": str(file_path),
                        "relative_path": str(file_path.relative_to(project_root)),
                        "match_count": get_file_matches(file_path, term),
                    }
                )
    except (IOError, UnicodeDecodeError):
        pass
    return matches


def get_file_matches(file_path: Path, term: str) -> int:
    """Count how many times term appears in file."""
    count = 0
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                if term.lower() in line.lower():
                    count += 1
    except (IOError, UnicodeDecodeError):
        pass
    return count


def search_directory(
    directory: Path, term: str, extensions: Optional[list] = None
) -> list[dict]:
    """Search all files in a directory for the term."""
    results = []
    if not directory.exists():
        return results

    for file_path in directory.rglob("*"):
        if file_path.is_file():
            if extensions and file_path.suffix not in extensions:
                continue
            matches = search_file(file_path, term)
            results.extend(matches)

    # Sort by match count (more matches = more relevant)
    results.sort(key=lambda x: x["match_count"], reverse=True)
    return results


def format_results(results: list[dict], term: str) -> str:
    """Format search results as readable text."""
    if not results:
        return f"No results found for '{term}'"

    output = []
    output.append(f"=== WIKI SEARCH: {term} ===")
    output.append(
        f"Found {len(results)} match(es) across {len(set(r['file'] for r in results))} file(s)"
    )
    output.append("")

    current_file = None
    for result in results:
        if result["file"] != current_file:
            current_file = result["file"]
            output.append(f"\n--- {result['relative_path']} ---")

        # Highlight the matching term
        highlighted = result["context"]
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        highlighted = pattern.sub(f"**{term.upper()}**", highlighted)
        output.append(f"  [{result['line_number']}] {highlighted}")

    return "\n".join(output)


def format_json(results: list[dict], term: str) -> str:
    """Format results as JSON for piping to other tools."""
    output = {
        "term": term,
        "total_matches": len(results),
        "files_searched": len(set(r["file"] for r in results)),
        "results": results,
    }
    return json.dumps(output, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description="Search the LLM Wiki for relevant knowledge"
    )
    parser.add_argument("term", nargs="?", help="Search term")
    parser.add_argument(
        "--domains", action="store_true", help="Search domain index only"
    )
    parser.add_argument("--pages", action="store_true", help="Search wiki pages only")
    parser.add_argument(
        "--sources", action="store_true", help="Search raw sources only"
    )
    parser.add_argument(
        "--recent", action="store_true", help="Search recent activity in log"
    )
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    # Allow stdin if no term provided
    term = args.term
    if not term:
        term = sys.stdin.read().strip()

    if not term:
        print("Error: No search term provided", file=sys.stderr)
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    results = []

    # Determine search scope
    search_domains = args.domains
    search_wiki = args.pages or not (search_domains or args.sources or args.recent)
    search_raw = args.sources
    search_log = args.recent or not (search_domains or args.pages or args.sources)

    # Execute searches
    if search_domains and DOMAINS_FILE.exists():
        results.extend(search_file(DOMAINS_FILE, term))

    if search_wiki and WIKI_DIR.exists():
        wiki_results = search_directory(WIKI_DIR, term, extensions=[".md"])
        # Exclude log.md from general wiki search unless specifically requested
        if not search_log:
            wiki_results = [r for r in wiki_results if "wiki/log.md" not in r["file"]]
        results.extend(wiki_results)

    if search_raw and RAW_DIR.exists():
        results.extend(
            search_directory(RAW_DIR, term, extensions=[".md", ".txt", ".pdf"])
        )

    if search_log:
        log_file = WIKI_DIR / "log.md"
        if log_file.exists():
            results.extend(search_file(log_file, term))

    # Output
    if args.json:
        print(format_json(results, term))
    else:
        print(format_results(results, term))

    # Exit code: 0 if matches, 1 if no matches
    sys.exit(0 if results else 1)


if __name__ == "__main__":
    main()
