# /drift-detect Skills Architecture

> Design document for restructuring the drift-detect command with proper skill separation.

## References

- **Skills Spec**: `agent-docs/CLAUDE-CODE-REFERENCE.md` (Section 2)
- **Token Optimization**: `agent-docs/CONTEXT-OPTIMIZATION-REFERENCE.md`
- **Prompt Engineering**: `agent-docs/PROMPT-ENGINEERING-REFERENCE.md`
- **Research**: `plans/skills-integration/research/`

---

## Executive Summary

Restructure `/drift-detect` to properly separate:
- **Command** (script): Orchestration, data flow, tool calls
- **Agent** (knowledge): Reasoning process, role definition
- **Skills** (knowledge): Domain expertise, patterns, templates

**Goals**:
- 40-60% token reduction per invocation
- Clean separation of concerns
- Progressive disclosure for deep content
- Maintain functional equivalence

---

## Current State Analysis

### Component Inventory

| Component | Lines | Token Est. | Issues |
|-----------|-------|------------|--------|
| `commands/drift-detect.md` | 259 | ~1500 | 90-line analysis prompt embedded |
| `agents/plan-synthesizer.md` | 224 | ~1200 | Duplicates skill content |
| `skills/drift-analysis/SKILL.md` | 325 | ~2000 | Orphaned (not referenced), no progressive disclosure |
| `lib/drift-detect/collectors.js` | 860 | 0 (JS) | Well-designed, no changes needed |

**Total context cost**: ~4700 tokens per invocation

### Problems Identified

1. **Orphaned skill**: `SKILL.md` exists but is never loaded by command or agent
2. **Embedded knowledge**: Command contains 90 lines of analysis instructions that should be skill content
3. **Duplication**: Agent repeats patterns already in skill (cross-reference, drift types, report format)
4. **No progressive disclosure**: Full 325-line skill loaded even when subset needed
5. **Exceeds budget**: Current skill at ~2000 tokens, recommended <800 for core

---

## Target Architecture

### Directory Structure

```
plugins/drift-detect/
├── commands/
│   └── drift-detect.md              # ~100 lines (~600 tokens)
├── agents/
│   └── plan-synthesizer.md          # ~80 lines (~500 tokens)
├── skills/
│   └── drift-analysis/
│       ├── SKILL.md                 # ~150 lines (~800 tokens)
│       └── references/
│           ├── detection-patterns.md    # ~100 lines (on demand)
│           ├── prioritization.md        # ~80 lines (on demand)
│           └── output-templates.md      # ~120 lines (on demand)
└── lib/drift-detect/
    └── collectors.js                # Unchanged
```

### Token Budget

| Component | Current | Target | Savings |
|-----------|---------|--------|---------|
| Command | ~1500 | ~600 | 60% |
| Agent | ~1200 | ~500 | 58% |
| Skill (core) | ~2000 | ~800 | 60% |
| **Typical invocation** | ~4700 | ~1900 | **60%** |
| With all references | N/A | ~2800 | 40% |

---

## Frontmatter Specifications

### SKILL.md Frontmatter

Based on official spec (`agent-docs/CLAUDE-CODE-REFERENCE.md:289-327`) plus our extensions (`lib/types/README.md`):

```yaml
---
# Official Claude Code fields
name: drift-analysis
description: >-
  Use for drift detection, reality checks, comparing documented plans to actual
  implementation. Activated when user asks about "plan drift", "reality check",
  "roadmap alignment", "implementation gaps", or needs to verify release readiness.
version: 2.1.0
allowed-tools: Read, Grep, Glob
model: opus

# Our custom extensions
when-to-use:
  - "User asks about plan drift or reality check"
  - "User wants to compare docs vs implementation"
  - "Before major releases to verify readiness"
  - "When GitHub issues seem stale or misaligned"
related:
  - plan-synthesizer
  - collectors.js
---
```

### Agent Frontmatter

Agent loads skill via frontmatter reference:

```yaml
---
name: plan-synthesizer
description: >-
  Perform deep semantic analysis on collected project data to identify drift,
  gaps, and create a prioritized reconstruction plan. Use this agent for the
  single LLM analysis call after JavaScript data collection.
tools: Read, Write
model: opus
skills:
  - drift-analysis
---
```

### Command Frontmatter

Command stays unchanged (already well-designed):

