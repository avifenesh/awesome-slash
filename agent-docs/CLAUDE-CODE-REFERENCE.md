# Claude Code Comprehensive Reference Guide (2024-2026)

> A complete reference covering hooks, skills, MCP integration, Agent SDK, configuration, subagent patterns, and IDE integrations.

**Last Updated:** January 2026
**Applicable Versions:** Claude Code 2.x+

---

## Table of Contents

1. [Hooks System Deep Dive](#1-hooks-system-deep-dive)
2. [Skills and Slash Commands](#2-skills-and-slash-commands)
3. [MCP Server Implementation](#3-mcp-server-implementation)
4. [Agent SDK Patterns](#4-agent-sdk-patterns)
5. [Configuration Best Practices](#5-configuration-best-practices)
6. [Subagent Orchestration](#6-subagent-orchestration)
7. [IDE Integrations](#7-ide-integrations)
8. [Production Examples](#8-production-examples)
9. [Context Window Management](#9-context-window-management)
10. [Tools Reference](#10-tools-reference)

---

## 1. Hooks System Deep Dive

Hooks are automated actions triggered at specific points in a Claude Code session. They enable validation, monitoring, and control of Claude's actions through bash commands or LLM-based evaluation.

**Sources:**
- [Hooks Reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Anthropic Blog: Configure Hooks](https://claude.com/blog/how-to-configure-hooks)
- [Agent SDK Hooks](https://platform.claude.com/docs/en/agent-sdk/hooks)

### 1.1 Hook Lifecycle

Hooks fire in this sequence:

1. **SessionStart** - Session begins or resumes
2. **UserPromptSubmit** - User submits a prompt
3. **PreToolUse** - Before tool execution (can modify/block)
4. **PermissionRequest** - When permission dialog appears
5. **PostToolUse** - After tool succeeds
6. **SubagentStart** - When spawning a subagent
7. **SubagentStop** - When subagent finishes
8. **Stop** - Claude finishes responding
9. **PreCompact** - Before context compaction
10. **SessionEnd** - Session terminates
11. **Notification** - Claude Code sends notifications

### 1.2 Hook Types

**Command Hooks** (`type: "command"`):
Execute bash commands with full stdin/stdout control.

**Prompt Hooks** (`type: "prompt"`):
Use LLM evaluation for intelligent, context-aware decisions. Currently only supported for `Stop` and `SubagentStop` events.

### 1.3 Configuration Structure

Hooks are configured in settings files:
- `~/.claude/settings.json` - User settings (all projects)
- `.claude/settings.json` - Project settings (shared with team)
- `.claude/settings.local.json` - Local project settings (not committed)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/validate-bash.sh",
            "timeout": 30
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/format-code.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if all requested tasks are complete. If not, list what remains.",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 1.4 Matcher Syntax

| Pattern | Description |
|---------|-------------|
| `Write` | Match exact tool name |
| `Edit\|Write` | Match multiple tools (regex OR) |
| `Notebook.*` | Regex pattern matching |
| `*` or `""` | Match all tools |
| (omitted) | Required for Stop, SubagentStop, UserPromptSubmit |

### 1.5 Hook Input Schema

All hooks receive JSON via stdin:

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript",
  "cwd": "/project/root",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test",
    "description": "Run test suite"
  }
}
```

### 1.6 Hook Output and Exit Codes

| Exit Code | Behavior |
|-----------|----------|
| 0 | Success - stdout shown to user or added as context |
| 2 | Blocking error - stderr shown, action blocked |
| Other | Non-blocking error - stderr shown in verbose mode |

**PreToolUse Decision Control:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "Reason for decision",
    "updatedInput": {
      "command": "modified command"
    },
    "additionalContext": "Context for Claude"
  }
}
```

**Stop/SubagentStop Control:**

```json
{
  "decision": "block",
  "reason": "Tasks incomplete: missing test coverage"
}
```

### 1.7 Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Absolute path to project root |
| `CLAUDE_CODE_REMOTE` | "true" if remote session |
| `CLAUDE_ENV_FILE` | Path to persist env vars (SessionStart/Setup only) |
| `CLAUDE_FILE_PATHS` | Space-separated file paths (PostToolUse for Write/Edit) |

### 1.8 Practical Hook Examples

**Security Firewall (block dangerous commands):**

```bash
#!/usr/bin/env bash
# .claude/hooks/pre-bash-firewall.sh
set -euo pipefail

cmd=$(jq -r '.tool_input.command // ""')

# Block dangerous patterns
if echo "$cmd" | grep -qE 'rm -rf|git reset --hard|curl.*\|.*sh'; then
  echo '{"decision": "block", "reason": "Dangerous command blocked by security policy"}' >&2
  exit 2
fi

exit 0
```

**Auto-formatter (run after file changes):**

```bash
#!/usr/bin/env bash
# .claude/hooks/format-code.sh
set -euo pipefail

# Get changed files
files=$(jq -r '.tool_input.file_path // ""')

# Format based on extension
for file in $files; do
  case "$file" in
    *.py) black "$file" 2>/dev/null || true ;;
    *.js|*.ts) prettier --write "$file" 2>/dev/null || true ;;
  esac
done

exit 0
```

**Command Logger:**

```bash
#!/usr/bin/env bash
set -euo pipefail
cmd=$(jq -r '.tool_input.command // ""')
printf '%s %s\n' "$(date -Is)" "$cmd" >> .claude/bash-commands.log
exit 0
```

### 1.9 SubagentStop Hooks for Workflow Control

SubagentStop hooks fire when a subagent (Task tool) completes. This enables workflow orchestration:

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Review the subagent's work. Did it complete all assigned tasks? Are there any issues that need escalation to the main agent?"
          }
        ]
      }
    ]
  }
}
```

---

## 2. Skills and Slash Commands

Skills are structured, auto-discovered capabilities that extend Claude's functionality. Custom slash commands have been merged into skills - a file at `.claude/commands/review.md` and a skill at `.claude/skills/review/SKILL.md` both create `/review`.

**Sources:**
- [Skills Documentation](https://code.claude.com/docs/en/skills)
- [Slash Commands Guide](https://code.claude.com/docs/en/slash-commands)
- [Agent Skills Standard](https://agentskills.io)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)

### 2.1 Key Differences

| Feature | Slash Commands | Skills |
|---------|----------------|--------|
| Invocation | Manual `/command` | Auto or manual |
| Structure | Single markdown file | Directory with SKILL.md + resources |
| Complexity | Simple, repeatable tasks | Rich workflows with supporting files |
| Discovery | Must know command name | Claude auto-triggers when relevant |

### 2.2 Directory Structure

```
my-skill/
├── SKILL.md           # Required - instructions and metadata
├── reference.md       # Optional - detailed documentation
├── examples.md        # Optional - usage examples
└── scripts/
    └── helper.py      # Optional - executable scripts
```

**Storage Locations:**

| Location | Path | Scope |
|----------|------|-------|
| Enterprise | See managed settings | All organization users |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | Current project only |

### 2.3 SKILL.md Format

```yaml
---
name: explain-code
description: Explains code with visual diagrams and analogies. Use when explaining how code works, teaching about a codebase, or when the user asks "how does this work?"
argument-hint: [file-path]
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob
model: claude-sonnet-4-20250514
context: fork
agent: Explore
---

When explaining code, always include:

1. **Start with an analogy**: Compare the code to something from everyday life
2. **Draw a diagram**: Use ASCII art to show flow, structure, or relationships
3. **Walk through the code**: Explain step-by-step what happens
4. **Highlight a gotcha**: What's a common mistake or misconception?

Keep explanations conversational. For complex concepts, use multiple analogies.
```

### 2.4 Frontmatter Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Display name (lowercase, max 64 chars). Defaults to directory name |
| `description` | Recommended | What skill does and when to use it (max 1024 chars) |
| `argument-hint` | No | Autocomplete hint, e.g., `[issue-number]` |
| `disable-model-invocation` | No | `true` = manual only. Default: `false` |
| `user-invocable` | No | `false` = hidden from `/` menu. Default: `true` |
| `allowed-tools` | No | Tools Claude can use without permission |
| `model` | No | Specific model when skill is active |
| `context` | No | `fork` = run in isolated subagent context |
| `agent` | No | Subagent type: `Explore`, `Plan`, `general-purpose` |
| `hooks` | No | Lifecycle hooks for this skill |

### 2.5 Invocation Control Patterns

**Manual Only (side effects):**
```yaml
---
name: deploy
description: Deploy to production
disable-model-invocation: true
---
```

**Background Knowledge (auto-only):**
```yaml
---
name: legacy-context
description: How the legacy payment system works
user-invocable: false
---
```

**Full Access (default):**
```yaml
---
name: review
description: Code review with best practices
---
```

### 2.6 Dynamic Context Injection

Use shell command syntax to inject dynamic content:

```yaml
---
name: pr-summary
description: Summarize PR changes
context: fork
agent: Explore
allowed-tools: Bash(gh:*)
---

## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
- Changed files: !`gh pr diff --name-only`

Summarize this pull request...
```

### 2.7 String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `${CLAUDE_SESSION_ID}` | Current session ID |

### 2.8 Subagent Execution

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

### 2.9 Skill-Scoped Hooks

```yaml
---
name: secure-operations
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
  once: true
---
```

### 2.10 Context Budget

Skill descriptions are loaded into context. Default budget: 15,000 characters.

```bash
# Check for warnings
/context

# Increase limit
export SLASH_COMMAND_TOOL_CHAR_BUDGET=30000
```

---

## 3. MCP Server Implementation

The Model Context Protocol (MCP) is an open standard for connecting AI models to external tools, data sources, and services.

**Sources:**
- [MCP in Claude Code](https://code.claude.com/docs/en/mcp)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Registry](https://registry.modelcontextprotocol.io)
- [Agent SDK MCP](https://platform.claude.com/docs/en/agent-sdk/mcp)

### 3.1 Overview

MCP provides three core capabilities:

| Capability | Description |
|------------|-------------|
| **Tools** | Functions that can perform actions or fetch data |
| **Resources** | Read-only content accessible via `@` mentions |
| **Prompts** | Reusable prompt templates available as `/mcp__server__prompt` |

### 3.2 Configuration Methods

**CLI Wizard:**
```bash
claude mcp add
```

**Direct Configuration (`.mcp.json` or settings):**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token"
      }
    },
    "custom-api": {
      "url": "https://your-api.com/mcp",
      "transport": "http"
    }
  }
}
```

### 3.3 Transport Types

| Transport | Description |
|-----------|-------------|
| `stdio` | Subprocess with JSON-RPC over stdin/stdout (most common) |
| `http` | Remote HTTP server (recommended for cloud services) |
| `sse` | Server-Sent Events |

### 3.4 Building Custom MCP Servers

**Python SDK:**
```bash
pip install mcp
```

**TypeScript SDK:**
```bash
npm install @modelcontextprotocol/sdk
```

**Example Server (TypeScript):**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'my-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
});

// Define a tool
server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'get_weather',
    description: 'Get current weather for a location',
    inputSchema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' },
      },
      required: ['location'],
    },
  }],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'get_weather') {
    const { location } = request.params.arguments;
    // Fetch weather data...
    return { content: [{ type: 'text', text: `Weather in ${location}: Sunny, 72F` }] };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 3.5 Using MCP Resources

```
@mcp__filesystem__readme.md
```

Resources appear alongside files in the `@` autocomplete menu.

### 3.6 Dynamic Tool Loading

When MCP tool descriptions exceed 10% of context, Tool Search activates automatically, loading tools on-demand.

### 3.7 Security Considerations

- MCP servers run with your user permissions
- Validate and sanitize all inputs
- Be cautious with servers that fetch untrusted content (prompt injection risk)
- Review third-party servers before installation

---

## 4. Agent SDK Patterns

The Claude Agent SDK lets you build AI agents programmatically with the same capabilities that power Claude Code.

**Sources:**
- [Agent SDK Overview](https://docs.claude.com/en/docs/agent-sdk/overview)
- [Python SDK](https://github.com/anthropics/claude-agent-sdk-python)
- [TypeScript SDK](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Building Agents Blog](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)

### 4.1 Installation

**Python:**
```bash
pip install claude-agent-sdk
```

**TypeScript:**
```bash
npm install @anthropic-ai/claude-agent-sdk
```

### 4.2 Key Features

- **Context Management**: Automatic compaction and context control
- **Rich Tool Ecosystem**: File operations, code execution, web search, MCP
- **Advanced Permissions**: Fine-grained capability control
- **Production Essentials**: Error handling, session management, monitoring
- **Optimized Integration**: Automatic prompt caching and performance optimizations

### 4.3 Basic Usage (Python)

```python
from claude_agent_sdk import query

async def main():
    async for message in query("What files are in this directory?"):
        print(message)
```

### 4.4 Full Client Usage (Python)

```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

async def main():
    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Grep", "Glob"],
        permission_mode="default",
        setting_sources=["project"],
    )

    async with ClaudeSDKClient(options) as client:
        session = await client.create_session()

        async for message in session.query("Analyze this codebase"):
            if message.type == "text":
                print(message.content)
            elif message.type == "tool_use":
                print(f"Using tool: {message.name}")
```

### 4.5 TypeScript Usage

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

async function main() {
  for await (const message of query("What files are in this directory?")) {
    console.log(message);
  }
}
```

### 4.6 Streaming Events

```python
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions

options = ClaudeAgentOptions(include_partial_messages=True)

async with ClaudeSDKClient(options) as client:
    session = await client.create_session()

    async for event in session.stream("Write a function"):
        if event.type == "partial":
            print(event.content, end="", flush=True)
```

### 4.7 Hooks in SDK

```typescript
import { ClaudeSDKClient } from '@anthropic-ai/claude-agent-sdk';

const client = new ClaudeSDKClient({
  hooks: {
    PreToolUse: async (event) => {
      console.log(`Tool: ${event.tool_name}`);
      return { decision: 'allow' };
    },
    PostToolUse: async (event) => {
      console.log(`Result: ${event.tool_result}`);
    },
  },
});
```

### 4.8 MCP Integration in SDK

```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';

const weatherTool = tool({
  name: 'get_weather',
  description: 'Get weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' },
    },
    required: ['location'],
  },
  handler: async ({ location }) => {
    return `Weather in ${location}: Sunny`;
  },
});

