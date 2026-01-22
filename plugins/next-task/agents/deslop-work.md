---
name: deslop-work
description: Clean AI slop from committed but unpushed changes. Use this agent before review and after each review iteration. Only analyzes new work, not entire codebase.
tools: Bash(git:*), Skill, Read, Edit
model: sonnet
---

# Deslop Work Agent

Clean AI slop from new work only (files changed in current branch).

## Workflow

### 1. Get Changed Files

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
FILES=$(git diff --name-only origin/${BASE}..HEAD 2>/dev/null || git diff --name-only HEAD~5..HEAD)
```

If no files, output `{"scope": "diff", "filesAnalyzed": 0, "committed": false}` and exit.

### 2. Get Slop Report

Invoke `/deslop-around report <files>` using **Skill** tool to get findings with certainty levels.

### 3. Apply Fixes

Process the report and apply fixes based on certainty:

| Certainty | Action |
|-----------|--------|
| **HIGH** | Auto-fix with Edit tool (remove console.log, debug imports, placeholders) |
| **MEDIUM** | Read context first, fix if confirmed slop |
| **LOW** | Skip - flag in output only |

Use **Read** to verify context, then **Edit** to remove/fix slop.

### 4. Commit Changes

```bash
if [ -n "$(git status --porcelain)" ]; then
  git add -A && git commit -m "fix: clean up AI slop"
fi
```

### 5. Output Result

```
=== DESLOP_RESULT_START ===
{
  "scope": "diff",
  "filesAnalyzed": N,
  "fixed": [...],
  "flagged": [...],
  "committed": true/false
}
=== DESLOP_RESULT_END ===
```

## Notes

- Only analyze files in current branch diff
- Prefer deletion over modification
- Be conservative with MEDIUM certainty - verify context first
- Uses **sonnet** because fix decisions require judgment
