---
name: enhance-claude-memory
description: "Use when improving CLAUDE.md or AGENTS.md project memory files."
version: 1.0.0
---

# enhance-claude-memory

Improve CLAUDE.md / AGENTS.md for clarity and correctness.

## Required Checks

- Architecture, testing, and workflow conventions are present.
- Tool permissions and safety rules are explicit.
- No secrets or environment-specific paths.
- Platform notes: Claude, OpenCode, Codex behavior is accurate.

## Best-Practices Context

- Keep memory concise and actionable.
- Use short bullet lists for constraints.
- Include repo-specific commands and conventions.

## Output Format

```
summary: <short>
changes:
  - file: <path>
    update: <recommendation>
```
