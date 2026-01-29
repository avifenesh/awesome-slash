---
name: enhance-reporter
description: "Use when generating the unified enhancement report."
version: 1.0.0
---

# enhance-reporter

Generate the unified enhancement report from all enhancer findings.

## Required Behavior

- Group findings by enhancer.
- Deduplicate identical issues.
- Prioritize HIGH, then MEDIUM, then LOW (if verbose).

## Output Format

```
report: |
  <markdown report>
```
