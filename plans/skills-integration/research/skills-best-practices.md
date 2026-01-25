# Skills Best Practices Research

> Consolidated findings from 50+ sources on designing effective AI agent skills.

## Table of Contents
1. [Skill Structure](#1-skill-structure)
2. [Progressive Disclosure](#2-progressive-disclosure)
3. [Instruction Design](#3-instruction-design)
4. [Integration Patterns](#4-integration-patterns)
5. [Quality Assurance](#5-quality-assurance)
6. [Key Principles](#6-key-principles)

---

## 1. Skill Structure

### Standard Directory Layout
All major implementations converge on a folder-based structure:

```
skill-name/
├── SKILL.md          # Required: instructions + metadata
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
└── assets/           # Optional: templates, resources
```

### SKILL.md Frontmatter

**Required fields:**
```yaml
---
name: skill-name           # 1-64 chars, lowercase + hyphens
description: What it does  # 1-1024 chars, when to use
---
```

**Optional fields:**
```yaml
license: MIT
compatibility: Requires git, docker
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Bash(git:*) Read  # Experimental
```

### Name Validation
Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Lowercase alphanumeric + hyphens
- No consecutive hyphens
- No leading/trailing hyphens
- Must match parent directory name

---

## 2. Progressive Disclosure

The universal pattern across all implementations:

| Level | Token Budget | When Loaded | Purpose |
|-------|-------------|-------------|---------|
| **Metadata** | ~100 tokens | At startup for ALL skills | Discovery, routing |
| **Instructions** | <5000 tokens | When skill is activated | Core knowledge |
| **Resources** | As needed | On demand | Deep reference |

### Why This Matters
> "The context window is a public good. Your Skill shares the context window with everything else Claude needs to know."
> — Anthropic Best Practices

### Implementation Guidelines

1. **Keep SKILL.md under 500 lines**
2. **Move reference material to separate files**
3. **Use one-level-deep file references only**
4. **Default assumption: Claude is already smart** - only add what it doesn't know

---

## 3. Instruction Design

### Degrees of Freedom

Match instruction specificity to task fragility:

| Freedom Level | When to Use | Example |
|--------------|-------------|---------|
| **High** (text instructions) | Multiple approaches valid | Code review guidelines |
| **Medium** (pseudocode) | Preferred pattern exists | Configurable templates |
| **Low** (specific scripts) | Operations are fragile | Database migrations |

### Formatting Best Practices

From Anthropic and OpenAI research:

1. **Use XML tags** for Claude (fine-tuned to pay attention to them)
2. **Use markdown structure** for organization
3. **Be direct** - Claude responds well to clear instructions
4. **Avoid over-engineering** - "Only make changes that are directly requested"

### Example Structure
```xml
<skill-instructions>
## Overview
[Brief description of what this skill does]

## When to Use
[Clear criteria for activation]

## Process
1. [Step 1]
2. [Step 2]

## Constraints
- [Constraint 1]
- [Constraint 2]

## Output Format
[Expected output structure]
</skill-instructions>
```

---

## 4. Integration Patterns

### Context Injection (XML Format)
```xml
<available_skills>
  <skill>
    <name>pdf-processing</name>
    <description>Extracts text and tables from PDF files...</description>
    <location>/path/to/skills/pdf-processing/SKILL.md</location>
  </skill>
</available_skills>
```

### Agent Frontmatter Loading
For OpenCode and similar platforms:
```yaml
---
name: my-agent
skills:
  - pdf-processing
  - code-review
---
```

### Filesystem-Based Loading
```bash
cat /path/to/skill/SKILL.md
```

### Tool-Based Loading
Implement `load_skill` tool that:
1. Takes skill name as parameter
2. Returns SKILL.md content
3. Optionally loads resources

---

## 5. Quality Assurance

### Test with Target Models
> "Skills effectiveness varies by model. Haiku needs more guidance, Opus less."

### Iterative Development
> "The most effective Skill development process involves Claude itself. Work with one instance of Claude ('Claude A') to create a Skill that will be used by other instances ('Claude B')."

### Feedback Loops
Implement validation → fix → repeat patterns:
1. Skill executes
2. Output validated against expectations
3. Errors fed back for correction
4. Loop until success

---

## 6. Key Principles

### From Anthropic
1. **Solve Don't Punt**: Scripts should handle errors explicitly
2. **Utility Scripts Over Generation**: Pre-made scripts are more reliable
3. **Context is Premium**: Every token counts
4. **Test with Real Workflows**: Validate in actual agent sessions

### From Production Tools
1. **Progressive Disclosure**: Load only what's needed
2. **Verifiable Goals**: Tests, linters, type checks enable autonomy
3. **File-Based Abstraction**: Files are powerful primitives
4. **Plain Text Formats**: Version-controllable, portable

### From Academic Research
1. **Structure for Parsing**: Thought/Action/Observation formats work
2. **Enable Self-Correction**: Allow revision based on feedback
3. **Ground in External Data**: Reduce hallucination
4. **Combine Approaches**: ReAct + CoT + verification

---

## Design Checklist

- [ ] Name matches directory, follows pattern
- [ ] Description explains WHEN to use (not just what)
- [ ] Instructions under 500 lines
- [ ] Reference material in separate files
- [ ] Scripts handle their own errors
- [ ] Tested with target model(s)
- [ ] Examples show edge cases
- [ ] Output format clearly specified

---

*Compiled from 50+ sources including Anthropic, OpenAI, Google, Microsoft, academic papers, and production implementations.*
