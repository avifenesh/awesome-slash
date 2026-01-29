---
name: enhance-skills
description: "Use when reviewing SKILL.md files for structure and trigger quality."
version: 1.0.0
---

# enhance-skills

Analyze SKILL.md files for frontmatter correctness and trigger quality.

## Required Checks

- Frontmatter includes name + description.
- Description includes clear trigger phrases ("Use when user asks…").
- Skill content is concise and scoped.

## Best-Practices Context

- Keep SKILL.md under ~500 lines; move extras to references/.
- Provide explicit triggers and outcomes.
- Avoid ambiguous descriptions.

## Output Format

```
summary: <short>
findings:
  - file: <path>
    issue: <text>
```