```yaml
---
description: Deep repository analysis to realign project plans with actual code reality
argument-hint: "[--sources github,docs,code] [--depth quick|thorough] [--output file|display|both] [--file PATH]"
allowed-tools: Bash(git:*), Bash(gh:*), Read, Glob, Grep, Task, Write
---
```

---

## Content Migration Plan

### Phase 1: Create Reference Files

Extract deep content from current SKILL.md into reference files.

#### `references/detection-patterns.md`

**Source content**:
- SKILL.md lines 129-158 (Cross-Reference Patterns)
- Agent lines 49-63 (Matching Logic)
- Common Mismatches table

**Structure**:
```markdown
# Detection Patterns Reference

## Document-to-Code Matching
[Fuzzy matching function and examples]

## Common Mismatches
| Documented As | Implemented As |
|---------------|----------------|
| "user authentication" | auth/, login/, session/ |
...

## Feature Name Variations
[Normalization rules]
```

#### `references/prioritization.md`

**Source content**:
- SKILL.md lines 73-127 (Priority Calculation, Time Buckets, Weights)
- Agent lines 107-121 (Priority Formula)

**Structure**:
```markdown
# Prioritization Framework

## Priority Calculation
[calculatePriority function]

## Time Bucket Thresholds
| Bucket | Criteria | Max Items |
|--------|----------|-----------|
| Immediate | severity=critical OR priority >= 15 | 5 |
...

## Default Priority Weights
[Weight table with rationale]
```

#### `references/output-templates.md`

**Source content**:
- SKILL.md lines 159-212 (Output Templates)
- Agent lines 127-203 (Report Format)
- SKILL.md lines 284-324 (Example Input/Output)

**Structure**:
```markdown
# Output Templates

## Reality Check Report Format
[Full markdown template]

## Section Templates
### Drift Analysis Section
### Gap Report Section
### Reconstruction Plan Section

## Example Output
[Complete example]
```

### Phase 2: Refactor SKILL.md

Trim to ~150 lines, keeping only core knowledge.