const mcpServer = createSdkMcpServer({
  tools: [weatherTool],
});
```

---

## 5. Configuration Best Practices

**Sources:**
- [Settings Documentation](https://code.claude.com/docs/en/settings)
- [Permissions Guide](https://www.eesel.ai/blog/claude-code-permissions)
- [Configuration Guide](https://claudelog.com/configuration/)

### 5.1 File Hierarchy

| File | Location | Scope | Committed |
|------|----------|-------|-----------|
| `managed-settings.json` | System directories | Enterprise | N/A |
| `settings.json` | `~/.claude/` | User (all projects) | No |
| `settings.json` | `.claude/` | Project (team) | Yes |
| `settings.local.json` | `.claude/` | Project (personal) | No |

### 5.2 CLAUDE.md Files

Memory files provide conversational context and project knowledge:

| Location | Scope |
|----------|-------|
| `~/.claude/CLAUDE.md` | Global (all projects) |
| `.claude/CLAUDE.md` | Project root |
| `src/.claude/CLAUDE.md` | Directory-specific |

### 5.3 Permission Configuration

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(git:*)",
      "Bash(go:*)",
      "Read(*)",
      "Glob(*)",
      "Grep(*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(curl:*|sh)",
      "Read(.env)",
      "Read(./secrets/**)"
    ]
  }
}
```

