# Skill-Script Hybrid Patterns

> How skills provide knowledge while scripts handle execution.

## Table of Contents
1. [The Core Distinction](#1-the-core-distinction)
2. [When to Use Each](#2-when-to-use-each)
3. [Integration Patterns](#3-integration-patterns)
4. [Framework Examples](#4-framework-examples)
5. [awesome-slash Application](#5-awesome-slash-application)

---

## 1. The Core Distinction

### Skills = Knowledge
- Instructions, guidelines, context
- Loaded into agent memory
- Inform decision-making
- No side effects

### Scripts = Execution
- Concrete actions
- Run in environment
- Have side effects
- Return results

### The Relationship
```
┌─────────────────────────────────────────┐
│              SKILL                       │
│  "How to do X" - knowledge, patterns    │
│                                          │
│    ┌──────────────────────────────┐     │
│    │          SCRIPT              │     │
│    │  "Do X" - actual execution   │     │
│    │  Called when needed          │     │
│    └──────────────────────────────┘     │
│                                          │
└─────────────────────────────────────────┘
```

---

## 2. When to Use Each

### Degrees of Freedom (Anthropic)

| Freedom | Artifact Type | When to Use |
|---------|--------------|-------------|
| **High** | Text instructions | Multiple valid approaches |
| **Medium** | Pseudocode/templates | Preferred pattern exists |
| **Low** | Concrete scripts | Operations are fragile |

### Decision Matrix

| Characteristic | Skill | Script |
|----------------|-------|--------|
| Side effects | No | Yes |
| Deterministic | No | Yes |
| Model-dependent | Yes | No |
| Version-controlled behavior | Loosely | Exactly |
| Error handling | Agent decides | Script handles |
| Token cost | Every invocation | Zero (runs externally) |

### Key Insight
> "Solve Don't Punt: Scripts should handle errors explicitly rather than failing and letting the agent figure it out."
> — Anthropic Skills Best Practices

---

## 3. Integration Patterns

### Pattern 1: Skill Describes, Script Executes

**Skill Content (SKILL.md):**
```markdown
## Release Process

When creating a release:
1. Determine version bump type (major/minor/patch)
2. Run the release script with appropriate flag
3. Verify the generated changelog
4. Push tags to remote

### Script Usage
Use `scripts/release.sh` with:
- `--major` for breaking changes
- `--minor` for new features  
- `--patch` for bug fixes
```

**Script (scripts/release.sh):**
```bash
#!/bin/bash
set -e  # Script handles errors, doesn't punt

# Validate inputs
if [[ ! "$1" =~ ^--(major|minor|patch)$ ]]; then
  echo "Usage: release.sh --major|--minor|--patch"
  exit 1
fi

# Execute deterministically
npm version ${1#--}
git push --follow-tags
```

### Pattern 2: Skill Provides Context, Agent Writes Script

**Skill Content:**
```markdown
## API Conventions

Our API follows these patterns:
- Routes in `src/routes/`
- Controllers in `src/controllers/`
- Models in `src/models/`
- Tests mirror source structure in `tests/`

When adding a new endpoint:
1. Create route file
2. Create controller with validation
3. Add model if needed
4. Write integration tests
```

**Agent Behavior:**
- Uses skill knowledge to understand conventions
- Writes new code following patterns
- No pre-made script needed

### Pattern 3: Skill Orchestrates, Scripts Execute Steps

**Skill Content:**
```markdown
## PR Workflow

Execute this workflow using the provided scripts:

1. `scripts/lint.sh` - Fix linting issues
2. `scripts/test.sh` - Run test suite
3. `scripts/build.sh` - Verify build
4. `scripts/pr-create.sh` - Create PR

If any step fails:
- Read the error output
- Apply appropriate fixes
- Re-run from the failed step
```

**Agent Behavior:**
- Skill provides orchestration knowledge
- Scripts provide reliable execution
- Agent handles failures using skill guidance

---

## 4. Framework Examples

### CrewAI: Flows + Crews

CrewAI explicitly separates:

| Component | Type | Purpose |
|-----------|------|---------|
| **Flows** | Script-like | Orchestration, state, logic |
| **Crews** | Knowledge-like | Autonomous agents with context |

```python
@flow
def release_flow():
    # Script-like: deterministic steps
    changelog = generate_changelog()  # Crew (knowledge)
    version = bump_version()          # Script (execution)
    create_release(version)           # Script (execution)
```

### LangGraph: Deterministic + Agentic

```
Deterministic (scripts)     Agentic (skills)
        │                        │
        ▼                        ▼
┌───────────────────────────────────────┐
│             LangGraph                  │
│   Combines both in a single graph     │
└───────────────────────────────────────┘
```

### AutoGen: Agent + Tool Separation

- **Agents** have knowledge (skills)
- **Tools** have execution (scripts)
- Agent decides when to call tools

---

## 5. awesome-slash Application

### Current State (Scripts)

Our commands are currently scripts with embedded knowledge:
```
plugins/next-task/command.md  # Mixed: orchestration + knowledge
plugins/ship/command.md       # Mixed: workflow + knowledge
```

### Target State (Skill + Script Hybrid)

```
plugins/next-task/
├── command.md           # SCRIPT: Pure orchestration
└── skills/
    ├── workflow-design/ # SKILL: Agent orchestration patterns
    ├── pr-review/       # SKILL: PR review guidelines
    └── code-quality/    # SKILL: Quality standards
```

### Migration Principles

1. **Commands remain orchestrators**
   - Define workflow steps
   - Call agents in sequence
   - Handle transitions

2. **Knowledge moves to skills**
   - Best practices
   - Domain expertise
   - Decision guidelines

3. **Scripts stay executable**
   - `lib/` modules
   - Shell scripts
   - MCP tools

### Example: /ship Command

**Before (mixed):**
```markdown
# Ship Command

You are a shipping assistant. When shipping:
1. First understand PR best practices...
[500 lines of knowledge + workflow mixed]
```

**After (separated):**

**command.md (orchestration):**
```markdown
# Ship Command

## Workflow
1. Load skill: pr-workflow
2. Call agent: commit-analyzer
3. Load skill: changelog-format
4. Execute: scripts/create-pr.sh
5. Call agent: pr-reviewer
```

**skills/pr-workflow/SKILL.md (knowledge):**
```markdown
---
name: pr-workflow
description: Best practices for PR creation and review
---

## PR Title Format
[knowledge about titles]

## PR Body Structure
[knowledge about descriptions]

## Review Checklist
[knowledge about what to check]
```

---

## Key Patterns for awesome-slash

### 1. Skill References Scripts
```markdown
## SKILL.md
When running CI checks, use `lib/ci-runner.js` which handles:
- Parallel test execution
- Failure aggregation
- Retry logic
```

### 2. Script Documented in Skill
```markdown
## SKILL.md
### Available Scripts
| Script | Purpose | When to Use |
|--------|---------|-------------|
| `lint.sh` | Fix style | Before commits |
| `test.sh` | Run tests | Before PR |
```

### 3. Agent Loads Skill, Calls Script
```javascript
// Agent workflow
await loadSkill('pr-workflow');      // Get knowledge
await runScript('scripts/lint.sh');   // Execute action
await loadSkill('review-checklist'); // Get review knowledge
// Agent applies knowledge to review
```

---

## Checklist for Separation

- [ ] Can this knowledge be used without this specific script? → Skill
- [ ] Does this need to execute reliably every time? → Script
- [ ] Is the behavior model-dependent? → Skill
- [ ] Are errors handled programmatically? → Script
- [ ] Could different models need different guidance? → Skill
- [ ] Is exact reproducibility required? → Script

---

*Based on patterns from CrewAI, LangGraph, AutoGen, Anthropic Skills, and production implementations.*
