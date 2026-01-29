# /perf Requirements (Canonical)

This document is the source of truth for `/perf` behavior, derived from real performance investigations. All `/perf` agents, skills, and hooks must follow these requirements.

---

## Non-Negotiable Rules

1. **Sequential benchmarks only** — never run benchmarks in parallel.
2. **Minimum duration** — 60s runs with 10s warmup; 30s only for binary search.
3. **One change at a time** — isolate variables; revert to baseline between tests.
4. **Narrow before wide** — start with a single scenario; expand only on explicit user approval.
5. **Evidence over assumptions** — verify everything; re-run anomalies.
6. **Clean slate** — align code with upstream baseline before each experiment.
7. **Resource minimalism** — start small, scale only when needed.
8. **Understand intent** — check git history before hypothesizing or modifying.
9. **Terminology precision** — clarify terms before acting.
10. **Commit + log** — checkpoint commits and investigation logs after each phase.

---

## Required Workflow Phases

1. Setup & clarification (scenario, metrics, success criteria)
2. Baseline establishment
3. Breaking point discovery (binary search)
4. Constraint testing (CPU/memory limits)
5. Hypothesis generation
6. Code path analysis
7. Profiling (CPU/memory/JFR/perf)
8. Optimization & validation (change → benchmark → compare)
9. Decision points (abandon/continue)
10. Consolidation (single baseline per version)

---

## State & Artifacts

**State files (project root):**
- `.claude/perf/investigation.json` — current phase, hypotheses, results
- `.claude/perf/investigations/<id>.md` — narrative log with user quotes
- `.claude/perf/baselines/<version>.json` — one baseline per version

**Commit behavior:**
- One checkpoint commit after each phase
- Commit message includes baseline vs current metrics and investigation ID

---

## Component Map (Issues → Required Behavior)

- **#124 /perf orchestrator** — enforces all non-negotiable rules + adaptive workflow
- **#125 perf-benchmarker** — sequential runs, 60s min, binary search, anomalies
- **#126 perf-theory-gatherer** — git history before hypotheses, top-5, compact evidence
- **#127 perf-theory-tester** — single-variable experiments, clean slate, 2+ runs
- **#128 perf-profiler** — debug symbols check, hotspots with file:line, flame graphs
- **#129 perf-analyzer** — synthesis, prioritization, abandoned approaches, breaking points
- **#144 perf-baseline-manager** — single JSON per version, consolidation, deltas
- **#145 perf-constraint-tester** — CPU/memory limits, constrained vs unconstrained
- **#146 perf-investigation-logger** — exact user quotes + rationale + commit integration
- **#147 perf-checkpoint** — auto-commit + log update after each phase

---

## Integration Notes (For Skills/Agents)

All perf agents and skills must:
- Reference this document as the canonical behavior contract.
- Reject actions that violate non-negotiable rules.
- Surface any deviation requests for explicit user approval.

