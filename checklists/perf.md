# /perf Implementation Checklist

Use this checklist when implementing the `/perf` workflow and its components.

## Canonical Requirements

- [ ] `docs/perf-requirements.md` referenced in all /perf agents, skills, and hooks
- [ ] Sequential benchmarks only (no parallel runs)
- [ ] Minimum 60s runs (30s only for binary search)
- [ ] One change per experiment; revert between runs
- [ ] Narrow-first workflow; expansion requires explicit approval
- [ ] Verify everything; re-run anomalies
- [ ] Clean baseline before tests
- [ ] Resource minimalism enforced
- [ ] Git history checked before hypotheses/changes
- [ ] Exact user quotes logged in investigation notes

## Components (Issues)

- [ ] #124 `/perf` command + perf-orchestrator agent
- [ ] #125 perf-benchmarker skill
- [ ] #126 perf-theory-gatherer agent
- [ ] #127 perf-theory-tester agent
- [ ] #128 perf-profiler skill
- [ ] #129 perf-analyzer agent
- [ ] #144 perf-baseline-manager skill
- [ ] #145 perf-constraint-tester hook
- [ ] #146 perf-investigation-logger agent
- [ ] #147 perf-checkpoint hook

## State & Artifacts

- [ ] `.claude/perf/investigation.json` schema defined
- [ ] `.claude/perf/investigations/<id>.md` log format defined
- [ ] `.claude/perf/baselines/<version>.json` single baseline per version
- [ ] Checkpoint commit message format defined

## Validation

- [ ] Reproducibility checks (2+ runs, variance tracked)
- [ ] Binary search breaking point confirmed with full run
- [ ] Constraint testing comparison reported
- [ ] Baseline consolidation produces one file per version
