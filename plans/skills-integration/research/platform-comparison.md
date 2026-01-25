# Platform Comparison: Claude Code vs OpenCode vs Codex

> Cross-platform differences and compatibility considerations.

## Table of Contents
1. [Overview](#1-overview)
2. [Configuration](#2-configuration)
3. [Skills Implementation](#3-skills-implementation)
4. [Agent Systems](#4-agent-systems)
5. [State Management](#5-state-management)
6. [Compatibility Strategy](#6-compatibility-strategy)

---

## 1. Overview

### Platform Summary

| Feature | Claude Code | OpenCode | Codex CLI |
|---------|-------------|----------|-----------|
| **Vendor** | Anthropic | SST (Open Source) | OpenAI |
| **Models** | Claude only | 75+ providers | OpenAI only |
| **Open Source** | No | Yes, 100% | Partial |
| **Architecture** | Monolithic | Client/Server | CLI-first |
| **Primary UI** | CLI + VS Code | TUI (terminal) | CLI |
| **LSP Support** | No | Built-in | No |

### Key Differentiators

**Claude Code:**
- Native Anthropic integration
- Hooks system for automation
- Skills specification originator

**OpenCode:**
- Provider-agnostic
- Model inheritance for subagents
- Plugin/hook architecture
- Custom tools in TypeScript

**Codex CLI:**
- Reasoning model integration
- AGENTS.md layered discovery
- Automatic context management

---

## 2. Configuration

### Config Files

| Platform | Primary | Global | Project |
|----------|---------|--------|---------|
| Claude Code | `settings.json` | `~/.claude/` | `.claude/` |
| OpenCode | `opencode.json` | `~/.config/opencode/` | `.opencode/` |
| Codex CLI | `config.toml` | `~/.codex/` | `.codex/` |

### Project Instructions

| Platform | File | Fallback |
|----------|------|----------|
| Claude Code | `CLAUDE.md` | None |
| OpenCode | `AGENTS.md` | `CLAUDE.md` |
| Codex CLI | `AGENTS.md` | `CODEX.md` |
| Gemini CLI | `GEMINI.md` | None |

### OpenCode Compatibility

OpenCode reads Claude Code configs as fallback:
```bash
# Disable with environment variables:
OPENCODE_DISABLE_CLAUDE_CODE=1        # All .claude support
OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1 # Only ~/.claude/CLAUDE.md
OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1 # Only .claude/skills
```

---

## 3. Skills Implementation

### Discovery Locations

| Platform | Primary | Secondary |
|----------|---------|-----------|
| Claude Code | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/` |
| OpenCode | `.opencode/skills/<name>/SKILL.md` | `.claude/skills/` (fallback) |
| Codex CLI | Not native | Uses AGENTS.md |
| Gemini CLI | Not native | Uses MCP |

### OpenCode Skill Discovery Order
1. Project: `.opencode/skills/<name>/SKILL.md`
2. Global: `~/.config/opencode/skills/<name>/SKILL.md`
3. Claude-compatible: `.claude/skills/<name>/SKILL.md`
4. Global Claude-compatible: `~/.claude/skills/<name>/SKILL.md`

### SKILL.md Format (Universal)

All platforms accepting skills use the same format:
```yaml
---
name: skill-name          # Required
description: What it does # Required
license: MIT              # Optional
compatibility: tool-xyz   # Optional
metadata: {}              # Optional
---

# Instructions
[Markdown content]
```

### Skill Loading Mechanism

| Platform | Method |
|----------|--------|
| Claude Code | Auto-discovery + tool invocation |
| OpenCode | `skill` tool, agent frontmatter |
| Codex CLI | Manual via AGENTS.md references |
| Gemini CLI | MCP server integration |

---

## 4. Agent Systems

### Agent Definition

**Claude Code (Subagents):**
```markdown
// .claude/agents/security-reviewer.md
---
name: security-reviewer
tools: [Read, Grep, Glob]
---

You are a security-focused code reviewer.
```

**OpenCode (Agents):**
```markdown
// .opencode/agents/code-reviewer.md
---
description: Reviews code for issues
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.1
tools:
  write: false
  edit: false
permission:
  bash: ask
---

You are in code review mode.
```

**Codex CLI:**
No native agent system. Uses AGENTS.md for instructions.

### Model Selection

| Platform | Primary | Subagent |
|----------|---------|----------|
| Claude Code | Claude (fixed) | Claude (fixed) |
| OpenCode | Configurable | Inherits from primary |
| Codex CLI | OpenAI (configurable) | N/A |

### OpenCode Model Format
```
provider/model-id
```
Examples:
- `anthropic/claude-sonnet-4-20250514`
- `openai/gpt-5`
- `google/gemini-2.0-flash`

---

## 5. State Management

### State Directories

| Platform | Location |
|----------|----------|
| Claude Code | `.claude/` |
| OpenCode | `.opencode/` |
| Codex CLI | `.codex/` |

### State Files (awesome-slash)

| File | Purpose |
|------|---------|
| `tasks.json` | Active task registry |
| `flow.json` | Workflow progress (in worktree) |
| `preference.json` | Cached task source |

### Platform Detection
```javascript
// lib/cross-platform/platform.js
function getStateDir() {
  const platform = process.env.AI_PLATFORM || detectPlatform();
  switch (platform) {
    case 'claude': return '.claude';
    case 'opencode': return '.opencode';
    case 'codex': return '.codex';
    default: return '.claude';
  }
}
```

---

## 6. Compatibility Strategy

### Recommended Approach

1. **Use Claude Code structure as primary** (canonical, most users)
2. **Other platforms fall back to Claude Code locations**
3. **State isolation via AI_STATE_DIR when needed**

### Directory Structure
```
.claude/                 # Primary (Claude Code - canonical)
├── skills/              # Skills (primary location)
├── agents/              # Agent definitions (Claude Code subagents)
├── sources/             # Task sources
└── flow.json            # Workflow state

.opencode/               # Secondary (OpenCode reads .claude/ as fallback)
├── agents/              # Agent definitions
├── commands/            # Custom commands
├── plugins/             # Plugins
└── tools/               # Custom tools

AGENTS.md                # Instructions (OpenCode, Codex)
CLAUDE.md                # Instructions (Claude Code - primary)
```

### Cross-Platform Skills

**Minimum viable skill:**
```yaml
---
name: my-skill
description: Does something useful
---

# My Skill

Instructions that work on any platform.
```

**Platform-specific notes:**
```markdown
---
name: my-skill
description: Does something useful
compatibility: claude-code, opencode
---

# My Skill

[Universal instructions]

## Platform Notes

### Claude Code
[Claude-specific guidance]

### OpenCode  
[OpenCode-specific guidance]
```

### MCP Compatibility

All platforms support MCP (Model Context Protocol):
- Same tool definitions work across platforms
- State isolation via `AI_STATE_DIR` environment variable
- Local (stdio) and remote (HTTP) server types

---

## Quick Reference

### User Interaction Differences

| Feature | Claude Code | OpenCode | Codex |
|---------|-------------|----------|-------|
| User questions | Checkboxes | Numbered list | Numbered list |
| Command prefix | `/` | `/` | `$` |
| Agent mention | N/A | `@agent-name` | N/A |
| Tab completion | Commands | Agents | Commands |

### Tool Access Differences

| Tool | Claude Code | OpenCode | Codex |
|------|-------------|----------|-------|
| Read | Yes | Yes | Yes |
| Write | Yes | Yes | Yes |
| Edit | Yes | Yes | Yes |
| Bash | Yes | Yes | Yes |
| Task (subagents) | Yes | Yes | Limited |
| WebFetch | Yes | Yes | Yes |
| Custom tools | Hooks | TypeScript | N/A |

---

## Migration Considerations

### For awesome-slash (Claude Code Primary)

Skills go in `.claude/skills/` - the canonical location. Other platforms read from there:

1. Keep skills in `.claude/skills/<name>/SKILL.md`
2. Create `AGENTS.md` (copy of `CLAUDE.md`) for OpenCode/Codex
3. State files use platform detection for `.claude/` vs `.opencode/` vs `.codex/`
4. Test on Claude Code first, then verify on other platforms

### How Other Platforms Find Our Skills

```javascript
// OpenCode discovery order (reads .claude/ as fallback)
const skillPaths = [
  '.opencode/skills',      // OpenCode primary
  '.claude/skills',        // Claude Code (our location) ← FOUND
  '~/.config/opencode/skills',
  '~/.claude/skills'
];
```

Since we use `.claude/skills/`, OpenCode finds them automatically via fallback.

---

*Based on official documentation from Anthropic, SST OpenCode, and OpenAI Codex.*
