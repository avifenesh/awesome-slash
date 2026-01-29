# /perf Plan Overview

**Last Updated**: 2026-01-29  
**Status**: Proposed  
**Branch**: `feat/perf-research-methodology`

## Goal

Add a `/perf` workflow that performs rigorous performance investigations with repeatable benchmarks, hypothesis testing, profiling, and evidence-driven decisions.

## Canonical Requirements

All components must follow:
- `docs/perf-requirements.md` (source of truth)
- `docs/perf-research-methodology.md` (raw research + quotes)

## Scope

**New plugin:** `plugins/perf/`  
**New lib module:** `lib/perf/`  
**New command:** `/perf`  
**New MCP tool (optional):** `perf_analyze` (if we choose to expose it)

## Architecture (Hybrid)

| Component | Type | Purpose |
|-----------|------|---------|
| `/perf` | Command | Entry point + mode selection |
| perf-orchestrator | Agent (opus) | Workflow coordination |
| perf-benchmarker | Skill | Bench planning/execution |
| perf-profiler | Skill | Low-level profiling |
| perf-baseline-manager | Skill | Baseline storage/comparison |
| perf-theory-gatherer | Agent | Hypothesis generation |
| perf-theory-tester | Agent | Controlled experiments |
| perf-analyzer | Agent | Synthesis + recommendations |
| perf-investigation-logger | Agent | Logs + checkpoint commits |
| perf-constraint-tester | Hook | Apply CPU/memory constraints |
| perf-checkpoint | Hook | Auto-commit after phases |

## Required Phases

1. Setup & clarification
2. Baseline establishment
3. Breaking point discovery (binary search)
4. Constraint testing (CPU/memory limits)
5. Hypothesis generation
6. Code path analysis
7. Profiling (CPU/memory/JFR/perf)
8. Optimization & validation
9. Decision points (abandon/continue)
10. Consolidation

## Key Behaviors (Must Enforce)

- Sequential benchmark execution
- 60s minimum runs (30s only for binary search)
- One change per experiment; revert to baseline between runs
- Narrow-first workflow; expand only on explicit approval
- Verify every claim; re-run anomalies
- Minimal resource usage
- Git history review before hypotheses/changes
- Exact user quotes logged in investigation notes

## Planned Files

### Command
- `plugins/perf/commands/perf.md`

### Agents
- `plugins/perf/agents/perf-orchestrator.md`
- `plugins/perf/agents/perf-theory-gatherer.md`
- `plugins/perf/agents/perf-theory-tester.md`
- `plugins/perf/agents/perf-analyzer.md`
- `plugins/perf/agents/perf-investigation-logger.md`

### Skills
- `plugins/perf/skills/benchmark.md`
- `plugins/perf/skills/profile.md`
- `plugins/perf/skills/baseline.md`

### Hooks
- `plugins/perf/hooks/constraint-tester.md`
- `plugins/perf/hooks/checkpoint.md`

### Lib
- `lib/perf/investigation-state.js`
- `lib/perf/benchmark-runner.js`
- `lib/perf/breaking-point-finder.js`
- `lib/perf/experiment-runner.js`
- `lib/perf/baseline-store.js`
- `lib/perf/baseline-comparator.js`
- `lib/perf/profilers/*`
- `lib/perf/analyzer/*`

## Success Criteria

- Behaviors match `docs/perf-requirements.md`
- All phases supported with resume
- Checkpoint commits + investigation logs are consistent
- Baselines consolidated to one JSON per version
- Perf findings are reproducible and evidence-backed
