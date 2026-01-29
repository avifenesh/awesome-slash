---
name: enhance-prompts
description: "Use when improving general prompts for structure, examples, and constraints."
version: 1.0.0
---

# enhance-prompts

Analyze prompts for clarity, structure, and output reliability.

## Required Checks

- Explicit constraints and output format.
- Examples for complex tasks.
- Avoid negative-only rules.

## Best-Practices Context

- Use XML tags for complex instructions.
- Include JSON schema when requesting structured output.
- Keep critical info at the start/end.

## Output Format

```
summary: <short>
findings:
  - file: <path>
    issue: <text>
```
