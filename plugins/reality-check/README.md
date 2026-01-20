# reality-check

Deep repository analysis to realign project plans with actual code reality.

## Overview

The reality-check plugin performs comprehensive analysis of your codebase to identify drift between documented plans and actual implementation. It uses pure JavaScript for data collection (no LLM overhead) and a single Opus call for deep semantic analysis.

## Architecture

```
/reality-check:scan
        │
        ├─→ collectors.js (pure JavaScript)
        │   ├─ scanGitHubState()     → issues, PRs, milestones
        │   ├─ analyzeDocumentation() → docs, plans, checkboxes
        │   └─ scanCodebase()        → structure, frameworks, health
        │
        └─→ plan-synthesizer (Opus)
            └─ Deep semantic analysis with full context
```

**Data collection**: No LLM calls - pure JavaScript
**Semantic analysis**: Single Opus call with complete context
**Token efficiency**: ~77% reduction vs. previous multi-agent architecture

## Features

- **Efficient data collection**: JavaScript collectors for deterministic extraction
- **Deep semantic analysis**: Single Opus call for cross-referencing and insights
- **Drift detection**: Identifies where plans have diverged from reality
- **Gap analysis**: Finds missing tests, documentation, and implementation
- **Priority ranking**: Context-aware prioritization
- **Command-line flags**: No persistent settings files needed

## Commands

### `/reality-check:scan`

Run a comprehensive reality check scan.

```
/reality-check:scan                              # Full scan (default)
/reality-check:scan --sources github,docs        # Specific sources
/reality-check:scan --depth quick                # Quick scan
/reality-check:scan --output file --file report.md  # Custom output
```

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--sources` | github,docs,code | all three | Which sources to scan |
| `--depth` | quick, thorough | thorough | How deep to analyze |
| `--output` | file, display, both | both | Where to output results |
| `--file` | path | reality-check-report.md | Output file path |

### `/reality-check:set`

Show available scan flags and examples.

```
/reality-check:set
```

## Agent

| Agent | Purpose | Model |
|-------|---------|-------|
| `plan-synthesizer` | Deep semantic analysis, drift detection, prioritization | opus |

## Workflow

```
/reality-check:scan
        │
        ├─→ Parse command flags
        │
        ├─→ JavaScript Data Collection (parallel, no LLM)
        │   ├─ scanGitHubState()
        │   ├─ analyzeDocumentation()
        │   └─ scanCodebase()
        │
        └─→ Single Opus Analysis Call
            ├─ Cross-reference docs vs code
            ├─ Identify drift patterns
            ├─ Find gaps
            └─ Generate prioritized plan
                    │
                    ▼
           Reality Check Report
```

## Data Sources

### GitHub (`--sources github`)
- Open issues categorized by labels (bug, feature, security)
- Open pull requests with draft status
- Milestones with due dates and completion
- Stale items (> 90 days inactive)
- Themes extracted from issue titles

**Requires**: `gh` CLI installed and authenticated

### Documentation (`--sources docs`)
- README.md, CONTRIBUTING.md, CHANGELOG.md
- PLAN.md, CLAUDE.md
- docs/*.md
- Checkbox completion rates
- Feature lists and planned work

### Code (`--sources code`)
- Directory structure analysis
- Framework detection (React, Express, Vue, etc.)
- Test framework detection (Jest, Mocha, Vitest)
- Health indicators (CI, linting, tests)
- Implemented features

## Output

The scan produces:

1. **Executive Summary**: Overview of project state
2. **Drift Analysis**: Where plans diverge from reality (with evidence)
3. **Gap Analysis**: Missing tests, docs, implementation (with severity)
4. **Cross-Reference**: Documented vs. implemented features
5. **Reconstruction Plan**: Prioritized action items by timeframe

### Example Output

```markdown
# Reality Check Report

## Executive Summary
Project has moderate drift: 8 stale priority issues and 20% plan completion.
Strong code health (tests + CI) but documentation lags implementation.

## Drift Analysis

### Priority Neglect
**Severity**: high
8 high-priority issues inactive for 60+ days.
**Recommendation**: Triage stale issues - close, reassign, or deprioritize.

## Gap Analysis

### No Automated Tests
**Severity**: critical
**Impact**: High risk of regressions, difficult to refactor safely.
**Recommendation**: Add test framework and critical path coverage.

## Prioritized Plan

### Immediate (This Week)
1. **Close issue #45** - already implemented
2. **Address security vulnerability** in auth module

### Short-Term (This Month)
1. Add test coverage for API endpoints
2. Update README to reflect current features
```

## Skills

### reality-analysis

Provides knowledge for:
- Drift detection patterns and signals
- Prioritization framework
- Cross-reference matching logic
- Output templates

## Requirements

- GitHub CLI (`gh`) for GitHub scanning
- Git repository
- Node.js

## Breaking Changes from v1

- `.claude/reality-check.local.md` settings file no longer used
- Use command flags instead: `--sources`, `--depth`, `--output`, `--file`
- Three scanner agents replaced with JavaScript collectors

## License

MIT
