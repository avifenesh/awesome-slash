---
name: enhance-agent-prompts
description: "Use when improving agent prompts, frontmatter, and tool restrictions."
version: 1.0.0
---

# enhance-agent-prompts

Analyze agent prompts for structure, tool restrictions, and clarity.

## Required Checks

- Frontmatter: name, description, tools, model.
- Tool permissions are least-privilege.
- Instructions are explicit and structured.

## Best-Practices Context

- Use XML tags for complex prompts.
- Avoid redundant step-by-step instructions for thinking models.
- Place critical constraints at the top.

## Output Format

```
summary: <short>
findings:
  - file: <path>
    issue: <text>
    fix: <suggested fix>
```
