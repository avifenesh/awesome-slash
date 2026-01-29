---
name: enhance-hooks
description: "Use when reviewing hooks for safety, timeouts, and correct frontmatter."
version: 1.0.0
---

# enhance-hooks

Analyze hook definitions and hook scripts for safety and correctness.

## Required Checks

- Hooks have frontmatter name/description.
- Dangerous commands are guarded or blocked.
- Timeouts are configured for command hooks.

## Best-Practices Context

- Hooks should fail fast (`set -euo pipefail` in scripts).
- Avoid destructive commands or require explicit permission.
- Keep hook outputs short and actionable.

## Output Format

```
summary: <short>
findings:
  - file: <path>
    issue: <text>
    fix: <suggestion>
```
