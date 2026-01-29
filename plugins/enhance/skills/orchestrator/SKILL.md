---
name: enhance-orchestrator
description: "Use when coordinating multiple enhancers and producing a unified /enhance report."
version: 1.0.0
---

# enhance-orchestrator

Coordinate all enhancement analyzers and produce a unified report.

## Required Behavior

- Run relevant enhancers in parallel.
- Respect --focus flags and target-path scoping.
- Deduplicate findings across enhancers.
- Apply auto-fixes only when explicitly requested.

## Best-Practices Context

- Use parallel subagents when tasks are independent.
- Keep outputs concise and evidence-backed.
- Ensure findings are actionable and reference file paths.

## Output Format

```
summary: <short>
by_enhancer:
  - <enhancer>: { high: n, medium: n, low: n }
next_steps:
  - <actionable next step>
```