**Permission Evaluation Order:**
1. Deny rules (block regardless of other rules)
2. Allow rules (permit if matched)
3. Ask rules (prompt for approval)

### 5.4 Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Ask permission for sensitive actions |
| `acceptEdits` | Auto-approve file edits |
| `bypassPermissions` | Skip all permission prompts (use with caution) |

### 5.5 Tool Allowlist Syntax

| Syntax | Description |
|--------|-------------|
| `ToolName` | Allow all uses of tool |
| `ToolName(*)` | Allow any argument |
| `ToolName(filter)` | Allow matching calls only |
| `Bash(npm:*)` | Allow all npm subcommands |
| `Read(src/**)` | Allow reading files in src/ |

### 5.6 CLI Flags

```bash
# Allow specific tools for session
claude --allowedTools "Bash(npm:*)" "Read(*)"

# Deny specific tools for session
claude --disallowedTools "Bash(curl:*)"

# Set permission mode
claude --permission-mode acceptEdits
```

### 5.7 Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Claude |
| `CLAUDE_CODE_USE_BEDROCK` | Use AWS Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | Use Google Vertex AI |
| `SLASH_COMMAND_TOOL_CHAR_BUDGET` | Skill description budget (default 15000) |

---

## 6. Subagent Orchestration

Subagents are specialized AI assistants that handle specific tasks in isolated context windows.

