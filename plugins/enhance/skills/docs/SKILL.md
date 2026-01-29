---
name: enhance-docs
description: "Use when improving documentation structure, accuracy, and RAG readiness."
version: 1.0.0
---

# enhance-docs

Analyze docs for structure, accuracy, and retrieval readiness.

## Required Checks

- Broken internal links and missing sections.
- Outdated references vs code.
- Clear examples and quick-start guidance.

## Best-Practices Context

- Use clear headings and consistent anchors.
- Keep docs concise; prefer tables for structured info.
- Include minimal, verified examples.

## Output Format

```
summary: <short>
findings:
  - file: <path>
    issue: <text>
```