**Keep**:
- Architecture Overview (brief diagram)
- Drift Types definitions (4 types, 1-2 lines each)
- Detection Signals thresholds (HIGH/MEDIUM/LOW table)
- Analysis Requirements (from command's embedded prompt)

**Add from command**:
- "Be BRUTALLY SPECIFIC" framing
- Issue-by-issue verification requirements
- Phase/checkbox validation requirements
- Release readiness assessment requirements

**Move to references**:
- Prioritization Framework → `references/prioritization.md`
- Output Templates → `references/output-templates.md`
- Cross-Reference Patterns → `references/detection-patterns.md`
- Example Input/Output → `references/output-templates.md`

**Add references section**:
```markdown
## References

For detailed implementation:
- Detection patterns: `references/detection-patterns.md`
- Priority framework: `references/prioritization.md`
- Report templates: `references/output-templates.md`
```

### Phase 3: Refactor Agent

Trim to ~80 lines, add skill reference.

**Keep**:
- Role description (condensed to 1 paragraph)
- Reasoning process (Steps 1-6, condensed)
- Model choice rationale (why opus)
- Success criteria (4-5 bullets)

**Remove (now in skill)**:
- Cross-reference patterns
- Drift identification patterns
- Gap analysis categories
- Report format template

**Add**:
```yaml
skills:
  - drift-analysis
```

### Phase 4: Refactor Command

Trim to ~100 lines, remove embedded knowledge.

**Keep**:
- Frontmatter (unchanged)
- Phase 1: Argument parsing, data collection
- Phase 2: Task call (simplified)
- Phase 3: Output handling
- Quick Reference table

**Remove**:
- 90-line `analysisPrompt` (lines 121-218)

**New Phase 2**:
```javascript
// Phase 2: Semantic Analysis (Single Opus Call)
// Agent loads drift-analysis skill automatically via frontmatter

await Task({
  subagent_type: "drift-detect:plan-synthesizer",
  prompt: `Analyze this project for drift between plans and implementation.

## Collected Data

${JSON.stringify(collectedData, null, 2)}

Generate a Reality Check Report following the skill's output format.`,
  description: "Analyze project reality"
});
```

---

## Implementation Checklist

### Phase 1: Create Reference Files
- [ ] Create `skills/drift-analysis/references/` directory
- [ ] Create `references/detection-patterns.md` (~100 lines)
- [ ] Create `references/prioritization.md` (~80 lines)
- [ ] Create `references/output-templates.md` (~120 lines)

### Phase 2: Refactor SKILL.md
- [ ] Update frontmatter with official + custom fields
- [ ] Add analysis requirements from command
- [ ] Trim to ~150 lines
- [ ] Add references section pointing to reference files
- [ ] Verify under 15,000 character budget

### Phase 3: Refactor Agent
- [ ] Add `skills: [drift-analysis]` to frontmatter
- [ ] Remove content now covered by skill
- [ ] Condense reasoning process
- [ ] Trim to ~80 lines

### Phase 4: Refactor Command
- [ ] Remove 90-line analysis prompt
- [ ] Simplify Task call (just pass data, let agent/skill handle instructions)
- [ ] Keep orchestration logic unchanged
- [ ] Trim to ~100 lines

### Phase 5: Validate
- [ ] Test: `/drift-detect` with default options
- [ ] Test: `/drift-detect --sources github --depth quick`
- [ ] Test: `/drift-detect --output file`
- [ ] Verify agent loads skill correctly
- [ ] Compare output quality to original (should be identical)
- [ ] Measure token counts before/after

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Skill not loaded by agent | Medium | High | Test skill loading mechanism first; have fallback inline content |
| Quality regression | Low | High | Keep original files as `.bak`; A/B test outputs |
| Reference file not found | Low | Medium | Use relative paths; test on Windows + macOS/Linux |
| Token savings not realized | Low | Medium | Measure actual token counts; adjust if needed |
| Agent skill syntax unsupported | Medium | High | Verify `skills:` frontmatter works; fall back to inline if not |

### Fallback Strategy

If agent `skills:` frontmatter doesn't work:
1. Keep skill content inline in agent
2. Use command to load skill via Read tool before Task call
3. Document limitation for future resolution

---

## Success Criteria

1. **Functional equivalence**: Same quality output as before
2. **Token reduction**: 40%+ reduction in typical invocation
3. **Clean separation**: Command has no domain knowledge embedded
4. **Progressive disclosure**: References only loaded when agent needs deep content
5. **Cross-platform**: Works on Claude Code + OpenCode (via `.claude/` fallback)
6. **Maintainable**: Clear ownership of each content type

---

## File Change Summary

| File | Action | Before | After |
|------|--------|--------|-------|
| `commands/drift-detect.md` | Modify | 259 lines | ~100 lines |
| `agents/plan-synthesizer.md` | Modify | 224 lines | ~80 lines |
| `skills/drift-analysis/SKILL.md` | Modify | 325 lines | ~150 lines |
| `skills/drift-analysis/references/detection-patterns.md` | Create | - | ~100 lines |
| `skills/drift-analysis/references/prioritization.md` | Create | - | ~80 lines |
| `skills/drift-analysis/references/output-templates.md` | Create | - | ~120 lines |

**Net content**: 808 lines → ~630 lines (22% reduction)
**Context per invocation**: ~4700 tokens → ~1900 tokens (60% reduction)

---

## Next Steps

1. **Test skill loading**: Verify agent `skills:` frontmatter works in Claude Code
2. **Create reference files**: Extract content per migration plan
3. **Refactor in order**: References → Skill → Agent → Command
4. **Test thoroughly**: Run all `/drift-detect` variations
5. **Document learnings**: Update this architecture doc with findings
6. **Apply pattern**: Use this as template for other commands

---

## Appendix: Current Content Locations

### Analysis Requirements (to move from command to skill)

Currently in `drift-detect.md` lines 121-211:

```markdown
Be BRUTALLY SPECIFIC. The user wants concrete, actionable insights.

### 1. Issue-by-Issue Verification
For EACH open issue, determine:
- Is this already implemented?
- Is this stale/irrelevant?
- Is this blocked?

### 2. Phase/Checkbox Validation
For EACH phase marked "complete" in docs:
- Verify against actual code
- Check for missing pieces

### 3. Release Readiness Assessment
If milestones exist, assess:
- Critical tests missing
- Security issues open
- Phases incomplete

### 4. Specific Recommendations
Output SPECIFIC actions:
- "Close issues: #12, #34, #56"
- "Reopen: Phase C"
- "Block release until: X, Y, Z"
```

This content moves to `SKILL.md` under "## Analysis Requirements".

### Report Format (to move to references)

Currently duplicated in:
- `SKILL.md` lines 159-212
- `plan-synthesizer.md` lines 127-203

Consolidate into `references/output-templates.md`.