**Sources:**
- [Subagent Documentation](https://code.claude.com/docs/en/sub-agents)
- [Best Practices for Subagents](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)
- [Parallelization Guide](https://zachwills.net/how-to-use-claude-code-subagents-to-parallelize-development/)

### 6.1 Built-in Subagents

| Agent | Purpose |
|-------|---------|
| `Explore` | Read-only codebase exploration |
| `Plan` | Planning-focused reasoning |
| `general-purpose` | Default with full capabilities |

### 6.2 Creating Custom Subagents

**Via CLAUDE.md:**

```markdown
## Custom Subagents

### security-reviewer
Model: claude-sonnet-4-20250514
Description: Reviews code for security vulnerabilities
Tools: Read, Grep, Glob
Instructions: Focus on OWASP Top 10, authentication, authorization, and data validation.

### test-writer
Model: claude-haiku-4
Description: Writes unit tests for functions
Tools: Read, Write, Bash(npm test:*)
Instructions: Use Jest/Vitest patterns. Aim for >80% coverage.
```

**Via Skills (context: fork):**

```yaml
---
name: security-review
description: Review code for security issues
context: fork
agent: security-reviewer
allowed-tools: Read, Grep, Glob
---
```

### 6.3 When to Use Subagents

- Task produces verbose output you don't need in main context
- Work is self-contained and can return a summary
- You want specific tool restrictions
- Parallel execution of independent tasks
- Preserving main context for complex multi-step work

### 6.4 Orchestration Patterns

**Fan-Out Pattern:**

```
Main Agent
    |
    +-- Subagent 1: Research API docs
    +-- Subagent 2: Analyze existing code
    +-- Subagent 3: Check dependencies
    |
Collect results and synthesize
```

**Pipeline Pattern:**

```
Subagent 1: Explore codebase
    |
    v
Subagent 2: Create plan
    |
    v
Subagent 3: Implement changes
    |
    v
Subagent 4: Write tests
```

**Map-Reduce Pattern:**

```
Main Agent: List all modules
    |
    +-- Subagent: Document module A
    +-- Subagent: Document module B
    +-- Subagent: Document module C
    |
Main Agent: Assemble into README
```

### 6.5 Important Constraints

- Subagents **cannot** spawn other subagents
- Task tool must be in `allowedTools` for main agent
- Don't include Task in subagent's tools array
- Each invocation creates fresh context (use resume for continuity)

### 6.6 Parallel Execution

```
Spawn multiple subagents in a single message:

1. Web Documentation Agent - Search official docs for the topic
2. Stack Overflow Agent - Find similar problems and solutions
3. GitHub Issues Agent - Check for related issues/discussions

All run in parallel, results collected when complete.
```

### 6.7 Cost Optimization

Route simple tasks to faster, cheaper models:

```yaml
---
name: quick-search
description: Fast file search
context: fork
model: claude-haiku-4
allowed-tools: Grep, Glob
---
```

---

## 7. IDE Integrations

**Sources:**
- [VS Code Documentation](https://code.claude.com/docs/en/vs-code)
- [JetBrains Plugin](https://plugins.jetbrains.com/plugin/27310-claude-code-beta-)
- [IDE Integration Guide](https://www.eesel.ai/blog/claude-code-ide-integration)

### 7.1 VS Code Extension

**Installation:**
1. Open Extensions (Cmd+Shift+X / Ctrl+Shift+X)
2. Search "Claude Code"
3. Install from Anthropic publisher

**Key Features:**
- Review and edit Claude's plans before accepting
- Auto-accept edits as they're made
- @-mention files with specific line ranges
- Conversation history
- Multiple conversations in tabs/windows

**Keyboard Shortcuts:**
- `Cmd+Esc` / `Ctrl+Esc` - Open Claude Code
- Shared diagnostics (lint errors, warnings, selections)

**Permission Modes in VS Code:**
- Normal mode: Ask permission for each action
- Plan mode: Show plan, wait for approval
- Auto-accept mode: Make edits without asking

### 7.2 JetBrains Plugin (Beta)

**Supported IDEs:** IntelliJ, PyCharm, WebStorm (entire JetBrains family)

**Installation:**
1. Settings/Preferences > Plugins > Marketplace
2. Search "Claude Code [Beta]"
3. Install from Anthropic PBC
4. Restart IDE

**Features:**
- Standard diff viewer integration
- Navigate, comment, and apply hunks normally
- Requires separate Claude Code CLI installation

### 7.3 CLI Integration

The extension and CLI share conversation history:

```bash
# Continue extension conversation in terminal
claude --resume
```

### 7.4 Troubleshooting

- Always run Claude from project root directory
- For WSL/Remote Development, ensure plugin installed in correct location
- Verify Anthropic publisher to avoid look-alike extensions

---

## 8. Production Examples

**Sources:**
- [Claude Code GitHub Action](https://github.com/anthropics/claude-code-action)
- [Best Practices Blog](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code)

### 8.1 GitHub Actions Integration

```yaml
name: Claude Code Review
on:
  pull_request:
    types: [opened, synchronize]
  issue_comment:
    types: [created]

jobs:
  claude-review:
    runs-on: ubuntu-latest
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          mode: review
```

**Modes:**
- `review` - Analyze PR changes and suggest improvements
- `implement` - Make code changes based on instructions
- `interactive` - Respond to @claude mentions

### 8.2 Recommended Workflow Pattern

1. **Explore First**: Ask Claude to read relevant files without writing code
2. **Use Subagents**: For complex problems, delegate research to subagents
3. **Create Plan**: Have Claude document its plan in a file or issue
4. **Implement**: Execute the approved plan
5. **Commit and PR**: Let Claude commit and create pull request
6. **Update Docs**: Have Claude update READMEs and changelogs

### 8.3 Multi-Agent Orchestration Tools

**claude-flow**: Enterprise-grade agent orchestration with swarm intelligence

**CC Mirror**: Hidden orchestration system in official codebase - task decomposition with dependency graphs and background execution

**ccswarm**: Rust-native multi-agent system using Claude Code via ACP

### 8.4 Security Skills (Trail of Bits)

Professional security-focused skills:
- Static analysis with CodeQL and Semgrep
- Variant analysis across codebases
- Fix verification
- Differential code review

### 8.5 Plugin Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── commands/                 # Slash commands
├── agents/                   # Specialized agents
├── skills/                   # Agent skills
├── hooks/
│   └── hooks.json           # Event handlers
├── .mcp.json                # MCP server config
└── README.md
```

**plugin.json:**
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Description of plugin",
  "author": "Your Name"
}
```

---

## 9. Context Window Management

**Sources:**
- [Context Windows Documentation](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Context Editing Beta](https://platform.claude.com/docs/en/build-with-claude/context-editing)

### 9.1 Auto-Compaction

Claude Code automatically compacts context when reaching ~95% capacity (or 64-75% in recent versions with "completion buffer").

**Manual Commands:**
- `/compact` - Summarize conversation, keep key information
- `/clear` - Wipe history completely, fresh start

### 9.2 Context Limits

| Model | Standard | Extended (Beta) |
|-------|----------|-----------------|
| Claude Opus 4.5 | 200K tokens | N/A |
| Claude Sonnet 4.5 | 200K tokens | 1M tokens |
| Claude Sonnet 4 | 200K tokens | 1M tokens |

1M context requires beta header: `context-1m-2025-08-07`

### 9.3 Prompt Caching

Place static content at the beginning of prompts:
- Tool definitions
- System instructions
- Context/examples

Minimum cache size: 1024 tokens

### 9.4 Context Editing API (Beta)

**clear_tool_uses_20250919**: Automatically clears oldest tool results when threshold exceeded.

```python
client.messages.create(
    model="claude-sonnet-4-20250514",
    betas=["context-management-2025-06-27"],
    # ...
)
```

### 9.5 Best Practices

1. Use subagents to isolate verbose operations
2. Return summaries, not full outputs
3. Manually compact when you have time
4. Reference files with `@` instead of pasting content
5. Keep SKILL.md files under 500 lines

---

## 10. Tools Reference

**Sources:**
- [Tools Reference](https://www.vtrivedy.com/posts/claudecode-tools-reference)
- [Bash Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool)
- [CLI Reference](https://code.claude.com/docs/en/cli-reference)

### 10.1 Core Tools

| Tool | Description |
|------|-------------|
| **Bash** | Execute shell commands in persistent session |
| **Read** | Read file contents |
| **Write** | Write/overwrite files |
| **Edit** | Make targeted file edits |
| **MultiEdit** | Batch editing |
| **Glob** | File pattern matching |
| **Grep** | Text search (ripgrep) |
| **LS** | List directories |

### 10.2 Web Tools

| Tool | Description |
|------|-------------|
| **WebFetch** | Fetch web content |
| **WebSearch** | Search the web |

### 10.3 Task Management

| Tool | Description |
|------|-------------|
| **Task** | Launch subagents for complex tasks |
| **TodoRead** | Read task list |
| **TodoWrite** | Update task list |

### 10.4 Notebook Support

| Tool | Description |
|------|-------------|
| **NotebookRead** | Read Jupyter notebooks |
| **NotebookEdit** | Edit notebook cells |

### 10.5 Usage Guidelines

- Use `Read` instead of `cat`, `head`, `tail`
- Use `Grep` instead of `grep` or `rg` in Bash
- Use `Glob` instead of `find` or `ls` for file discovery
- Use `Edit` instead of `sed` or `awk`
- Chain commands with `&&` or `;`, not newlines

### 10.6 Grep Parameters

```
pattern: string (required) - regex pattern
path: string - directory to search
glob: string - filter files (e.g., "*.js")
type: string - file type (js, py, rust, etc.)
output_mode: "content" | "files_with_matches" | "count"
-A, -B, -C: number - context lines
```

---

## Quick Reference Card

### Essential Commands

```bash
# Start Claude Code
claude

# Resume previous session
claude --resume

# With specific permission mode
claude --permission-mode acceptEdits

# With allowed tools
claude --allowedTools "Bash(npm:*)" "Read(*)"

# Debug mode
claude --debug
```

### Slash Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/context` | Show context usage and warnings |
| `/hooks` | Show registered hooks |
| `/compact` | Summarize and compress context |
| `/clear` | Clear conversation history |
| `/permissions` | Manage tool permissions |

### File Locations

| Purpose | Path |
|---------|------|
| User settings | `~/.claude/settings.json` |
| User memory | `~/.claude/CLAUDE.md` |
| User skills | `~/.claude/skills/` |
| Project settings | `.claude/settings.json` |
| Project memory | `.claude/CLAUDE.md` |
| Project skills | `.claude/skills/` |
| MCP config | `.mcp.json` |

---

## Additional Resources

### Official Documentation
- [Claude Code Docs](https://code.claude.com/docs/en)
- [Claude Platform Docs](https://platform.claude.com/docs)
- [Agent SDK Docs](https://docs.claude.com/en/docs/agent-sdk/overview)

### GitHub Repositories
- [anthropics/claude-code](https://github.com/anthropics/claude-code)
- [anthropics/skills](https://github.com/anthropics/skills)
- [anthropics/claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python)
- [anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript)
- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)

### Community Resources
- [Awesome Claude Code](https://github.com/hesreallyhim/awesome-claude-code)
- [Awesome Claude Skills](https://github.com/travisvn/awesome-claude-skills)
- [MCP Registry](https://registry.modelcontextprotocol.io)
- [Agent Skills Standard](https://agentskills.io)

### Anthropic Engineering Blog
- [Building Agents with Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Equipping Agents with Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
