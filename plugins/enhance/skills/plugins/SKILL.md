---
name: enhance-plugins
description: "Use when analyzing plugin structures, MCP tools, and plugin security patterns."
version: 1.0.0
---

# enhance-plugins

Analyze plugin structures, MCP tools, and security patterns.

## Required Checks

- plugin.json validity (versions, required fields).
- MCP tool schemas: required fields, additionalProperties false, clear descriptions.
- Security patterns (unrestricted bash, hardcoded secrets).

## Best-Practices Context

- Prefer strict schemas with enums and required fields.
- Tool descriptions must include when-to-use guidance.
- Avoid over-privileged tool permissions.

## Output Format

```
summary: <short>
findings:
  - file: <path>
    issue: <text>
    certainty: HIGH|MEDIUM|LOW
```
