# Skills Integration Plan Overview

> Session continuity document - all context needed to resume work.

**Last Updated**: January 2026  
**Status**: Architecture Complete for /drift-detect - Ready for Implementation  
**Branch**: `skills-integration` (to be created)

---

## Quick Context

We're restructuring awesome-slash commands to properly separate:
- **Commands** (scripts): Orchestration, workflow steps
- **Agents** (knowledge): Reasoning instructions  
- **Skills** (knowledge): Domain expertise, patterns, templates

**Why**: Token efficiency (60% reduction), clean separation, progressive disclosure.

---

## What's Done

### Research Phase (Complete)
- Reviewed 65+ sources (Anthropic, OpenAI, Google, academic papers, production tools)
- Created 5 research documents in `research/`

### Architecture Phase (In Progress)
- `/drift-detect` architecture complete: `architecture/drift-detect.md`
- Other commands: Not started

---

## Key Documents

| Document | Purpose | Read When |
|----------|---------|-----------|
| `architecture/drift-detect.md` | Full implementation blueprint | Starting implementation |
| `research/skills-best-practices.md` | Skill structure, progressive disclosure | Understanding patterns |
| `research/skill-script-hybrid.md` | Skills = knowledge, Scripts = execution | Deciding what goes where |
| `research/context-efficiency.md` | Token budgets, caching | Optimizing |
| `agent-docs/CLAUDE-CODE-REFERENCE.md` | Official skills spec (Section 2) | Frontmatter reference |
| `agent-docs/CONTEXT-OPTIMIZATION-REFERENCE.md` | Token strategies | Optimization |

---

## Implementation Plan for /drift-detect

### Current Files

```
plugins/drift-detect/
├── commands/drift-detect.md     # 259 lines - has embedded knowledge (problem)
├── agents/plan-synthesizer.md   # 224 lines - duplicates skill content (problem)
├── skills/drift-analysis/
│   └── SKILL.md                 # 325 lines - orphaned, not loaded (problem)
└── lib/drift-detect/
    └── collectors.js            # 860 lines - pure JS, no changes needed
```

### Target State

```
plugins/drift-detect/
├── commands/drift-detect.md     # ~100 lines (orchestration only)
├── agents/plan-synthesizer.md   # ~80 lines (loads skill via frontmatter)
├── skills/drift-analysis/
│   ├── SKILL.md                 # ~150 lines (core knowledge)
│   └── references/
│       ├── detection-patterns.md    # ~100 lines (on demand)
│       ├── prioritization.md        # ~80 lines (on demand)
│       └── output-templates.md      # ~120 lines (on demand)
└── lib/drift-detect/
    └── collectors.js            # Unchanged
```

### Implementation Phases

**Phase 1: Create Reference Files**
- [ ] Create `references/detection-patterns.md`
- [ ] Create `references/prioritization.md`
- [ ] Create `references/output-templates.md`

**Phase 2: Refactor SKILL.md**
- [ ] Update frontmatter (official + custom fields)
- [ ] Add analysis requirements from command
- [ ] Trim to ~150 lines
- [ ] Add references section

**Phase 3: Refactor Agent**
- [ ] Add `skills: [drift-analysis]` to frontmatter
- [ ] Remove content now in skill
- [ ] Trim to ~80 lines

**Phase 4: Refactor Command**
- [ ] Remove 90-line analysis prompt
- [ ] Simplify Task call
- [ ] Trim to ~100 lines

**Phase 5: Validate**
- [ ] Test `/drift-detect` with all flag combinations
- [ ] Compare output quality
- [ ] Measure token savings

---

## Key Decisions Made

1. **Agent frontmatter for skill loading** - Agent declares `skills: [drift-analysis]`
2. **Split analysis prompt** - Data in command, framing in agent, knowledge in skill
3. **Progressive disclosure** - Core skill ~150 lines, deep content in references/
4. **Claude Code primary** - `.claude/skills/` canonical, other platforms fall back

---

## Risk Mitigation

If `skills:` frontmatter doesn't work:
1. Keep skill content inline in agent
2. Or command loads skill via Read before Task call

---

## Commands After /drift-detect

Priority order for other commands:
1. `/ship` - Medium complexity
2. `/enhance` - Multiple sub-commands
3. `/next-task` - Most complex (14 agents)
4. Others as needed

---

## Resume Instructions

To continue this work:

1. Checkout branch: `git checkout skills-integration`
2. Read this file for context
3. Read `architecture/drift-detect.md` for implementation details
4. Start with Phase 1: Create reference files
5. Test after each phase

---

## Files Changed in This Session

- Created: `plans/skills-integration/architecture/drift-detect.md`
- Created: `plans/skills-integration/OVERVIEW.md` (this file)
- Updated: `plans/README.md` (if needed)
